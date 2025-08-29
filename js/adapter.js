/**
 * @file adapter.js
 * This module serves as the adapter for the application's Python backend,
 * which in turn communicates with the OpenAI compatible api.
 */

import { initializeApp } from './main.js';
import { gameState } from './state.js';
import { UI } from './dom.js';
import { updateModelSelection } from './ui.js';
import { callApi } from './utils.js';

// Construct the API path dynamically from the deployment config.
const basePath = '/';
const apiPath = `${basePath}/api/`.replace('//', '/');

const backendApiAdapter = {
    isConfigured() {
        return true;
    },

    loadSettings() {
        const savedModel = localStorage.getItem('trivia_model');
        if (savedModel) {
            updateModelSelection(savedModel);
        }
    },

    saveSettings() {
        if (UI.modelSelect) {
            localStorage.setItem('trivia_model', UI.modelSelect.value);
        }
    },

    _resolveModelSelection() {
        const selectedValue = UI.modelSelect.value;

        if (selectedValue === 'random-pl' || selectedValue === 'random-en') {
            const lang = selectedValue === 'random-pl' ? 'pl' : 'en';
            const compatibleModels = gameState.availableModels.filter(model =>
                model.languages && model.languages.includes(lang)
            );

            if (compatibleModels.length > 0) {
                const randomIndex = Math.floor(Math.random() * compatibleModels.length);
                const randomModelId = compatibleModels[randomIndex].id;
                console.log(`Random model selected for ${lang}: ${randomModelId}`);
                return randomModelId;
            }
        }

        return selectedValue;
    },

    // A helper function to build the payload with the selected model and gameId
    _buildPayload(data) {
        return {
            model: this._resolveModelSelection(),
            gameId: gameState.gameId,
            ...data
        };
    },

    // A new method to trigger the preload on the server
    async preloadQuestions() {
        if (!gameState.gameId) return; // Don't do anything if the game hasn't started

        const payload = {
            model: UI.modelSelect.value,
            gameId: gameState.gameId,
            categories: gameState.categories,
            gameMode: gameState.gameMode,
            knowledgeLevel: gameState.knowledgeLevel,
            language: gameState.currentLanguage,
            theme: gameState.theme,
            includeCategoryTheme: gameState.includeCategoryTheme,
            subcategoryHistory: Object.fromEntries(
                Object.entries(gameState.categoryTopicHistory).map(([k, v]) => [k, v.subcategories])
            ),
            entityHistory: Object.fromEntries(
                Object.entries(gameState.categoryTopicHistory).map(([k, v]) => [k, v.entities])
            )
        };

        try {
            // Fire-and-forget request, we don't need to wait for the response
            fetch(apiPath + 'preload-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('Preload request sent with model selection:', payload.model);
        } catch (error) {
            console.error('Failed to send preload request:', error);
        }
    },

    async generateCategories(theme) {
        const payload = this._buildPayload({theme, language: gameState.currentLanguage});
        const response = await callApi(apiPath + 'generate-categories', payload);
        if (!response || !Array.isArray(response.categories) || response.categories.length < 6) {
            console.error("Backend did not return valid categories.", response);
            throw new Error("Failed to generate categories from backend.");
        }

        gameState.promptHistory.push({
            prompt: JSON.stringify(payload, null, 2),
            response: JSON.stringify(response, null, 2)
        });
        return response.categories.slice(0, 6);
    },

    async generateQuestion(category) {
        let history = gameState.categoryTopicHistory[category] || {subcategories: [], entities: []};
        const payload = this._buildPayload({
            category,
            gameMode: gameState.gameMode,
            knowledgeLevel: gameState.knowledgeLevel,
            language: gameState.currentLanguage,
            theme: gameState.theme,
            includeCategoryTheme: gameState.includeCategoryTheme,
            subcategoryHistory: history.subcategories || [],
            entityHistory: history.entities || [],
        });
        const response = await callApi(apiPath + 'generate-question', payload);
        if (!response || typeof response.question !== 'string') {
            console.error("Backend response is not a valid question object.", response);
            throw new Error("Failed to generate question from backend.");
        }

        gameState.promptHistory.push({
            prompt: JSON.stringify(payload, null, 2),
            response: JSON.stringify(response, null, 2)
        });
        return response;
    },

    async getIncorrectAnswerExplanation() {
        const payload = this._buildPayload({
            language: gameState.currentLanguage,
            question: gameState.currentQuestionData.question,
            correct_answer: gameState.currentQuestionData.answer,
            player_answer: gameState.currentPlayerAnswer,
        });
        const data = await callApi(apiPath + 'explain-incorrect', payload);

        gameState.promptHistory.push({
            prompt: JSON.stringify(payload, null, 2),
            response: JSON.stringify(data, null, 2)
        });
        return data;
    },

    async getCategoryMutationChoices(oldCategory, existingCategories = []) {
        const payload = this._buildPayload({
            language: gameState.currentLanguage,
            old_category: oldCategory,
            theme: gameState.theme || null,
            existing_categories: existingCategories,
        });
        const data = await callApi(apiPath + 'mutate-category', payload);
        gameState.promptHistory.push({
            prompt: JSON.stringify(payload, null, 2),
            response: JSON.stringify(data, null, 2)
        });
        return data.choices;
    }
};

initializeApp(backendApiAdapter);
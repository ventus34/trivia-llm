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

    _resolveQuestionModel() {
        // Use stored game state first, fallback to UI
        let selectedValue = gameState.selectedQuestionModel || (UI.modelSelect ? UI.modelSelect.value : 'random-pl');

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

    _resolveExplanationModel() {
        // Use stored game state first, fallback to UI
        return gameState.selectedExplanationModel || (UI.explanationModelSelect ? UI.explanationModelSelect.value : 'auto');
    },

    _resolveCategoryModel() {
        // Use stored game state first, fallback to UI
        return gameState.selectedCategoryModel || (UI.categoryModelSelect ? UI.categoryModelSelect.value : 'auto');
    },

    loadSettings() {
        const savedQuestion = localStorage.getItem('trivia_question_model');
        if (savedQuestion && UI.modelSelect) {
            UI.modelSelect.value = savedQuestion;
            updateModelSelection(savedQuestion, 'question');
        }

        const savedExplanation = localStorage.getItem('trivia_explanation_model');
        if (savedExplanation && UI.explanationModelSelect) {
            UI.explanationModelSelect.value = savedExplanation;
            updateModelSelection(savedExplanation, 'explanation');
        }

        const savedCategory = localStorage.getItem('trivia_category_model');
        if (savedCategory && UI.categoryModelSelect) {
            UI.categoryModelSelect.value = savedCategory;
            updateModelSelection(savedCategory, 'category');
        }
    },

    saveSettings() {
        if (UI.modelSelect) {
            localStorage.setItem('trivia_question_model', UI.modelSelect.value);
        }
        if (UI.explanationModelSelect) {
            localStorage.setItem('trivia_explanation_model', UI.explanationModelSelect.value);
        }
        if (UI.categoryModelSelect) {
            localStorage.setItem('trivia_category_model', UI.categoryModelSelect.value);
        }
    },

    // A new method to trigger the preload on the server
    async preloadQuestions() {
        if (!gameState.gameId) return; // Don't do anything if the game hasn't started

        const payload = {
            model: this._resolveQuestionModel(),
            gameId: gameState.gameId,
            categories: gameState.categories,
            gameMode: gameState.gameMode,
            knowledgeLevel: gameState.knowledgeLevel,
            language: gameState.currentLanguage,
            theme: gameState.theme,
            includeCategoryTheme: gameState.includeCategoryTheme,
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
        const payload = {
            model: this._resolveCategoryModel(),
            gameId: gameState.gameId,
            theme,
            language: gameState.currentLanguage
        };
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
        const payload = {
            model: this._resolveQuestionModel(),
            gameId: gameState.gameId,
            category,
            gameMode: gameState.gameMode,
            knowledgeLevel: gameState.knowledgeLevel,
            language: gameState.currentLanguage,
            theme: gameState.theme,
            includeCategoryTheme: gameState.includeCategoryTheme
        };
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
        const payload = {
            model: this._resolveExplanationModel(),
            gameId: gameState.gameId,
            language: gameState.currentLanguage,
            question: gameState.currentQuestionData.question,
            correct_answer: gameState.currentQuestionData.answer,
            player_answer: gameState.currentPlayerAnswer,
        };
        const data = await callApi(apiPath + 'explain-incorrect', payload);

        gameState.promptHistory.push({
            prompt: JSON.stringify(payload, null, 2),
            response: JSON.stringify(data, null, 2)
        });
        return data;
    },

    async getCategoryMutationChoices(oldCategory, existingCategories = []) {
        const payload = {
            model: this._resolveCategoryModel(),
            gameId: gameState.gameId,
            language: gameState.currentLanguage,
            old_category: oldCategory,
            theme: gameState.theme || null,
            existing_categories: existingCategories,
        };
        const data = await callApi(apiPath + 'mutate-category', payload);
        gameState.promptHistory.push({
            prompt: JSON.stringify(payload, null, 2),
            response: JSON.stringify(data, null, 2)
        });
        return data.choices;
    }
};

initializeApp(backendApiAdapter);
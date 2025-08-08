/**
 * @file adapter.js
 * This module serves as the adapter for the application's Python backend,
 * which in turn communicates with the Google Gemini API.
 */

import { initializeApp, gameState, translations, UI } from './game_core.js';
import { callApi } from './utils.js';

function updateModelSelection(selectedValue) {
    if (UI.modelSelect && UI.modelSelect.value !== selectedValue) {
        UI.modelSelect.value = selectedValue;
    }
    if (UI.gameMenuModelSelect && UI.gameMenuModelSelect.value !== selectedValue) {
        UI.gameMenuModelSelect.value = selectedValue;
    }
}


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

    // A helper function to build the payload with the selected model
    _buildPayload(data) {
        return {
            model: UI.modelSelect.value,
            ...data
        };
    },

    async generateCategories(theme) {
        const payload = this._buildPayload({ theme, language: gameState.currentLanguage });
        const response = await callApi('/api/generate-categories', payload);
        if (!response || !Array.isArray(response.categories) || response.categories.length < 6) {
            console.error("Backend did not return valid categories.", response);
            throw new Error("Failed to generate categories from backend.");
        }
        return response.categories.slice(0, 6);
    },

    async generateQuestion(category) {
        let history = gameState.categoryTopicHistory[category] || { subcategories: [], entities: [] };
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
        const response = await callApi('/api/generate-question', payload);
        if (!response || typeof response.question !== 'string') {
            console.error("Backend response is not a valid question object.", response);
            throw new Error("Failed to generate question from backend.");
        }
        gameState.promptHistory.push({ prompt: `[Backend Call: /api/generate-question]`, response: JSON.stringify(response, null, 2) });
        return response;
    },

    async getIncorrectAnswerExplanation() {
        const payload = this._buildPayload({
            language: gameState.currentLanguage,
            question: gameState.currentQuestionData.question,
            correct_answer: gameState.currentQuestionData.answer,
            player_answer: gameState.currentPlayerAnswer,
        });
        const data = await callApi('/api/explain-incorrect', payload);
        return data.explanation;
    },

    async getCategoryMutationChoices(oldCategory, existingCategories = []) {
        const payload = this._buildPayload({
            language: gameState.currentLanguage,
            old_category: oldCategory,
            theme: gameState.theme || null,
            existing_categories: existingCategories,
        });
        const data = await callApi('/api/mutate-category', payload);
        return data.choices;
    }
};

// Add an event listener to save the model choice
if (UI.modelSelect) {
    UI.modelSelect.addEventListener('change', backendApiAdapter.saveSettings);
}

initializeApp(backendApiAdapter);
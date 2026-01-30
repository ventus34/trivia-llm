/**
 * @file game-api.js
 * API interaction helpers for trivia gameplay.
 */

import { translations } from './config.js';
import { gameState } from './state.js';
import { UI } from './dom.js';
import { showNotification } from './ui-notifications.js';
import { updateCategoryInputs, autoResizeTextarea } from './ui.js';

/**
 * Handles the click event for the category suggestion button.
 */
export async function handleSuggestAlternatives(targetTextarea) {
    if (!gameState.api.isConfigured()) {
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: "Configuration error." }, 'error');
        return;
    }

    const oldCategory = targetTextarea.value.trim();
    if (!oldCategory) {
        showNotification({ title: "Input Required", body: translations.suggestion_input_needed[gameState.currentLanguage] }, 'info');
        return;
    }

    UI.suggestionModal.classList.add('visible');
    UI.suggestionLoader.classList.remove('hidden');
    UI.suggestionLoader.querySelector('span').textContent = translations.suggestion_loader_text[gameState.currentLanguage];
    UI.suggestionButtons.classList.add('hidden');
    UI.suggestionButtons.innerHTML = '';

    const allCategoryInputs = Array.from(UI.categoriesContainer.querySelectorAll('.category-input'));
    const existingCategories = allCategoryInputs
        .map(input => input.value.trim())
        .filter(cat => cat !== oldCategory && cat !== '');

    try {
        const choices = await gameState.api.getCategoryMutationChoices(oldCategory, existingCategories);

        UI.suggestionLoader.classList.add('hidden');
        UI.suggestionButtons.classList.remove('hidden');

        if (!choices || choices.length === 0) {
            UI.suggestionButtons.textContent = translations.suggestion_error[gameState.currentLanguage];
            return;
        }

        choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'w-full p-4 text-white rounded-lg transition-transform hover:scale-105 text-left bg-indigo-600 themed-button';
            button.innerHTML = `<span class="block font-bold text-lg">${choice.name || ""}</span><p class="text-sm font-normal opacity-90 mt-1">${choice.description || ""}</p>`;
            button.onclick = () => {
                targetTextarea.value = choice.name;
                autoResizeTextarea(targetTextarea);
                UI.suggestionModal.classList.remove('visible');
                if (gameState.api.preloadQuestions) {
                    console.log("Question preload on game start..");
                    gameState.api.preloadQuestions();
                }
            };
            UI.suggestionButtons.appendChild(button);
        });

    } catch (error) {
        console.error("Failed to get category suggestions:", error);
        UI.suggestionLoader.classList.add('hidden');
        UI.suggestionButtons.classList.remove('hidden');
        UI.suggestionButtons.textContent = translations.suggestion_error[gameState.currentLanguage];
        showNotification({ title: "API Error", body: "Could not generate suggestions." }, 'error');
    }
}

/**
 * Calls the API to generate new categories based on the provided theme.
 */
export async function generateCategories() {
    const theme = UI.themeInput.value.trim();
    if (!theme) return;

    if (!gameState.api.isConfigured()) {
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: "Configuration error." }, 'error');
        return;
    }

    const originalBtnText = UI.generateCategoriesBtn.textContent;
    UI.generateCategoriesBtn.textContent = translations.generating_categories[gameState.currentLanguage];
    UI.generateCategoriesBtn.disabled = true;

    try {
        const generatedCats = await gameState.api.generateCategories(theme);
        updateCategoryInputs(generatedCats.slice(0, 6));
    } catch (error) {
        console.error("Category generation error:", error);
        const errorMessage = error.message || translations.generate_categories_error[gameState.currentLanguage];
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: errorMessage }, 'error');
    } finally {
        UI.generateCategoriesBtn.textContent = originalBtnText;
        UI.generateCategoriesBtn.disabled = false;
    }
}

export async function verifyIncorrectAnswer() {
    UI.verifyAnswerBtn.classList.add('hidden');
    UI.incorrectExplanationLoader.classList.remove('hidden');

    if (UI.llmEvaluationContainer) UI.llmEvaluationContainer.classList.add('hidden');
    try {
        const responseData = await gameState.api.getIncorrectAnswerExplanation();

        UI.incorrectExplanationText.innerHTML = (responseData.explanation || translations.incorrect_answer_analysis_error[gameState.currentLanguage]).replace(/\n/g, '<br>');

        if (responseData.verdict_for && UI.llmEvaluationContainer) {
            const certainty = responseData.verdict_certainty || 0;
            const lang = gameState.currentLanguage;
            const verdictKey = `verdict_${responseData.verdict_for}`;
            const translatedVerdict = translations[verdictKey] ? translations[verdictKey][lang] : responseData.verdict_for;

            const evalText = translations.evaluation_certainty_text[lang]
                .replace('{verdict_for}', translatedVerdict)
                .replace('{certainty}', certainty);
            UI.llmEvaluationText.innerHTML = evalText.replace(/\n/g, '<br>');
            UI.llmEvaluationContainer.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Incorrect answer explanation error:", error);
        UI.incorrectExplanationText.innerHTML = translations.incorrect_answer_analysis_error[gameState.currentLanguage];
    } finally {
        UI.incorrectExplanationLoader.classList.add('hidden');
    }
}

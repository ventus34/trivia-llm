/**
 * @file adapter_local.js
 * This module serves as the specific API adapter for a local, OpenAI-compatible
 * server (e.g., LM Studio, Ollama with an OpenAI-compatible endpoint).
 * It handles:
 * - Storing and retrieving the local server URL.
 * - Formatting prompts and requests for the chat completions endpoint.
 * - Implementing the standard API adapter interface expected by game_core.js.
 */

// Import core game logic, state, and translation functions.
import { initializeApp, gameState, translations } from './game_core.js';
// Import shared utility functions (API calls, array shuffling, etc.).
import { shuffleArray, callApi } from './utils.js';


// --- LOCAL-SPECIFIC UI ELEMENTS ---
// This is the input field for the local server's URL.
const lmStudioUrlInput = document.getElementById('lmstudio-url-input');


/**
 * A wrapper function that configures and calls the generic `callApi` utility
 * with parameters specific to an OpenAI-compatible local server.
 * @param {string} prompt - The full prompt to send to the model.
 * @param {boolean} [expectJson=true] - Whether the response should be parsed as JSON.
 * @returns {Promise<any>} - The result from the API, either as a parsed object or raw text.
 */
async function callLmStudioApi(prompt, expectJson = true) {
    // Get the server URL from the input field.
    const url = lmStudioUrlInput.value.trim();
    const headers = { 'Content-Type': 'application/json' };

    /**
     * A function that creates the payload (request body) in the format
     * required by the standard /v1/chat/completions endpoint.
     * @param {string} p - The prompt text.
     * @returns {object} The structured payload for the API request.
     */
    const getPayload = (p) => {
        const temperature = parseFloat(document.getElementById('temperature-slider').value);
        return {
            messages: [{ role: 'user', content: p }],
            temperature: temperature,
            stream: false // Streaming responses are not needed for this application.
        };
    };

    // Delegate the actual API call to the shared utility function.
    return callApi(prompt, expectJson, url, headers, getPayload);
}

// --- LOCAL API ADAPTER OBJECT ---
// This object implements the standard interface required by the core game logic.
const localApiAdapter = {
    configErrorMsg: '',

    /**
     * Checks if the adapter is properly configured. For a local setup,
     * this means ensuring the server URL has been provided.
     * @returns {boolean} True if the URL is present, false otherwise.
     */
    isConfigured() {
        const url = lmStudioUrlInput.value.trim();
        const lang = gameState.currentLanguage;
        // Set a specific error message to be displayed if configuration is missing.
        this.configErrorMsg = translations.lm_studio_url_alert[lang];
        return !!url; // Returns true if the URL is not an empty string.
    },

    /**
     * Saves local-specific settings to localStorage.
     */
    saveSettings() {
        localStorage.setItem('quizGameSettings_local', JSON.stringify({
            lmStudioUrl: lmStudioUrlInput.value,
        }));
    },

    /**
     * Loads local-specific settings when the application starts.
     */
    loadSettings() {
        const savedSettings = localStorage.getItem('quizGameSettings_local');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.lmStudioUrl) lmStudioUrlInput.value = settings.lmStudioUrl;
        } else {
            // Provide a default value as a helpful placeholder for the user.
            lmStudioUrlInput.value = 'http://localhost:1234/v1/chat/completions';
        }
    },

    /**
     * Generates a list of 6 quiz categories based on a theme.
     * The prompt logic is identical to the Gemini adapter, showcasing the
     * power of the abstracted architecture.
     * @param {string} theme - The theme provided by the user.
     * @returns {Promise<string[]>} A promise that resolves to an array of 6 category names.
     */
    async generateCategories(theme) {
        const lang = gameState.currentLanguage;

        const prompt = translations.batch_category_prompt_cot[lang]
            .replace('{theme}', theme);

        const response = await callLmStudioApi(prompt, true);

        if (!response || !Array.isArray(response.categories) || response.categories.length < 6) {
            console.error("API did not return a valid array of 6 categories.", response);
            throw new Error("Failed to generate a complete set of categories.");
        }

        return response.categories.slice(0, 6);
    },

    /**
     * Generates a single quiz question for a given category.
     * The prompt construction logic is identical to the other adapter.
     * @param {string} category - The category for which to generate a question.
     * @returns {Promise<object>} A promise that resolves to the question object.
     */
    async generateQuestion(category) {
        const lang = gameState.currentLanguage;
        const languageName = lang === 'pl' ? 'polskim' : 'English';
        const promptStructure = translations.question_prompt[lang];

        let history = [...(gameState.categoryTopicHistory[category] || [])];
        shuffleArray(history);
        const historyPrompt = history.length > 0 ? `"${history.join('", "')}"` : "Brak historii.";

        const inspirationalWords = [...translations.inspirational_words[lang]];
        shuffleArray(inspirationalWords);
        const twoInspirationalWords = inspirationalWords.slice(0, 2).join(', ');

        const shuffledContextAndRules = [...promptStructure.context_lines, ...promptStructure.rules];
        shuffleArray(shuffledContextAndRules);

        let basePrompt = [
            promptStructure.persona,
            promptStructure.chain_of_thought,
            promptStructure.context_header,
            ...shuffledContextAndRules,
            promptStructure.few_shot_example_header,
            promptStructure.few_shot_example,
            promptStructure.output_format
        ].join('\n');

        const themeContext = gameState.includeCategoryTheme && gameState.theme ? translations.main_theme_context_prompt[lang].replace('{theme}', gameState.theme) : "Brak dodatkowego motywu.";

        const prompt = basePrompt
            .replace(/{category}/g, category)
            .replace(/{theme_context}/g, themeContext)
            .replace(/{knowledge_prompt}/g, translations.knowledge_prompts[gameState.knowledgeLevel][lang])
            .replace(/{game_mode_prompt}/g, translations.game_mode_prompts[gameState.gameMode][lang])
            .replace(/{history_prompt}/g, historyPrompt)
            .replace(/{language_name}/g, languageName)
            .replace(/{inspirational_words}/g, twoInspirationalWords);

        const response = await callLmStudioApi(prompt, true);

        // --- Response Validation and Correction ---
        if (!response || typeof response.question !== 'string') {
            console.error("API response is not a valid question object.", response);
            throw new Error("Failed to generate question.");
        }

        if (gameState.gameMode === 'mcq' && (!response.options || !response.options.some(opt => opt.toLowerCase() === response.answer.toLowerCase()))) {
            console.warn("Correct answer was not in the options list. Correcting response.");
            if (!response.options || response.options.length < 4) response.options = ["A", "B", "C", "D"];
            response.options[Math.floor(Math.random() * response.options.length)] = response.answer;
        }

        return response;
    },

    /**
     * Generates a brief explanation for why a player's incorrect answer was wrong.
     * @returns {Promise<string>} A promise resolving to the explanation text.
     */
    async getIncorrectAnswerExplanation() {
        const lang = gameState.currentLanguage;
        const prompt = translations.incorrect_answer_explanation_prompt[lang]
            .replace('{question}', gameState.currentQuestionData.question)
            .replace('{correct_answer}', gameState.currentQuestionData.answer)
            .replace('{player_answer}', gameState.currentPlayerAnswer);
        const data = await callLmStudioApi(prompt, true);
        return data.explanation;
    },

    /**
     * Generates three new category choices to replace an old one.
     * This function is now decoupled from the global state and relies on passed parameters.
     * @param {string} oldCategory - The name of the category to be replaced.
     * @param {string[]} [existingCategories=[]] - An array of other category names to avoid duplication.
     * @returns {Promise<object[]>} A promise resolving to an array of new category choices.
     */
    async getCategoryMutationChoices(oldCategory, existingCategories = []) {
        const lang = gameState.currentLanguage;
        const basePrompt = translations.category_mutation_prompt[lang];

        const theme = gameState.theme || "ogólny";

        const existingCategoriesStr = `"${existingCategories.join('", "')}"`;

        const prompt = basePrompt
            .replace(/{old_category}/g, oldCategory)
            .replace(/{theme}/g, theme)
            .replace(/{existing_categories}/g, existingCategoriesStr);

        // Correctly call this adapter's specific API wrapper function.
        const data = await callLmStudioApi(prompt, true);

        return data.choices;
    }
};

// --- INITIALIZATION ---
// Save settings whenever the user types in the URL input field.
lmStudioUrlInput.addEventListener('input', localApiAdapter.saveSettings);

// Initialize the main application, injecting this adapter as the API handler.
initializeApp(localApiAdapter);
/**
 * @file adapter_gemini.js
 * This module serves as the specific API adapter for the Google Gemini API.
 * It handles all logic related to Gemini, such as:
 * - Fetching available models.
 * - Managing Gemini-specific UI elements (model selection dropdown).
 * - Formatting prompts and requests for the Gemini API endpoint.
 * - Implementing the standard API adapter interface expected by game_core.js.
 */

// Import core game logic, state, and translation functions.
import { initializeApp, gameState, translations } from './game_core.js';
// Import shared utility functions (API calls, error handling, etc.).
import { RateLimitError, shuffleArray, callApi } from './utils.js';

// --- GEMINI-SPECIFIC UI ELEMENTS ---
// These are DOM elements present only in the trivia_gemini.html file.
const modelSelect = document.getElementById('model-select');
const refreshModelsBtn = document.getElementById('refresh-models-btn');


/**
 * A wrapper function that configures and calls the generic `callApi` utility
 * with parameters specific to the Google Gemini API.
 * @param {string} prompt - The full prompt to send to the model.
 * @param {boolean} [expectJson=true] - Whether the response should be parsed as JSON.
 * @returns {Promise<any>} - The result from the API, either as a parsed object or raw text.
 */
async function callGeminiApiWithRetries(prompt, expectJson = true) {
    // Retrieve the API key from session storage for security.
    const apiKey = sessionStorage.getItem('gemini_api_key');
    // Get the currently selected model ID from the dropdown.
    const modelId = modelSelect.value;
    // Construct the specific URL for the Gemini API's generateContent method.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
    // Set the required headers for Gemini API authentication.
    const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };

    /**
     * A function that creates the payload (request body) in the format
     * required by the Gemini API.
     * @param {string} p - The prompt text.
     * @returns {object} The structured payload for the API request.
     */
    const getPayload = (p) => {
        const temperature = parseFloat(document.getElementById('temperature-slider').value);
        return {
            contents: [{ parts: [{ text: p }] }],
            generationConfig: { temperature }
        };
    };

    // Delegate the actual API call to the shared utility function.
    return callApi(prompt, expectJson, url, headers, getPayload);
}


/**
 * Fetches the list of available Gemini models from the API.
 * This allows the user to choose from the latest compatible models.
 */
async function fetchModels() {
    const apiKey = sessionStorage.getItem('gemini_api_key');
    const lang = document.documentElement.lang || 'pl';
    if (!apiKey) {
        alert(translations.api_key_alert[lang]);
        return;
    }

    const refreshIcon = document.getElementById('refresh-icon');

    // Disable the button and show a loading animation to provide user feedback.
    refreshModelsBtn.disabled = true;
    refreshIcon.classList.add('is-loading');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        const data = await response.json();

        // Filter the full model list to include only those that support the 'generateContent' method,
        // which is what this application uses.
        const supportedModels = data.models
            .filter(model => model.supportedGenerationMethods.includes('generateContent'))
            .map(model => ({
                id: model.name.replace('models/', ''), // Clean up the model ID.
                displayName: model.displayName
            }));

        populateModelsDropdown(supportedModels);

    } catch (error) {
        console.error("Fetch models error:", error);
        alert(translations.fetch_models_error[lang]);
        // If the fetch fails, populate with default models as a fallback.
        populateModelsDropdown();
    } finally {
        // Re-enable the button and remove the loading animation.
        refreshModelsBtn.disabled = false;
        refreshIcon.classList.remove('is-loading');
    }
}

/**
 * Populates the model selection dropdown with a list of models.
 * It combines a default list with any models fetched from the API.
 * @param {object[]} [models=[]] - An array of model objects from the API.
 */
function populateModelsDropdown(models = []) {
    // A hardcoded list of default/recommended models ensures the app is usable
    // even if the model fetching API fails or returns an empty list.
    const defaultModels = [
        { id: 'gemma-3-27b-it', displayName: 'Gemma 3 27B' },
        { id: 'gemini-2.5-flash-lite-preview-06-17', displayName: 'Gemini 2.5 Flash Lite' },
        { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' }
    ];

    // Combine default and fetched models, then remove duplicates.
    const allModels = [...defaultModels, ...models];
    const uniqueModels = allModels.filter((model, index, self) =>
        index === self.findIndex((m) => m.id === model.id)
    );

    // Retrieve the user's previously saved model choice to restore their selection.
    const savedSettings = localStorage.getItem('quizGameSettings_gemini');
    const savedModel = savedSettings ? JSON.parse(savedSettings).model : 'gemma-3-27b-it';

    modelSelect.innerHTML = ''; // Clear existing options.
    uniqueModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.displayName;
        if (model.id === savedModel) {
            option.selected = true;
        }
        modelSelect.appendChild(option);
    });
}

// --- GEMINI API ADAPTER OBJECT ---
// This object implements the standard interface required by the core game logic.
const geminiApiAdapter = {
    configErrorMsg: '',

    /**
     * Loads Gemini-specific settings when the application starts.
     */
    loadSettings() {
        // Initially populate the dropdown with default models.
        // A subsequent fetch can add more models.
        populateModelsDropdown();

        const savedSettings = localStorage.getItem('quizGameSettings_gemini');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            // Restore the user's last selected model.
            if (settings.model) modelSelect.value = settings.model;
        }
    },

    /**
     * Saves Gemini-specific settings to localStorage.
     */
    saveSettings() {
        localStorage.setItem('quizGameSettings_gemini', JSON.stringify({
            model: modelSelect.value,
        }));
    },

    /**
     * Checks if the adapter is properly configured to make API calls.
     * For Gemini, this means checking if an API key exists in session storage.
     * @returns {boolean} True if configured, false otherwise.
     */
    isConfigured() {
        const apiKey = sessionStorage.getItem('gemini_api_key');
        const lang = gameState.currentLanguage;
        this.configErrorMsg = translations.api_key_alert[lang];
        if (!apiKey) {
            // If the key is missing, the user cannot proceed.
            // Redirect them to the authentication page to enter a key.
            window.location.href = 'auth.html';
            return false;
        }
        return true;
    },

    /**
     * Generates a list of 6 quiz categories based on a theme.
     * @param {string} theme - The theme provided by the user (e.g., "Lord of the Rings").
     * @returns {Promise<string[]>} A promise that resolves to an array of 6 category names.
     */
    async generateCategories(theme) {
        const lang = gameState.currentLanguage;

        // Use a sophisticated prompt template that encourages chain-of-thought reasoning.
        const prompt = translations.batch_category_prompt_cot[lang]
            .replace('{theme}', theme);

        const response = await callGeminiApiWithRetries(prompt, true);

        // Validate the response structure to ensure it's usable.
        if (!response || !Array.isArray(response.categories) || response.categories.length < 6) {
            console.error("API did not return a valid array of 6 categories.", response);
            throw new Error("Failed to generate a complete set of categories.");
        }

        return response.categories.slice(0, 6);
    },

    /**
     * Generates a single quiz question for a given category.
     * This function dynamically constructs a detailed prompt using the current game state.
     * @param {string} category - The category for which to generate a question.
     * @returns {Promise<object>} A promise that resolves to the question object.
     */
    async generateQuestion(category) {
        const lang = gameState.currentLanguage;
        const languageName = lang === 'pl' ? 'polskim' : 'English';
        const promptStructure = translations.question_prompt[lang];

        // Retrieve the history of subtopics for this category to avoid repetition.
        let categoryHistory = gameState.categoryTopicHistory[category] || { subcategories: [], entities: [] };
        if (Array.isArray(categoryHistory)) {
            categoryHistory = { subcategories: categoryHistory, entities: [] };
        }
        const subcategoryHistory = [...(categoryHistory.subcategories || [])];
        const entityHistory = [...(categoryHistory.entities || [])];
        shuffleArray(subcategoryHistory);
        shuffleArray(entityHistory);

        const subcategoryHistoryPrompt = subcategoryHistory.length > 0 ? `"${subcategoryHistory.join('", "')}"` : "Brak historii.";
        const entityHistoryPrompt = entityHistory.length > 0 ? `"${entityHistory.join('", "')}"` : "Brak historii.";

        // Inject inspirational words to spur creativity.
        const inspirationalWords = [...translations.inspirational_words[lang]];
        shuffleArray(inspirationalWords);
        const twoInspirationalWords = inspirationalWords.slice(0, 2).join(', ');

        // Combine and shuffle context and rules for more varied model behavior.
        const shuffledContextAndRules = [...promptStructure.context_lines, ...promptStructure.rules];
        shuffleArray(shuffledContextAndRules);

        // Build the base prompt from structured parts.
        let basePrompt = [
            promptStructure.persona,
            promptStructure.chain_of_thought,
            promptStructure.context_header,
            ...shuffledContextAndRules,
            promptStructure.few_shot_example_header,
            promptStructure.few_shot_example,
            promptStructure.output_format
        ].join('\n');

        // Determine if a global theme should be part of the context.
        const themeContext = gameState.includeCategoryTheme && gameState.theme ? translations.main_theme_context_prompt[lang].replace('{theme}', gameState.theme) : "Brak dodatkowego motywu.";

        // Inject all dynamic values into the final prompt.
        const prompt = basePrompt
            .replace(/{category}/g, category)
            .replace(/{theme_context}/g, themeContext)
            .replace(/{knowledge_prompt}/g, translations.knowledge_prompts[gameState.knowledgeLevel][lang])
            .replace(/{game_mode_prompt}/g, translations.game_mode_prompts[gameState.gameMode][lang])
            .replace(/{subcategory_history_prompt}/g, subcategoryHistoryPrompt)
            .replace(/{entity_history_prompt}/g, entityHistoryPrompt)
            .replace(/{language_name}/g, languageName)
            .replace(/{inspirational_words}/g, twoInspirationalWords);

        const response = await callGeminiApiWithRetries(prompt, true);

        // --- Response Validation and Correction ---
        // This defensive code ensures the game doesn't break if the AI returns a flawed response.
        if (!response || typeof response.question !== 'string') {
            console.error("API response is not a valid question object.", response);
            throw new Error("Failed to generate question.");
        }

        // For multiple-choice questions, ensure the correct answer is actually present in the options list.
        // If not, randomly replace one of the options with the correct answer.
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
        const data = await callGeminiApiWithRetries(prompt, true);
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

        const theme = gameState.theme || "-";

        const existingCategoriesStr = `"${existingCategories.join('", "')}"`;

        const prompt = basePrompt
            .replace(/{old_category}/g, oldCategory)
            .replace(/{theme}/g, theme)
            .replace(/{existing_categories}/g, existingCategoriesStr);

        // Correctly call this adapter's specific API wrapper function.
        const data = await callGeminiApiWithRetries(prompt, true);

        return data.choices;
    }
};

// --- INITIALIZATION ---
// Set up event listeners for the Gemini-specific UI components.
modelSelect.addEventListener('change', geminiApiAdapter.saveSettings);
refreshModelsBtn.addEventListener('click', fetchModels);

// Initialize the main application, injecting this adapter as the API handler.
initializeApp(geminiApiAdapter);
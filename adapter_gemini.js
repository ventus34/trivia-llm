import { initializeApp, gameState, translations } from './game_core.js';

// --- ELEMENTY UI SPECIFICZNE DLA GEMINI ---
const geminiApiKeyInput = document.getElementById('gemini-api-key');
const modelSelect = document.getElementById('model-select');
const refreshModelsBtn = document.getElementById('refresh-models-btn');

/**
 * Wywołuje API Gemini z logiką ponawiania prób.
 * @param {string} prompt - Pełny prompt dla modelu.
 * @param {boolean} expectJson - Czy odpowiedź powinna być parsowana jako JSON.
 * @returns {Promise<any>} - Wynik z API.
 */
async function callGeminiApiWithRetries(prompt, expectJson = true) {
    const maxRetries = 3;
    const apiKey = geminiApiKeyInput.value.trim();
    const modelId = modelSelect.value;
    const temperature = parseFloat(document.getElementById('temperature-slider').value);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
    
    console.log('Gemini API Prompt:', prompt);
    console.log('Temperature:', temperature);

    for (let i = 0; i < maxRetries; i++) {
        try {
            const generationConfig = { temperature };
            if (expectJson && (modelId.startsWith('gemini') || modelId.startsWith('gemma-2'))) {
                generationConfig.response_mime_type = "application/json";
            }
            const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig };
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();
            console.log('Gemini API Response:', data);

            if (data.candidates && data.candidates[0].content?.parts?.[0]) {
                let content = data.candidates[0].content.parts[0].text;
                if (expectJson) {
                    try {
                        const firstBracket = content.indexOf('{');
                        const lastBracket = content.lastIndexOf('}');
                        if (firstBracket === -1 || lastBracket === -1) {
                            throw new Error("No JSON object found in the response.");
                        }
                        const jsonString = content.substring(firstBracket, lastBracket + 1);
                        return JSON.parse(jsonString);
                    } catch (e) {
                        console.error("JSON parsing error:", e, "Original content:", content);
                        throw new Error("Failed to parse JSON from API response.");
                    }
                }
                return content;
            } else {
                throw new Error("Invalid or empty response from API.");
            }
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) throw error;
        }
    }
}

/**
 * Pobiera listę dostępnych modeli Gemini.
 */
async function fetchModels() {
    const apiKey = geminiApiKeyInput.value.trim();
    const lang = document.documentElement.lang || 'pl';
    if (!apiKey) {
        alert(translations.api_key_alert[lang]);
        return;
    }

    const refreshIcon = document.getElementById('refresh-icon');
    const loadingSpinner = document.getElementById('loading-spinner');

    refreshModelsBtn.disabled = true;
    refreshIcon.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        const supportedModels = data.models
            .filter(model => model.supportedGenerationMethods.includes('generateContent'))
            .map(model => ({
                id: model.name.replace('models/', ''),
                displayName: model.displayName
            }));
        populateModelsDropdown(supportedModels);
    } catch (error) {
        console.error("Fetch models error:", error);
        alert(translations.fetch_models_error[lang]);
        populateModelsDropdown();
    } finally {
        refreshModelsBtn.disabled = false;
        refreshIcon.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
    }
}

/**
 * Wypełnia listę rozwijaną modelami.
 * @param {object[]} models - Lista modeli z API.
 */
function populateModelsDropdown(models = []) {
    const defaultModels = [
        { id: 'gemma-3-27b-it', displayName: 'Gemma 3 27B' },
        { id: 'gemini-2.5-flash-lite-preview-06-17', displayName: 'Gemini 2.5 Flash Lite' },
        { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' }
    ];

    const allModels = [...defaultModels, ...models];
    const uniqueModels = allModels.filter((model, index, self) =>
        index === self.findIndex((m) => m.id === model.id)
    );

    const savedModel = localStorage.getItem('quizGameSettings_gemini') ? JSON.parse(localStorage.getItem('quizGameSettings_gemini')).model : 'gemini-2.5-flash-latest';

    modelSelect.innerHTML = '';
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

// --- OBIEKT ADAPTERA API DLA GEMINI ---
const geminiApiAdapter = {
    configErrorMsg: '',

    isConfigured() {
        const apiKey = geminiApiKeyInput.value.trim();
        const lang = gameState.currentLanguage;
        this.configErrorMsg = translations.api_key_alert[lang];
        return !!apiKey;
    },
    
    saveSettings() {
        localStorage.setItem('quizGameSettings_gemini', JSON.stringify({
            apiKey: geminiApiKeyInput.value,
            model: modelSelect.value,
        }));
    },

    loadSettings() {
        populateModelsDropdown();
        const savedSettings = localStorage.getItem('quizGameSettings_gemini');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.apiKey) geminiApiKeyInput.value = settings.apiKey;
            if (settings.model) modelSelect.value = settings.model;
        }
    },

    async generateCategories(theme) {
        const lang = gameState.currentLanguage;
        const generatedCats = [];
        let attempts = 0;
        const maxAttempts = 15; 

        while (generatedCats.length < 6 && attempts < maxAttempts) {
            attempts++;
            const existingCategoriesStr = generatedCats.length > 0 ? `"${generatedCats.join('", "')}"` : "brak";

            // Używamy nowego, precyzyjnego promptu
            const prompt = translations.broad_single_category_prompt[lang]
                .replace('{theme}', theme)
                .replace('{existing_categories}', existingCategoriesStr);

            try {
                const response = await callGeminiApiWithRetries(prompt, true);
                if (response && response.category && !generatedCats.includes(response.category)) {
                    generatedCats.push(response.category);
                } else {
                    console.warn("Pominięto pustą lub zduplikowaną kategorię. Próbuję ponownie.");
                }
            } catch (error) {
                console.error(`Błąd podczas generowania kategorii #${generatedCats.length + 1}:`, error);
                throw new Error(`Failed to generate category #${generatedCats.length + 1}.`);
            }
        }

        if (generatedCats.length < 6) {
            console.error(`Wygenerowano tylko ${generatedCats.length} unikalnych kategorii po ${maxAttempts} próbach.`);
            throw new Error('Nie udało się wygenerować pełnego zestawu 6 unikalnych kategorii.');
        }

        return generatedCats;
    },

    async generateQuestion(category) {
        const lang = gameState.currentLanguage;
        // 1. Pobieramy tablicę szablonów
        const promptTemplates = translations.question_prompt[lang];
        // 2. Losujemy JEDEN szablon z tablicy
        const basePrompt = promptTemplates[Math.floor(Math.random() * promptTemplates.length)];
        
        const history = gameState.categoryTopicHistory[category] || [];
        const historyPrompt = history.length > 0 ? `"${history.join('", "')}"` : "Brak historii.";
        const themeContext = gameState.includeCategoryTheme && gameState.theme ? translations.main_theme_context_prompt[lang].replace('{theme}', gameState.theme) : "Brak dodatkowego motywu.";

        // 3. Wywołujemy .replace() na wylosowanym szablonie (stringu)
        const prompt = basePrompt
            .replace(/{category}/g, category)
            .replace(/{theme_context}/g, themeContext)
            .replace(/{knowledge_prompt}/g, translations.knowledge_prompts[gameState.knowledgeLevel][lang])
            .replace(/{game_mode_prompt}/g, translations.game_mode_prompts[gameState.gameMode][lang])
            .replace(/{history_prompt}/g, historyPrompt);

        const data = await callGeminiApiWithRetries(prompt, true);
        if (gameState.gameMode === 'mcq' && (!data.options || !data.options.some(opt => opt.toLowerCase() === data.answer.toLowerCase()))) {
            data.options[Math.floor(Math.random() * data.options.length)] = data.answer;
        }
        return data;
    },

    async getIncorrectAnswerExplanation() {
        const lang = gameState.currentLanguage;
        const prompt = translations.incorrect_answer_explanation_prompt[lang]
            .replace('{question}', gameState.currentQuestionData.question)
            .replace('{correct_answer}', gameState.currentQuestionData.answer)
            .replace('{player_answer}', gameState.currentPlayerAnswer);
        const data = await callGeminiApiWithRetries(prompt, true);
        return data.explanation;
    },

    async getCategoryMutationChoices(oldCategory) {
        const lang = gameState.currentLanguage;
        // LOSOWANIE SZABLONU
        const promptTemplates = translations.category_mutation_prompt[lang];
        const basePrompt = promptTemplates[Math.floor(Math.random() * promptTemplates.length)];

        const theme = gameState.theme || translations.default_categories[lang]; 
        const otherCategories = gameState.categories.filter(c => c !== oldCategory);
        const existingCategoriesStr = `"${otherCategories.join('", "')}"`;

        const prompt = basePrompt
            .replace(/{old_category}/g, oldCategory)
            .replace(/{theme}/g, theme)
            .replace(/{existing_categories}/g, existingCategoriesStr);
            
        const data = await callGeminiApiWithRetries(prompt, true);
        return data.choices;
    }
};

// --- INICJALIZACJA ---
geminiApiKeyInput.addEventListener('input', geminiApiAdapter.saveSettings);
modelSelect.addEventListener('change', geminiApiAdapter.saveSettings);
refreshModelsBtn.addEventListener('click', fetchModels);

initializeApp(geminiApiAdapter);

import { initializeApp, gameState, translations } from './game_core.js';

// --- ELEMENTY UI SPECIFICZNE DLA GEMINI ---
const geminiApiKeyInput = document.getElementById('gemini-api-key');
const modelSelect = document.getElementById('model-select');
const refreshModelsBtn = document.getElementById('refresh-models-btn');

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function callApi(prompt, expectJson = true, url, headers, getPayload) {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const payload = getPayload(prompt);
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            // Pobieramy całą treść odpowiedzi (może zawierać CoT i JSON)
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || data.choices?.[0]?.message?.content || '';

            if (!content) {
                throw new Error("Invalid or empty response from API.");
            }

            // Zapisujemy pełną odpowiedź (z CoT) do historii
            gameState.promptHistory.push({ prompt, response: content });

            if (expectJson) {
                // Nowa, niezawodna metoda ekstrakcji JSON
                const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*})/;
                const match = content.match(jsonRegex);

                if (!match) {
                    throw new Error("No JSON object found in the response string.");
                }
                
                // Bierzemy pierwszą pasującą grupę (albo z bloku ```json, albo ogólny {...})
                const jsonString = match[1] || match[2];
                return JSON.parse(jsonString);
            }

            return content; // Zwróć surowy tekst, jeśli nie oczekujemy JSON
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) throw error;
        }
    }
}

/**
 * Wywołuje API Gemini z logiką ponawiania prób.
 * @param {string} prompt - Pełny prompt dla modelu.
 * @param {boolean} expectJson - Czy odpowiedź powinna być parsowana jako JSON.
 * @returns {Promise<any>} - Wynik z API.
 */
async function callGeminiApiWithRetries(prompt, expectJson = true) {
    const apiKey = geminiApiKeyInput.value.trim();
    const modelId = modelSelect.value;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
    const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
    
    const getPayload = (p) => {
        const temperature = parseFloat(document.getElementById('temperature-slider').value);
        return { contents: [{ parts: [{ text: p }] }], generationConfig: { temperature } };
    };
    
    return callApi(prompt, expectJson, url, headers, getPayload);
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
        
        const prompt = translations.batch_category_prompt_cot[lang]
            .replace('{theme}', theme);

        const response = await callGeminiApiWithRetries(prompt, true);

        // Walidacja odpowiedzi
        if (!response || !Array.isArray(response.categories) || response.categories.length < 6) {
            console.error("API did not return a valid array of 6 categories.", response);
            throw new Error("Failed to generate a complete set of categories.");
        }

        // Zwracamy tablicę 6 kategorii
        return response.categories.slice(0, 6);
    },

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

        // Łączymy i tasujemy kontekst z regułami
        const shuffledContextAndRules = [...promptStructure.context_lines, ...promptStructure.rules];
        shuffleArray(shuffledContextAndRules);

        // Budujemy dynamiczny prompt
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

        const response = await callGeminiApiWithRetries(prompt, true);

        const chosenQuestion = response;

        if (!chosenQuestion || typeof chosenQuestion.question !== 'string') {
            console.error("API nie zwróciło prawidłowego obiektu pytania.", response);
            throw new Error("Nie udało się wygenerować pytania.");
        }

        if (gameState.gameMode === 'mcq' && (!chosenQuestion.options || !chosenQuestion.options.some(opt => opt.toLowerCase() === chosenQuestion.answer.toLowerCase()))) {
            if (!chosenQuestion.options) chosenQuestion.options = ["A", "B", "C", "D"];
            chosenQuestion.options[Math.floor(Math.random() * chosenQuestion.options.length)] = chosenQuestion.answer;
        }
        
        return chosenQuestion;
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
        const basePrompt = translations.category_mutation_prompt[lang];
    
        const theme = gameState.theme || "-"; 
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

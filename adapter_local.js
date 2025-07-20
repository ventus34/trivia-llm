import { initializeApp, gameState, translations } from './game_core.js';

// --- ELEMENTY UI SPECIFICZNE DLA LM STUDIO ---
const lmStudioUrlInput = document.getElementById('lmstudio-url-input');

/**
 * Wywołuje API serwera LM Studio z logiką ponawiania prób.
 * @param {string} prompt - Pełny prompt dla modelu.
 * @param {boolean} expectJson - Czy odpowiedź powinna być parsowana jako JSON.
 * @returns {Promise<any>} - Wynik z API.
 */
async function callLmStudioApi(prompt, expectJson = true) {
    const maxRetries = 3;
    const url = lmStudioUrlInput.value.trim();
    const temperature = parseFloat(document.getElementById('temperature-slider').value);
    
    console.log('LM Studio Prompt:', prompt);

    const payload = {
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        stream: false,
    };

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();
            console.log('LM Studio Response:', data);

            if (data.choices && data.choices[0].message?.content) {
                let content = data.choices[0].message.content;
                if (expectJson) {
                    try {
                        const firstBracket = content.indexOf('{');
                        const lastBracket = content.lastIndexOf('}');
                        if (firstBracket === -1 || lastBracket === -1) {
                            throw new Error("No JSON object found in the response string.");
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
                throw new Error("Invalid or empty response from LM Studio API.");
            }
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) throw error;
            await new Promise(res => setTimeout(res, 1000));
        }
    }
}

// --- OBIEKT ADAPTERA API DLA LM STUDIO ---
const localApiAdapter = {
    configErrorMsg: '',

    isConfigured() {
        const url = lmStudioUrlInput.value.trim();
        const lang = gameState.currentLanguage;
        this.configErrorMsg = translations.lm_studio_url_alert[lang];
        return !!url;
    },

    saveSettings() {
        localStorage.setItem('quizGameSettings_local', JSON.stringify({
            lmStudioUrl: lmStudioUrlInput.value,
        }));
    },

    loadSettings() {
        const savedSettings = localStorage.getItem('quizGameSettings_local');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.lmStudioUrl) lmStudioUrlInput.value = settings.lmStudioUrl;
        } else {
            lmStudioUrlInput.value = 'http://localhost:1234/v1/chat/completions';
        }
    },
    
    async generateCategories(theme) {
        const lang = gameState.currentLanguage;
        const prompt = translations.category_generation_prompt[lang]
            .replace('{theme}', theme)
            .replace('{existing_categories}', "brak")
            .replace('{random_id}', Math.floor(Math.random() * 1000000));
        const response = await callLmStudioApi(prompt, true);
        return response.categories;
    },

    async generateQuestion(category) {
        const lang = gameState.currentLanguage;
        const history = gameState.categoryTopicHistory[category] || [];
        const historyPrompt = history.length > 0 ? `"${history.join('", "')}"` : "Brak historii.";
        const themeContext = gameState.includeCategoryTheme && gameState.theme ? translations.main_theme_context_prompt[lang].replace('{theme}', gameState.theme) : "Brak dodatkowego motywu.";

        const prompt = translations.question_prompt[lang]
            .replace('{category}', category)
            .replace('{theme_context}', themeContext)
            .replace('{knowledge_prompt}', translations.knowledge_prompts[gameState.knowledgeLevel][lang])
            .replace('{game_mode_prompt}', translations.game_mode_prompts[gameState.gameMode][lang])
            .replace('{history_prompt}', historyPrompt)
            .replace('{random_id}', Math.floor(Math.random() * 1000000));

        const data = await callLmStudioApi(prompt, true);
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
        const data = await callLmStudioApi(prompt, true);
        return data.explanation;
    },

    async getCategoryMutationChoices(oldCategory) {
        const lang = gameState.currentLanguage;
        const prompt = translations.category_mutation_prompt[lang]
            .replace('{old_category}', oldCategory)
            .replace('{random_id}', Math.floor(Math.random() * 1000000));
        const data = await callLmStudioApi(prompt, true);
        return data.choices;
    }
};

// --- INICJALIZACJA ---
lmStudioUrlInput.addEventListener('input', localApiAdapter.saveSettings);

initializeApp(localApiAdapter);

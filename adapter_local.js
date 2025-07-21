import { initializeApp, gameState, translations } from './game_core.js';

// --- ELEMENTY UI SPECIFICZNE DLA LM STUDIO ---
const lmStudioUrlInput = document.getElementById('lmstudio-url-input');

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
 * Wywołuje API serwera LM Studio z logiką ponawiania prób.
 * @param {string} prompt - Pełny prompt dla modelu.
 * @param {boolean} expectJson - Czy odpowiedź powinna być parsowana jako JSON.
 * @returns {Promise<any>} - Wynik z API.
 */
async function callLmStudioApi(prompt, expectJson = true) {
    const url = lmStudioUrlInput.value.trim();
    const headers = { 'Content-Type': 'application/json' };

    const getPayload = (p) => {
        const temperature = parseFloat(document.getElementById('temperature-slider').value);
        return { messages: [{ role: 'user', content: p }], temperature: temperature, stream: false };
    };
    
    return callApi(prompt, expectJson, url, headers, getPayload);
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
                const response = await callLmStudioApi(prompt, true);
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

        const response = await callLmStudioApi(prompt, true);
        
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
        // Bez zmian
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
            
        const data = await callLmStudioApi(prompt, true);
        return data.choices;
    }
};

// --- INICJALIZACJA ---
lmStudioUrlInput.addEventListener('input', localApiAdapter.saveSettings);

initializeApp(localApiAdapter);

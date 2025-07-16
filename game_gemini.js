// --- ELEMENTY UI ---
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const winnerScreen = document.getElementById('winner-screen');
const langPlBtn = document.getElementById('lang-pl');
const langEnBtn = document.getElementById('lang-en');
const gameModeSelect = document.getElementById('game-mode');
const gameModeDescription = document.getElementById('game-mode-description');
const knowledgeLevelSelect = document.getElementById('knowledge-level');
const knowledgeLevelDescription = document.getElementById('knowledge-level-description');
const themeInput = document.getElementById('theme-input');
const generateCategoriesBtn = document.getElementById('generate-categories-btn');
const categoriesContainer = document.getElementById('categories-container');
const playerCountInput = document.getElementById('player-count');
const playerNamesContainer = document.getElementById('player-names-container');
const geminiApiKeyInput = document.getElementById('gemini-api-key');
const modelSelect = document.getElementById('model-select');
const temperatureSlider = document.getElementById('temperature-slider');
const temperatureValueSpan = document.getElementById('temperature-value');
const refreshModelsBtn = document.getElementById('refresh-models-btn');
const includeThemeToggle = document.getElementById('include-theme-toggle');
const mutateCategoriesToggle = document.getElementById('mutate-categories-toggle');
const startGameBtn = document.getElementById('start-game-btn');
const boardElement = document.getElementById('board');
const categoryLegend = document.getElementById('category-legend');
const currentPlayerNameSpan = document.getElementById('current-player-name');
const playerScoresContainer = document.getElementById('player-scores');
const diceResultDiv = document.getElementById('dice-result');
const diceElement = document.getElementById('dice');
const rollDiceBtn = document.getElementById('roll-dice-btn');
const gameMessageDiv = document.getElementById('game-message');
const questionModal = document.getElementById('question-modal');
const modalContent = document.getElementById('modal-content');
const questionCategoryH3 = document.getElementById('question-category');
const regenerateQuestionBtn = document.getElementById('regenerate-question-btn');
const questionContent = document.getElementById('question-content');
const questionTextP = document.getElementById('question-text');
const mcqOptionsContainer = document.getElementById('mcq-options-container');
const answerSection = document.getElementById('answer-section');
const answerInput = document.getElementById('answer-input');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const llmLoader = document.getElementById('llm-loader');
const categoryChoiceModal = document.getElementById('category-choice-modal');
const categoryChoiceButtons = document.getElementById('category-choice-buttons');
const answerPopup = document.getElementById('answer-popup');
const answerPopupContent = document.getElementById('answer-popup-content');
const answerPopupTitle = document.getElementById('answer-popup-title');
const playerAnswerText = document.getElementById('player-answer-text');
const correctAnswerContainer = document.getElementById('correct-answer-container');
const correctAnswerText = document.getElementById('correct-answer-text');
const explanationContainer = document.getElementById('explanation-container');
const explanationText = document.getElementById('explanation-text');
const incorrectExplanationContainer = document.getElementById('incorrect-explanation-container');
const incorrectExplanationText = document.getElementById('incorrect-explanation-text');
const incorrectExplanationLoader = document.getElementById('incorrect-explanation-loader');
const manualVerificationButtons = document.getElementById('manual-verification-buttons');
const postVerificationButtons = document.getElementById('post-verification-buttons');
const acceptAnswerBtn = document.getElementById('accept-answer-btn');
const rejectAnswerBtn = document.getElementById('reject-answer-btn');
const popupRegenerateBtn = document.getElementById('popup-regenerate-btn');
const closePopupBtn = document.getElementById('close-popup-btn');
const winnerNameSpan = document.getElementById('winner-name');
const playAgainBtn = document.getElementById('play-again-btn');
const notificationContainer = document.getElementById('notification-container');

// --- STAN GRY I TŁUMACZENIA ---
let gameState = { currentLanguage: 'pl' };
const EMOJI_OPTIONS = ['😀', '🚀', '🦄', '🤖', '🦊', '🧙', '👽', '👾', '👻', '👑', '💎', '🍕', '🍔', '⚽️', '🏀', '🎸', '🎨', '🎭', '🎬', '🎤', '🎮', '💻', '💡', '🧪', '🌍', '🏛️', '🏰', '🗿', '🛸'];
const translations = {
    setup_title: { pl: "Ustawienia Zaawansowane", en: "Advanced Settings" },
    gemini_api_key_label: { pl: "Klucz API Google Gemini:", en: "Google Gemini API Key:" },
    model_label: { pl: "Model Językowy:", en: "Language Model:" },
    temperature_label: { pl: "Temperatura:", en: "Temperature:" },
    refresh_models_title: { pl: "Odśwież listę modeli", en: "Refresh model list" },
    gemini_api_key_placeholder: { pl: "Wklej swój klucz API", en: "Paste your API key" },
    api_key_alert: { pl: "Proszę podać klucz API Gemini.", en: "Please provide a Gemini API key." },
    game_mode_label: { pl: "Tryb Gry:", en: "Game Mode:" },
    game_mode_mcq: { pl: "Pytania zamknięte", en: "Single Choice" },
    game_mode_short: { pl: "Pytania otwarte (krótkie)", en: "Open-ended (short)" },
    game_mode_desc_mcq: { pl: "Klasyczne pytania z jedną poprawną odpowiedzią.", en: "Classic questions with a single correct answer." },
    game_mode_desc_short_answer: { pl: "Odpowiedzi składające się z 1-3 słów.", en: "Answers consisting of 1-3 words." },
    knowledge_level_label: { pl: "Poziom Wiedzy:", en: "Knowledge Level:" },
    knowledge_level_basic: { pl: "Podstawowy", en: "Basic" },
    knowledge_level_intermediate: { pl: "Średniozaawansowany", en: "Intermediate" },
    knowledge_level_expert: { pl: "Ekspercki", en: "Expert" },
    knowledge_desc_basic: { pl: "Pytania z wiedzy ogólnej.", en: "General knowledge questions." },
    knowledge_desc_intermediate: { pl: "Pytania dla znających temat.", en: "Questions for those familiar with the topic." },
    knowledge_desc_expert: { pl: "Pytania dla prawdziwych ekspertów.", en: "Questions for true experts." },
    category_theme_label: { pl: "Temat do generacji kategorii (opcjonalnie)", en: "Category Generation Theme (optional)" },
    category_theme_placeholder: { pl: "Wpisz motyw, np. Władca Pierścieni", en: "Enter a theme, e.g., Lord of the Rings" },
    include_theme_label: { pl: "Dodaj temat generacji do pytań", en: "Add generation theme to questions" },
    mutate_categories_label: { pl: "Mutacja kategorii po zdobyciu punktu", en: "Mutate category after scoring" },
    category_generator_btn: { pl: "Generuj", en: "Generate" },
    categories_label: { pl: "Kategorie", en: "Categories" },
    default_categories: { pl: "Historia, Geografia, Nauka, Sztuka, Sport, Rozrywka", en: "History, Geography, Science, Art, Sports, Entertainment" },
    players_label: { pl: "Gracze", en: "Players" },
    player_count_label: { pl: "Liczba:", en: "Count:" },
    player_name_placeholder: { pl: "Imię Gracza {i}", en: "Player {i}'s Name" },
    start_game_btn: { pl: "Rozpocznij Grę", en: "Start Game" },
    min_categories_alert: { pl: "Wszystkie 6 pól kategorii musi być wypełnione.", en: "All 6 category fields must be filled." },
    player_turn: { pl: "Tura Gracza", en: "Player's Turn" },
    roll_to_start: { pl: "Rzuć kostką, aby rozpocząć!", en: "Roll the dice to start!" },
    roll_dice_btn: { pl: "Rzuć Kostką", en: "Roll Dice" },
    choose_move: { pl: "Wybierz pole, na które chcesz się przesunąć.", en: "Choose a square to move to." },
    dice_roll_result: { pl: "Wyrzucono: {roll}", en: "You rolled: {roll}" },
    category_title: { pl: "Kategoria: {category}", en: "Category: {category}" },
    regenerate_question_btn: { pl: "Nowe pytanie", en: "New Question" },
    choose_category_title: { pl: "Wybierz kategorię", en: "Choose a Category" },
    generating_question: { pl: "Generuję pytanie...", en: "Generating question..." },
    generating_categories: { pl: "Generuję kategorie...", en: "Generating categories..." },
    question_generation_error: { pl: "Nie udało się wygenerować pytania. Sprawdź konsolę, by poznać szczegóły.", en: "Failed to generate a question. Check console for details." },
    answer_placeholder: { pl: "Wpisz swoją odpowiedź...", en: "Type your answer here..." },
    submit_answer_btn: { pl: "Zatwierdź Odpowiedź", en: "Submit Answer" },
    empty_answer_error: { pl: "Proszę wpisać odpowiedź.", en: "Please enter an answer." },
    answer_evaluation: { pl: "Oceń odpowiedź", en: "Evaluate Answer" },
    player_answer_was: { pl: "Odpowiedź gracza:", en: "Player's answer:"},
    correct_answer_is: { pl: "Poprawna odpowiedź:", en: "Correct answer:"},
    explanation: { pl: "Wyjaśnienie poprawnej odpowiedzi:", en: "Explanation of the correct answer:" },
    your_answer_explanation: { pl: "Uzasadnienie Twojego błędu:", en: "Reasoning for your error:" },
    incorrect_answer_analysis_error: { pl: "Nie udało się przeanalizować odpowiedzi.", en: "Failed to analyze the answer." },
    accept_answer: { pl: "Poprawna", en: "Correct" },
    reject_answer: { pl: "Niepoprawna", en: "Incorrect" },
    verification_error: { pl: "Błąd weryfikacji.", en: "Verification error." },
    close_popup_btn: { pl: "Zamknij", en: "Close" },
    next_turn_btn: { pl: "Dalej", en: "Continue" },
    congratulations: { pl: "Gratulacje!", en: "Congratulations!" },
    winner_is: { pl: "Zwycięzcą jest", en: "The winner is" },
    play_again_btn: { pl: "Zagraj Ponownie", en: "Play Again" },
    category_generation_prompt: {
        pl: `Jesteś kreatywnym mistrzem gry. Twoim zadaniem jest stworzenie zestawu 6 świeżych i unikalnych kategorii do quizu na podstawie motywu: "{theme}".

     Kryteria:
    1.  **Zwięzłość**: Każda nazwa kategorii musi zawierać od jednego do trzech słów. Preferuj jedno słowo, o ile pozwala precyzyjnie określić temat.
    2.  **Różnorodność**: Unikaj generowania kategorii, które już istnieją.
    
    Istniejące kategorie, których należy unikać: {existing_categories}

    ID sesji losowej (dla zapewnienia unikalności): {random_id}

    Zwróć odpowiedź WYŁĄCZNIE jako obiekt JSON z jednym kluczem "categories". Przykład: {"categories": ["A", "B", "C", "D", "E", "F"]}`,
        en: `You are a creative game master. Your task is to create a set of 6 fresh and unique quiz categories based on the theme: "{theme}".

    Criteria:
    1.  **Brevity**: Each category name must contain from one to three words. Prefer one word, as long as it allows to precisely define topic.
    2.  **Variety**: Avoid generating categories that already exist.
    
    
    Existing categories to avoid: {existing_categories}

    Random Session ID (to ensure uniqueness): {random_id}

    Return the response ONLY as a JSON object with a single key "categories". Example: {"categories": ["A", "B", "C", "D", "E", "F"]}`
    },
    question_prompt: {
        pl: `Jesteś ekspertem w tworzeniu angażujących pytań do quizów. Twoim zadaniem jest stworzenie pytania, które jest precyzyjne, unikalne i stanowi wyzwanie.
        
        KROK 1: Analiza.
        - Kategoria: "{category}"
        - Poziom trudności: {knowledge_prompt}
        - Tryb gry: {game_mode_prompt}
        - Kontekst tematyczny: {theme_context}
        - Historia słów kluczowych (unikać): {history_prompt}

        KROK 2: Generowanie.
        Stwórz pytanie, które spełnia powyższe kryteria. Pytanie NIE MOŻE być typu tak/nie i NIE MOŻE opierać się na subiektywnej opinii. Musi być jednoznaczne.
        
        KROK 3: Formatowanie.
        Zwróć odpowiedź jako pojedynczy obiekt JSON. Użyj następującej struktury:
        {
          "question": "Tekst pytania...",
          "answer": "Krótka, precyzyjna odpowiedź...",
          "explanation": "Zwięzłe wyjaśnienie (maks. 50 słów), dlaczego odpowiedź jest poprawna, dostarczające wartości edukacyjnej.",
          "keywords": ["słowo kluczowe 1", "słowo kluczowe 2"],
          "options": ["opcja A", "opcja B", "opcja C", "opcja D"]
        }

        WAŻNE:
        - Klucz "keywords" musi zawierać 2-3 słowa kluczowe identyfikujące główny temat pytania, aby uniknąć powtórzeń w przyszłości.
        - Klucz "options" dołącz TYLKO, jeśli tryb gry to MCQ. Jedna z opcji MUSI być identyczna z wartością w kluczu "answer". Dystraktory powinny być prawdopodobne, ale błędne.
        - ID losowe (dla unikalności): {random_id}`,
        en: `You are an expert in creating engaging quiz questions. Your task is to create a question that is precise, unique, and challenging.

        STEP 1: Analysis.
        - Category: "{category}"
        - Difficulty Level: {knowledge_prompt}
        - Game Mode: {game_mode_prompt}
        - Thematic Context: {theme_context}
        - Keyword History (to avoid): {history_prompt}

        STEP 2: Generation.
        Create a question that meets the above criteria. The question CANNOT be a yes/no question and CANNOT be based on subjective opinion. It must be unambiguous.

        STEP 3: Formatting.
        Return the response as a single JSON object. Use the following structure:
        {
          "question": "Question text...",
          "answer": "Short, precise answer...",
          "explanation": "A concise explanation (max 50 words) of why the answer is correct, providing educational value.",
          "keywords": ["keyword 1", "keyword 2"],
          "options": ["option A", "option B", "option C", "option D"]
        }

        IMPORTANT:
        - The "keywords" key must contain 2-3 keywords identifying the main topic of the question to avoid future repetitions.
        - Include the "options" key ONLY if the game mode is MCQ. One of the options MUST be identical to the value in the "answer" key. Distractors should be plausible but incorrect.
        - Random ID (for uniqueness): {random_id}`
    },
    incorrect_answer_explanation_prompt: {
        pl: `Jesteś pomocnym nauczycielem w grze quizowej. Gracz właśnie odpowiedział niepoprawnie. Twoim zadaniem jest wyjaśnienie mu, dlaczego jego odpowiedź była błędna. Bądź zwięzły, empatyczny i edukacyjny.

Kontekst:
- Pytanie: "{question}"
- Poprawna odpowiedź: "{correct_answer}"
- Błędna odpowiedź gracza: "{player_answer}"

Zadanie:
Napisz krótkie (1-2 zdania) wyjaśnienie, dlaczego odpowiedź gracza jest niepoprawna. Skup się na błędzie w rozumowaniu gracza lub wskaż kluczową różnicę.

Przykład:
Pytanie: "Jaka jest stolica Australii?"
Poprawna odpowiedź: "Canberra"
Błędna odpowiedź gracza: "Sydney"
Wyjaśnienie: "Sydney jest największym i najbardziej znanym miastem w Australii, ale to Canberra pełni funkcję stolicy administracyjnej kraju."

Zwróć odpowiedź jako obiekt JSON w formacie: {"explanation": "Twoje wyjaśnienie..."}`,
        en: `You are a helpful teacher in a quiz game. A player has just answered incorrectly. Your task is to explain to them why their answer was wrong. Be concise, empathetic, and educational.

Context:
- Question: "{question}"
- Correct answer: "{correct_answer}"
- Player's incorrect answer: "{player_answer}"

Task:
Write a short (1-2 sentences) explanation for why the player's answer is incorrect. Focus on the player's reasoning error or point out the key difference.

Example:
Question: "What is the capital of Australia?"
Correct Answer: "Canberra"
Player's Incorrect Answer: "Sydney"
Explanation: "Sydney is the largest and most famous city in Australia, but Canberra serves as the country's administrative capital."

Return the response as a JSON object in the format: {"explanation": "Your explanation..."}`
    },
    main_theme_context_prompt: {
        pl: "Pytanie musi dotyczyć motywu: {theme}.",
        en: "The question must relate to the theme: {theme}."
    },
    knowledge_prompts: {
        basic: { pl: "Podstawowy. Pytanie powinno dotyczyć powszechnie znanych faktów.", en: "Basic. The question should be about commonly known facts." },
        intermediate: { pl: "Średniozaawansowany. Trudniejsze niż wiedza ogólna, ale nie specjalistyczne.", en: "Intermediate. More difficult than common knowledge, but not specialized." },
        expert: { pl: "Ekspercki. Dotyczące mniej znanych faktów, dla znawców tematu.", en: "Expert. Concerning lesser-known facts, for connoisseurs of the subject." }
    },
    game_mode_prompts: {
        mcq: { pl: "Pytanie jednokrotnego wyboru (MCQ).", en: "Single Choice Question (MCQ)." },
        short_answer: { pl: "Pytanie otwarte z krótką odpowiedzią (1-3 słowa).", en: "Open-ended question with a short answer (1-3 words)." },
    },
    question_history_prompt: {
        pl: `"{topics}"`,
        en: `"{topics}"`
    },
    category_mutation_prompt: {
        pl: `Jesteś kreatywnym mistrzem gry. Kategoria "{old_category}" została opanowana. Twoim zadaniem jest wygenerowanie JEDNEJ, nowej, powiązanej tematycznie, ale wyraźnie innej kategorii. Unikaj prostych synonimów. ID sesji: {random_id}. Zwróć TYLKO i WYŁĄCZNIE obiekt JSON w formacie {"new_category": "Nazwa nowej kategorii"}. Nie dodawaj żadnych innych słów ani formatowania markdown.`,
        en: `You are a creative game master. The category "{old_category}" has been mastered. Your task is to generate ONE, new, thematically related, but distinctly different category. Avoid simple synonyms. Session ID: {random_id}. Return ONLY and EXCLUSIVELY a JSON object in the format {"new_category": "New category name"}. Do not add any other words or markdown formatting.`
    },
    api_error: { pl: "Błąd API", en: "API Error" },
    fetch_models_error: { pl: "Nie udało się pobrać listy modeli. Sprawdź klucz API i spróbuj ponownie.", en: "Failed to fetch model list. Check your API key and try again." },
    generate_categories_error: { pl: "Nie udało się wygenerować kategorii. Sprawdź klucz API i spróbuj ponownie.", en: "Failed to generate categories. Check your API key and try again." },
    category_mutated: { pl: "Kategoria zmutowała!", en: "Category has mutated!" },
    new_category_msg: { pl: '"{old_cat}" zmienia się w "{new_cat}"!', en: '"{old_cat}" changes into "{new_cat}"!' }
};

const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#84cc16', '#eab308', '#06b6d4', '#6366f1'];
const CATEGORY_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#facc15'];
const SQUARE_TYPES = { HQ: 'HEADQUARTERS', SPOKE: 'SPOKE', RING: 'RING', HUB: 'HUB', ROLL_AGAIN: 'ROLL_AGAIN' };

// --- LOGIKA GRY ---

function showNotification(message, type = 'info', duration = 5000) {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;

    const iconContainer = document.createElement('div');
    iconContainer.className = 'flex-shrink-0';

    let iconSvg = '';
    if (type === 'error') iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    else if (type === 'success') iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    else iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

    iconContainer.innerHTML = iconSvg;

    const textContainer = document.createElement('div');
    textContainer.innerHTML = `<p class="text-sm font-medium text-gray-900">${message.title}</p><p class="text-sm text-gray-500">${message.body}</p>`;

    notif.appendChild(iconContainer);
    notif.appendChild(textContainer);

    notificationContainer.appendChild(notif);

    setTimeout(() => {
        notif.classList.add('show');
    }, 10);

    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 500);
    }, duration);
}

function setLanguage(lang) {
    gameState.currentLanguage = lang;
    document.documentElement.lang = lang;
    langPlBtn.classList.toggle('active', lang === 'pl');
    langEnBtn.classList.toggle('active', lang === 'en');
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (translations[key] && translations[key][lang]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if(el.placeholder) el.placeholder = translations[key][lang];
            } else if (el.tagName === 'OPTION' || el.tagName === 'BUTTON') {
                el.textContent = translations[key][lang];
            } else {
                el.innerHTML = translations[key][lang];
            }
        }
    });
    geminiApiKeyInput.placeholder = translations.gemini_api_key_placeholder[lang];
    regenerateQuestionBtn.title = translations.regenerate_question_btn[lang];
    refreshModelsBtn.title = translations.refresh_models_title[lang];
    updateCategoryInputs(translations.default_categories[lang].split(', '));
    updatePlayerNameInputs();
    updateDescriptions();
}

function saveSettings() {
    localStorage.setItem('quizGameSettings', JSON.stringify({
        apiKey: geminiApiKeyInput.value,
        model: modelSelect.value,
        temperature: temperatureSlider.value,
        includeTheme: includeThemeToggle.checked,
        mutateCategories: mutateCategoriesToggle.checked
    }));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('quizGameSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.apiKey) geminiApiKeyInput.value = settings.apiKey;
        if (settings.model && [...modelSelect.options].some(opt => opt.value === settings.model)) {
            modelSelect.value = settings.model;
        }
        if (settings.temperature) {
            temperatureSlider.value = settings.temperature;
            temperatureValueSpan.textContent = parseFloat(settings.temperature).toFixed(1);
            temperatureSlider.style.setProperty('--thumb-color', `hsl(${(1 - settings.temperature / 2) * 240}, 70%, 50%)`);
        }
        if (settings.includeTheme) includeThemeToggle.checked = settings.includeTheme;
        if (settings.mutateCategories) mutateCategoriesToggle.checked = settings.mutateCategories;
    }
}

function populateModelsDropdown(models = []) {
    const preferredDefaultModel = 'gemma-3-27b-it';
    const defaultModels = [
        { id: 'gemini-2.5-flash-latest', displayName: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro-latest', displayName: 'Gemini 2.5 Pro' },
        { id: 'gemma-3-27b-it', displayName: 'Gemma 3 27B' }
    ];

    const allModels = [...defaultModels, ...models];
    const uniqueModels = allModels.filter((model, index, self) =>
        index === self.findIndex((m) => m.id === model.id)
    );


    const savedModel = localStorage.getItem('quizGameSettings') ? JSON.parse(localStorage.getItem('quizGameSettings')).model : 'gemini-1.5-flash-latest';

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

async function fetchModels() {
    const apiKey = geminiApiKeyInput.value.trim();
    if (!apiKey) {
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: translations.api_key_alert[gameState.currentLanguage] }, 'error');
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
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: translations.fetch_models_error[gameState.currentLanguage] }, 'error');
        populateModelsDropdown();
    } finally {
        refreshModelsBtn.disabled = false;
        refreshIcon.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
    }
}

function updateDescriptions() {
    const lang = gameState.currentLanguage;
    gameModeDescription.textContent = translations[`game_mode_desc_${gameModeSelect.value}`][lang];
    knowledgeLevelDescription.textContent = translations[`knowledge_desc_${knowledgeLevelSelect.value}`][lang];
}

function updateCategoryInputs(cats) {
    categoriesContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'category-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm';
        input.value = cats[i] || '';
        input.style.borderLeft = `5px solid ${CATEGORY_COLORS[i]}`;
        categoriesContainer.appendChild(input);
    }
}

async function generateCategories() {
    const theme = themeInput.value.trim();
    if (!theme) return;

    const apiKey = geminiApiKeyInput.value.trim();
    if (!apiKey) {
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: translations.api_key_alert[gameState.currentLanguage] }, 'error');
        return;
    }

    const originalBtnText = generateCategoriesBtn.textContent;
    generateCategoriesBtn.textContent = translations.generating_categories[gameState.currentLanguage];
    generateCategoriesBtn.disabled = true;

    let defaultCategories = translations.default_categories[gameState.currentLanguage].split(', ');
    const existingCategories = Array.from(document.querySelectorAll('#categories-container .category-input'))
        .map(input => input.value.trim())
        .filter(c => c !== '')
        .filter(c => !defaultCategories.includes(c));
    const existingCategoriesPrompt = existingCategories.length > 0 ? `"${existingCategories.join('", "')}"` : "brak";

    try {
        const randomId = Math.floor(Math.random() * 1000000);
        const prompt = translations.category_generation_prompt[gameState.currentLanguage]
            .replace('{theme}', theme)
            .replace('{existing_categories}', existingCategoriesPrompt)
            .replace('{random_id}', randomId);

        const temperature = parseFloat(temperatureSlider.value);
        const response = await callLmStudioApi(lmStudioUrl, temperature, prompt, true);
        const generatedCats = response.categories;

        if (Array.isArray(generatedCats) && generatedCats.length >= 6) {
            // KLUCZOWA ZMIANA: Zapisz nowo wygenerowane kategorie do globalnej historii
            const categoriesToSave = generatedCats.slice(0, 6);
            const currentHistory = JSON.parse(localStorage.getItem('globalQuizHistory')) || {};
            categoriesToSave.forEach(cat => {
                if (!currentHistory[cat]) {
                    currentHistory[cat] = []; // Inicjalizuj z pustą historią słów kluczowych
                }
            });
            localStorage.setItem('globalQuizHistory', JSON.stringify(currentHistory));

            updateCategoryInputs(categoriesToSave);
        } else {
            throw new Error("Invalid format received from Gemini.");
        }
    } catch (error) {
        console.error("Category generation error:", error);
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: translations.generate_categories_error[gameState.currentLanguage] }, 'error');
    } finally {
        generateCategoriesBtn.textContent = originalBtnText;
        generateCategoriesBtn.disabled = false;
    }
}

function createBoardLayout() {
    const layout = [];
    const center = 50;
    const armLength = 5;
    const radii = [0, 10, 18, 26, 34, 42, 50];

    layout.push({ id: 0, type: SQUARE_TYPES.HUB, categoryIndex: null, pos: { x: center, y: center }, connections: [] });

    let id = 1;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * 2 * Math.PI;
        const spokeCategoryPattern = [(i + 1) % 6, (i + 2) % 6, (i + 3) % 6, (i + 4) % 6, (i + 5) % 6];
        for (let j = 1; j <= armLength; j++) {
            const x = center + radii[j] * Math.cos(angle);
            const y = center + radii[j] * Math.sin(angle);
            layout.push({ id: id, type: SQUARE_TYPES.SPOKE, categoryIndex: spokeCategoryPattern[j - 1], pos: { x, y }, connections: [] });
            id++;
        }
        const x = center + radii[armLength + 1] * Math.cos(angle);
        const y = center + radii[armLength + 1] * Math.sin(angle);
        layout.push({ id: id, type: SQUARE_TYPES.HQ, categoryIndex: i, pos: { x, y }, connections: [] });
        id++;
    }

    const ringStartId = id;
    const ringSquareCountPerSegment = 6;
    for (let i = 0; i < 6; i++) {
        const segmentCategoryPattern = [(i + 2) % 6, (i + 3) % 6, (i + 4) % 6, (i + 5) % 6, i % 6, (i+1)%6];
        for (let j = 0; j < ringSquareCountPerSegment; j++) {
            const type = (j === 2) ? SQUARE_TYPES.ROLL_AGAIN : SQUARE_TYPES.RING;
            const categoryIndex = type === SQUARE_TYPES.RING ? segmentCategoryPattern[j] : null;
            layout.push({ id: id++, type, categoryIndex, pos: {}, connections: [] });
        }
    }

    for (let i = 0; i < 6; i++) {
        const spokeStartId = 1 + i * (armLength + 1);
        layout[0].connections.push(spokeStartId);
        layout[spokeStartId].connections.push(0);
        for (let j = 0; j < armLength - 1; j++) {
            const currentId = spokeStartId + j;
            const nextId = spokeStartId + j + 1;
            layout[currentId].connections.push(nextId);
            layout[nextId].connections.push(currentId);
        }
        const lastSpokeId = spokeStartId + armLength - 1;
        const hqId = spokeStartId + armLength;
        layout[lastSpokeId].connections.push(hqId);
        layout[hqId].connections.push(lastSpokeId);
    }

    const hqRadius = radii[armLength + 1];
    for (let i = 0; i < 6; i++) {
        const hq1 = layout.find(s => s.type === SQUARE_TYPES.HQ && s.categoryIndex === i);
        const hq2 = layout.find(s => s.type === SQUARE_TYPES.HQ && s.categoryIndex === (i + 1) % 6);
        const angle1 = Math.atan2(hq1.pos.y - center, hq1.pos.x - center);
        let angle2 = Math.atan2(hq2.pos.y - center, hq2.pos.x - center);
        if (angle2 < angle1) angle2 += 2 * Math.PI;

        const segmentStartIndex = ringStartId + i * ringSquareCountPerSegment;
        let previousId = hq1.id;

        for (let j = 0; j < ringSquareCountPerSegment; j++) {
            const currentSquare = layout[segmentStartIndex + j];
            const currentAngle = angle1 + ((angle2 - angle1) / (ringSquareCountPerSegment + 1)) * (j + 1);
            currentSquare.pos = { x: center + hqRadius * Math.cos(currentAngle), y: center + hqRadius * Math.sin(currentAngle) };

            currentSquare.connections.push(previousId);
            layout.find(s => s.id === previousId).connections.push(currentSquare.id);
            previousId = currentSquare.id;
        }
        layout.find(s => s.id === previousId).connections.push(hq2.id);
        hq2.connections.push(previousId);
    }
    gameState.board = layout;
}

function initializeGame() {
    const apiKey = geminiApiKeyInput.value.trim();
    if(!apiKey) {
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: translations.api_key_alert[gameState.currentLanguage] }, 'error');
        return;
    }

    const playerCount = parseInt(playerCountInput.value);
    const playerInputs = document.querySelectorAll('#player-names-container > .player-entry');
    const playerNames = Array.from(playerInputs).map(div => div.querySelector('.player-name-input').value || div.querySelector('.player-name-input').placeholder);
    const playerEmojis = Array.from(playerInputs).map(div => div.querySelector('.emoji-button').textContent);
    const categories = Array.from(document.querySelectorAll('#categories-container .category-input')).map(input => input.value.trim());

    if (categories.some(c => c === '')) {
        showNotification({ title: "Błąd ustawień", body: translations.min_categories_alert[gameState.currentLanguage] }, 'error');
        return;
    }

    gameState = {
        ...gameState,
        players: [],
        categories: categories,
        board: [],
        theme: themeInput.value.trim(),
        includeCategoryTheme: includeThemeToggle.checked,
        mutateCategories: mutateCategoriesToggle.checked,
        currentPlayerIndex: 0,
        isAwaitingMove: false,
        lastAnswerWasCorrect: false,
        gameMode: gameModeSelect.value,
        knowledgeLevel: knowledgeLevelSelect.value,
        geminiApiKey: apiKey,
        model: modelSelect.value,
        temperature: parseFloat(temperatureSlider.value),
        currentQuestionData: null,
        categoryTopicHistory: JSON.parse(localStorage.getItem('globalQuizHistory')) || {},
        possiblePaths: {}, // ZMIANA: Dodano do przechowywania możliwych ścieżek
    };

    gameState.categories.forEach(cat => {
        if (!gameState.categoryTopicHistory[cat]) {
            gameState.categoryTopicHistory[cat] = [];
        }
    });

    for (let i = 0; i < playerCount; i++) {
        gameState.players.push({
            name: playerNames[i],
            emoji: playerEmojis[i],
            position: 0,
            color: PLAYER_COLORS[i],
            wedges: []
        });
    }

    createBoardLayout();
    renderBoard();
    renderCategoryLegend();
    updateUI();
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}

function renderBoard() {
    boardElement.innerHTML = '';
    gameState.board.forEach(square => {
        const squareEl = document.createElement('div');
        squareEl.className = 'board-square';
        squareEl.id = `square-${square.id}`;
        squareEl.style.left = `calc(${square.pos.x}% - 3%)`;
        squareEl.style.top = `calc(${square.pos.y}% - 3%)`;

        const categoryColor = square.categoryIndex !== null ? CATEGORY_COLORS[square.categoryIndex] : '#f3f4f6';
        squareEl.style.backgroundColor = categoryColor;
        if (square.type === SQUARE_TYPES.HQ) {
            squareEl.style.transform = 'scale(1.4)';
            squareEl.style.borderRadius = '50%';
        }
        if (square.type === SQUARE_TYPES.ROLL_AGAIN) {
            squareEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 8h.01"></path><path d="M12 12h.01"></path><path d="M8 16h.01"></path></svg>`;
        }
        if (square.type === SQUARE_TYPES.HUB) {
            squareEl.style.transform = 'scale(1.2)';
            squareEl.style.background = 'radial-gradient(circle, #fff, #d1d5db)';
        }

        squareEl.addEventListener('click', () => handleSquareClick(square.id));
        boardElement.appendChild(squareEl);
    })
}

function renderCategoryLegend() {
    categoryLegend.innerHTML = '';
    gameState.categories.forEach((cat, i) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'flex items-center gap-2';
        legendItem.id = `legend-cat-${i}`;
        legendItem.innerHTML = `<div class="w-4 h-4 rounded-full" style="background-color: ${CATEGORY_COLORS[i]}"></div><span>${cat}</span>`;
        categoryLegend.appendChild(legendItem);
    });
}

function renderPlayerTokens() {
    document.querySelectorAll('.player-token').forEach(token => token.remove());
    gameState.players.forEach((player, playerIndex) => {
        const square = gameState.board.find(s => s.id === player.position);
        if (!square) return;

        const tokenEl = document.createElement('div');
        tokenEl.className = 'player-token';
        tokenEl.id = `token-${playerIndex}`;
        tokenEl.style.left = `calc(${square.pos.x}% - 1.75%)`;
        tokenEl.style.top = `calc(${square.pos.y}% - 1.75%)`;
        tokenEl.textContent = player.emoji;
        boardElement.appendChild(tokenEl);
    });
}

function updateUI() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    currentPlayerNameSpan.textContent = currentPlayer.name;
    currentPlayerNameSpan.style.color = currentPlayer.color;
    playerScoresContainer.innerHTML = '';
    gameState.players.forEach((player, playerIndex) => {
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'p-2 rounded-lg flex items-center justify-between';
        scoreDiv.style.border = `1px solid ${player.color}`;
        let wedgesHTML = '';
        gameState.categories.forEach((cat, i) => {
            const hasWedge = player.wedges.includes(cat);
            wedgesHTML += `<span class="category-wedge" style="background-color: ${hasWedge ? CATEGORY_COLORS[i] : '#e5e7eb'};" title="${cat}"></span>`;
        });
        scoreDiv.innerHTML = `<p class="font-semibold" style="color: ${player.color};">${player.emoji} ${player.name}</p><div>${wedgesHTML}</div>`;
        playerScoresContainer.appendChild(scoreDiv);
    });
    renderPlayerTokens();
}

function setDiceFace(roll) {
    const rotations = {
        1: 'rotateY(0deg) rotateX(0deg)', 2: 'rotateX(-90deg)', 3: 'rotateY(90deg)',
        4: 'rotateY(-90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)'
    };
    diceElement.style.transform = rotations[roll];
}

function rollDice() {
    if (gameState.isAwaitingMove) return;
    gameMessageDiv.textContent = '';
    const roll = Math.floor(Math.random() * 6) + 1;

    setDiceFace(roll);
    diceResultDiv.querySelector('span').textContent = translations.dice_roll_result[gameState.currentLanguage].replace('{roll}', roll);

    const player = gameState.players[gameState.currentPlayerIndex];
    const possiblePaths = findPossibleMoves(player.position, roll);
    gameState.possiblePaths = possiblePaths;

    const destinationIds = Object.keys(possiblePaths);

    if (destinationIds.length > 0) {
        gameState.isAwaitingMove = true;
        rollDiceBtn.disabled = true;
        rollDiceBtn.classList.add('opacity-50');
        gameMessageDiv.textContent = translations.choose_move[gameState.currentLanguage];
        destinationIds.forEach(id => document.getElementById(`square-${id}`).classList.add('highlighted-move'));
    } else {
        nextTurn();
    }
}

// ZMIANA: Funkcja zwraca teraz obiekt z pełnymi ścieżkami
function findPossibleMoves(startId, steps) {
    let queue = [[startId, [startId]]];
    const finalPaths = {};
    const visited = new Set();
    visited.add(startId.toString());

    while (queue.length > 0) {
        const [currentId, path] = queue.shift();

        if (path.length - 1 === steps) {
            finalPaths[currentId] = path;
            continue;
        }

        if (path.length - 1 > steps) continue;

        const currentSquare = gameState.board.find(s => s.id === currentId);
        for (const neighborId of currentSquare.connections) {
            // Pozwól na powrót, ale nie od razu na poprzednie pole
            if (path.length > 1 && neighborId === path[path.length - 2]) continue;

            const newPath = [...path, neighborId];
            queue.push([neighborId, newPath]);
        }
    }
    return finalPaths;
}

function promptCategoryChoice() {
    categoryChoiceButtons.innerHTML = '';
    gameState.categories.forEach((cat, index) => {
        const button = document.createElement('button');
        button.textContent = cat;
        button.className = 'w-full p-3 text-white font-semibold rounded-lg transition-transform hover:scale-105';
        button.style.backgroundColor = CATEGORY_COLORS[index];
        button.onclick = () => {
            categoryChoiceModal.classList.add('hidden');
            askQuestion(index);
        };
        categoryChoiceButtons.appendChild(button);
    });
    categoryChoiceModal.classList.remove('hidden');
}

// ZMIANA: Nowa funkcja do animacji pionka
async function animatePawnMovement(path) {
    const playerIndex = gameState.currentPlayerIndex;
    const tokenEl = document.getElementById(`token-${playerIndex}`);
    const animationDelay = 150; // ms

    for (const squareId of path) {
        const newSquare = gameState.board.find(s => s.id === squareId);
        tokenEl.style.left = `calc(${newSquare.pos.x}% - 1.75%)`;
        tokenEl.style.top = `calc(${newSquare.pos.y}% - 1.75%)`;
        await new Promise(resolve => setTimeout(resolve, animationDelay));
    }
}

// ZMIANA: Zmodyfikowano logikę kliknięcia na pole, aby używać animacji
async function handleSquareClick(squareId) {
    if (!gameState.isAwaitingMove) return;

    const path = gameState.possiblePaths[squareId];
    if (!path) return;

    document.querySelectorAll('.highlighted-move').forEach(el => el.classList.remove('highlighted-move'));
    gameState.isAwaitingMove = false;
    gameMessageDiv.textContent = '';

    await animatePawnMovement(path.slice(1)); // Animuj od drugiego pola

    const player = gameState.players[gameState.currentPlayerIndex];
    player.position = squareId;

    const landedSquare = gameState.board.find(s => s.id === squareId);
    if (landedSquare.type === SQUARE_TYPES.ROLL_AGAIN) {
        diceResultDiv.querySelector('span').textContent = 'Roll Again!';
        rollDiceBtn.disabled = false;
        rollDiceBtn.classList.remove('opacity-50');
    } else if (landedSquare.type === SQUARE_TYPES.HUB) {
        promptCategoryChoice();
    } else {
        askQuestion();
    }
}

function constructQuestionPrompt(category, lang) {
    const { knowledgeLevel, theme, includeCategoryTheme, gameMode, categoryTopicHistory } = gameState;
    const history = categoryTopicHistory[category] || [];
    const randomId = Math.floor(Math.random() * 1000000) + 1;

    let themeContext = includeCategoryTheme && theme ? translations.main_theme_context_prompt[lang].replace('{theme}', theme) : "Brak dodatkowego motywu.";

    let historyPrompt = history.length > 0 ? translations.question_history_prompt[lang].replace('{topics}', history.join('", "')) : "Brak historii.";

    let basePrompt = translations.question_prompt[lang]
        .replace('{category}', category)
        .replace('{theme_context}', themeContext)
        .replace('{knowledge_prompt}', translations.knowledge_prompts[knowledgeLevel][lang])
        .replace('{game_mode_prompt}', translations.game_mode_prompts[gameMode][lang])
        .replace('{history_prompt}', historyPrompt)
        .replace('{random_id}', randomId);

    return basePrompt;
}

async function askQuestion(forcedCategoryIndex = null) {
    gameState.currentForcedCategoryIndex = forcedCategoryIndex;
    const player = gameState.players[gameState.currentPlayerIndex];
    const square = gameState.board.find(s => s.id === player.position);
    const categoryIndex = forcedCategoryIndex !== null ? forcedCategoryIndex : square.categoryIndex;
    const category = gameState.categories[categoryIndex];
    const lang = gameState.currentLanguage;

    questionCategoryH3.textContent = translations.category_title[lang].replace('{category}', category);
    questionCategoryH3.style.color = CATEGORY_COLORS[categoryIndex];
    answerInput.value = '';

    showModal(true);
    llmLoader.classList.remove('hidden');
    questionContent.classList.add('hidden');
    mcqOptionsContainer.innerHTML = '';

    try {
        const prompt = constructQuestionPrompt(category, lang);
        const data = await callGeminiApiWithRetries(gameState.geminiApiKey, gameState.model, gameState.temperature, prompt, true);

        if (!data.question || !data.answer || !data.explanation || !data.keywords) {
            throw new Error("Invalid data structure from API.");
        }

        gameState.currentQuestionData = data;
        questionTextP.textContent = data.question;

        if (gameState.gameMode === 'mcq') {
            if (!data.options || data.options.length < 2) throw new Error("MCQ options missing from API response.");
            const correctAnswerExists = data.options.some(option => option.toLowerCase() === data.answer.toLowerCase());
            if (!correctAnswerExists) {
                data.options[Math.floor(Math.random() * data.options.length)] = data.answer;
            }
            answerSection.classList.add('hidden');
            mcqOptionsContainer.classList.remove('hidden');
            data.options.forEach(option => {
                const button = document.createElement('button');
                button.textContent = option;
                button.className = "w-full p-3 text-left bg-gray-100 hover:bg-indigo-100 rounded-lg transition-colors";
                button.onclick = () => handleMcqAnswer(option);
                mcqOptionsContainer.appendChild(button);
            });
        } else {
            answerSection.classList.remove('hidden');
            mcqOptionsContainer.classList.add('hidden');
            answerInput.focus();
        }
        questionContent.classList.remove('hidden');

    } catch (error) {
        console.error('Question generation error:', error);
        questionTextP.textContent = translations.question_generation_error[lang];
        questionContent.classList.remove('hidden');
        setTimeout(() => {
            hideModal();
            rollDiceBtn.disabled = false;
            rollDiceBtn.classList.remove('opacity-50');
            gameMessageDiv.textContent = 'Błąd, rzuć ponownie.';
        }, 3000);
    } finally {
        llmLoader.classList.add('hidden');
    }
}

function handleMcqAnswer(selectedOption) {
    hideModal();
    setTimeout(() => showManualVerificationPopup(selectedOption, gameState.currentQuestionData.answer), 300);
}

function handleOpenAnswer() {
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) {
        gameMessageDiv.textContent = translations.empty_answer_error[gameState.currentLanguage];
        return;
    }
    hideModal();
    setTimeout(() => showManualVerificationPopup(userAnswer, gameState.currentQuestionData.answer), 300);
}

function showManualVerificationPopup(playerAnswer, correctAnswer) {
    playerAnswerText.textContent = playerAnswer;
    correctAnswerText.textContent = correctAnswer;
    gameState.currentPlayerAnswer = playerAnswer;

    explanationContainer.classList.add('hidden');
    incorrectExplanationContainer.classList.add('hidden');
    incorrectExplanationText.textContent = '';

    explanationText.textContent = gameState.currentQuestionData.explanation;
    manualVerificationButtons.classList.remove('hidden');
    postVerificationButtons.classList.add('hidden');
    answerPopupTitle.textContent = translations.answer_evaluation[gameState.currentLanguage];

    showAnswerPopup();
}

async function getIncorrectAnswerExplanation() {
    const { currentQuestionData, currentPlayerAnswer, currentLanguage, geminiApiKey, model, temperature } = gameState;

    const prompt = translations.incorrect_answer_explanation_prompt[currentLanguage]
        .replace('{question}', currentQuestionData.question)
        .replace('{correct_answer}', currentQuestionData.answer)
        .replace('{player_answer}', currentPlayerAnswer);

    try {
        incorrectExplanationLoader.classList.remove('hidden');
        const data = await callGeminiApiWithRetries(geminiApiKey, model, temperature, prompt, true);
        if (data.explanation) {
            incorrectExplanationText.textContent = data.explanation;
        } else {
            throw new Error("No explanation found in API response.");
        }
    } catch (error) {
        console.error("Incorrect answer explanation error:", error);
        incorrectExplanationText.textContent = translations.incorrect_answer_analysis_error[currentLanguage];
    } finally {
        incorrectExplanationLoader.classList.add('hidden');
    }
}

async function handleManualVerification(isCorrect) {
    gameState.lastAnswerWasCorrect = isCorrect;
    const player = gameState.players[gameState.currentPlayerIndex];
    const square = gameState.board.find(s => s.id === player.position);

    const categoryIndex = gameState.currentForcedCategoryIndex !== null ? gameState.currentForcedCategoryIndex : square.categoryIndex;
    const category = gameState.categories[categoryIndex];

    if (category && gameState.currentQuestionData.keywords) {
        const history = gameState.categoryTopicHistory[category];
        gameState.currentQuestionData.keywords.forEach(kw => {
            if (!history.includes(kw)) history.push(kw);
        });
        if (history.length > 15) gameState.categoryTopicHistory[category] = history.slice(-15);
        localStorage.setItem('globalQuizHistory', JSON.stringify(gameState.categoryTopicHistory));
    }

    manualVerificationButtons.classList.add('hidden');
    postVerificationButtons.classList.remove('hidden');

    explanationContainer.classList.remove('hidden');

    closePopupBtn.textContent = translations.next_turn_btn[gameState.currentLanguage];

    if (isCorrect) {
        if (square.type === SQUARE_TYPES.HQ) {
            if(category && !player.wedges.includes(category)){
                player.wedges.push(category);
                if (gameState.mutateCategories) {
                    await mutateCategory(categoryIndex);
                }
            }
        }
    } else {
        incorrectExplanationContainer.classList.remove('hidden');
        getIncorrectAnswerExplanation();
    }
}

async function mutateCategory(categoryIndex) {
    const oldCategory = gameState.categories[categoryIndex];
    const randomId = Math.floor(Math.random() * 1000000);
    const prompt = translations.category_mutation_prompt[gameState.currentLanguage]
        .replace('{old_category}', oldCategory)
        .replace('{random_id}', randomId);

    try {
        const data = await callGeminiApiWithRetries(gameState.geminiApiKey, gameState.model, gameState.temperature, prompt, true);
        if (data.new_category) {
            const newCategory = data.new_category;
            gameState.categories[categoryIndex] = newCategory;
            delete gameState.categoryTopicHistory[oldCategory];
            if (!gameState.categoryTopicHistory[newCategory]) {
                gameState.categoryTopicHistory[newCategory] = [];
            }
            const legendItem = document.getElementById(`legend-cat-${categoryIndex}`);
            legendItem.querySelector('span').textContent = newCategory;
            showNotification({
                title: translations.category_mutated[gameState.currentLanguage],
                body: translations.new_category_msg[gameState.currentLanguage].replace('{old_cat}', oldCategory).replace('{new_cat}', newCategory)
            }, 'info');
        }
    } catch (error) {
        console.error("Category mutation failed:", error);
    }
}


function showAnswerPopup() {
    answerPopup.classList.remove('hidden');
    setTimeout(() => {
        answerPopup.classList.remove('opacity-0', 'scale-90');
    }, 10);
}

function closePopupAndContinue() {
    answerPopup.classList.add('opacity-0', 'scale-90');
    setTimeout(() => answerPopup.classList.add('hidden'), 500);

    if (gameState.lastAnswerWasCorrect) {
        diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
        rollDiceBtn.disabled = false;
        rollDiceBtn.classList.remove('opacity-50');
    } else {
        nextTurn();
    }
    updateUI();
    checkWinCondition();
}

function nextTurn() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    updateUI();
    diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
    rollDiceBtn.disabled = false;
    rollDiceBtn.classList.remove('opacity-50');
}

function checkWinCondition() {
    const winner = gameState.players.find(p => p.wedges.length === gameState.categories.length);
    if (winner) {
        gameScreen.classList.add('hidden');
        winnerScreen.classList.remove('hidden');
        winnerNameSpan.textContent = winner.name;
    }
}

async function callGeminiApiWithRetries(apiKey, modelId, temperature, prompt, expectJson = true) {
    const maxRetries = 3;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
    console.log('API Prompt:', prompt);

    for (let i = 0; i < maxRetries; i++) {
        try {
            const generationConfig = { temperature };
            if (expectJson && modelId.startsWith('gemini')) {
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
            console.log('API Response:', data);

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

function showModal(show) {
    if (show) {
        questionModal.classList.remove('hidden');
        setTimeout(() => modalContent.classList.remove('scale-95', 'opacity-0'), 10);
    } else {
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => questionModal.classList.add('hidden'), 300);
    }
}

function hideModal() { showModal(false); }

function updatePlayerNameInputs() {
    const count = parseInt(playerCountInput.value);
    playerNamesContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'player-entry flex gap-2 items-center';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'player-name-input flex-grow block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm';
        nameInput.placeholder = translations.player_name_placeholder[gameState.currentLanguage].replace('{i}', i + 1);

        const emojiPickerDiv = document.createElement('div');
        emojiPickerDiv.className = 'emoji-picker';
        const emojiButton = document.createElement('button');
        emojiButton.className = 'emoji-button';
        emojiButton.textContent = EMOJI_OPTIONS[i % EMOJI_OPTIONS.length];
        const emojiPanel = document.createElement('div');
        emojiPanel.className = 'emoji-panel';

        EMOJI_OPTIONS.forEach(emoji => {
            const option = document.createElement('span');
            option.className = 'emoji-option';
            option.textContent = emoji;
            option.onclick = () => {
                emojiButton.textContent = emoji;
                emojiPanel.classList.remove('active');
            };
            emojiPanel.appendChild(option);
        });

        emojiButton.onclick = (e) => {
            e.preventDefault();
            emojiPanel.classList.toggle('active');
        };

        emojiPickerDiv.appendChild(emojiButton);
        emojiPickerDiv.appendChild(emojiPanel);

        div.appendChild(nameInput);
        div.appendChild(emojiPickerDiv);
        playerNamesContainer.appendChild(div);
    }
}

// --- EVENT LISTENERS ---
window.addEventListener('DOMContentLoaded', () => {
    populateModelsDropdown();
    loadSettings();
    setLanguage('pl');
});
langPlBtn.addEventListener('click', () => setLanguage('pl'));
langEnBtn.addEventListener('click', () => setLanguage('en'));
gameModeSelect.addEventListener('change', updateDescriptions);
knowledgeLevelSelect.addEventListener('change', updateDescriptions);
geminiApiKeyInput.addEventListener('input', saveSettings);
modelSelect.addEventListener('change', saveSettings);
temperatureSlider.addEventListener('input', (e) => {
    const temp = parseFloat(e.target.value);
    temperatureValueSpan.textContent = temp.toFixed(1);
    e.target.style.setProperty('--thumb-color', `hsl(${(1 - temp / 2) * 240}, 70%, 50%)`);
    saveSettings();
});
includeThemeToggle.addEventListener('change', saveSettings);
mutateCategoriesToggle.addEventListener('change', saveSettings);
refreshModelsBtn.addEventListener('click', fetchModels);
generateCategoriesBtn.addEventListener('click', generateCategories);
regenerateQuestionBtn.addEventListener('click', () => askQuestion(gameState.currentForcedCategoryIndex));
popupRegenerateBtn.addEventListener('click', () => {
    answerPopup.classList.add('opacity-0', 'scale-90');
    setTimeout(() => answerPopup.classList.add('hidden'), 500);
    askQuestion(gameState.currentForcedCategoryIndex);
});
playerCountInput.addEventListener('input', updatePlayerNameInputs);
startGameBtn.addEventListener('click', initializeGame);
rollDiceBtn.addEventListener('click', rollDice);
submitAnswerBtn.addEventListener('click', handleOpenAnswer);
answerInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleOpenAnswer(); });
acceptAnswerBtn.addEventListener('click', () => handleManualVerification(true));
rejectAnswerBtn.addEventListener('click', () => handleManualVerification(false));
closePopupBtn.addEventListener('click', closePopupAndContinue);
playAgainBtn.addEventListener('click', () => {
    winnerScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
});
document.addEventListener('click', (e) => {
    document.querySelectorAll('.emoji-panel.active').forEach(panel => {
        if (!panel.parentElement.contains(e.target)) {
            panel.classList.remove('active');
        }
    });
});
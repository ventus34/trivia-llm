/**
 * @file game_core.js
 * This file contains the core logic for the trivia board game, including setup,
 * game state management, UI rendering, game flow, and interaction with the
 * backend server.
 */

// --- GAME CONFIGURATION ---
const CONFIG = {
    // Colors for player tokens and UI elements
    PLAYER_COLORS: ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#84cc16', '#eab308', '#06b6d4', '#6366f1'],
    // Colors for the six game categories
    CATEGORY_COLORS: ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#facc15'],
    // Defines the different types of squares on the board
    SQUARE_TYPES: { HQ: 'HEADQUARTERS', SPOKE: 'SPOKE', RING: 'RING', HUB: 'HUB', ROLL_AGAIN: 'ROLL_AGAIN' },
    // Delay in milliseconds for pawn movement animation
    ANIMATION_DELAY_MS: 50,
    // The maximum number of subcategory topics to remember per category to avoid repetition
    MAX_SUBCATEGORY_HISTORY_ITEMS: 15,
    // The maximum number of 'history items' to remember per category to avoid repetition
    MAX_ENTITY_HISTORY_ITEMS: 25,
    // A list of emojis available for player tokens
    EMOJI_OPTIONS: ['😀', '🚀', '🦄', '🤖', '🦊', '🧙', '👽', '👾', '👻', '👑', '💎', '🍕', '🍔', '⚽️', '🏀', '🎸', '🎨', '🎭', '🎬', '🎤', '🎮', '💻', '💡', '🧪', '🌍', '🏛️', '🏰', '🗿', '🛸']
};

// --- UI ELEMENTS ---
// This object centralizes all DOM element selections for easy access and management.
export const UI = {
    setupScreen: document.getElementById('setup-screen'),
    gameScreen: document.getElementById('game-screen'),
    gameMenuModelSelect: document.getElementById('game-menu-model-select'),
    winnerScreen: document.getElementById('winner-screen'),
    langPlBtn: document.getElementById('lang-pl'),
    langEnBtn: document.getElementById('lang-en'),
    modelSelect: document.getElementById('model-select'),
    gameModeSelect: document.getElementById('game-mode'),
    gameModeDescription: document.getElementById('game-mode-description'),
    knowledgeLevelSelect: document.getElementById('knowledge-level'),
    knowledgeLevelDescription: document.getElementById('knowledge-level-description'),
    themeInput: document.getElementById('theme-input'),
    generateCategoriesBtn: document.getElementById('generate-categories-btn'),
    categoriesContainer: document.getElementById('categories-container'),
    playerCountInput: document.getElementById('player-count'),
    playerNamesContainer: document.getElementById('player-names-container'),
    includeThemeToggle: document.getElementById('include-theme-toggle'),
    mutateCategoriesToggle: document.getElementById('mutate-categories-toggle'),
    startGameBtn: document.getElementById('start-game-btn'),
    loadGameBtn: document.getElementById('load-game-btn'),
    boardWrapper: document.querySelector('.board-wrapper'),
    boardElement: document.getElementById('board'),
    categoryLegend: document.getElementById('category-legend'),
    currentPlayerEmojiSpan: document.getElementById('current-player-emoji'),
    currentPlayerNameDiv: document.getElementById('current-player-name'),
    playerScoresContainer: document.getElementById('player-scores'),
    diceResultDiv: document.getElementById('dice-result'),
    diceElement: document.getElementById('dice'),
    gameMessageDiv: document.getElementById('game-message'),
    questionModal: document.getElementById('question-modal'),
    modalContent: document.getElementById('modal-content'),
    questionCategoryH3: document.getElementById('question-category'),
    regenerateQuestionBtn: document.getElementById('regenerate-question-btn'),
    questionContent: document.getElementById('question-content'),
    questionTextP: document.getElementById('question-text'),
    mcqOptionsContainer: document.getElementById('mcq-options-container'),
    answerSection: document.getElementById('answer-section'),
    answerInput: document.getElementById('answer-input'),
    submitAnswerBtn: document.getElementById('submit-answer-btn'),
    llmLoader: document.getElementById('llm-loader'),
    categoryChoiceModal: document.getElementById('category-choice-modal'),
    categoryChoiceButtons: document.getElementById('category-choice-buttons'),
    standardPopupContent: document.getElementById('standard-popup-content'),
    mutationContent: document.getElementById('mutation-content'),
    mutationLoader: document.getElementById('mutation-loader'),
    mutationButtons: document.getElementById('mutation-buttons'),
    answerPopup: document.getElementById('answer-popup'),
    answerPopupTitle: document.getElementById('answer-popup-title'),
    playerAnswerText: document.getElementById('player-answer-text'),
    correctAnswerContainer: document.getElementById('correct-answer-container'),
    correctAnswerText: document.getElementById('correct-answer-text'),
    explanationContainer: document.getElementById('explanation-container'),
    explanationText: document.getElementById('explanation-text'),
    incorrectExplanationContainer: document.getElementById('incorrect-explanation-container'),
    incorrectExplanationText: document.getElementById('incorrect-explanation-text'),
    incorrectExplanationLoader: document.getElementById('incorrect-explanation-loader'),
    verificationButtons: document.getElementById('verification-buttons'),
    postVerificationButtons: document.getElementById('post-verification-buttons'),
    acceptAnswerBtn: document.getElementById('accept-answer-btn'),
    rejectAnswerBtn: document.getElementById('reject-answer-btn'),
    popupRegenerateBtn: document.getElementById('popup-regenerate-btn'),
    closePopupBtn: document.getElementById('close-popup-btn'),
    winnerNameSpan: document.getElementById('winner-name'),
    playAgainBtn: document.getElementById('play-again-btn'),
    notificationContainer: document.getElementById('notification-container'),
    historyModal: document.getElementById('history-modal'),
    closeHistoryBtn: document.getElementById('close-history-btn'),
    historyContent: document.getElementById('history-content'),
    historyModalTitle: document.getElementById('history-modal-title'),
    restartGameBtn: document.getElementById('restart-game-btn'),
    downloadStateBtn: document.getElementById('download-state-btn'),
    uploadStateInput: document.getElementById('upload-state-input'),
    suggestionModal: document.getElementById('suggestion-modal'),
    suggestionModalTitle: document.getElementById('suggestion-modal-title'),
    closeSuggestionModalBtn: document.getElementById('close-suggestion-modal-btn'),
    suggestionLoader: document.getElementById('suggestion-loader'),
    suggestionButtons: document.getElementById('suggestion-buttons'),

    // NOWE ELEMENTY MENU
    openGameMenuBtn: document.getElementById('open-game-menu-btn'),
    gameMenuPanel: document.getElementById('game-menu-panel'),
    gameMenuOverlay: document.getElementById('game-menu-overlay'),
    showHistoryBtn: document.getElementById('show-history-btn')
};


// --- GAME STATE & TRANSLATIONS ---

/**
 * The main game state object. It holds all dynamic data related to the current game session.
 * It is exported to be accessible by other modules.
 * @property {string} currentLanguage - The current UI language ('pl' or 'en').
 * @property {Array} promptHistory - A log of prompts sent to the API and their responses.
 * @property {object} api - The API adapter for communicating with the language model.
 */
export let gameState = {
    currentLanguage: 'pl',
    promptHistory: []
};

/**
 * An object containing all UI text translations for Polish and English.
 * The keys correspond to `data-lang-key` attributes in the HTML or are used directly in the code.
 * All prompt-related translations have been moved to the server.
 */
export const translations = {
    setup_title: { pl: "Ustawienia", en: "Settings" },
    api_error: { pl: "Błąd API", en: "API Error" },
    model_label: {pl: "Model Językowy:", en: "Language Model:"},
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
    category_theme_placeholder: { pl: "Wpisz motyw", en: "Enter theme"},
    include_theme_label: { pl: "Dodaj temat generacji do pytań", en: "Add generation theme to questions" },
    mutate_categories_label: { pl: "Mutacja kategorii po zdobyciu punktu", en: "Mutate category after scoring" },
    category_generator_btn: { pl: "Generuj", en: "Generate" },
    categories_label: { pl: "Kategorie", en: "Categories" },
    default_categories: { pl: "Historia, Geografia, Nauka, Sztuka, Sport, Rozrywka", en: "History, Geography, Science, Art, Sports, Entertainment" },
    players_label: { pl: "Gracze", en: "Players" },
    player_count_label: { pl: "Liczba:", en: "Count:" },
    player_name_placeholder: { pl: "Imię Gracza {i}", en: "Player {i}'s Name" },
    start_game_btn: { pl: "Rozpocznij grę", en: "Start game" },
    load_game_btn: { pl: "Wczytaj ostatnią grę", en: "Load last game" },
    min_categories_alert: { pl: "Wszystkie 6 pól kategorii musi być wypełnione.", en: "All 6 category fields must be filled." },
    player_turn: { pl: "Tura Gracza", en: "Player's Turn" },
    roll_to_start: { pl: "Rzuć kostką, aby rozpocząć!", en: "Roll the dice to start!" },
    roll_dice_btn: { pl: "Rzuć Kostką", en: "Roll Dice" },
    choose_move: { pl: "Wybierz pole, na które chcesz się przesunąć.", en: "Choose a square to move to." },
    dice_roll_result: { pl: "Wyrzucono: {roll}", en: "You rolled: {roll}" },
    category_title: { pl: "Kategoria: {category}", en: "Category: {category}" },
    regenerate_question_btn: { pl: "Nowe pytanie", en: "New Question" },
    choose_category_title: { pl: "Wybierz kategorię", en: "Choose a Category" },
    choose_mutation_title: { pl: "Kategoria mutuje! Wybierz nową:", en: "Category is mutating! Choose a new one:" },
    generating_question: { pl: "Generuję pytanie...", en: "Generating question..." },
    generating_categories: { pl: "Generuję kategorie...", en: "Generating categories..." },
    question_generation_error: { pl: "Nie udało się wygenerować pytania. Sprawdź konsolę, by poznać szczegóły.", en: "Failed to generate a question. Check console for details." },
    answer_placeholder: { pl: "Wpisz swoją odpowiedź...", en: "Type your answer here..." },
    submit_answer_btn: { pl: "Zatwierdź Odpowiedź", en: "Submit Answer" },
    analyzing_text: { pl: "Analizuję...", en: "Analyzing..." },
    empty_answer_error: { pl: "Proszę wpisać odpowiedź.", en: "Please enter an answer." },
    answer_evaluation: { pl: "Oceń odpowiedź", en: "Evaluate Answer" },
    player_answer_was: { pl: "Odpowiedź gracza:", en: "Player's answer:" },
    correct_answer_is: { pl: "Poprawna odpowiedź:", en: "Correct answer:" },
    roll_again: { pl: "Rzuć ponownie", en: "Roll again" },
    explanation: { pl: "Wyjaśnienie poprawnej odpowiedzi:", en: "Explanation of the correct answer:" },
    your_answer_explanation: { pl: "Uzasadnienie Twojego błędu:", en: "Reasoning for your error:" },
    incorrect_answer_analysis_error: { pl: "Nie udało się przeanalizować odpowiedzi.", en: "Failed to analyze the answer." },
    accept_answer: { pl: "Poprawna", en: "Correct" },
    reject_answer: { pl: "Niepoprawna", en: "Incorrect" },
    verification_error: { pl: "Błąd weryfikacji.", en: "Verification error." },
    continue_btn: { pl: "Kontynuuj", en: "Continue" },
    congratulations: { pl: "Gratulacje!", en: "Congratulations!" },
    winner_is: { pl: "Zwycięzcą jest", en: "The winner is" },
    play_again_btn: { pl: "Zagraj Ponownie", en: "Play Again" },
    restart_game_btn: { pl: "Zacznij od nowa", en: "Start Over" },
    restart_game_confirm: { pl: "Czy na pewno chcesz zrestartować grę? Cały postęp zostanie utracony.", en: "Are you sure you want to restart the game? All progress will be lost." },
    suggestion_modal_title: { pl: "Sugestie", en: "Suggestions" },
    suggestion_loader_text: { pl: "Generuję sugestie...", en: "Generating suggestions..." },
    suggestion_error: { pl: "Nie udało się wygenerować sugestii.", en: "Could not generate suggestions." },
    suggestion_input_needed: { pl: "Proszę wpisać kategorię, aby uzyskać sugestie.", en: "Please enter a category to get suggestions for." },
    suggestion_button_title: { pl: "Zasugeruj alternatywy", en: "Suggest alternatives" },
    infobox_temp_desc: { pl: "Kontroluje \"kreatywność\" modelu AI. Niska wartość (np. 0.2) tworzy bardziej przewidywalne i zachowawcze pytania. Wysoka wartość (np. 1.2) zachęca do tworzenia bardziej zróżnicowanych i nieoczekiwanych treści, co może czasem prowadzić do dziwnych wyników.", en: "Controls the 'creativity' of the AI model. A low value (e.g., 0.2) generates more predictable and conservative questions. A high value (e.g., 1.2) encourages more diverse and unexpected content, which can sometimes lead to strange results." },
    generating_mutation: { pl: "Generuję nowe kategorie...", en: "Generating new categories..." },
    infobox_title: { pl: "Jak działają te opcje?", en: "How do these options work?" },
    infobox_rules_title: { pl: "📜 Zasady Gry", en: "📜 Game Rules" },
    infobox_rules_desc: {
        pl: `
            <ul class="list-disc list-inside space-y-1 mt-1 mb-2 text-slate-600">
                <li><b>Cel gry:</b> Jako pierwszy zdobyć 6 kolorowych kółek – po jednym z każdej kategorii.</li>
                <li><b>Tura gracza:</b> Rzuć kostką, przesuń pionek i odpowiedz na pytanie z kategorii pola, na którym staniesz.</li>
                <li><b>Zdobywanie kółek:</b> Poprawna odpowiedź na "polu głównym" (duże pole na końcu ramienia) nagradzana jest kółkiem w kolorze tego pola.</li>
                <li><b>Pola specjalne:</b> Pole centralne ("piasta") pozwala wybrać dowolną kategorię, a pola "Rzuć ponownie" dają dodatkowy ruch.</li>
            </ul>
        `, en: `
            <ul class="list-disc list-inside space-y-1 mt-1 mb-2 text-slate-600">
                <li><b>Objective:</b> Be the first to collect a colored disc from each of the six categories.</li>
                <li><b>Gameplay:</b> Roll the die, move your pawn, and answer the question for the category you land on.</li>
                <li><b>Earning Discs:</b> Correctly answer a question on a category "HQ" (Headquarters) to earn that category's disc.</li>
                <li><b>Special Squares:</b> The central "Hub" lets you choose any category, while "Roll Again" squares grant an extra turn.</li>
            </ul>
        `
    },
    infobox_mutation_title: { pl: "🧬 Mutacja Kategorii", en: "🧬 Category Mutation" },
    infobox_mutation_desc: { pl: "Gdy ta opcja jest włączona, po zdobyciu \"cząstki\" w danej kategorii, kategoria ta zostanie zastąpiona nową, spokrewnioną tematycznie. Utrzymuje to grę świeżą i dynamiczną.", en: "When this option is enabled, after winning a wedge in a category (on an HQ square), that category will be replaced with a new, thematically related one. This keeps the game fresh and dynamic." },
    infobox_theme_title: { pl: "📝 Dodaj Temat do Pytań", en: "📝 Add Theme to Questions" },
    infobox_theme_desc: { pl: "Jeśli wpisano motyw w polu \"Temat do generacji kategorii\", zaznaczenie tej opcji sprawi, że model AI będzie musiał tworzyć pytania, które są związane nie tylko z kategorią (np. \"Historia\"), ale również z głównym motywem gry (np. \"Władca Pierścieni\").", en: "If a theme was entered in the \"Category Generation Theme\" field, checking this option will force the AI model to create questions that relate not only to the category (e.g., \"History\") but also to the main game theme (e.g., \"Lord of the Rings\")." },
    game_menu_title: { pl: "Menu Gry", en: "Game Menu" },
    show_history_btn: { pl: "Pokaż historię promptów", en: "Show prompt history" },
    generate_categories_error: { pl: "Nie udało się wygenerować kategorii. Sprawdź ustawienia API i spróbuj ponownie.", en: "Failed to generate categories. Check API settings and try again." },
    category_mutated: { pl: "Kategoria zmutowała!", en: "Category has mutated!" },
    new_category_msg: { pl: '"{old_cat}" zmienia się w "{new_cat}"!', en: '"{old_cat}" changes into "{new_cat}"!' },
    history_modal_title: { pl: "Historia Zapytań", en: "Request History" },
    history_prompt_title: { pl: "Wysłane Zapytanie (do backendu)", en: "Sent Request (to backend)" },
    history_response_title: { pl: "Otrzymana Odpowiedź", en: "Received Response" },
    history_empty: { pl: "Historia jest jeszcze pusta.", en: "History is empty." },
    rate_limit_title: { pl: "Przekroczono limit zapytań", en: "Request Limit Exceeded" },
    rate_limit_desc: { pl: "Wykorzystałeś limit zapytań dla obecnego modelu. Wybierz inny model, aby kontynuować grę.", en: "You have used the request limit for the current model. Please choose another model to continue." },
    confirm_choice_btn: { pl: "Zatwierdź wybór", en: "Confirm Choice" },
    download_state_btn: { pl: "Pobierz zapis", en: "Download State" },
    upload_state_btn: { pl: "Wczytaj grę", en: "Load Game" },
    theme_title: { pl: "Motyw", en: "Theme" },
    theme_light_label: { pl: "Jasny", en: "Light" },
    theme_dark_label: { pl: "Ciemny", en: "Dark" },
    theme_oled_label: { pl: "OLED", en: "OLED" },
    game_loaded_success: { pl: "Gra wczytana pomyślnie!", en: "Game loaded successfully!" },
    game_loaded_error: { pl: "Błąd wczytywania pliku. Upewnij się, że to poprawny plik zapisu.", en: "Error loading file. Make sure it's a valid save file." }
};


// --- UI & NOTIFICATIONS ---

/**
 * Automatically adjusts the height of a textarea to fit its content.
 * @param {HTMLTextAreaElement} textarea - The textarea element to resize.
 */
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto'; // Reset height to correctly calculate scrollHeight
    textarea.style.height = `${textarea.scrollHeight}px`; // Set height to content height
}

function updateModelSelection(selectedValue) {
    if (UI.modelSelect.value !== selectedValue) {
        UI.modelSelect.value = selectedValue;
    }
    if (UI.gameMenuModelSelect.value !== selectedValue) {
        UI.gameMenuModelSelect.value = selectedValue;
    }
}

/**
 * Displays a notification on the screen.
 * @param {object} message - An object with `title` and `body` fields.
 * @param {string} [type='info'] - The type of notification ('info', 'success', 'error').
 * @param {number} [duration=5000] - The display duration in milliseconds.
 */
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

    UI.notificationContainer.appendChild(notif);

    setTimeout(() => {
        notif.classList.add('show');
    }, 10);

    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 500);
    }, duration);
}

/**
 * Sets the UI language and updates all translatable text elements.
 * @param {string} lang - The language code ('pl' or 'en').
 */
function setLanguage(lang) {
    gameState.currentLanguage = lang;
    document.documentElement.lang = lang;
    UI.langPlBtn.classList.toggle('active', lang === 'pl');
    UI.langEnBtn.classList.toggle('active', lang === 'en');

    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (translations[key] && translations[key][lang]) {
            const translation = translations[key][lang];
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder) el.placeholder = translation;
            } else if (el.title && !el.textContent.trim()) {
                el.title = translation;
            } else {
                el.innerHTML = translation;
            }
        }
    });

    // Update suggestion modal title on language change
    if (UI.suggestionModalTitle) {
        UI.suggestionModalTitle.textContent = translations.suggestion_modal_title[lang];
    }
    updateCategoryInputs(translations.default_categories[lang].split(', '));
    updatePlayerNameInputs();
    updateDescriptions();
}

/**
 * Updates the descriptive text below the game mode and knowledge level selectors.
 */
function updateDescriptions() {
    const lang = gameState.currentLanguage;
    UI.gameModeDescription.textContent = translations[`game_mode_desc_${UI.gameModeSelect.value}`][lang];
    UI.knowledgeLevelDescription.textContent = translations[`knowledge_desc_${UI.knowledgeLevelSelect.value}`][lang];
}


// --- GAME SETUP ---

function generateGameId() {
    return 'game-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Handles the click event for the category suggestion button.
 * It gathers context, calls the API, and displays the suggestion modal.
 * @param {HTMLTextAreaElement} targetTextarea - The textarea element for which to generate suggestions.
 */
async function handleSuggestAlternatives(targetTextarea) {
    if (!gameState.api.isConfigured()) {
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: "Configuration error." }, 'error');
        return;
    }

    const oldCategory = targetTextarea.value.trim();
    if (!oldCategory) {
        showNotification({ title: "Input Required", body: translations.suggestion_input_needed[gameState.currentLanguage] }, 'info');
        return;
    }

    UI.suggestionModal.classList.remove('hidden');
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
                UI.suggestionModal.classList.add('hidden');
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
 * Populates the category name input fields using auto-sizing textareas.
 * @param {string[]} cats - An array of category names.
 */
function updateCategoryInputs(cats) {
    UI.categoriesContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative';

        const textarea = document.createElement('textarea');
        textarea.className = 'category-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm';
        textarea.value = cats[i] || '';
        textarea.style.borderLeft = `5px solid ${CONFIG.CATEGORY_COLORS[i]}`;
        textarea.rows = 1;
        textarea.addEventListener('input', () => autoResizeTextarea(textarea));

        const suggestBtn = document.createElement('button');
        suggestBtn.type = 'button';
        suggestBtn.className = 'category-suggestion-btn';
        suggestBtn.title = translations.suggestion_button_title[gameState.currentLanguage];
        suggestBtn.innerHTML = '✨';
        suggestBtn.addEventListener('click', () => handleSuggestAlternatives(textarea));

        wrapper.appendChild(textarea);
        wrapper.appendChild(suggestBtn);
        UI.categoriesContainer.appendChild(wrapper);

        autoResizeTextarea(textarea);
    }
}

/**
 * Generates the input fields for player names and emoji pickers based on the selected player count.
 */
function updatePlayerNameInputs() {
    const count = parseInt(UI.playerCountInput.value);
    UI.playerNamesContainer.innerHTML = '';
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
        emojiButton.textContent = CONFIG.EMOJI_OPTIONS[i % CONFIG.EMOJI_OPTIONS.length];
        const emojiPanel = document.createElement('div');
        emojiPanel.className = 'emoji-panel';

        CONFIG.EMOJI_OPTIONS.forEach(emoji => {
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
        UI.playerNamesContainer.appendChild(div);
    }
}

/**
 * Initializes the game state based on setup screen settings and transitions to the game screen.
 */
function initializeGame() {
    const playerCount = parseInt(UI.playerCountInput.value);
    const playerInputs = document.querySelectorAll('#player-names-container > .player-entry');
    const playerNames = Array.from(playerInputs).map(div => div.querySelector('.player-name-input').value || div.querySelector('.player-name-input').placeholder);
    const playerEmojis = Array.from(playerInputs).map(div => div.querySelector('.emoji-button').textContent);
    const categories = Array.from(document.querySelectorAll('#categories-container .category-input')).map(input => input.value.trim());
    gameState.gameId = generateGameId();

    if (categories.some(c => c === '')) {
        showNotification({ title: "Setup Error", body: translations.min_categories_alert[gameState.currentLanguage] }, 'error');
        return;
    }

    gameState = {
        ...gameState,
        players: [],
        categories: categories,
        board: [],
        theme: UI.themeInput.value.trim(),
        includeCategoryTheme: UI.includeThemeToggle.checked,
        mutateCategories: UI.mutateCategoriesToggle.checked,
        currentPlayerIndex: 0,
        isAwaitingMove: false,
        lastAnswerWasCorrect: false,
        gameMode: UI.gameModeSelect.value,
        knowledgeLevel: UI.knowledgeLevelSelect.value,
        currentQuestionData: null,
        categoryTopicHistory: JSON.parse(localStorage.getItem('globalQuizHistory')) || {},
        possiblePaths: {},
    };

    gameState.categories.forEach(cat => {
        if (!gameState.categoryTopicHistory[cat]) {
            gameState.categoryTopicHistory[cat] = { subcategories: [], entities: [] };
        }
    });

    for (let i = 0; i < playerCount; i++) {
        gameState.players.push({
            name: playerNames[i],
            emoji: playerEmojis[i],
            position: 0,
            color: CONFIG.PLAYER_COLORS[i],
            wedges: []
        });
    }

    createBoardLayout();
    renderBoard();
    renderCategoryLegend();
    updateUI();
    UI.diceResultDiv.classList.add('hint-pulsate');
    UI.setupScreen.classList.add('hidden');
    UI.gameScreen.classList.remove('hidden');
}


// --- API INTERACTION ---

/**
 * Calls the API to generate new categories based on the provided theme.
 */
async function generateCategories() {
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
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: translations.generate_categories_error[gameState.currentLanguage] }, 'error');
    } finally {
        UI.generateCategoriesBtn.textContent = originalBtnText;
        UI.generateCategoriesBtn.disabled = false;
    }
}

/**
 * Fetches a question from the API and displays it in the question modal.
 * @param {number|null} [forcedCategoryIndex=null] - The index of a category to use, overriding the player's current square. Used for HUB squares.
 */
async function askQuestion(forcedCategoryIndex = null) {
    gameState.currentForcedCategoryIndex = forcedCategoryIndex;
    const player = gameState.players[gameState.currentPlayerIndex];
    const square = gameState.board.find(s => s.id === player.position);
    const categoryIndex = forcedCategoryIndex !== null ? forcedCategoryIndex : square.categoryIndex;

    if (categoryIndex === null || categoryIndex === undefined) {
        console.error("Invalid category index on the current square:", square);
        nextTurn();
        return;
    }

    const category = gameState.categories[categoryIndex];
    const categoryColor = CONFIG.CATEGORY_COLORS[categoryIndex];

    UI.questionCategoryH3.textContent = translations.category_title[gameState.currentLanguage].replace('{category}', category);
    UI.questionCategoryH3.style.color = categoryColor;
    UI.modalContent.style.borderTopColor = categoryColor;

    showModal(true);
    UI.llmLoader.classList.remove('hidden');
    UI.questionContent.classList.add('hidden');
    UI.mcqOptionsContainer.innerHTML = '';

    try {
        const data = await gameState.api.generateQuestion(category);
        gameState.currentQuestionData = data;
        UI.questionTextP.textContent = data.question;

        if (gameState.gameMode === 'mcq') {
            UI.answerSection.classList.add('hidden');
            UI.mcqOptionsContainer.classList.remove('hidden');
            data.options.forEach(option => {
                const button = document.createElement('button');
                button.className = "w-full p-3 text-center bg-gray-100 hover:bg-indigo-100 rounded-lg transition-colors flex justify-center items-center";
                button.innerHTML = `<span>${option}</span>`;
                button.onclick = () => handleMcqAnswer(option);
                UI.mcqOptionsContainer.appendChild(button);
            });
        } else {
            UI.answerSection.classList.remove('hidden');
            UI.mcqOptionsContainer.classList.add('hidden');
            UI.answerInput.focus();
        }
        UI.questionContent.classList.remove('hidden');
        UI.llmLoader.classList.add('hidden');

    } catch (error) {
        console.error('Question generation error:', error);
        UI.llmLoader.classList.add('hidden');
        UI.questionTextP.textContent = translations.question_generation_error[gameState.currentLanguage];
        UI.questionContent.classList.remove('hidden');
        setTimeout(() => {
            hideModal();
            UI.diceElement.disabled = false;
            UI.gameMessageDiv.textContent = 'Error, roll again.';
        }, 3000);
    }
}


// --- BOARD LOGIC & RENDERING ---

/**
 * Creates the programmatic structure of the game board, including squares, positions, and connections.
 */
function createBoardLayout() {
    const layout = [];
    const center = 50;
    const armLength = 5;
    const radii = [0, 10, 18, 26, 34, 42, 50];

    // Hub
    layout.push({ id: 0, type: CONFIG.SQUARE_TYPES.HUB, categoryIndex: null, pos: { x: center, y: center }, connections: [] });

    // Spokes and HQ squares
    let id = 1;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * 2 * Math.PI;
        const spokeCategoryPattern = [(i + 1) % 6, (i + 2) % 6, (i + 3) % 6, (i + 4) % 6, (i + 5) % 6];
        for (let j = 1; j <= armLength; j++) {
            const x = center + radii[j] * Math.cos(angle);
            const y = center + radii[j] * Math.sin(angle);
            layout.push({ id: id, type: CONFIG.SQUARE_TYPES.SPOKE, categoryIndex: spokeCategoryPattern[j - 1], pos: { x, y }, connections: [] });
            id++;
        }
        const x = center + radii[armLength + 1] * Math.cos(angle);
        const y = center + radii[armLength + 1] * Math.sin(angle);
        layout.push({ id: id, type: CONFIG.SQUARE_TYPES.HQ, categoryIndex: i, pos: { x, y }, connections: [] });
        id++;
    }

    // Outer ring squares
    const ringStartId = id;
    const ringSquareCountPerSegment = 6;
    for (let i = 0; i < 6; i++) {
        const segmentCategoryPattern = [(i + 2) % 6, (i + 3) % 6, (i + 4) % 6, (i + 5) % 6, i % 6, (i + 1) % 6];
        for (let j = 0; j < ringSquareCountPerSegment; j++) {
            const type = (j === 2) ? CONFIG.SQUARE_TYPES.ROLL_AGAIN : CONFIG.SQUARE_TYPES.RING;
            const categoryIndex = type === CONFIG.SQUARE_TYPES.RING ? segmentCategoryPattern[j] : null;
            layout.push({ id: id++, type, categoryIndex, pos: {}, connections: [] });
        }
    }

    // Connect spoke squares
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

    // Connect ring squares and calculate their positions
    const hqRadius = radii[armLength + 1];
    for (let i = 0; i < 6; i++) {
        const hq1 = layout.find(s => s.type === CONFIG.SQUARE_TYPES.HQ && s.categoryIndex === i);
        const hq2 = layout.find(s => s.type === CONFIG.SQUARE_TYPES.HQ && s.categoryIndex === (i + 1) % 6);
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

/**
 * Renders the game board squares and their connections as an SVG overlay.
 */
function renderBoard() {
    UI.boardElement.innerHTML = '';
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute('class', 'board-connections');
    UI.boardWrapper.insertBefore(svg, UI.boardElement);

    const drawnConnections = new Set();

    gameState.board.forEach(square => {
        const squareEl = document.createElement('div');
        squareEl.className = 'board-square';
        squareEl.id = `square-${square.id}`;
        squareEl.style.left = `calc(${square.pos.x}% - 3%)`;
        squareEl.style.top = `calc(${square.pos.y}% - 3%)`;

        const categoryColor = square.categoryIndex !== null ? CONFIG.CATEGORY_COLORS[square.categoryIndex] : '#f3f4f6';
        squareEl.style.backgroundColor = categoryColor;

        if (square.type === CONFIG.SQUARE_TYPES.HQ) {
            squareEl.style.transform = 'scale(1.4)';
            squareEl.style.borderRadius = '50%';
        }
        if (square.type === CONFIG.SQUARE_TYPES.ROLL_AGAIN) {
            squareEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 8h.01"></path><path d="M12 12h.01"></path><path d="M8 16h.01"></path></svg>`;
        }
        if (square.type === CONFIG.SQUARE_TYPES.HUB) {
            squareEl.style.transform = 'scale(1.2)';
            squareEl.style.background = 'radial-gradient(circle, #fff, #d1d5db)';
        }

        squareEl.addEventListener('click', () => handleSquareClick(square.id));
        UI.boardElement.appendChild(squareEl);

        // Draw connections between squares
        square.connections.forEach(connId => {
            const key1 = `${square.id}-${connId}`;
            const key2 = `${connId}-${square.id}`;
            if (!drawnConnections.has(key1) && !drawnConnections.has(key2)) {
                const neighbor = gameState.board.find(s => s.id === connId);
                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', `${square.pos.x}%`);
                line.setAttribute('y1', `${square.pos.y}%`);
                line.setAttribute('x2', `${neighbor.pos.x}%`);
                line.setAttribute('y2', `${neighbor.pos.y}%`);
                svg.appendChild(line);
                drawnConnections.add(key1);
            }
        });
    });
}

/**
 * Renders the legend showing category names and their corresponding colors.
 */
function renderCategoryLegend() {
    UI.categoryLegend.innerHTML = '';
    gameState.categories.forEach((cat, i) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'flex items-center gap-2';
        legendItem.id = `legend-cat-${i}`;
        legendItem.innerHTML = `<div class="w-4 h-4 rounded-full" style="background-color: ${CONFIG.CATEGORY_COLORS[i]}"></div><span>${cat}</span>`;
        UI.categoryLegend.appendChild(legendItem);
    });
}

/**
 * Renders player tokens on their current board positions.
 */
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
        UI.boardElement.appendChild(tokenEl);
    });
}

/**
 * Updates the entire game UI, including the current player display, scores, and tokens.
 */
function updateUI() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    UI.currentPlayerEmojiSpan.textContent = currentPlayer.emoji;
    UI.currentPlayerNameDiv.textContent = currentPlayer.name;
    UI.currentPlayerNameDiv.style.color = currentPlayer.color;
    UI.playerScoresContainer.innerHTML = '';

    gameState.players.forEach((player, playerIndex) => {
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'p-2 rounded-lg flex items-center justify-between';
        scoreDiv.style.border = `1px solid ${player.color}`;
        let wedgesHTML = '';
        gameState.categories.forEach((cat, i) => {
            const hasWedge = player.wedges.includes(cat);
            wedgesHTML += `<span class="category-wedge" style="background-color: ${hasWedge ? CONFIG.CATEGORY_COLORS[i] : '#e5e7eb'};" title="${cat}"></span>`;
        });
        scoreDiv.innerHTML = `<p class="font-semibold" style="color: ${player.color};">${player.emoji} ${player.name}</p><div>${wedgesHTML}</div>`;
        UI.playerScoresContainer.appendChild(scoreDiv);
    });

    renderPlayerTokens();
}


// --- CORE GAME FLOW ---

/*
 * Creates a realistic, multi-step tumble animation for the dice.
 * @param {number} roll - The final dice roll result (1-6).
 */
async function animateDiceRoll(roll) {
    const rotations = {
        1: 'rotateY(0deg) rotateX(0deg)', 2: 'rotateX(-90deg)', 3: 'rotateY(90deg)',
        4: 'rotateY(-90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)'
    };
    const finalTransform = rotations[roll];

    let currentX = 0;
    let currentY = 0;
    const spinX = (Math.random() > 0.5 ? 1 : -1) * (350 + Math.random() * 200);
    const spinY = (Math.random() > 0.5 ? 1 : -1) * (350 + Math.random() * 200);
    const tumbleCount = 2;
    const tumbleDelay = 100;

    UI.diceElement.style.transition = 'transform 0.1s linear';

    for (let i = 0; i < tumbleCount; i++) {
        currentX += spinX / (i * 1.5 + 1);
        currentY += spinY / (i * 1.5 + 1);
        const tumbleTransform = `rotateX(${currentX}deg) rotateY(${currentY}deg)`;
        UI.diceElement.style.transform = tumbleTransform;
        await new Promise(resolve => setTimeout(resolve, tumbleDelay));
    }

    UI.diceElement.style.transition = 'transform 0.8s cubic-bezier(0.2, 1, 0.2, 1)';
    UI.diceElement.style.transform = finalTransform;
    await new Promise(resolve => setTimeout(resolve, 800));
    UI.diceElement.style.transition = '';
}


/**
 * Handles the dice roll action, calculates possible moves, and highlights them.
 */
async function rollDice() {
    UI.diceResultDiv.classList.remove('hint-pulsate');
    if (UI.diceElement.disabled || gameState.isAwaitingMove) return;

    UI.diceElement.disabled = true;
    UI.gameMessageDiv.textContent = '';
    const roll = Math.floor(Math.random() * 6) + 1;

    await animateDiceRoll(roll);

    UI.diceResultDiv.querySelector('span').textContent = translations.dice_roll_result[gameState.currentLanguage].replace('{roll}', roll);

    const player = gameState.players[gameState.currentPlayerIndex];
    const possiblePaths = findPossibleMoves(player.position, roll);
    gameState.possiblePaths = possiblePaths;

    const destinationIds = Object.keys(possiblePaths);

    if (destinationIds.length > 0) {
        gameState.isAwaitingMove = true;
        UI.gameMessageDiv.textContent = translations.choose_move[gameState.currentLanguage];
        destinationIds.forEach(id => document.getElementById(`square-${id}`).classList.add('highlighted-move'));
    } else {
        nextTurn();
    }
}

/**
 * Finds all possible destination squares given a start position and number of steps.
 * @param {number} startId - The starting square ID.
 * @param {number} steps - The number of steps to move.
 * @returns {object} An object where keys are destination square IDs and values are the paths.
 */
function findPossibleMoves(startId, steps) {
    let queue = [[startId, [startId]]];
    const finalPaths = {};

    while (queue.length > 0) {
        const [currentId, path] = queue.shift();
        if (path.length - 1 === steps) {
            finalPaths[currentId] = path;
            continue;
        }
        if (path.length - 1 > steps) continue;

        const currentSquare = gameState.board.find(s => s.id === currentId);
        for (const neighborId of currentSquare.connections) {
            if (path.length > 1 && neighborId === path[path.length - 2]) continue;
            const newPath = [...path, neighborId];
            queue.push([neighborId, newPath]);
        }
    }
    return finalPaths;
}

/**
 * Handles a player's click on a board square to move their token.
 * @param {number} squareId - The ID of the clicked square.
 */
async function handleSquareClick(squareId) {
    if (!gameState.isAwaitingMove) return;

    const path = gameState.possiblePaths[squareId];
    if (!path) return;

    document.querySelectorAll('.highlighted-move').forEach(el => el.classList.remove('highlighted-move'));
    gameState.isAwaitingMove = false;
    UI.gameMessageDiv.textContent = '';

    await animatePawnMovement(path.slice(1));

    const player = gameState.players[gameState.currentPlayerIndex];
    player.position = squareId;

    const landedSquare = gameState.board.find(s => s.id === squareId);
    if (landedSquare.type === CONFIG.SQUARE_TYPES.ROLL_AGAIN) {
        UI.diceResultDiv.querySelector('span').textContent = translations.roll_again[gameState.currentLanguage];
        UI.diceElement.disabled = false;
    } else if (landedSquare.type === CONFIG.SQUARE_TYPES.HUB) {
        promptCategoryChoice();
    } else {
        askQuestion();
    }
}

/**
 * Animates the player's token moving along a specified path.
 * @param {number[]} path - An array of square IDs representing the movement path.
 */
async function animatePawnMovement(path) {
    const playerIndex = gameState.currentPlayerIndex;
    const tokenEl = document.getElementById(`token-${playerIndex}`);

    for (const squareId of path) {
        const newSquare = gameState.board.find(s => s.id === squareId);
        tokenEl.style.left = `calc(${newSquare.pos.x}% - 1.75%)`;
        tokenEl.style.top = `calc(${newSquare.pos.y}% - 1.75%)`;
        await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION_DELAY_MS));
    }
}

/**
 * Proceeds to the next player's turn.
 */
function nextTurn() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    updateUI();

    if (gameState.api.preloadQuestions) {
        gameState.api.preloadQuestions();
    }

    UI.diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
    UI.diceElement.disabled = false;
    saveGameState();
    UI.diceResultDiv.classList.add('hint-pulsate');
}

/**
 * Checks if a player has met the win condition (collected all 6 wedges).
 */
function checkWinCondition() {
    const winner = gameState.players.find(p => p.wedges.length === gameState.categories.length);
    if (winner) {
        UI.gameScreen.classList.add('hidden');
        UI.winnerScreen.classList.remove('hidden');
        UI.winnerNameSpan.textContent = winner.name;
    }
}


// --- ANSWER HANDLING & VERIFICATION ---

/**
 * Handles an answer submission in Multiple Choice Question (MCQ) mode.
 * @param {string} selectedOption - The text of the selected answer option.
 */
function handleMcqAnswer(selectedOption) {
    hideModal();
    setTimeout(() => showVerificationPopup(selectedOption, gameState.currentQuestionData.answer), 300);
}

/**
 * Handles an answer submission in open-ended answer mode.
 */
function handleOpenAnswer() {
    const userAnswer = UI.answerInput.value.trim();
    if (!userAnswer) {
        showNotification({ title: "Input Error", body: translations.empty_answer_error[gameState.currentLanguage] }, 'error');
        return;
    }
    hideModal();
    setTimeout(() => showVerificationPopup(userAnswer, gameState.currentQuestionData.answer), 300);
}

/**
 * Processes the result of a manual answer verification (correct/incorrect).
 * @param {boolean} isCorrect - Whether the player's answer was deemed correct.
 */
async function handleManualVerification(isCorrect) {
    gameState.lastAnswerWasCorrect = isCorrect;
    const player = gameState.players[gameState.currentPlayerIndex];
    const square = gameState.board.find(s => s.id === player.position);
    const categoryIndex = gameState.currentForcedCategoryIndex !== null ? gameState.currentForcedCategoryIndex : square.categoryIndex;
    const oldCategory = gameState.categories[categoryIndex];

    if (oldCategory && gameState.currentQuestionData.subcategory) {
        if (!gameState.categoryTopicHistory[oldCategory] || Array.isArray(gameState.categoryTopicHistory[oldCategory])) {
            gameState.categoryTopicHistory[oldCategory] = { subcategories: [], entities: [] };
        }

        const history = gameState.categoryTopicHistory[oldCategory];
        const newSubcategory = gameState.currentQuestionData.subcategory;
        if (!history.subcategories.includes(newSubcategory)) {
            history.subcategories.push(newSubcategory);
        }
        if (Array.isArray(gameState.currentQuestionData.key_entities)) {
            gameState.currentQuestionData.key_entities.forEach(entity => {
                if (!history.entities.includes(entity)) {
                    history.entities.push(entity);
                }
            });
        }

        if (history.subcategories.length > CONFIG.MAX_SUBCATEGORY_HISTORY_ITEMS) {
            history.subcategories = history.subcategories.slice(-CONFIG.MAX_SUBCATEGORY_HISTORY_ITEMS);
        }
        if (history.entities.length > CONFIG.MAX_ENTITY_HISTORY_ITEMS) {
            history.entities = history.entities.slice(-CONFIG.MAX_ENTITY_HISTORY_ITEMS);
        }

        localStorage.setItem('globalQuizHistory', JSON.stringify(gameState.categoryTopicHistory));
    }

    UI.verificationButtons.classList.add('hidden');
    UI.postVerificationButtons.classList.remove('hidden');

    const shouldMutate = isCorrect &&
                         square.type === CONFIG.SQUARE_TYPES.HQ &&
                         !player.wedges.includes(oldCategory) &&
                         gameState.mutateCategories;

    if (shouldMutate) {
        UI.standardPopupContent.classList.add('hidden');
        UI.mutationContent.classList.remove('hidden');
        UI.mutationLoader.classList.remove('hidden');
        UI.mutationButtons.classList.add('hidden');
        UI.closePopupBtn.classList.add('hidden');

        try {
            const otherCategories = gameState.categories.filter(c => c !== oldCategory);
            const choices = await gameState.api.getCategoryMutationChoices(oldCategory, otherCategories);

            UI.mutationLoader.classList.add('hidden');
            UI.mutationButtons.classList.remove('hidden');
            UI.mutationButtons.innerHTML = '';

            if (!Array.isArray(choices)) throw new Error("Invalid choices received from API");

            choices.forEach(choice => {
                const button = document.createElement('button');
                button.className = 'w-full p-4 text-white rounded-lg transition-transform hover:scale-105 text-left';
                button.style.backgroundColor = CONFIG.CATEGORY_COLORS[categoryIndex];
                button.innerHTML = `<span class="block font-bold text-lg">${choice.name || ""}</span><p class="text-sm font-normal opacity-90 mt-1">${choice.description || ""}</p>`;
                button.onclick = () => {
                    const newCategoryName = choice.name;
                    gameState.categories[categoryIndex] = newCategoryName;
                    player.wedges.push(newCategoryName);
                    renderCategoryLegend();
                    delete gameState.categoryTopicHistory[oldCategory];
                    if (!gameState.categoryTopicHistory[newCategoryName]) {
                        gameState.categoryTopicHistory[newCategoryName] = { subcategories: [], entities: [] };
                    }
                    showNotification({ title: translations.category_mutated[gameState.currentLanguage], body: translations.new_category_msg[gameState.currentLanguage].replace('{old_cat}', oldCategory).replace('{new_cat}', newCategoryName) }, 'info');

                    closePopupAndContinue();
                };
                UI.mutationButtons.appendChild(button);
            });
        } catch (error) {
            console.error("Category mutation failed:", error);
            player.wedges.push(oldCategory); // As a fallback, award the wedge for the old category.
            showNotification({ title: translations.api_error[gameState.currentLanguage], body: "Failed to mutate category." }, 'error');
            closePopupAndContinue();
        }
    } else {
        // Standard flow (no mutation).
        if (isCorrect && square.type === CONFIG.SQUARE_TYPES.HQ) {
            if (oldCategory && !player.wedges.includes(oldCategory)) {
                player.wedges.push(oldCategory);
            }
        }
        UI.explanationContainer.classList.remove('hidden');
        if (!isCorrect) {
            UI.incorrectExplanationContainer.classList.remove('hidden');
            UI.incorrectExplanationLoader.classList.remove('hidden');
            try {
                const explanation = await gameState.api.getIncorrectAnswerExplanation();
                UI.incorrectExplanationText.textContent = explanation;
            } catch (error) {
                console.error("Incorrect answer explanation error:", error);
                UI.incorrectExplanationText.textContent = translations.incorrect_answer_analysis_error[gameState.currentLanguage];
            } finally {
                UI.incorrectExplanationLoader.classList.add('hidden');
            }
        }
    }
}


// --- MODALS & POPUPS ---

/**
 * Displays the modal for choosing a category (used when on the HUB square).
 */
function promptCategoryChoice() {
    UI.categoryChoiceButtons.innerHTML = '';
    gameState.categories.forEach((cat, index) => {
        const button = document.createElement('button');
        button.textContent = cat;
        button.className = 'w-full p-3 text-white font-semibold rounded-lg transition-transform hover:scale-105';
        button.style.backgroundColor = CONFIG.CATEGORY_COLORS[index];
        button.onclick = () => {
            UI.categoryChoiceModal.classList.remove('visible');
            askQuestion(index);
        };
        UI.categoryChoiceButtons.appendChild(button);
    });
    UI.categoryChoiceModal.classList.add('visible');
}

/**
 * Displays the popup for answer verification.
 * @param {string} playerAnswer - The player's submitted answer.
 * @param {string} correctAnswer - The correct answer from the question data.
 */
function showVerificationPopup(playerAnswer, correctAnswer) {
    UI.playerAnswerText.textContent = playerAnswer;
    UI.correctAnswerText.textContent = correctAnswer;
    gameState.currentPlayerAnswer = playerAnswer;

    UI.explanationContainer.classList.add('hidden');
    UI.incorrectExplanationContainer.classList.add('hidden');
    UI.incorrectExplanationText.textContent = '';

    UI.explanationText.textContent = gameState.currentQuestionData.explanation;
    UI.verificationButtons.classList.remove('hidden');
    UI.postVerificationButtons.classList.add('hidden');
    UI.answerPopupTitle.textContent = translations.answer_evaluation[gameState.currentLanguage];

    showAnswerPopup();
}

/**
 * Displays the answer verification popup with a transition.
 */
function showAnswerPopup() {
    UI.answerPopup.classList.remove('hidden');
    setTimeout(() => {
        UI.answerPopup.classList.remove('opacity-0', 'scale-90');
    }, 10);
}

/**
 * Closes the answer verification popup and continues the game.
 */
function closePopupAndContinue() {
    UI.answerPopup.classList.add('opacity-0', 'scale-90');
    setTimeout(() => {
        UI.answerPopup.classList.add('hidden');
        UI.standardPopupContent.classList.remove('hidden');
        UI.mutationContent.classList.add('hidden');
        UI.closePopupBtn.classList.remove('hidden');
    }, 500);

    if (gameState.lastAnswerWasCorrect) {
        UI.diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
        UI.diceElement.disabled = false;
    } else {
        nextTurn();
    }
    updateUI();
    checkWinCondition();
    saveGameState();
}

/**
 * Shows or hides the main question modal.
 * @param {boolean} show - True to show, false to hide.
 */
function showModal(show) {
    if (show) {
        UI.questionModal.classList.add('visible');
        setTimeout(() => UI.modalContent.classList.remove('scale-95', 'opacity-0'), 10);
    } else {
        UI.modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => UI.questionModal.classList.remove('visible'), 300);
    }
}

/**
 * A convenience function to hide the question modal with proper cleanup.
 */
function hideModal() {
    showModal(false);
    setTimeout(() => { if (UI.modalContent) UI.modalContent.style.borderTopColor = 'transparent'; }, 300);
}

/**
 * Renders the prompt history in its dedicated modal.
 */
function renderPromptHistory() {
    UI.historyContent.innerHTML = '';
    const lang = gameState.currentLanguage;

    if (gameState.promptHistory.length === 0) {
        UI.historyContent.textContent = translations.history_empty[lang];
        return;
    }

    const fragment = document.createDocumentFragment();
    gameState.promptHistory.slice().reverse().forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'p-4 border rounded-lg bg-gray-50';

        const promptTitle = document.createElement('h4');
        promptTitle.className = 'font-semibold text-gray-800';
        promptTitle.textContent = `${translations.history_prompt_title[lang]} #${gameState.promptHistory.length - index}`;

        const promptPre = document.createElement('pre');
        promptPre.className = 'mt-2 p-3 bg-gray-200 text-sm text-gray-700 rounded-md overflow-x-auto whitespace-pre-wrap';
        const promptCode = document.createElement('code');
        promptCode.textContent = entry.prompt;
        promptPre.appendChild(promptCode);

        const responseTitle = document.createElement('h4');
        responseTitle.className = 'mt-4 font-semibold text-gray-800';
        responseTitle.textContent = translations.history_response_title[lang];

        const responsePre = document.createElement('pre');
        responsePre.className = 'mt-2 p-3 bg-blue-100 text-sm text-blue-800 rounded-md overflow-x-auto whitespace-pre-wrap';
        const responseCode = document.createElement('code');
        responseCode.textContent = entry.response;
        responsePre.appendChild(responseCode);

        entryDiv.append(promptTitle, promptPre, responseTitle, responsePre);
        fragment.appendChild(entryDiv);
    });

    UI.historyContent.appendChild(fragment);
}

/** Shows the prompt history modal. */
function showHistoryModal() {
    UI.historyModalTitle.textContent = translations.history_modal_title[gameState.currentLanguage];
    renderPromptHistory();
    UI.historyModal.classList.add('visible');
}

/** Hides the prompt history modal. */
function hideHistoryModal() {
    UI.historyModal.classList.remove('visible');
}


// --- GAME STATE PERSISTENCE ---

/**
 * Saves the essential game state to localStorage.
 */
function saveGameState() {
    const stateToSave = getCleanedState();
    localStorage.setItem('savedQuizGame', JSON.stringify(stateToSave));
    console.log("Game state saved (optimized).", new Date().toLocaleTimeString());
}

/**
 * Loads the game state from localStorage.
 * @returns {object|null} The loaded game state object, or null if not found.
 */
function loadGameState() {
    const savedState = localStorage.getItem('savedQuizGame');
    if (savedState) {
        console.log("Found saved game state. Loading...");
        return JSON.parse(savedState);
    }
    return null;
}

/**
 * Restarts the game by clearing saved state and reloading the page.
 */
function restartGame() {
    if (confirm(translations.restart_game_confirm[gameState.currentLanguage])) {
        localStorage.removeItem('savedQuizGame');
        window.location.reload();
    }
}

/**
 * Triggers a download of the current game state as a JSON file.
 */
function downloadGameState() {
    const stateToSave = getCleanedState();
    const jsonString = JSON.stringify(stateToSave, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-");
    link.download = `trivia_save_${timestamp}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Handles the user uploading a game state file.
 * @param {Event} event - The file input change event.
 */
function handleStateUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loadedState = JSON.parse(e.target.result);
            if (loadedState && loadedState.players && loadedState.categories) {
                restoreGameState(loadedState);
                showNotification({ title: "Success", body: translations.game_loaded_success[gameState.currentLanguage] }, 'success');
            } else {
                throw new Error("Invalid game state format.");
            }
        } catch (error) {
            console.error("Failed to load or parse game state:", error);
            showNotification({ title: "Error", body: translations.game_loaded_error[gameState.currentLanguage] }, 'error');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file, 'UTF-8');
}

/**
 * Restores the game from a loaded state object.
 * @param {object} stateToRestore - The game state object to load.
 */
function restoreGameState(stateToRestore) {
    Object.assign(gameState, stateToRestore);

    if (!gameState.gameId) {
        console.warn("Loaded game state is missing a gameId. Generating a new one.");
        gameState.gameId = generateGameId();
    }


    gameState.isAwaitingMove = false;
    gameState.lastAnswerWasCorrect = false;

    createBoardLayout();
    setLanguage(gameState.currentLanguage);

    UI.setupScreen.classList.add('hidden');
    UI.gameScreen.classList.remove('hidden');

    const oldSvg = UI.boardWrapper.querySelector('.board-connections');
    if (oldSvg) oldSvg.remove();

    renderBoard();
    renderCategoryLegend();
    updateUI();

    UI.diceElement.disabled = false;
    UI.diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
    UI.gameMessageDiv.textContent = '';
}

/**
 * Creates a "clean" version of the game state for saving.
 * This removes transient, reconstructible, or sensitive data.
 * @returns {object} The cleaned game state object.
 */
function getCleanedState() {
    const stateToSave = JSON.parse(JSON.stringify(gameState));

    const excludeKeys = [
        'api', 'promptHistory', 'possiblePaths', 'currentQuestionData',
        'currentForcedCategoryIndex', 'currentPlayerAnswer', 'isAwaitingMove',
        'lastAnswerWasCorrect', 'board'
    ];
    excludeKeys.forEach(key => delete stateToSave[key]);

    if (stateToSave.categoryTopicHistory && stateToSave.categories) {
        const currentCategories = new Set(stateToSave.categories);
        const cleanedHistory = {};
        for (const categoryName in stateToSave.categoryTopicHistory) {
            if (currentCategories.has(categoryName)) {
                cleanedHistory[categoryName] = stateToSave.categoryTopicHistory[categoryName];
            }
        }
        stateToSave.categoryTopicHistory = cleanedHistory;
    }

    return stateToSave;
}

/**
 * Sets up the side menu panel for game options.
 */
function setupGameMenu() {
    const openBtn = UI.openGameMenuBtn;
    const panel = UI.gameMenuPanel;
    const overlay = UI.gameMenuOverlay;

    function closeMenu() {
        panel.classList.remove('visible');
        overlay.classList.remove('visible');
    }

    function openMenu() {
        panel.classList.add('visible');
        overlay.classList.add('visible');
    }

    if(openBtn) openBtn.addEventListener('click', openMenu);
    if(overlay) overlay.addEventListener('click', closeMenu);

    if(UI.showHistoryBtn) {
        UI.showHistoryBtn.addEventListener('click', () => {
            closeMenu();
            showHistoryModal();
        });
    }
}


// --- MAIN INITIALIZATION ---

/**
 * Initializes the entire application, sets up event listeners, and injects the API adapter.
 * @param {object} apiAdapter - An object with methods for communicating with the backend.
 */
export function initializeApp(apiAdapter) {
    gameState.api = apiAdapter;

    const urlParams = new URLSearchParams(window.location.search);
    const shouldLoadGame = urlParams.get('loadGame') === 'true';
    const savedGame = loadGameState();

    if (savedGame) {
        UI.loadGameBtn.classList.remove('hidden');
        UI.loadGameBtn.addEventListener('click', () => {
            restoreGameState(savedGame);
        });
    }

    // Initialize API adapter if needed
    if (gameState.api.loadSettings) {
        gameState.api.loadSettings();
    }

    if (shouldLoadGame && savedGame) {
        restoreGameState(savedGame);
    } else {
        setLanguage(localStorage.getItem('trivia_lang') || 'pl');
    }

    // // --- EVENT LISTENERS ---
    // window.addEventListener('DOMContentLoaded', () => {
    //
    // });

    UI.langPlBtn.addEventListener('click', () => setLanguage('pl'));
    UI.langEnBtn.addEventListener('click', () => setLanguage('en'));
    UI.gameModeSelect.addEventListener('change', updateDescriptions);
    UI.knowledgeLevelSelect.addEventListener('change', updateDescriptions);
    UI.includeThemeToggle.addEventListener('change', () => {
        if (gameState.api.saveSettings) gameState.api.saveSettings();
    });
    UI.mutateCategoriesToggle.addEventListener('change', () => { if (gameState.api.saveSettings) gameState.api.saveSettings(); });
    UI.generateCategoriesBtn.addEventListener('click', generateCategories);
    UI.regenerateQuestionBtn.addEventListener('click', () => askQuestion(gameState.currentForcedCategoryIndex));
    UI.popupRegenerateBtn.addEventListener('click', () => {
        UI.answerPopup.classList.add('opacity-0', 'scale-90');
        setTimeout(() => UI.answerPopup.classList.add('hidden'), 500);
        askQuestion(gameState.currentForcedCategoryIndex);
    });

      UI.modelSelect.addEventListener('change', (e) => {
        updateModelSelection(e.target.value);
        if (gameState.api.saveSettings) {
            gameState.api.saveSettings();
        }
    });

    UI.gameMenuModelSelect.addEventListener('change', (e) => {
        updateModelSelection(e.target.value);
        if (gameState.api.saveSettings) {
            gameState.api.saveSettings();
        }
    });

    UI.playerCountInput.addEventListener('input', updatePlayerNameInputs);
    UI.startGameBtn.addEventListener('click', initializeGame);
    UI.diceElement.addEventListener('click', rollDice);
    UI.submitAnswerBtn.addEventListener('click', handleOpenAnswer);
    UI.answerInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleOpenAnswer(); });
    UI.acceptAnswerBtn.addEventListener('click', () => handleManualVerification(true));
    UI.rejectAnswerBtn.addEventListener('click', () => handleManualVerification(false));
    UI.closePopupBtn.addEventListener('click', closePopupAndContinue);
    UI.closeHistoryBtn.addEventListener('click', hideHistoryModal);
    UI.restartGameBtn.addEventListener('click', restartGame);
    UI.downloadStateBtn.addEventListener('click', downloadGameState);
    UI.uploadStateInput.addEventListener('change', handleStateUpload);
    UI.closeSuggestionModalBtn.addEventListener('click', () => {
        UI.suggestionModal.classList.add('hidden');
    });
    UI.suggestionModalTitle.textContent = translations.suggestion_modal_title[gameState.currentLanguage];
    UI.playAgainBtn.addEventListener('click', () => {
        UI.winnerScreen.classList.add('hidden');
        UI.setupScreen.classList.remove('hidden');
        const oldSvg = UI.boardWrapper.querySelector('.board-connections');
        if (oldSvg) oldSvg.remove();
    });

    document.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-panel.active').forEach(panel => {
            if (!panel.parentElement.contains(e.target)) {
                panel.classList.remove('active');
            }
        });
    });

    // Initialize the side menu
    setupGameMenu();
}
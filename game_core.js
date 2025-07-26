/**
 * @file game_core.js
 * This file contains the core logic for the trivia board game, including setup,
 * game state management, UI rendering, game flow, and interaction with the
 * language model API.
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
    // // The maximum number of subcategory topics to remember per category to avoid repetition
    // MAX_SUBCATEGORY_HISTORY: 10,
    // The maximum number of 'history items' to remember per category to avoid repetition
    MAX_HISTORY_ITEMS_PER_CATEGORY: 25,
    // A list of emojis available for player tokens
    EMOJI_OPTIONS: ['😀', '🚀', '🦄', '🤖', '🦊', '🧙', '👽', '👾', '👻', '👑', '💎', '🍕', '🍔', '⚽️', '🏀', '🎸', '🎨', '🎭', '🎬', '🎤', '🎮', '💻', '💡', '🧪', '🌍', '🏛️', '🏰', '🗿', '🛸']
};

// --- UI ELEMENTS ---
// This object centralizes all DOM element selections for easy access and management.
const UI = {
    setupScreen: document.getElementById('setup-screen'),
    gameScreen: document.getElementById('game-screen'),
    winnerScreen: document.getElementById('winner-screen'),
    langPlBtn: document.getElementById('lang-pl'),
    langEnBtn: document.getElementById('lang-en'),
    gameModeSelect: document.getElementById('game-mode'),
    gameModeDescription: document.getElementById('game-mode-description'),
    knowledgeLevelSelect: document.getElementById('knowledge-level'),
    knowledgeLevelDescription: document.getElementById('knowledge-level-description'),
    themeInput: document.getElementById('theme-input'),
    generateCategoriesBtn: document.getElementById('generate-categories-btn'),
    categoriesContainer: document.getElementById('categories-container'),
    playerCountInput: document.getElementById('player-count'),
    playerNamesContainer: document.getElementById('player-names-container'),
    temperatureSlider: document.getElementById('temperature-slider'),
    temperatureValueSpan: document.getElementById('temperature-value'),
    includeThemeToggle: document.getElementById('include-theme-toggle'),
    mutateCategoriesToggle: document.getElementById('mutate-categories-toggle'),
    startGameBtn: document.getElementById('start-game-btn'),
    boardWrapper: document.querySelector('.board-wrapper'),
    boardElement: document.getElementById('board'),
    categoryLegend: document.getElementById('category-legend'),
    currentPlayerNameSpan: document.getElementById('current-player-name'),
    playerScoresContainer: document.getElementById('player-scores'),
    diceResultDiv: document.getElementById('dice-result'),
    diceElement: document.getElementById('dice'),
    rollDiceBtn: document.getElementById('roll-dice-btn'),
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
    showHistoryBtn: document.getElementById('show-history-btn'),
    historyModal: document.getElementById('history-modal'),
    closeHistoryBtn: document.getElementById('close-history-btn'),
    historyContent: document.getElementById('history-content'),
    historyModalTitle: document.getElementById('history-modal-title'),
    restartGameBtn: document.getElementById('restart-game-btn'),
    downloadStateBtn: document.getElementById('download-state-btn'),
    uploadStateInput: document.getElementById('upload-state-input'),
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
 */
export const translations = {
    setup_title: { pl: "Ustawienia Zaawansowane", en: "Advanced Settings" },
    gemini_api_key_label: { pl: "Klucz API Google Gemini:", en: "Google Gemini API Key:" },
    gemini_api_key_placeholder: { pl: "Wklej swój klucz API", en: "Paste your API key" },
    gemini_api_key_help: { pl: "Gdzie znaleźć klucz?", en: "Where to find the key?" },
    lm_studio_url_label: { pl: "Adres serwera LM Studio:", en: "LM Studio Server URL:" },
    lm_studio_url_placeholder: { pl: "np. http://localhost:1234/v1/chat/completions", en: "e.g., http://localhost:1234/v1/chat/completions" },
    lm_studio_help: { pl: "Upewnij się, że serwer LM Studio jest uruchomiony. Sugerowany model: Gemma 3 (>=4B)", en: "Make sure the LM Studio server is running. Suggested model: Gemma 3 (>=4B)" },
    model_label: { pl: "Model Językowy:", en: "Language Model:" },
    temperature_label: { pl: "Temperatura:", en: "Temperature:" },
    refresh_models_title: { pl: "Odśwież listę modeli", en: "Refresh model list" },
    api_key_alert: { pl: "Proszę podać klucz API.", en: "Please provide an API key." },
    lm_studio_url_alert: { pl: "Proszę podać adres serwera LM Studio.", en: "Please provide the LM Studio server URL." },
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
    creative_words: {
        pl: [
            'Przyczyna', 'Skutek', 'Proces', 'Wpływ', 'Kontekst', 'Struktura',
            'Ewolucja', 'Funkcja', 'Porównanie', 'Kontrast', 'Symbol', 'Narzędzie',
            'Mit', 'Początek', 'Przyszłość', 'Interakcja', 'Perspektywa', 'Anomalia',
            'Zależność', 'Hierarchia', 'Transformacja', 'Cykl', 'Punkt zwrotny',
            'Tradycja', 'Znaczenie', 'Ograniczenie', 'Potencjał', 'Zasada',
            'Adaptacja', 'Innowacja'
        ],
        en: [
            'Cause', 'Effect', 'Process', 'Impact', 'Context', 'Structure',
            'Evolution', 'Function', 'Comparison', 'Contrast', 'Symbol', 'Tool',
            'Myth', 'Origin', 'Future', 'Interaction', 'Perspective', 'Anomaly',
            'Dependence', 'Hierarchy', 'Transformation', 'Cycle', 'Turning point',
            'Tradition', 'Significance', 'Limitation', 'Potential', 'Principle',
            'Adaptation', 'Innovation'
        ]
    },
    single_category_generation_prompt: {
        pl: `Jesteś BARDZO kreatywnym mistrzem gry. Twoim zadaniem jest stworzenie JEDNEJ świeżej, zaskakującej i unikalnej kategorii do quizu na podstawie motywu: "{theme}".\n\n# Kryteria:\n- Nazwa kategorii musi zawierać od 1 do 3 słów.\n- Kategoria NIE MOŻE być jedną z już istniejących: {existing_categories}.\n\n# Kreatywny katalizator (użyj jako inspiracji):\n{creative_word}\n\nZwróć odpowiedź WYŁĄCZNIE jako obiekt JSON w formacie: {"category": "Twoja unikalna kategoria"}`,
        en: `You are a VERY creative game master. Your task is to create ONE fresh, surprising, and unique quiz category based on the theme: "{theme}".\n\n# Criteria:\n- The category name must be 1-3 words long.\n- The category MUST NOT be one of the already existing ones: {existing_categories}.\n\n# Creative Catalyst (use as inspiration):\n{creative_word}\n\nReturn the response ONLY as a JSON object in the format: {"category": "Your unique category"}`
    },
    broad_single_category_prompt: {
        pl: `Jesteś mistrzem gry w popularnym teleturnieju. Twoim zadaniem jest stworzenie JEDNEJ, szerokiej i intuicyjnej kategorii do quizu na podstawie motywu: "{theme}". Kategoria powinna być zrozumiała dla każdego.\n\n# Przykład dla motywu "Kuchnia":\n- Dobre odpowiedzi: "Desery", "Wina", "Techniki gotowania", "Smaki świata"\n- Złe odpowiedzi: "Molekularna dekonstrukcja smaku", "Kulinarny symbolizm w baroku"\n\n# Kryteria:\n- Nazwa kategorii musi zawierać od 1 do 4 słów.\n- Kategoria NIE MOŻE być jedną z już istniejących: {existing_categories}.\n\nZwróć odpowiedź WYŁĄCZNIE jako obiekt JSON w formacie: {"category": "Twoja szeroka kategoria"}`,
        en: `You are a game master for a popular TV quiz show. Your task is to create ONE broad and intuitive quiz category based on the theme: "{theme}". The category should be understandable to a general audience.\n\n# Example for the theme "Kitchen":\n- Good answers: "Desserts", "Wines", "Cooking Techniques", "World Flavors"\n- Bad answers: "Molecular Deconstruction of Flavor", "Culinary Symbolism in the Baroque Period"\n\n# Criteria:\n- The category name must be 1-4 words long.\n- The category MUST NOT be one of the already existing ones: {existing_categories}.\n\nReturn the response ONLY as a JSON object in the format: {"category": "Your broad category"}`
    },
    category_generation_prompt: {
        pl: `Jesteś BARDZO kreatywnym mistrzem gry. Twoim zadaniem jest stworzenie zestawu 6 świeżych, zaskakujących i unikalnych kategorii do quizu na podstawie motywu: "{theme}". Unikaj typowych, oczywistych skojarzeń.\n\nKryteria:\n1.  **Zwięzłość**: Każda nazwa kategorii musi zawierać od jednego do trzech słów.\n2.  **Różnorodność**: Unikaj generowania kategorii, które już istnieją.\n\nIstniejące kategorie, których należy unikać: {existing_categories}\n\nKreatywny katalizator (użyj jako inspiracji, by stworzyć coś niepowtarzalnego): {creative_word}\n\nZwróć odpowiedź WYŁĄCZNIE jako obiekt JSON z jednym kluczem "categories". Przykład: {"categories": ["A", "B", "C", "D", "E", "F"]}`,
        en: `You are a VERY creative game master. Your task is to create a set of 6 fresh, surprising, and unique quiz categories based on the theme: "{theme}". Avoid typical, obvious associations.\n\nCriteria:\n1.  **Brevity**: Each category name must contain from one to three words.\n2.  **Variety**: Avoid generating categories that already exist.\n\nExisting categories to avoid: {existing_categories}\n\nCreative Catalyst (use as inspiration to create something unique): {creative_word}\n\nReturn the response ONLY as a JSON object with a single key "categories". Example: {"categories": ["A", "B", "C", "D", "E", "F"]}`
    },
    question_prompt: {
        pl: {
            persona: "Wciel się w rolę doświadczonego mistrza teleturnieju. Twoim zadaniem jest stworzenie JEDNEGO, wysokiej jakości, obiektywnego pytania quizowego.",
            chain_of_thought: `
            # PROCES MYŚLOWY (Chain of Thought):
            Zanim podasz ostateczną odpowiedź w formacie JSON, przeprowadź wewnętrzny proces myślowy. Krok po kroku:
            1.  **Analiza Kontekstu:** Rozważ podaną kategorię, motyw, poziom trudności i słowa-inspiracje.
            2.  **Burza Mózgów:** Wymyśl 3-5 wstępnych pomysłów na pytania, które pasują do kontekstu.
            3.  **Selekcja i Udoskonalenie:** Porównaj swoje pomysły z listą tematów do unikania. Wybierz ten pomysł, który jest **najbardziej odległy tematycznie** od tej listy, **ale jednocześnie ściśle trzyma się głównej kategorii**. Udoskonal pytanie.
            4.  **Weryfikacja i Korekta:** Przejrzyj wybrane pytanie, odpowiedź i opcje. Sprawdź je KROK PO KROKU pod kątem WSZYSTKICH reguł (zwłaszcza reguły 'ZAKAZ POWTÓRZEŃ' i krytycznej zasady, że odpowiedź nie może być w pytaniu). Jeśli jakakolwiek reguła jest złamana, **POPRAW** treść, aby była w pełni zgodna.`,
            context_header: "\n# KONTEKST I REGUŁY DO ZASTOSOWANIA:",
            context_lines: [
                "- Kategoria: \"{category}\"",
                "- Poziom trudności: {knowledge_prompt}",
                "- Tryb gry: {game_mode_prompt}",
                "- Motyw przewodni: {theme_context}",
                "- Słowa-inspiracje (użyj jako luźnego skojarzenia): {inspirational_words}"
            ],
            rules: [
                "**JĘZYK WYJŚCIOWY:** Cała zawartość finalnego obiektu JSON (pytanie, odpowiedź, opcje, wyjaśnienie) MUSI być w języku {language_name}.",
                "**DEFINIUJ SUBKATEGORIĘ:** Dla każdego pytania zdefiniuj jedno- lub dwuwyrazową, precyzyjną subkategorię (np. dla 'Historii' -> 'Starożytny Rzym').",
                "**ZAKAZ POWTÓRZEŃ:** Pytanie nie może dotyczyć następujących, ostatnio użytych tematów i nazw własnych: {avoidance_list_prompt}. Wygeneruj pytanie z zupełnie innej dziedziny.",
                "**ZASADA KRYTYCZNA:** Tekst pytania NIE MOŻE zawierać słów tworzących poprawną odpowiedź.",
                "**WYODRĘBNIJ NAZWY WŁASNE:** Zidentyfikuj kluczowe nazwy własne (np. tytuły seriali, miejsca, imiona i nazwiska) w treści pytania, odpowiedzi i wyjaśnienia, a następnie umieść je w tablicy 'key_entities'.",
                "**JAKOŚĆ OPCJI (dla MCQ):** Błędne opcje muszą być wiarygodne i bazować na częstych pomyłkach. Jedna opcja MUSI być poprawna.",
                "**OBIEKTYWIZM:** Pytanie musi być oparte na weryfikowalnych faktach i mieć jedną, bezspornie poprawną odpowiedź.",
                "**SPÓJNOŚĆ:** Pytanie musi ściśle trzymać się podanej kategorii."
            ],
            output_format: `\n# OSTATECZNY WYNIK:\nWypisz wewnętrzny proces myślowowy, następnie zwróć odpowiedź jako jeden, czysty obiekt JSON o strukturze:\n{\n  "question": "...",\n  "answer": "...",\n  "explanation": "...",\n  "subcategory": "Precyzyjna subkategoria...",\n  "options": ["...", "...", "...", "..."]\n}`
        },
        en: {
            persona: "Embody the role of an experienced quiz show master. Your task is to create ONE high-quality, objective quiz question.",
            chain_of_thought: `
            # CHAIN OF THOUGHT PROCESS:
            Before providing the final JSON output, conduct an internal thought process. Step by step:
            1.  **Analyze Context:** Consider the given category, theme, difficulty level, and inspirational words.
            2.  **Brainstorm:** Come up with 3-5 initial ideas for questions that fit the context.
            3.  **Select & Refine:** Compare your ideas against the list of topics to avoid. Choose the idea that is **most thematically distant** from that list, **while still strictly adhering to the main category**. Refine the question.
            4.  **Verification and Correction:** Review the selected question, answer, and options. Check them STEP-BY-STEP against ALL the rules (especially the 'NO REPETITION' rule and the critical rule that the answer cannot be in the question). If any rule is violated, **CORRECT** the content to be fully compliant.`,
            context_header: "\n# CONTEXT AND RULES TO APPLY:",
            context_lines: [
                "- Category: \"{category}\"",
                "- Difficulty Level: {knowledge_prompt}",
                "- Game Mode: {game_mode_prompt}",
                "- Main Theme: {theme_context}",
                "- Inspirational Words (use as a loose association): {inspirational_words}"
            ],
            rules: [
                "**OUTPUT LANGUAGE:** The entire content of the final JSON object (question, answer, options, explanation) MUST be in {language_name}.",
                "**DEFINE SUBCATEGORY:** For each question, define a precise, one or two-word subcategory (e.g., for 'History' -> 'Ancient Rome').",
                "**EXTRACT PROPER NOUNS:** Identify key proper nouns (e.g., series titles, places, full names) within the question, answer, and explanation, then place them in the 'key_entities' array.",
                "**NO REPETITION:** The question must not be about the following, recently used topics and proper nouns: {avoidance_list_prompt}. Generate a question from a completely different domain.",
                "**CRITICAL RULE:** The question text MUST NOT contain the words that make up the correct answer.",
                "**OPTION QUALITY (for MCQ):** Incorrect options must be plausible and based on common misconceptions. One option MUST be correct.",
                "**OBJECTIVITY:** The question must be based on verifiable facts and have a single, indisputably correct answer.",
                "**CONSISTENCY:** The question must strictly adhere to the given category."
            ],
            output_format: `\n# FINAL OUTPUT:\nWrite your internal thought process, after that return the response as a single, clean JSON object with the structure:\n{\n  "question": "...",\n  "answer": "...",\n  "explanation": "...",\n  "subcategory": "Precise subcategory...",\n  "options": ["...", "...", "...", "..."]\n}`
        }
    },
    batch_category_prompt_cot: {
        pl: `Jesteś kreatywnym mistrzem teleturnieju. Twoim zadaniem jest stworzenie JEDNEGO zestawu 6 szerokich, ciekawych i intuicyjnych kategorii do quizu na podstawie podanego motywu.

# PROCES MYŚLOWY (Chain of Thought):
Zanim sformułujesz ostateczny JSON, przeprowadź wewnętrzny proces myślowy:
1.  **Analiza Motywu:** Głęboko przeanalizuj motyw: "{theme}". Jakie są jego kluczowe aspekty, postacie, miejsca, koncepcje?
2.  **Burza Mózgów:** Wypisz listę 10-12 potencjalnych pomysłów na kategorie.
3.  **Selekcja i Dywersyfikacja:** Z tej listy wybierz 6 NAJLEPSZYCH opcji. Upewnij się, że są one od siebie RÓŻNORODNE, nie pokrywają się zbytnio tematycznie i są wystarczająco szerokie dla ogólnego quizu.

# OSTATECZNY WYNIK:
Po zakończeniu procesu myślowego, najpierw wypisz swoje myśli w tagach <thinking>...</thinking>. Następnie, w nowej linii, bez żadnych dodatkowych słów, zwróć ostateczną odpowiedź jako jeden, czysty obiekt JSON o strukturze:
{
  "categories": ["Kategoria 1", "Kategoria 2", "Kategoria 3", "Kategoria 4", "Kategoria 5", "Kategoria 6"]
}`,
        en: `You are a creative quiz show master. Your task is to create ONE set of 6 broad, interesting, and intuitive quiz categories based on the provided theme.

# CHAIN OF THOUGHT PROCESS:
Before you formulate the final JSON, conduct an internal thought process:
1.  **Theme Analysis:** Deeply analyze the theme: "{theme}". What are its key aspects, characters, places, concepts?
2.  **Brainstorm:** Write a list of 10-12 potential category ideas.
3.  **Selection & Diversification:** From this list, select the 6 BEST options. Ensure they are DIVERSE, do not overlap too much thematically, and are broad enough for a general quiz.

# FINAL OUTPUT:
After your thought process, first write out your thoughts inside <thinking>...</thinking> tags. Then, on a new line, without any other words, return the final answer as a single, clean JSON object with the structure:
{
  "categories": ["Category 1", "Category 2", "Category 3", "Category 4", "Category 5", "Category 6"]
}`
    },
    inspirational_words: {
        pl: ['Wiele', 'Mało', 'Odległe', 'Bliskie', 'Nowe', 'Stare', 'Pierwsze', 'Ostatnie', 'Ukryte', 'Oczywiste', 'Proste', 'Złożone', 'Wielkie', 'Drobne', 'Szybkie', 'Wolne', 'Głośne', 'Ciche', 'Publiczne', 'Prywatne'],
        en: ['Many', 'Few', 'Distant', 'Close', 'New', 'Old', 'First', 'Last', 'Hidden', 'Obvious', 'Simple', 'Complex', 'Great', 'Tiny', 'Fast', 'Slow', 'Loud', 'Quiet', 'Public', 'Private']
    },
    incorrect_answer_explanation_prompt: {
        pl: `Jesteś pomocnym nauczycielem w grze quizowej. Gracz właśnie odpowiedział niepoprawnie. Twoim zadaniem jest wyjaśnienie mu, dlaczego jego odpowiedź była błędna. Bądź zwięzły, empatyczny i edukacyjny.\n\nKontekst:\n- Pytanie: "{question}"\n- Poprawna odpowiedź: "{correct_answer}"\n- Błędna odpowiedź gracza: "{player_answer}"\n\nZadanie:\nNapisz krótkie (1-2 zdania) wyjaśnienie, dlaczego odpowiedź gracza jest niepoprawna. Skup się na błędzie w rozumowaniu gracza lub wskaż kluczową różnicę.\n\nZwróć odpowiedź jako obiekt JSON w formacie: {"explanation": "Twoje wyjaśnienie..."}`,
        en: `You are a helpful teacher in a quiz game. A player has just answered incorrectly. Your task is to explain to them why their answer was wrong. Be concise, empathetic, and educational.\n\nContext:\n- Question: "{question}"\n- Correct answer: "{correct_answer}"\n- Player's incorrect answer: "{player_answer}"\n\nTask:\nWrite a short (1-2 sentences) explanation for why the player's answer is incorrect. Focus on the player's reasoning error or point out the key difference.\n\nReturn the response as a JSON object in the format: {"explanation": "Your explanation..."}`
    },
    category_mutation_prompt: {
        pl: `Jesteś mistrzem gry. Twoim zadaniem jest zaproponowanie TRZECH alternatywnych kategorii, które zastąpią starą kategorię: "{old_category}".

# PROCES MYŚLOWY (Chain of Thought):
1.  **Analiza:** Jaka jest esencja kategorii "{old_category}" i jej związek z motywem gry: "{theme}"?
2.  **Burza Mózgów:** Wypisz 5-6 pomysłów na kategorie, które są rozwinięciem lub alternatywą dla "{old_category}".
3.  **Selekcja:** Wybierz 3 najlepsze pomysły. Upewnij się, że nie powtarzają pozostałych kategorii w grze ({existing_categories}) i że są od siebie różne. Dla każdego sformułuj zwięzły opis.

# OSTATECZNY WYNIK:
Po procesie myślowym zwróć WYŁĄCZNIE obiekt JSON w formacie: {"choices": [{"name": "Nazwa 1", "description": "Opis 1"}, ...]}`,
        en: `You are a game master. Your task is to propose THREE alternative categories to replace the old category: "{old_category}".

# CHAIN OF THOUGHT PROCESS:
1.  **Analysis:** What is the essence of the category "{old_category}" and its relation to the game theme: "{theme}"?
2.  **Brainstorm:** List 5-6 ideas for categories that are an evolution or alternative to "{old_category}".
3.  **Selection:** Choose the 3 best ideas. Ensure they do not repeat the other categories in the game ({existing_categories}) and are distinct from each other. Formulate a concise description for each.

# FINAL OUTPUT:
After your thought process, return ONLY a JSON object in the format: {"choices": [{"name": "Name 1", "description": "Description 1"}, ...]}`
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
    infobox_title: { pl: "Jak działają te opcje?", en: "How do these options work?" },
    infobox_rules_title: { pl: "📜 Zasady Gry", en: "📜 Game Rules" },
    infobox_rules_desc: { 
        pl: `
            <ul class="list-disc list-inside space-y-1 mt-1 mb-2 text-slate-600">
                <li><b>Cel:</b> Zdobądź jako pierwszy "cząstkę" z każdej z 6 kategorii.</li>
                <li><b>Rozgrywka:</b> Rzuć kostką, przesuń pionek i odpowiedz na pytanie z kategorii pola, na którym wylądujesz.</li>
                <li><b>Zdobywanie cząstek:</b> Cząstki zdobywa się za poprawną odpowiedź na polu-matce (duże, okrągłe pole na końcu "ramienia").</li>
                <li><b>Pola specjalne:</b> Pole centralne pozwala wybrać dowolną kategorię, a niektóre pola na pierścieniu pozwalają rzucić kostką jeszcze raz.</li>
            </ul>
        `, 
        en: `
            <ul class="list-disc list-inside space-y-1 mt-1 mb-2 text-slate-600">
                <li><b>Objective:</b> Be the first to collect a "wedge" from each of the 6 categories.</li>
                <li><b>Gameplay:</b> Roll the dice, move your pawn, and answer a question from the category of the square you land on.</li>
                <li><b>Earning Wedges:</b> Wedges are earned for a correct answer on an HQ square (the large, circular square at the end of a spoke).</li>
                <li><b>Special Squares:</b> The center HUB square lets you choose any category, and some squares on the outer ring let you roll the dice again.</li>
            </ul>
        ` 
    },
    infobox_temp_title: { pl: "🌡️ Temperatura", en: "🌡️ Temperature" },
    infobox_temp_desc: { pl: "Kontroluje \"kreatywność\" modelu AI. Niska wartość (np. 0.2) tworzy bardziej przewidywalne i zachowawcze treści. Wysoka wartość (np. 1.2) zachęca do tworzenia bardziej zróżnicowanych i nieoczekiwanych pytań, co może czasem prowadzić do dziwnych wyników.", en: "Controls the \"creativity\" of the AI model. A low value (e.g., 0.2) produces more predictable and conservative content. A high value (e.g., 1.2) encourages more diverse and unexpected questions, which can sometimes lead to strange results." },
    infobox_mutation_title: { pl: "🧬 Mutacja Kategorii", en: "🧬 Category Mutation" },
    infobox_mutation_desc: { pl: "Gdy ta opcja jest włączona, po zdobyciu \"cząstki\" w danej kategorii, kategoria ta zostanie zastąpiona nową, spokrewnioną tematycznie. Utrzymuje to grę świeżą i dynamiczną.", en: "When this option is enabled, after winning a wedge in a category (on an HQ square), that category will be replaced with a new, thematically related one. This keeps the game fresh and dynamic." },
    infobox_theme_title: { pl: "📝 Dodaj Temat do Pytań", en: "📝 Add Theme to Questions" },
    infobox_theme_desc: { pl: "Jeśli wpisano motyw w polu \"Temat do generacji kategorii\", zaznaczenie tej opcji sprawi, że model AI będzie musiał tworzyć pytania, które są związane nie tylko z kategorią (np. \"Historia\"), ale również z głównym motywem gry (np. \"Władca Pierścieni\").", en: "If a theme was entered in the \"Category Generation Theme\" field, checking this option will force the AI model to create questions that relate not only to the category (e.g., \"History\") but also to the main game theme (e.g., \"Lord of the Rings\")." },
    infobox_cors_title: { pl: "🚨 Ważne dla LM Studio (CORS)", en: "🚨 Important for LM Studio (CORS)" },
    infobox_cors_desc: { pl: "Aby ta aplikacja mogła komunikować się z Twoim lokalnym serwerem LM Studio, musisz włączyć w nim obsługę CORS. W LM Studio przejdź do zakładki 'Developer', a następnie w sekcji 'Settings' zaznacz pole 'Enable CORS'. Użytkownicy przeglądarki Safari mogą nadal napotykać problemy, nawet po włączeniu tej opcji.", en: "For this application to communicate with your local LM Studio server, you must enable CORS support. In LM Studio, go to the 'Developer' tab, and in the 'Settings' section, check the 'Enable CORS' box. Safari users may still experience issues even after enabling this option." },
    api_error: { pl: "Błąd API", en: "API Error" },
    fetch_models_error: { pl: "Nie udało się pobrać listy modeli. Sprawdź klucz API i spróbuj ponownie.", en: "Failed to fetch model list. Check your API key and try again." },
    generate_categories_error: { pl: "Nie udało się wygenerować kategorii. Sprawdź ustawienia API i spróbuj ponownie.", en: "Failed to generate categories. Check API settings and try again." },
    category_mutated: { pl: "Kategoria zmutowała!", en: "Category has mutated!" },
    new_category_msg: { pl: '"{old_cat}" zmienia się w "{new_cat}"!', en: '"{old_cat}" changes into "{new_cat}"!' },
    history_modal_title: { pl: "Historia Promptów", en: "Prompt History" },
    history_prompt_title: { pl: "Wysłany Prompt", en: "Sent Prompt" },
    history_response_title: { pl: "Otrzymana Odpowiedź", en: "Received Response" },
    history_empty: { pl: "Historia jest jeszcze pusta.", en: "History is empty." },
    rate_limit_title: { pl: "Przekroczono limit zapytań", en: "Request Limit Exceeded" },
    rate_limit_desc: { pl: "Wykorzystałeś limit zapytań dla obecnego modelu. Wybierz inny model, aby kontynuować grę.", en: "You have used the request limit for the current model. Please choose another model to continue." },
    confirm_choice_btn: { pl: "Zatwierdź wybór", en: "Confirm Choice" },
    download_state_btn: { pl: "Pobierz zapis", en: "Download State" },
    upload_state_btn: { pl: "Wczytaj grę", en: "Load Game" },
    game_loaded_success: { pl: "Gra wczytana pomyślnie!", en: "Game loaded successfully!" },
    game_loaded_error: { pl: "Błąd wczytywania pliku. Upewnij się, że to poprawny plik zapisu.", en: "Error loading file. Make sure it's a valid save file." }
};


// --- UI & NOTIFICATIONS ---

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

    // Manually set placeholders for elements that might not have a `data-lang-key`
    const geminiKeyInput = document.getElementById('gemini-api-key');
    if (geminiKeyInput) geminiKeyInput.placeholder = translations.gemini_api_key_placeholder[lang];

    const lmStudioUrlInput = document.getElementById('lmstudio-url-input');
    if (lmStudioUrlInput) lmStudioUrlInput.placeholder = translations.lm_studio_url_placeholder[lang];

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

/**
 * Populates the category name input fields.
 * @param {string[]} cats - An array of category names.
 */
function updateCategoryInputs(cats) {
    UI.categoriesContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'category-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm';
        input.value = cats[i] || '';
        input.style.borderLeft = `5px solid ${CONFIG.CATEGORY_COLORS[i]}`;
        UI.categoriesContainer.appendChild(input);
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
    if (!gameState.api.isConfigured()) {
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: gameState.api.configErrorMsg }, 'error');
        return;
    }

    const playerCount = parseInt(UI.playerCountInput.value);
    const playerInputs = document.querySelectorAll('#player-names-container > .player-entry');
    const playerNames = Array.from(playerInputs).map(div => div.querySelector('.player-name-input').value || div.querySelector('.player-name-input').placeholder);
    const playerEmojis = Array.from(playerInputs).map(div => div.querySelector('.emoji-button').textContent);
    const categories = Array.from(document.querySelectorAll('#categories-container .category-input')).map(input => input.value.trim());

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
        temperature: parseFloat(UI.temperatureSlider.value),
        currentQuestionData: null,
        categoryTopicHistory: JSON.parse(localStorage.getItem('globalQuizHistory')) || {},
        possiblePaths: {},
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
            color: CONFIG.PLAYER_COLORS[i],
            wedges: []
        });
    }

    createBoardLayout();
    renderBoard();
    renderCategoryLegend();
    updateUI();
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
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: gameState.api.configErrorMsg }, 'error');
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
        if (error.message && error.message.includes('rate limit')) {
            UI.generateCategoriesBtn.textContent = originalBtnText;
            UI.generateCategoriesBtn.disabled = false;
            await promptForModelChange();
            return generateCategories(); // Retry after model change
        }
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
                button.className = "w-full p-3 text-left bg-gray-100 hover:bg-indigo-100 rounded-lg transition-colors";
                button.textContent = option;
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
        if (error.message && error.message.includes('rate limit')) {
            await promptForModelChange();
            return askQuestion(forcedCategoryIndex); // Retry the question generation
        }
        
        // Handle other errors
        UI.llmLoader.classList.add('hidden');
        UI.questionTextP.textContent = translations.question_generation_error[gameState.currentLanguage];
        UI.questionContent.classList.remove('hidden');
        setTimeout(() => {
            hideModal();
            UI.rollDiceBtn.disabled = false;
            UI.rollDiceBtn.classList.remove('opacity-50');
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
    UI.currentPlayerNameSpan.textContent = currentPlayer.name;
    UI.currentPlayerNameSpan.style.color = currentPlayer.color;
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

/**
 * Sets the visual face of the 3D dice.
 * @param {number} roll - The dice roll result (1-6).
 */
function setDiceFace(roll) {
    const rotations = {
        1: 'rotateY(0deg) rotateX(0deg)', 2: 'rotateX(-90deg)', 3: 'rotateY(90deg)',
        4: 'rotateY(-90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)'
    };
    UI.diceElement.style.transform = rotations[roll];
}

/**
 * Handles the dice roll action, calculates possible moves, and highlights them.
 */
function rollDice() {
    if (gameState.isAwaitingMove) return;
    UI.gameMessageDiv.textContent = '';
    const roll = Math.floor(Math.random() * 6) + 1;

    setDiceFace(roll);
    UI.diceResultDiv.querySelector('span').textContent = translations.dice_roll_result[gameState.currentLanguage].replace('{roll}', roll);

    const player = gameState.players[gameState.currentPlayerIndex];
    const possiblePaths = findPossibleMoves(player.position, roll);
    gameState.possiblePaths = possiblePaths;

    const destinationIds = Object.keys(possiblePaths);

    if (destinationIds.length > 0) {
        gameState.isAwaitingMove = true;
        UI.rollDiceBtn.disabled = true;
        UI.rollDiceBtn.classList.add('opacity-50');
        UI.gameMessageDiv.textContent = translations.choose_move[gameState.currentLanguage];
        destinationIds.forEach(id => document.getElementById(`square-${id}`).classList.add('highlighted-move'));
    } else {
        // No possible moves, which shouldn't happen on a connected board, but as a fallback.
        nextTurn();
    }
}

/**
 * Finds all possible destination squares given a start position and number of steps.
 * Uses a breadth-first search approach.
 * @param {number} startId - The starting square ID.
 * @param {number} steps - The number of steps to move.
 * @returns {object} An object where keys are destination square IDs and values are the paths (array of IDs).
 */
function findPossibleMoves(startId, steps) {
    let queue = [[startId, [startId]]]; // [currentId, path_so_far]
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
            // Prevent moving back immediately, which would be an inefficient path.
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
    if (!path) return; // Clicked on a non-highlighted square

    document.querySelectorAll('.highlighted-move').forEach(el => el.classList.remove('highlighted-move'));
    gameState.isAwaitingMove = false;
    UI.gameMessageDiv.textContent = '';

    await animatePawnMovement(path.slice(1));

    const player = gameState.players[gameState.currentPlayerIndex];
    player.position = squareId;

    const landedSquare = gameState.board.find(s => s.id === squareId);
    if (landedSquare.type === CONFIG.SQUARE_TYPES.ROLL_AGAIN) {
        UI.diceResultDiv.querySelector('span').textContent = 'Roll Again!';
        UI.rollDiceBtn.disabled = false;
        UI.rollDiceBtn.classList.remove('opacity-50');
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
    UI.diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
    UI.rollDiceBtn.disabled = false;
    UI.rollDiceBtn.classList.remove('opacity-50');
    saveGameState();
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
    const oldCategory = gameState.categories[categoryIndex]; // Save the old category name before potential mutation

    // Record the subcategory to history to avoid repetition, regardless of answer correctness
    if (oldCategory && gameState.currentQuestionData.subcategory) {
        const history = gameState.categoryTopicHistory[oldCategory];
        const newSubcategory = gameState.currentQuestionData.subcategory;
        if (!history.includes(newSubcategory)) {
            history.push(newSubcategory);
        }

        if (Array.isArray(gameState.currentQuestionData.key_entities)) {
            gameState.currentQuestionData.key_entities.forEach(entity => {
                if (!history.includes(entity)) {
                    history.push(entity);
                }
            });
        }

        if (history.length > CONFIG.MAX_HISTORY_ITEMS_PER_CATEGORY) {
            gameState.categoryTopicHistory[oldCategory] = history.slice(-CONFIG.MAX_HISTORY_ITEMS_PER_CATEGORY);
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
        // Don't award the wedge yet; wait for the player to choose a new category.
        UI.standardPopupContent.classList.add('hidden');
        UI.mutationContent.classList.remove('hidden');
        UI.mutationLoader.classList.remove('hidden');
        UI.mutationButtons.classList.add('hidden');
        UI.closePopupBtn.classList.add('hidden');

        try {
            const choices = await gameState.api.getCategoryMutationChoices(oldCategory);
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
                    // Step 1: Update the category name in the game state.
                    gameState.categories[categoryIndex] = newCategoryName;
                    
                    // Step 2: Award the player a wedge for the NEW category.
                    player.wedges.push(newCategoryName);

                    // Step 3: Update the legend to show the new category name.
                    renderCategoryLegend();

                    // Clean up history and notify the player.
                    delete gameState.categoryTopicHistory[oldCategory];
                    if (!gameState.categoryTopicHistory[newCategoryName]) {
                        gameState.categoryTopicHistory[newCategoryName] = [];
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
        // Reset the popup's appearance for the next time it's opened
        UI.standardPopupContent.classList.remove('hidden');
        UI.mutationContent.classList.add('hidden');
        UI.closePopupBtn.classList.remove('hidden');
    }, 500);

    if (gameState.lastAnswerWasCorrect) {
        // Player answered correctly, they get to roll again.
        UI.diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
        UI.rollDiceBtn.disabled = false;
        UI.rollDiceBtn.classList.remove('opacity-50');
    } else {
        // Player was incorrect, pass the turn.
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
 * Displays a modal forcing the user to change the language model, typically after a rate limit error.
 * @returns {Promise<void>} A promise that resolves when the user confirms their choice.
 */
function promptForModelChange() {
    return new Promise(async (resolve) => {
        const modal = document.getElementById('model-choice-modal');
        const title = document.getElementById('model-choice-title');
        const select = document.getElementById('modal-model-select');
        const confirmBtn = document.getElementById('confirm-model-choice-btn');

        // Set translations
        const lang = gameState.currentLanguage;
        title.textContent = translations.rate_limit_title[lang];
        confirmBtn.textContent = translations.confirm_choice_btn[lang];
        document.querySelector('[data-lang-key="rate_limit_desc"]').textContent = translations.rate_limit_desc[lang];
        document.querySelector('[for="modal-model-select"]').textContent = translations.model_label[lang];

        // Refresh and copy the model list from the main settings
        if (gameState.api.fetchModels) await gameState.api.fetchModels();
        const mainModelSelect = document.getElementById('model-select');
        select.innerHTML = mainModelSelect.innerHTML;
        select.value = mainModelSelect.value;

        modal.classList.add('visible');

        const onConfirm = () => {
            const mainModelSelect = document.getElementById('model-select');
            mainModelSelect.value = select.value; // Update the main select
            if (gameState.api.saveSettings) gameState.api.saveSettings(); // Save the new setting

            modal.classList.remove('visible');
            confirmBtn.removeEventListener('click', onConfirm);
            resolve();
        };

        confirmBtn.addEventListener('click', onConfirm);
    });
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

    // Iterate in reverse to show the latest entries first
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
            event.target.value = ''; // Reset input
        }
    };
    // ENCODING FIX: Explicitly read the file as UTF-8 to handle special characters correctly.
    reader.readAsText(file, 'UTF-8');
}

/**
 * Restores the game from a loaded state object.
 * @param {object} stateToRestore - The game state object to load.
 */
function restoreGameState(stateToRestore) {
    Object.assign(gameState, stateToRestore);
    
    // Reset transient turn state for a clean resume.
    gameState.isAwaitingMove = false;
    gameState.lastAnswerWasCorrect = false;
    
    // The board layout is not saved, so it must be recreated.
    createBoardLayout();

    setLanguage(gameState.currentLanguage);
    
    UI.setupScreen.classList.add('hidden');
    UI.gameScreen.classList.remove('hidden');
    
    const oldSvg = UI.boardWrapper.querySelector('.board-connections');
    if (oldSvg) oldSvg.remove();
    
    renderBoard();
    renderCategoryLegend();
    updateUI();

    UI.rollDiceBtn.disabled = false;
    UI.rollDiceBtn.classList.remove('opacity-50');
    UI.diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
    UI.gameMessageDiv.textContent = '';
}

/**
 * Creates a "clean" version of the game state for saving.
 * This removes transient, reconstructible, or sensitive data to create a lean save file.
 * @returns {object} The cleaned game state object.
 */
function getCleanedState() {
    // Create a deep copy to avoid modifying the live game state.
    const stateToSave = JSON.parse(JSON.stringify(gameState));

    // 1. Exclude keys that are not needed in a save file.
    const excludeKeys = [
        'api', 'promptHistory', 'possiblePaths', 'currentQuestionData',
        'currentForcedCategoryIndex', 'currentPlayerAnswer', 'isAwaitingMove',
        'lastAnswerWasCorrect', 'board' // The board is procedurally generated.
    ];
    excludeKeys.forEach(key => delete stateToSave[key]);

    // 2. Clean up subcategory history, keeping only history for currently active categories.
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


// --- MAIN INITIALIZATION ---

/**
 * Initializes the entire application, sets up event listeners, and injects the API adapter.
 * This is the main entry point for the game logic.
 * @param {object} apiAdapter - An object with methods for communicating with the AI API.
 */
export function initializeApp(apiAdapter) {
    gameState.api = apiAdapter;

    // --- EVENT LISTENERS ---
    window.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const shouldLoadGame = urlParams.get('loadGame') === 'true';
        const savedGame = loadGameState();
        if (shouldLoadGame && savedGame) {
            // If the URL directs to load and a save exists, restore the game.
            restoreGameState(savedGame);
        } else {
            // Otherwise, start with a fresh setup screen.
            setLanguage('pl');
        }
    
        if (gameState.api.loadSettings) {
            gameState.api.loadSettings();
        }
    });

    UI.langPlBtn.addEventListener('click', () => setLanguage('pl'));
    UI.langEnBtn.addEventListener('click', () => setLanguage('en'));
    UI.gameModeSelect.addEventListener('change', updateDescriptions);
    UI.knowledgeLevelSelect.addEventListener('change', updateDescriptions);

    UI.temperatureSlider.addEventListener('input', (e) => {
        const temp = parseFloat(e.target.value);
        UI.temperatureValueSpan.textContent = temp.toFixed(1);
        e.target.style.setProperty('--thumb-color', `hsl(${(1 - temp / 2) * 240}, 70%, 50%)`);
        if (gameState.api.saveSettings) gameState.api.saveSettings();
    });

    UI.includeThemeToggle.addEventListener('change', () => { if (gameState.api.saveSettings) gameState.api.saveSettings(); });
    UI.mutateCategoriesToggle.addEventListener('change', () => { if (gameState.api.saveSettings) gameState.api.saveSettings(); });

    UI.generateCategoriesBtn.addEventListener('click', generateCategories);
    UI.regenerateQuestionBtn.addEventListener('click', () => askQuestion(gameState.currentForcedCategoryIndex));

    UI.popupRegenerateBtn.addEventListener('click', () => {
        UI.answerPopup.classList.add('opacity-0', 'scale-90');
        setTimeout(() => UI.answerPopup.classList.add('hidden'), 500);
        askQuestion(gameState.currentForcedCategoryIndex);
    });

    UI.playerCountInput.addEventListener('input', updatePlayerNameInputs);
    UI.startGameBtn.addEventListener('click', initializeGame);
    UI.rollDiceBtn.addEventListener('click', rollDice);
    UI.submitAnswerBtn.addEventListener('click', handleOpenAnswer);
    UI.answerInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleOpenAnswer(); });
    UI.acceptAnswerBtn.addEventListener('click', () => handleManualVerification(true));
    UI.rejectAnswerBtn.addEventListener('click', () => handleManualVerification(false));
    UI.closePopupBtn.addEventListener('click', closePopupAndContinue);
    UI.showHistoryBtn.addEventListener('click', showHistoryModal);
    UI.closeHistoryBtn.addEventListener('click', hideHistoryModal);
    UI.restartGameBtn.addEventListener('click', restartGame);
    UI.downloadStateBtn.addEventListener('click', downloadGameState);
    UI.uploadStateInput.addEventListener('change', handleStateUpload);

    UI.playAgainBtn.addEventListener('click', () => {
        UI.winnerScreen.classList.add('hidden');
        UI.setupScreen.classList.remove('hidden');
        // Remove the SVG connections overlay when restarting.
        const oldSvg = UI.boardWrapper.querySelector('.board-connections');
        if (oldSvg) oldSvg.remove();
    });

    // Close active emoji pickers when clicking elsewhere on the document.
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-panel.active').forEach(panel => {
            if (!panel.parentElement.contains(e.target)) {
                panel.classList.remove('active');
            }
        });
    });
}
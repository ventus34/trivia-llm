// --- KONFIGURACJA GRY ---
const CONFIG = {
    PLAYER_COLORS: ['#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#84cc16', '#eab308', '#06b6d4', '#6366f1'],
    CATEGORY_COLORS: ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#facc15'],
    SQUARE_TYPES: { HQ: 'HEADQUARTERS', SPOKE: 'SPOKE', RING: 'RING', HUB: 'HUB', ROLL_AGAIN: 'ROLL_AGAIN' },
    ANIMATION_DELAY_MS: 50,
    MAX_SUBCATEGORY_HISTORY: 10,
    EMOJI_OPTIONS: ['😀', '🚀', '🦄', '🤖', '🦊', '🧙', '👽', '👾', '👻', '👑', '💎', '🍕', '🍔', '⚽️', '🏀', '🎸', '🎨', '🎭', '🎬', '🎤', '🎮', '💻', '💡', '🧪', '🌍', '🏛️', '🏰', '🗿', '🛸']
};

// --- ELEMENTY UI ---
// Ta sekcja pobiera wszystkie elementy DOM, aby były dostępne globalnie w tym module.
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
const temperatureSlider = document.getElementById('temperature-slider');
const temperatureValueSpan = document.getElementById('temperature-value');
const includeThemeToggle = document.getElementById('include-theme-toggle');
const mutateCategoriesToggle = document.getElementById('mutate-categories-toggle');
const startGameBtn = document.getElementById('start-game-btn');
const boardWrapper = document.querySelector('.board-wrapper');
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
const standardPopupContent = document.getElementById('standard-popup-content');
const mutationContent = document.getElementById('mutation-content');
const mutationLoader = document.getElementById('mutation-loader');
const mutationButtons = document.getElementById('mutation-buttons');
const answerPopup = document.getElementById('answer-popup');
const answerPopupTitle = document.getElementById('answer-popup-title');
const playerAnswerText = document.getElementById('player-answer-text');
const correctAnswerContainer = document.getElementById('correct-answer-container');
const correctAnswerText = document.getElementById('correct-answer-text');
const explanationContainer = document.getElementById('explanation-container');
const explanationText = document.getElementById('explanation-text');
const incorrectExplanationContainer = document.getElementById('incorrect-explanation-container');
const incorrectExplanationText = document.getElementById('incorrect-explanation-text');
const incorrectExplanationLoader = document.getElementById('incorrect-explanation-loader');
const verificationButtons = document.getElementById('verification-buttons');
const postVerificationButtons = document.getElementById('post-verification-buttons');
const acceptAnswerBtn = document.getElementById('accept-answer-btn');
const rejectAnswerBtn = document.getElementById('reject-answer-btn');
const popupRegenerateBtn = document.getElementById('popup-regenerate-btn');
const closePopupBtn = document.getElementById('close-popup-btn');
const winnerNameSpan = document.getElementById('winner-name');
const playAgainBtn = document.getElementById('play-again-btn');
const notificationContainer = document.getElementById('notification-container');
const showHistoryBtn = document.getElementById('show-history-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyContent = document.getElementById('history-content');
const historyModalTitle = document.getElementById('history-modal-title');
const restartGameBtn = document.getElementById('restart-game-btn');
const downloadStateBtn = document.getElementById('download-state-btn');
const uploadStateInput = document.getElementById('upload-state-input');
const uploadStateBtn = document.getElementById('upload-state-btn');

// --- STAN GRY I TŁUMACZENIA ---
export let gameState = { currentLanguage: 'pl', promptHistory: [] };
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
            chain_of_thought: "\n# PROCES MYŚLOWY (Chain of Thought):\nZanim podasz ostateczną odpowiedź w formacie JSON, przeprowadź wewnętrzny proces myślowy. Krok po kroku:\n1.  **Analiza Kontekstu:** Rozważ podaną kategorię, motyw, poziom trudności i słowa-inspiracje.\n2.  **Burza Mózgów:** Wymyśl 3-5 wstępnych pomysłów na pytania, które pasują do kontekstu.\n3.  **Selekcja i Udoskonalenie:** Porównaj swoje pomysły z listą tematów do unikania. Wybierz ten pomysł, który jest **najbardziej odległy tematycznie** od tej listy, **ale jednocześnie ściśle trzyma się głównej kategorii**. To kluczowy balans. Następnie udoskonal go, upewniając się, że jest jednoznaczny i spełnia wszystkie pozostałe reguły.",
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
                "**ZAKAZ POWTÓRZEŃ:** Pytanie nie może dotyczyć następujących, ostatnio użytych subkategorii: {history_prompt}. Wygeneruj pytanie z zupełnie innej subkategorii.",
                "**ZASADA KRYTYCZNA:** Tekst pytania NIE MOŻE zawierać słów tworzących poprawną odpowiedź.",
                "**JAKOŚĆ OPCJI (dla MCQ):** Błędne opcje muszą być wiarygodne i bazować na częstych pomyłkach. Jedna opcja MUSI być poprawna.",
                "**OBIEKTYWIZM:** Pytanie musi być oparte na weryfikowalnych faktach i mieć jedną, bezspornie poprawną odpowiedź.",
                "**SPÓJNOŚĆ:** Pytanie musi ściśle trzymać się podanej kategorii."
            ],
            output_format: `\n# OSTATECZNY WYNIK:\nPo zakończeniu wewnętrznego procesu myślowego, zwróć odpowiedź WYŁĄCZNIE jako jeden, czysty obiekt JSON o strukturze:\n{\n  "question": "...",\n  "answer": "...",\n  "explanation": "...",\n  "subcategory": "Precyzyjna subkategoria...",\n  "options": ["...", "...", "...", "..."]\n}`
        },
        en: {
            persona: "Embody the role of an experienced quiz show master. Your task is to create ONE high-quality, objective quiz question.",
            chain_of_thought: `\n# CHAIN OF THOUGHT PROCESS:\nBefore providing the final JSON output, conduct an internal thought process. Step by step:\n1.  **Analyze Context:** Consider the given category, theme, difficulty level, and inspirational words.\n2.  **Brainstorm:** Come up with 3-5 initial ideas for questions that fit the context.\n3.  **Select & Refine:** Compare your ideas against the list of topics to avoid. Choose the idea that is **most thematically distant** from that list, **while still strictly adhering to the main category**. This is a key balance. Then, refine it, ensuring it is unambiguous and meets all other rules.`,
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
                "**NO REPETITION:** The question must not be about the following, recently used subcategories: {history_prompt}. Generate a question from a completely different subcategory.",
                "**CRITICAL RULE:** The question text MUST NOT contain the words that make up the correct answer.",
                "**OPTION QUALITY (for MCQ):** Incorrect options must be plausible and based on common misconceptions. One option MUST be correct.",
                "**OBJECTIVITY:** The question must be based on verifiable facts and have a single, indisputably correct answer.",
                "**CONSISTENCY:** The question must strictly adhere to the given category."
            ],
            output_format: `\n# FINAL OUTPUT:\nAfter completing your internal thought process, return the response ONLY as a single, clean JSON object with the structure:\n{\n  "question": "...",\n  "answer": "...",\n  "explanation": "...",\n  "subcategory": "Precise subcategory...",\n  "options": ["...", "...", "...", "..."]\n}`
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
    download_state_btn: { pl: "Pobierz zapis", en: "Download State" },
    upload_state_btn: { pl: "Wczytaj grę", en: "Load Game" },
    game_loaded_success: { pl: "Gra wczytana pomyślnie!", en: "Game loaded successfully!" },
    game_loaded_error: { pl: "Błąd wczytywania pliku. Upewnij się, że to poprawny plik zapisu.", en: "Error loading file. Make sure it's a valid save file." }
};


// --- LOGIKA GRY ---

/**
 * Wyświetla powiadomienie na ekranie.
 * @param {object} message - Obiekt z polami `title` i `body`.
 * @param {string} type - Typ powiadomienia ('info', 'success', 'error').
 * @param {number} duration - Czas wyświetlania w ms.
 */
function showNotification(message, type = 'info', duration = 5000) {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    // ... reszta implementacji bez zmian
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

/**
 * Ustawia język interfejsu i aktualizuje wszystkie teksty.
 * @param {string} lang - Kod języka ('pl' lub 'en').
 */
function setLanguage(lang) {
    gameState.currentLanguage = lang;
    document.documentElement.lang = lang;
    langPlBtn.classList.toggle('active', lang === 'pl');
    langEnBtn.classList.toggle('active', lang === 'en');
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (translations[key] && translations[key][lang]) {
            const translation = translations[key][lang];
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder) el.placeholder = translation;
            } else if (el.title && !el.textContent.trim()) {
                el.title = translation;
            }
            else {
                el.innerHTML = translation;
            }
        }
    });
    // Ręczne ustawienie placeholderów, które mogą nie mieć `data-lang-key`
    const geminiKeyInput = document.getElementById('gemini-api-key');
    if (geminiKeyInput) geminiKeyInput.placeholder = translations.gemini_api_key_placeholder[lang];

    const lmStudioUrlInput = document.getElementById('lmstudio-url-input');
    if (lmStudioUrlInput) lmStudioUrlInput.placeholder = translations.lm_studio_url_placeholder[lang];

    updateCategoryInputs(translations.default_categories[lang].split(', '));
    updatePlayerNameInputs();
    updateDescriptions();
}

/**
 * Aktualizuje opisy pod selectami trybu gry i poziomu wiedzy.
 */
function updateDescriptions() {
    const lang = gameState.currentLanguage;
    gameModeDescription.textContent = translations[`game_mode_desc_${gameModeSelect.value}`][lang];
    knowledgeLevelDescription.textContent = translations[`knowledge_desc_${knowledgeLevelSelect.value}`][lang];
}

/**
 * Generuje pola do wpisywania nazw kategorii.
 * @param {string[]} cats - Tablica z nazwami kategorii.
 */
function updateCategoryInputs(cats) {
    categoriesContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'category-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm';
        input.value = cats[i] || '';
        input.style.borderLeft = `5px solid ${CONFIG.CATEGORY_COLORS[i]}`;
        categoriesContainer.appendChild(input);
    }
}

/**
 * Generuje pola do wpisywania imion graczy.
 */
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
        playerNamesContainer.appendChild(div);
    }
}

/**
 * Wywołuje API do wygenerowania nowych kategorii na podstawie motywu.
 */
async function generateCategories() {
    const theme = themeInput.value.trim();
    if (!theme) return;

    if (!gameState.api.isConfigured()) {
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: gameState.api.configErrorMsg }, 'error');
        return;
    }

    const originalBtnText = generateCategoriesBtn.textContent;
    generateCategoriesBtn.textContent = translations.generating_categories[gameState.currentLanguage];
    generateCategoriesBtn.disabled = true;

    try {
        const generatedCats = await gameState.api.generateCategories(theme);
        updateCategoryInputs(generatedCats.slice(0, 6));
    } catch (error) {
        console.error("Category generation error:", error);
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: translations.generate_categories_error[gameState.currentLanguage] }, 'error');
    } finally {
        generateCategoriesBtn.textContent = originalBtnText;
        generateCategoriesBtn.disabled = false;
    }
}

/**
 * Tworzy strukturę danych planszy.
 */
function createBoardLayout() {
    const layout = [];
    const center = 50;
    const armLength = 5;
    const radii = [0, 10, 18, 26, 34, 42, 50];

    layout.push({ id: 0, type: CONFIG.SQUARE_TYPES.HUB, categoryIndex: null, pos: { x: center, y: center }, connections: [] });

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
 * Zapisuje kluczowy i oczyszczony stan gry w localStorage.
 */
function saveGameState() {
    const stateToSave = getCleanedState();
    localStorage.setItem('savedQuizGame', JSON.stringify(stateToSave));
    console.log("Gra zapisana (stan zoptymalizowany).", new Date().toLocaleTimeString());
}

/**
 * Wczytuje stan gry z localStorage.
 * @returns {object|null} - Wczytany stan gry lub null.
 */
function loadGameState() {
    const savedState = localStorage.getItem('savedQuizGame');
    if (savedState) {
        console.log("Znaleziono zapisany stan gry. Wczytuję...");
        return JSON.parse(savedState);
    }
    return null;
}

/**
 * Restartuje grę, czyszcząc zapisany stan i odświeżając stronę.
 */
function restartGame() {
    if (confirm(translations.restart_game_confirm[gameState.currentLanguage])) {
        localStorage.removeItem('savedQuizGame');
        window.location.reload();
    }
}

/**
 * Uruchamia pobieranie zoptymalizowanego stanu gry jako pliku JSON z poprawnym kodowaniem.
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
 * Obsługuje wgranie pliku JSON ze stanem gry z poprawnym kodowaniem.
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
                showNotification({ title: "Sukces", body: translations.game_loaded_success[gameState.currentLanguage] }, 'success');
            } else {
                throw new Error("Invalid game state format.");
            }
        } catch (error) {
            console.error("Failed to load or parse game state:", error);
            showNotification({ title: "Błąd", body: translations.game_loaded_error[gameState.currentLanguage] }, 'error');
        } finally {
            event.target.value = '';
        }
    };
    // POPRAWKA KODOWANIA: Jawnie odczytujemy plik jako UTF-8
    reader.readAsText(file, 'UTF-8');
}


/**
 * Przywraca stan gry, odtwarza planszę i odświeża interfejs.
 * @param {object} stateToRestore - Obiekt stanu gry do wczytania.
 */
function restoreGameState(stateToRestore) {
    Object.assign(gameState, stateToRestore);
    
    // Resetujemy stan tury dla czystego wznowienia
    gameState.isAwaitingMove = false;
    gameState.lastAnswerWasCorrect = false;
    
    // Odtwarzamy planszę, ponieważ nie ma jej w pliku zapisu
    createBoardLayout();

    setLanguage(gameState.currentLanguage);
    
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    const oldSvg = boardWrapper.querySelector('.board-connections');
    if (oldSvg) oldSvg.remove();
    
    renderBoard();
    renderCategoryLegend();
    updateUI();

    rollDiceBtn.disabled = false;
    rollDiceBtn.classList.remove('opacity-50');
    diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
    gameMessageDiv.textContent = '';
}

/**
 * Tworzy "czystą" wersję stanu gry, gotową do zapisu.
 * Usuwa dane tymczasowe, deweloperskie i możliwe do odtworzenia.
 * @returns {object} - Oczyszczony obiekt stanu gry.
 */
function getCleanedState() {
    // Tworzymy głęboką kopię, aby nie modyfikować aktualnego stanu gry
    const stateToSave = JSON.parse(JSON.stringify(gameState));

    // 1. Wykluczamy klucze, których nie trzeba zapisywać
    const excludeKeys = [
        'api', 'promptHistory', 'possiblePaths', 'currentQuestionData',
        'currentForcedCategoryIndex', 'currentPlayerAnswer', 'isAwaitingMove',
        'lastAnswerWasCorrect', 'board' // <- Dodano 'board' do wykluczeń
    ];
    excludeKeys.forEach(key => delete stateToSave[key]);

    // 2. Czyścimy historię subkategorii, zostawiając tylko aktywne kategorie
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
 * Inicjalizuje stan gry i przechodzi do ekranu rozgrywki.
 */
function initializeGame() {
    if (!gameState.api.isConfigured()) {
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: gameState.api.configErrorMsg }, 'error');
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
        temperature: parseFloat(temperatureSlider.value),
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
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
}

/**
 * Renderuje planszę (pola i połączenia).
 */
function renderBoard() {
    boardElement.innerHTML = '';
    // Dodajemy kontener SVG na połączenia
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute('class', 'board-connections');
    boardWrapper.insertBefore(svg, boardElement);

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
        boardElement.appendChild(squareEl);

        // Rysowanie połączeń
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
 * Renderuje legendę kategorii.
 */
function renderCategoryLegend() {
    categoryLegend.innerHTML = '';
    gameState.categories.forEach((cat, i) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'flex items-center gap-2';
        legendItem.id = `legend-cat-${i}`;
        legendItem.innerHTML = `<div class="w-4 h-4 rounded-full" style="background-color: ${CONFIG.CATEGORY_COLORS[i]}"></div><span>${cat}</span>`;
        categoryLegend.appendChild(legendItem);
    });
}

/**
 * Renderuje pionki graczy na planszy.
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
        boardElement.appendChild(tokenEl);
    });
}

/**
 * Aktualizuje cały interfejs gry (tura, wyniki, pionki).
 */
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
            wedgesHTML += `<span class="category-wedge" style="background-color: ${hasWedge ? CONFIG.CATEGORY_COLORS[i] : '#e5e7eb'};" title="${cat}"></span>`;
        });
        scoreDiv.innerHTML = `<p class="font-semibold" style="color: ${player.color};">${player.emoji} ${player.name}</p><div>${wedgesHTML}</div>`;
        playerScoresContainer.appendChild(scoreDiv);
    });
    renderPlayerTokens();
}

/**
 * Ustawia ściankę kostki 3D.
 * @param {number} roll - Wynik rzutu (1-6).
 */
function setDiceFace(roll) {
    const rotations = {
        1: 'rotateY(0deg) rotateX(0deg)', 2: 'rotateX(-90deg)', 3: 'rotateY(90deg)',
        4: 'rotateY(-90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)'
    };
    diceElement.style.transform = rotations[roll];
}

/**
 * Obsługuje rzut kostką.
 */
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

/**
 * Znajduje wszystkie możliwe do osiągnięcia pola.
 * @param {number} startId - ID pola startowego.
 * @param {number} steps - Liczba kroków.
 * @returns {object} - Obiekt z możliwymi ścieżkami.
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
 * Wyświetla modal z wyborem kategorii.
 */
function promptCategoryChoice() {
    categoryChoiceButtons.innerHTML = '';
    gameState.categories.forEach((cat, index) => {
        const button = document.createElement('button');
        button.textContent = cat;
        button.className = 'w-full p-3 text-white font-semibold rounded-lg transition-transform hover:scale-105';
        button.style.backgroundColor = CONFIG.CATEGORY_COLORS[index];
        button.onclick = () => {
            categoryChoiceModal.classList.add('hidden');
            askQuestion(index);
        };
        categoryChoiceButtons.appendChild(button);
    });
    categoryChoiceModal.classList.remove('hidden');
}

/**
 * Animuje ruch pionka po planszy.
 * @param {number[]} path - Ścieżka ruchu.
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
 * Obsługuje kliknięcie na pole planszy.
 * @param {number} squareId - ID klikniętego pola.
 */
async function handleSquareClick(squareId) {
    if (!gameState.isAwaitingMove) return;

    const path = gameState.possiblePaths[squareId];
    if (!path) return;

    document.querySelectorAll('.highlighted-move').forEach(el => el.classList.remove('highlighted-move'));
    gameState.isAwaitingMove = false;
    gameMessageDiv.textContent = '';

    await animatePawnMovement(path.slice(1));

    const player = gameState.players[gameState.currentPlayerIndex];
    player.position = squareId;

    const landedSquare = gameState.board.find(s => s.id === squareId);
    if (landedSquare.type === CONFIG.SQUARE_TYPES.ROLL_AGAIN) {
        diceResultDiv.querySelector('span').textContent = 'Roll Again!';
        rollDiceBtn.disabled = false;
        rollDiceBtn.classList.remove('opacity-50');
    } else if (landedSquare.type === CONFIG.SQUARE_TYPES.HUB) {
        promptCategoryChoice();
    } else {
        askQuestion();
    }
}

/**
 * Pyta o pytanie z API i wyświetla je w modalu.
 * @param {number|null} forcedCategoryIndex - Indeks kategorii do wymuszenia.
 */
async function askQuestion(forcedCategoryIndex = null) {
    gameState.currentForcedCategoryIndex = forcedCategoryIndex;
    const player = gameState.players[gameState.currentPlayerIndex];
    const square = gameState.board.find(s => s.id === player.position);
    const categoryIndex = forcedCategoryIndex !== null ? forcedCategoryIndex : square.categoryIndex;
    // Zabezpieczenie na wypadek braku kategorii na danym polu
    if (categoryIndex === null || categoryIndex === undefined) {
        console.error("Błędny indeks kategorii na aktualnym polu:", square);
        nextTurn(); // Przejdź do następnej tury, aby uniknąć zawieszenia gry
        return;
    }

    const category = gameState.categories[categoryIndex];

    const categoryColor = CONFIG.CATEGORY_COLORS[categoryIndex];

    questionCategoryH3.textContent = translations.category_title[gameState.currentLanguage].replace('{category}', category);
    questionCategoryH3.style.color = categoryColor;
    modalContent.style.borderTopColor = categoryColor;

    showModal(true);
    llmLoader.classList.remove('hidden');
    questionContent.classList.add('hidden');
    mcqOptionsContainer.innerHTML = '';

    try {
        const data = await gameState.api.generateQuestion(category);
        gameState.currentQuestionData = data;
        questionTextP.textContent = data.question;

        if (gameState.gameMode === 'mcq') {
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
        questionTextP.textContent = translations.question_generation_error[gameState.currentLanguage];
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

/**
 * Obsługuje odpowiedź w trybie MCQ.
 * @param {string} selectedOption - Wybrana opcja.
 */
function handleMcqAnswer(selectedOption) {
    hideModal();
    setTimeout(() => showVerificationPopup(selectedOption, gameState.currentQuestionData.answer), 300);
}

/**
 * Obsługuje odpowiedź w trybie otwartym.
 */
function handleOpenAnswer() {
    const userAnswer = answerInput.value.trim();
    if (!userAnswer) {
        gameMessageDiv.textContent = translations.empty_answer_error[gameState.currentLanguage];
        return;
    }
    hideModal();
    setTimeout(() => showVerificationPopup(userAnswer, gameState.currentQuestionData.answer), 300);
}

/**
 * Wyświetla popup do weryfikacji odpowiedzi.
 * @param {string} playerAnswer - Odpowiedź gracza.
 * @param {string} correctAnswer - Poprawna odpowiedź.
 */
function showVerificationPopup(playerAnswer, correctAnswer) {
    playerAnswerText.textContent = playerAnswer;
    correctAnswerText.textContent = correctAnswer;
    gameState.currentPlayerAnswer = playerAnswer;

    explanationContainer.classList.add('hidden');
    incorrectExplanationContainer.classList.add('hidden');
    incorrectExplanationText.textContent = '';

    explanationText.textContent = gameState.currentQuestionData.explanation;
    verificationButtons.classList.remove('hidden');
    postVerificationButtons.classList.add('hidden');
    answerPopupTitle.textContent = translations.answer_evaluation[gameState.currentLanguage];

    showAnswerPopup();
}

async function handleManualVerification(isCorrect) {
    gameState.lastAnswerWasCorrect = isCorrect;
    const player = gameState.players[gameState.currentPlayerIndex];
    const square = gameState.board.find(s => s.id === player.position);
    const categoryIndex = gameState.currentForcedCategoryIndex !== null ? gameState.currentForcedCategoryIndex : square.categoryIndex;
    const oldCategory = gameState.categories[categoryIndex]; // Zapisujemy starą nazwę

    // Zapis subkategorii do historii (bez zmian)
    if (oldCategory && gameState.currentQuestionData.subcategory) {
        const history = gameState.categoryTopicHistory[oldCategory];
        const newSubcategory = gameState.currentQuestionData.subcategory;
        if (!history.includes(newSubcategory)) {
            history.push(newSubcategory);
        }
        if (history.length > CONFIG.MAX_SUBCATEGORY_HISTORY) {
            gameState.categoryTopicHistory[oldCategory] = history.slice(-CONFIG.MAX_SUBCATEGORY_HISTORY);
        }
        localStorage.setItem('globalQuizHistory', JSON.stringify(gameState.categoryTopicHistory));
    }

    verificationButtons.classList.add('hidden');
    postVerificationButtons.classList.remove('hidden');

    const shouldMutate = isCorrect &&
                         square.type === CONFIG.SQUARE_TYPES.HQ &&
                         !player.wedges.includes(oldCategory) &&
                         gameState.mutateCategories;

    if (shouldMutate) {
        // Nie przyznajemy jeszcze punktu! Czekamy na wybór nowej kategorii.
        standardPopupContent.classList.add('hidden');
        mutationContent.classList.remove('hidden');
        mutationLoader.classList.remove('hidden');
        mutationButtons.classList.add('hidden');
        closePopupBtn.classList.add('hidden');

        try {
            const choices = await gameState.api.getCategoryMutationChoices(oldCategory);
            mutationLoader.classList.add('hidden');
            mutationButtons.classList.remove('hidden');
            mutationButtons.innerHTML = '';
            
            if (!Array.isArray(choices)) throw new Error("Invalid choices received from API");

            choices.forEach(choice => {
                const button = document.createElement('button');
                button.className = 'w-full p-4 text-white rounded-lg transition-transform hover:scale-105 text-left';
                button.style.backgroundColor = CONFIG.CATEGORY_COLORS[categoryIndex];
                button.innerHTML = `<span class="block font-bold text-lg">${choice.name || ""}</span><p class="text-sm font-normal opacity-90 mt-1">${choice.description || ""}</p>`;
                button.onclick = () => {
                    const newCategoryName = choice.name;
                    // KROK 1: Aktualizujemy nazwę kategorii w grze
                    gameState.categories[categoryIndex] = newCategoryName;
                    
                    // KROK 2: Przyznajemy graczowi punkt za NOWĄ kategorię
                    player.wedges.push(newCategoryName);

                    // KROK 3: Aktualizujemy legendę, aby pokazać nową nazwę
                    renderCategoryLegend();

                    // Logika czyszczenia historii i powiadomienia (bez zmian)
                    delete gameState.categoryTopicHistory[oldCategory];
                    if (!gameState.categoryTopicHistory[newCategoryName]) {
                        gameState.categoryTopicHistory[newCategoryName] = [];
                    }
                    showNotification({ title: translations.category_mutated[gameState.currentLanguage], body: translations.new_category_msg[gameState.currentLanguage].replace('{old_cat}', oldCategory).replace('{new_cat}', newCategoryName) }, 'info');
                    
                    closePopupAndContinue();
                };
                mutationButtons.appendChild(button);
            });
        } catch (error) {
            console.error("Category mutation failed:", error);
            player.wedges.push(oldCategory); // W razie błędu, przyznaj punkt za starą kategorię
            showNotification({ title: translations.api_error[gameState.currentLanguage], body: translations.mutation_error[gameState.currentLanguage] }, 'error');
            closePopupAndContinue();
        }
    } else {
        // Standardowy przepływ (bez mutacji)
        if (isCorrect && square.type === CONFIG.SQUARE_TYPES.HQ) {
            if (oldCategory && !player.wedges.includes(oldCategory)) player.wedges.push(oldCategory);
        }
        explanationContainer.classList.remove('hidden');
        if (!isCorrect) {
            incorrectExplanationContainer.classList.remove('hidden');
            incorrectExplanationLoader.classList.remove('hidden');
            try {
                const explanation = await gameState.api.getIncorrectAnswerExplanation();
                incorrectExplanationText.textContent = explanation;
            } catch (error) {
                console.error("Incorrect answer explanation error:", error);
                incorrectExplanationText.textContent = translations.incorrect_answer_analysis_error[gameState.currentLanguage];
            } finally {
                incorrectExplanationLoader.classList.add('hidden');
            }
        }
    }
}


/**
 * Wyświetla popup z odpowiedzią.
 */
function showAnswerPopup() {
    answerPopup.classList.remove('hidden');
    setTimeout(() => {
        answerPopup.classList.remove('opacity-0', 'scale-90');
    }, 10);
}

/**
 * Zamyka popup i kontynuuje grę.
 */
function closePopupAndContinue() {
    answerPopup.classList.add('opacity-0', 'scale-90');
    setTimeout(() => {
        answerPopup.classList.add('hidden');
        // Resetujemy wygląd pop-upu do domyślnego
        standardPopupContent.classList.remove('hidden');
        mutationContent.classList.add('hidden');
        closePopupBtn.classList.remove('hidden');
    }, 500);

    if (gameState.lastAnswerWasCorrect) {
        diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
        rollDiceBtn.disabled = false;
        rollDiceBtn.classList.remove('opacity-50');
    } else {
        nextTurn();
    }
    updateUI();
    checkWinCondition();
    saveGameState();
}

/**
 * Przechodzi do tury następnego gracza.
 */
function nextTurn() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    updateUI();
    diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
    rollDiceBtn.disabled = false;
    rollDiceBtn.classList.remove('opacity-50');
    saveGameState();
}

/**
 * Sprawdza, czy któryś z graczy wygrał.
 */
function checkWinCondition() {
    const winner = gameState.players.find(p => p.wedges.length === gameState.categories.length);
    if (winner) {
        gameScreen.classList.add('hidden');
        winnerScreen.classList.remove('hidden');
        winnerNameSpan.textContent = winner.name;
    }
}

/**
 * Pokazuje lub ukrywa modal pytania.
 * @param {boolean} show - Czy pokazać modal.
 */
function showModal(show) {
    if (show) {
        questionModal.classList.remove('hidden');
        setTimeout(() => modalContent.classList.remove('scale-95', 'opacity-0'), 10);
    } else {
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => questionModal.classList.add('hidden'), 300);
    }
}

function hideModal() {
    showModal(false);
    setTimeout(() => { if (modalContent) modalContent.style.borderTopColor = 'transparent'; }, 300);
}

/**
 * Renderuje historię promptów w modalu.
 */
function renderPromptHistory() {
    historyContent.innerHTML = ''; // Wyczyść stary kontent
    const lang = gameState.currentLanguage;

    if (gameState.promptHistory.length === 0) {
        historyContent.textContent = translations.history_empty[lang];
        return;
    }

    // Tworzymy fragment, aby zminimalizować operacje na DOM
    const fragment = document.createDocumentFragment();

    // Iterujemy od końca, aby najnowsze były na górze
    gameState.promptHistory.slice().reverse().forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'p-4 border rounded-lg bg-gray-50';

        const promptTitle = document.createElement('h4');
        promptTitle.className = 'font-semibold text-gray-800';
        promptTitle.textContent = `${translations.history_prompt_title[lang]} #${gameState.promptHistory.length - index}`;

        const promptPre = document.createElement('pre');
        promptPre.className = 'mt-2 p-3 bg-gray-200 text-sm text-gray-700 rounded-md overflow-x-auto whitespace-pre-wrap';
        const promptCode = document.createElement('code');
        promptCode.textContent = entry.prompt; // Bezpieczne wstawienie tekstu
        promptPre.appendChild(promptCode);

        const responseTitle = document.createElement('h4');
        responseTitle.className = 'mt-4 font-semibold text-gray-800';
        responseTitle.textContent = translations.history_response_title[lang];

        const responsePre = document.createElement('pre');
        responsePre.className = 'mt-2 p-3 bg-blue-100 text-sm text-blue-800 rounded-md overflow-x-auto whitespace-pre-wrap';
        const responseCode = document.createElement('code');
        responseCode.textContent = entry.response; // Bezpieczne wstawienie tekstu
        responsePre.appendChild(responseCode);

        entryDiv.append(promptTitle, promptPre, responseTitle, responsePre);
        fragment.appendChild(entryDiv);
    });

    historyContent.appendChild(fragment); // Dodajemy wszystko naraz
}

function showHistoryModal() {
    historyModalTitle.textContent = translations.history_modal_title[gameState.currentLanguage];
    renderPromptHistory();
    historyModal.classList.add('visible');
}

function hideHistoryModal() {
    historyModal.classList.remove('visible');
}


// --- GŁÓWNA FUNKCJA INICJALIZUJĄCA ---
/**
 * Inicjalizuje całą grę, ustawia nasłuchiwacze i przekazuje adapter API.
 * @param {object} apiAdapter - Obiekt z metodami do komunikacji z API.
 */
export function initializeApp(apiAdapter) {
    gameState.api = apiAdapter;

    // --- EVENT LISTENERS ---
    window.addEventListener('DOMContentLoaded', () => {
        const savedGame = loadGameState(); // Wczytanie z localStorage
        if (savedGame) {
            restoreGameState(savedGame); // Użycie nowej funkcji
        } else {
            setLanguage('pl');
        }
    
        if (gameState.api.loadSettings) {
            gameState.api.loadSettings();
        }
    });

    langPlBtn.addEventListener('click', () => setLanguage('pl'));
    langEnBtn.addEventListener('click', () => setLanguage('en'));
    gameModeSelect.addEventListener('change', updateDescriptions);
    knowledgeLevelSelect.addEventListener('change', updateDescriptions);

    temperatureSlider.addEventListener('input', (e) => {
        const temp = parseFloat(e.target.value);
        temperatureValueSpan.textContent = temp.toFixed(1);
        e.target.style.setProperty('--thumb-color', `hsl(${(1 - temp / 2) * 240}, 70%, 50%)`);
        if (gameState.api.saveSettings) gameState.api.saveSettings();
    });

    includeThemeToggle.addEventListener('change', () => { if (gameState.api.saveSettings) gameState.api.saveSettings(); });
    mutateCategoriesToggle.addEventListener('change', () => { if (gameState.api.saveSettings) gameState.api.saveSettings(); });

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
    showHistoryBtn.addEventListener('click', showHistoryModal);
    closeHistoryBtn.addEventListener('click', hideHistoryModal);
    restartGameBtn.addEventListener('click', restartGame);
    downloadStateBtn.addEventListener('click', downloadGameState);
    uploadStateInput.addEventListener('change', handleStateUpload);

    playAgainBtn.addEventListener('click', () => {
        winnerScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
        // Usunięcie SVG z połączeniami przy restarcie
        const oldSvg = boardWrapper.querySelector('.board-connections');
        if (oldSvg) oldSvg.remove();
    });

    document.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-panel.active').forEach(panel => {
            if (!panel.parentElement.contains(e.target)) {
                panel.classList.remove('active');
            }
        });
    });
}

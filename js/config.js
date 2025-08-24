/**
 * @file config.js
 * Contains static game configuration and UI translations.
 */

// --- GAME CONFIGURATION ---
export const CONFIG = {
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
    EMOJI_OPTIONS: ['🚀', '🦄', '🤖', '🦊', '🧙', '👽', '👾', '👻', '👑', '💎', '🍕', '🍔', '⚽️', '🏀', '🎸', '🎨', '🎭', '🎬', '🎤', '🎮', '💻', '💡', '🧪', '🌍', '🏛️', '🏰', '🗿', '🛸', '🌲', '⛵️', '🐈', '🐕', '🦈']
};

// --- TRANSLATIONS ---
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
    explanation: { pl: "Wyjaśnienie:", en: "Explanation:" },
    your_answer_explanation: { pl: "Porównanie odpowiedzi:", en: "Answer Comparison:" },
    llm_evaluation: { pl: "Werdykt", en: "Verdict" },
    evaluation_certainty_text: { pl: "Werdykt dla: {verdict_for} (pewność: {certainty}%)", en: "Verdict for: {verdict_for} (certainty: {certainty}%)" },
    verify_answer_btn: { pl: "Weryfikuj z AI", en: "Verify with AI" },
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
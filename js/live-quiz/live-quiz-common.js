// Live Quiz Common Utilities
window.LiveQuizCommon = (function() {
    'use strict';

    // Category Presets are now imported from config.js or accessed via window.CATEGORY_PRESETS
    const MAX_PLAYERS = 12;
    const DEFAULT_TOTAL_QUESTIONS = 30;
    const DEFAULT_QUESTION_MODEL = 'trivia';
    const DEFAULT_EXPLANATION_MODEL = 'OR:.google/gemini-3-flash-preview';
    const DEFAULT_CATEGORY_MODEL = 'OR:.google/gemini-3-flash-preview';

    const API_ENDPOINTS = {
        modelsQuestions: '/api/models/questions',
        generateCategories: '/api/generate-categories',
        createRoom: '/api/live-quiz/create-room',
        joinRoom: '/api/live-quiz/join-room',
        submitAnswer: '/api/live-quiz/submit-answer',
        hostControl: '/api/live-quiz/host-control',
        events: '/api/live-quiz/events'
    };
    const DEFAULT_CATEGORY_PRESETS = [
        {
            name: {pl: 'Wiedza Ogólna – Klasyk', en: 'General Knowledge – Classic'},
            categories: [
                {pl: 'Historia', en: 'History'},
                {pl: 'Geografia', en: 'Geography'},
                {pl: 'Nauka', en: 'Science'},
                {pl: 'Kultura i sztuka', en: 'Culture & Art'},
                {pl: 'Sport', en: 'Sports'},
                {pl: 'Media i rozrywka', en: 'Media & Entertainment'}
            ]
        },
        {
            name: {pl: 'Wiedza Ogólna – Współczesność', en: 'General Knowledge – Modern Times'},
            categories: [
                {pl: 'Wydarzenia bieżące', en: 'Current Events'},
                {pl: 'Technologia', en: 'Technology'},
                {pl: 'Popkultura', en: 'Pop Culture'},
                {pl: 'Odkrycia naukowe', en: 'Scientific Discoveries'},
                {pl: 'Polityka', en: 'Politics'},
                {pl: 'Internet i media społecznościowe', en: 'Internet & Social Media'}
            ]
        },
        {
            name: {pl: 'Polska – Wiedza Ogólna', en: 'Poland – General Knowledge'},
            categories: [
                {pl: 'Historia', en: 'History'},
                {pl: 'Geografia', en: 'Geography'},
                {pl: 'Kultura i sztuka', en: 'Culture & Art'},
                {pl: 'Znani Polacy', en: 'Famous Poles'},
                {pl: 'Sport', en: 'Sports'},
                {pl: 'Społeczeństwo', en: 'Society'}
            ]
        },
        {
            name: {pl: 'Polska – Lata 90.', en: 'Poland – The 90s'},
            categories: [
                {pl: 'Historia', en: 'History'},
                {pl: 'Muzyka', en: 'Music'},
                {pl: 'Film i seriale', en: 'Movies & TV'},
                {pl: 'Życie codzienne', en: 'Everyday Life'},
                {pl: 'Sport', en: 'Sports'},
                {pl: 'Technologia', en: 'Technology'}
            ]
        },
        {
            name: {pl: 'Nauka – Podstawy', en: 'Science – The Basics'},
            categories: [
                {pl: 'Fizyka', en: 'Physics'},
                {pl: 'Chemia', en: 'Chemistry'},
                {pl: 'Biologia', en: 'Biology'},
                {pl: 'Astronomia', en: 'Astronomy'},
                {pl: 'Matematyka', en: 'Mathematics'},
                {pl: 'Wielcy odkrywcy', en: 'Great Discoverers'}
            ]
        },
        {
            name: {pl: 'Gry wideo', en: 'Video Games'},
            categories: [
                {pl: 'Historia gier', en: 'History of Games'},
                {pl: 'Serie i postacie', en: 'Series & Characters'},
                {pl: 'Konsole', en: 'Consoles'},
                {pl: 'Gatunki', en: 'Genres'},
                {pl: 'Kultura graczy', en: 'Gaming Culture'},
                {pl: 'E-sport', en: 'E-sports'}
            ]
        },
        {
            name: {pl: 'Rozrywka – Kino', en: 'Entertainment – Cinema'},
            categories: [
                {pl: 'Historia kina', en: 'History of Cinema'},
                {pl: 'Gatunki filmowe', en: 'Film Genres'},
                {pl: 'Reżyserzy', en: 'Directors'},
                {pl: 'Aktorzy', en: 'Actors'},
                {pl: 'Nagrody filmowe', en: 'Film Awards'},
                {pl: 'Kultowe filmy', en: 'Cult Movies'}
            ]
        },
        {
            name: {pl: 'Podróże – Świat', en: 'Travel – World'},
            categories: [
                {pl: 'Kontynenty', en: 'Continents'},
                {pl: 'Kraje', en: 'Countries'},
                {pl: 'Miasta', en: 'Cities'},
                {pl: 'Zabytki', en: 'Landmarks'},
                {pl: 'Cuda natury', en: 'Natural Wonders'},
                {pl: 'Kultury i tradycje', en: 'Cultures & Traditions'}
            ]
        },
        {
            name: {pl: 'Kuchnia Polska', en: 'Polish Cuisine'},
            categories: [
                {pl: 'Dania główne', en: 'Main Courses'},
                {pl: 'Zupy', en: 'Soups'},
                {pl: 'Przystawki', en: 'Appetizers'},
                {pl: 'Desery', en: 'Desserts'},
                {pl: 'Święta i tradycje kulinarne', en: 'Holiday & Traditional Foods'},
                {pl: 'Znane potrawy regionalne', en: 'Famous Regional Dishes'}
            ]
        },
        {
            name: {pl: 'Sport – Ogólne', en: 'Sport – General'},
            categories: [
                {pl: 'Igrzyska olimpijskie', en: 'Olympic Games'},
                {pl: 'Piłka nożna', en: 'Football (Soccer)'},
                {pl: 'Koszykówka', en: 'Basketball'},
                {pl: 'Lekkoatletyka', en: 'Athletics'},
                {pl: 'Sporty zimowe', en: 'Winter Sports'},
                {pl: 'Znani sportowcy', en: 'Famous Athletes'}
            ]
        }
    ];

    if (!window.CATEGORY_PRESETS) {
        window.CATEGORY_PRESETS = DEFAULT_CATEGORY_PRESETS;
    }

    const TRANSLATIONS = {
        live_quiz_host_title: { pl: '🎯 Live Quiz - Host', en: '🎯 Live Quiz - Host' },
        live_quiz_setup_title: { pl: 'Ustawienia gry', en: 'Game Setup' },
        knowledge_level_label: { pl: 'Poziom wiedzy', en: 'Knowledge Level' },
        knowledge_level_basic: { pl: 'Podstawowy', en: 'Basic' },
        knowledge_level_intermediate: { pl: 'Średniozaawansowany', en: 'Intermediate' },
        knowledge_level_expert: { pl: 'Ekspercki', en: 'Expert' },
        language_label: { pl: 'Język', en: 'Language' },
        language_pl: { pl: 'Polski', en: 'Polish' },
        language_en: { pl: 'English', en: 'English' },
        questions_per_category_label: { pl: 'Pytania na kategorię', en: 'Questions per Category' },
        answer_time_label: { pl: 'Czas odpowiedzi', en: 'Answer Time' },
        seconds_label: { pl: 'sekund', en: 'seconds' },
        question_model_label: { pl: 'Model pytań', en: 'Question Model' },
        question_model_loading: { pl: 'Ładowanie modeli...', en: 'Loading models...' },
        theme_label: { pl: 'Motyw (opcjonalnie)', en: 'Theme (Optional)' },
        theme_placeholder: { pl: 'np. Władca Pierścieni', en: 'e.g., Lord of the Rings' },
        include_theme_label: { pl: 'Uwzględnij motyw w pytaniach', en: 'Include theme in questions' },
        category_presets_label: { pl: 'Gotowe zestawy kategorii', en: 'Category Presets' },
        category_preset_placeholder: { pl: 'Wybierz zestaw...', en: 'Choose a preset...' },
        load_preset_btn: { pl: 'Wczytaj zestaw', en: 'Load Preset' },
        generate_categories_btn: { pl: 'Generuj kategorie', en: 'Generate Categories' },
        categories_required_label: { pl: 'Kategorie (wymagane 6)', en: 'Categories (6 required)' },
        category_1_placeholder: { pl: 'Kategoria 1', en: 'Category 1' },
        category_2_placeholder: { pl: 'Kategoria 2', en: 'Category 2' },
        category_3_placeholder: { pl: 'Kategoria 3', en: 'Category 3' },
        category_4_placeholder: { pl: 'Kategoria 4', en: 'Category 4' },
        category_5_placeholder: { pl: 'Kategoria 5', en: 'Category 5' },
        category_6_placeholder: { pl: 'Kategoria 6', en: 'Category 6' },
        create_room_btn: { pl: '🎮 Utwórz pokój', en: '🎮 Create Room' },
        how_to_play_title: { pl: '🎯 Jak grać', en: '🎯 How to Play' },
        how_to_play_setup_title: { pl: 'Ustawienia', en: 'Setup' },
        how_to_play_setup_item_1: { pl: '• Wybierz język, poziom wiedzy i czas na pytanie.', en: '• Choose language, knowledge level and time per question.' },
        how_to_play_setup_item_2: { pl: '• Wybierz lub wygeneruj 6 kategorii (wymagane).', en: '• Pick or generate 6 categories (required for the game).' },
        how_to_play_setup_item_3: { pl: '• Opcjonalnie dodaj motyw dla generowanych pytań.', en: '• Optionally add a theme to shape generated questions.' },
        how_to_play_invite_title: { pl: 'Zapraszanie graczy', en: 'Invite players' },
        how_to_play_invite_item_1: { pl: '• Utwórz pokój, aby uzyskać kod i link dołączenia.', en: '• Create a room to get a 6-digit code and join link.' },
        how_to_play_invite_item_2: { pl: '• Wyświetl kod QR na ekranie głównym.', en: '• Show the QR code on the main screen.' },
        how_to_play_invite_item_3: { pl: '• Gracze dołączają kodem lub QR.', en: '• Players join on their phones with the code or QR.' },
        how_to_play_during_title: { pl: 'W trakcie pytań', en: 'During questions' },
        how_to_play_during_item_1: { pl: '• Pytania pojawiają się na telefonach z 4 opcjami.', en: '• Each question appears on players’ devices with up to 4 options.' },
        how_to_play_during_item_2: { pl: '• Użyj pauzy/wznowienia timera w razie potrzeby.', en: '• Use the timer controls to pause, resume or extend the time.' },
        how_to_play_during_item_3: { pl: '• Możesz odświeżyć pytanie lub pokazać wyjaśnienie.', en: '• You can regenerate a question or show the explanation when ready.' },
        how_to_play_during_item_4: { pl: '• Auto-przejście uruchomi kolejne pytanie po zwłoce.', en: '• Auto-advance can move to the next question after a short delay.' },
        how_to_play_scores_title: { pl: 'Wyniki', en: 'Scores & results' },
        how_to_play_scores_item_1: { pl: '• Na panelu bocznym widać status odpowiedzi i wyniki.', en: '• Track live scores and answer status in the side panel.' },
        how_to_play_scores_item_2: { pl: '• Ekran końcowy pokazuje ranking.', en: '• Final screen shows ranking based on the current scoring rules.' },
        how_to_play_scores_item_3: { pl: '• Najlepiej: host na dużym ekranie, gracze na telefonach.', en: '• Best experience: host view on a big screen, players answer on phones.' },
        game_lobby_title: { pl: '🏠 Lobby gry', en: '🏠 Game Lobby' },
        join_game_title: { pl: '📱 Dołącz do gry', en: '📱 Join Game' },
        scan_qr_to_join: { pl: 'Zeskanuj kod QR, aby dołączyć', en: 'Scan QR code to join' },
        room_info_title: { pl: '📋 Informacje o pokoju', en: '📋 Room Information' },
        room_code_label: { pl: 'Kod pokoju:', en: 'Room Code:' },
        game_id_label: { pl: 'ID gry:', en: 'Game ID:' },
        players_label: { pl: 'Gracze:', en: 'Players:' },
        start_game_btn: { pl: '🚀 Start gry', en: '🚀 Start Game' },
        back_to_setup_btn: { pl: '← Wróć do ustawień', en: '← Back to Setup' },
        connected_players_title: { pl: '👥 Podłączeni gracze', en: '👥 Connected Players' },
        copy_room_code_title: { pl: 'Skopiuj kod pokoju', en: 'Copy room code' },
        copy_join_link_title: { pl: 'Skopiuj link dołączenia', en: 'Copy join link' },
        controls_title: { pl: '🎮 Sterowanie', en: '🎮 Controls' },
        fullscreen_btn: { pl: '📺 Pełny ekran', en: '📺 Fullscreen' },
        toggle_results_btn: { pl: '📋 Pokaż wyjaśnienie', en: '📋 Show Explanation' },
        toggle_results_hide_btn: { pl: '📋 Ukryj wyjaśnienie', en: '📋 Hide Explanation' },
        pause_timer_btn: { pl: '⏸️ Pauza', en: '⏸️ Pause Timer' },
        resume_timer_btn: { pl: '▶️ Wznów', en: '▶️ Resume Timer' },
        regenerate_question_btn: { pl: '🔄 Nowe pytanie', en: '🔄 New Question' },
        next_question_btn: { pl: '➡️ Następne pytanie', en: '➡️ Next Question' },
        auto_advance_label: { pl: 'Auto-przejście', en: 'Auto-advance' },
        auto_advance_time_label: { pl: 'Czas auto-przejścia:', en: 'Auto-advance time:' },
        answer_status_title: { pl: '📊 Status odpowiedzi', en: '📊 Answer Status' },
        current_scores_title: { pl: '🏆 Wyniki', en: '🏆 Current Scores' },
        game_progress_title: { pl: '📈 Postęp gry', en: '📈 Game Progress' },
        question_label: { pl: 'Pytanie:', en: 'Question:' },
        answered_label: { pl: 'Odpowiedzi:', en: 'Answered:' },
        players_list_label: { pl: 'Gracze:', en: 'Players:' },
        results_title: { pl: '📋 Wyniki', en: '📋 Results' },
        correct_answer_label: { pl: 'Poprawna odpowiedź:', en: 'Correct Answer:' },
        explanation_label: { pl: 'Wyjaśnienie:', en: 'Explanation:' },
        player_votes_label: { pl: 'Głosy graczy:', en: 'Player Votes:' },
        score_label: { pl: 'Wynik', en: 'Score' },
        game_finished_title: { pl: '🎉 Koniec gry!', en: '🎉 Game Finished!' },
        final_results_title: { pl: 'Wyniki końcowe', en: 'Final Results' },
        position_header: { pl: 'Miejsce', en: 'Position' },
        player_header: { pl: 'Gracz', en: 'Player' },
        score_header: { pl: 'Wynik', en: 'Score' },
        winner_title: { pl: '🏆 Zwycięzca!', en: '🏆 Winner!' },
        new_game_btn: { pl: '🎮 Nowa gra', en: '🎮 New Game' },
        exit_fullscreen_btn: { pl: '❌ Wyjdź z pełnego ekranu', en: '❌ Exit Fullscreen' },
        no_players_title: { pl: 'Brak graczy', en: 'No Players Participated' },
        no_players_message: { pl: 'Nie dołączyli gracze poza hostem.', en: 'No non-host players joined the game' },
        points_label: { pl: 'pkt', en: 'points' },
        live_quiz_player_title: { pl: '🎮 Live Quiz', en: '🎮 Live Quiz' },
        join_game_subtitle: { pl: 'Wpisz 6-cyfrowy kod pokoju z ekranu hosta i graj na telefonie.', en: 'Enter the 6-digit room code from the host screen and play on your phone while watching the main screen.' },
        join_game_subtitle_short: { pl: 'Wpisz kod pokoju podany przez hosta', en: 'Enter the room code provided by the host' },
        room_code_placeholder: { pl: '123456', en: '123456' },
        player_name_label: { pl: 'Twoje imię', en: 'Your Name' },
        player_name_placeholder: { pl: 'Wpisz swoje imię', en: 'Enter your name' },
        join_game_btn: { pl: 'Dołącz do gry', en: 'Join Game' },
        join_game_hint: { pl: 'Lub zeskanuj kod QR z ekranu hosta, aby dołączyć na tym urządzeniu.', en: 'Or scan the QR code from the host screen to join instantly on this device.' },
        join_game_hint_short: { pl: 'Lub zeskanuj kod QR, aby dołączyć automatycznie', en: 'Or scan the QR code to join automatically' },
        waiting_room_title: { pl: '🏠 Poczekalnia', en: '🏠 Waiting Room' },
        players_connected_label: { pl: 'Połączeni gracze:', en: 'Players Connected:' },
        game_categories_title: { pl: 'Kategorie gry:', en: 'Game Categories:' },
        waiting_for_host_text: { pl: 'Czekamy na start. Zostaw tę stronę otwartą — pytania pojawią się tutaj.', en: 'Waiting for the host to start. Keep this page open — questions will appear here.' },
        waiting_for_host_text_short: { pl: 'Czekamy, aż host wystartuje grę...', en: 'Waiting for host to start the game...' },
        leave_game_btn: { pl: 'Opuść grę', en: 'Leave Game' },
        player_answer_prompt: { pl: 'Wybierz odpowiedź przed końcem czasu. Możesz pominąć, jeśli nie jesteś pewien.', en: 'Select your answer before time runs out. You can skip if you are not sure.' },
        player_answer_prompt_short: { pl: 'Wybierz odpowiedź', en: 'Select your answer' },
        skip_question_btn: { pl: '⏭️ Pomiń pytanie', en: '⏭️ Skip Question' },
        question_complete_title: { pl: 'Pytanie zakończone', en: 'Question Complete' },
        waiting_next_question_text: { pl: 'Czekamy na następne pytanie...', en: 'Waiting for next question...' },
        your_answer_label: { pl: 'Twoja odpowiedź:', en: 'Your Answer:' },
        game_complete_title: { pl: 'Koniec gry!', en: 'Game Complete!' },
        thanks_for_playing_text: { pl: 'Dzięki za grę!', en: 'Thanks for playing!' },
        final_score_label: { pl: 'Wynik końcowy', en: 'Final Score' },
        final_position_text: { pl: 'Miejsce: -/-', en: 'Position: -/-' },
        play_again_btn: { pl: 'Zagraj ponownie', en: 'Play Again' },
        answer_submitted_text: { pl: '✓ Odpowiedź wysłana!', en: '✓ Answer submitted!' },
        question_skipped_text: { pl: '⏭️ Pytanie pominięte', en: '⏭️ Question skipped' },
        skipped_title: { pl: 'Pominięto', en: 'Skipped' },
        skipped_message: { pl: 'Pominąłeś to pytanie', en: 'You skipped this question' },
        correct_title: { pl: 'Poprawnie!', en: 'Correct!' },
        incorrect_title: { pl: 'Niepoprawnie', en: 'Incorrect' },
        correct_message: { pl: 'Świetna robota!', en: 'Great job!' },
        incorrect_message: { pl: 'Powodzenia następnym razem!', en: 'Better luck next time!' },
        timer_paused_by_host: { pl: 'Timer wstrzymany przez hosta', en: 'Timer paused by host' },
        timer_resumed: { pl: 'Timer wznowiony', en: 'Timer resumed' },
        connection_lost_text: { pl: '🔌 Połączenie utracone. Próba ponownego połączenia...', en: '🔌 Connection lost. Trying to reconnect...' },
        loading_text: { pl: 'Ładowanie...', en: 'Loading...' },
        theme_required_error: { pl: 'Najpierw wpisz motyw', en: 'Please enter a theme first' },
        generating_categories_loading: { pl: 'Generuję kategorie...', en: 'Generating categories...' },
        categories_generated_success: { pl: 'Kategorie wygenerowane!', en: 'Categories generated successfully!' },
        categories_generated_failed: { pl: 'Nie udało się wygenerować kategorii — możesz wpisać je ręcznie.', en: 'Failed to generate categories, you can add them manually' },
        preset_select_required: { pl: 'Wybierz najpierw preset', en: 'Please select a preset first' },
        preset_loaded_success: { pl: 'Preset wczytany!', en: 'Preset loaded successfully!' },
        fill_all_categories_error: { pl: 'Uzupełnij wszystkie 6 kategorii', en: 'Please fill in all 6 categories' },
        creating_room_loading: { pl: 'Tworzenie pokoju...', en: 'Creating room...' },
        create_room_failed_prefix: { pl: 'Nie udało się utworzyć pokoju:', en: 'Failed to create room:' },
        room_code_copied: { pl: 'Kod pokoju skopiowany!', en: 'Room code copied!' },
        join_url_copied: { pl: 'Link dołączenia skopiowany!', en: 'Join URL copied!' },
        connection_lost_refresh: { pl: 'Połączenie utracone. Odśwież stronę.', en: 'Connection lost. Please refresh the page.' },
        reconnected_active_game: { pl: 'Połączono ponownie z aktywną grą!', en: 'Reconnected to active game!' },
        player_joined_toast: { pl: '{name} dołączył(a) do gry!', en: '{name} joined the game!' },
        player_reconnected_toast: { pl: '{name} wrócił(a) do gry!', en: '{name} reconnected!' },
        question_regenerated: { pl: 'Pytanie odświeżone!', en: 'Question regenerated!' },
        game_started_toast: { pl: 'Gra wystartowała!', en: 'Game started!' },
        starting_game_loading: { pl: 'Uruchamianie gry...', en: 'Starting game...' },
        start_game_failed_prefix: { pl: 'Nie udało się uruchomić gry:', en: 'Failed to start game:' },
        action_failed_prefix: { pl: 'Akcja nieudana:', en: 'Action failed:' },
        host_action_next_question: { pl: 'Następne pytanie', en: 'Next question' },
        host_action_regenerate_question: { pl: 'Pytanie odświeżone', en: 'Question regenerated' },
        host_action_pause_timer: { pl: 'Timer wstrzymany', en: 'Timer paused' },
        host_action_resume_timer: { pl: 'Timer wznowiony', en: 'Timer resumed' },
        auto_advance_disabled_manual: { pl: 'Auto-przejście wyłączone (ręczne przejście)', en: 'Auto-advance disabled (manual advance)' },
        timer_paused_toast: { pl: 'Timer wstrzymany', en: 'Timer paused' },
        timer_resumed_toast: { pl: 'Timer wznowiony', en: 'Timer resumed' },
        no_explanation_available: { pl: 'Brak wyjaśnienia.', en: 'No explanation available.' },
        question_results_toast: { pl: 'Wyniki pytania {number}: {correct}/{total} poprawnych', en: 'Question {number} results: {correct}/{total} correct' },
        auto_advance_toast: { pl: 'Auto-przejście do następnego pytania...', en: 'Auto-advancing to next question...' },
        ready_next_question_toast: { pl: 'Gotowe na kolejne pytanie. Kliknij „Następne pytanie”.', en: 'Ready for next question. Click "Next Question" to continue.' },
        question_number_text: { pl: 'Pytanie {current}/{total}', en: 'Question {current}/{total}' },
        enter_valid_room_code: { pl: 'Podaj prawidłowy 6-cyfrowy kod pokoju', en: 'Please enter a valid 6-digit room code' },
        enter_player_name: { pl: 'Podaj swoje imię', en: 'Please enter your name' },
        joining_game_loading: { pl: 'Dołączanie do gry...', en: 'Joining game...' },
        join_game_success: { pl: 'Dołączono do gry!', en: 'Joined game successfully!' },
        join_game_failed_prefix: { pl: 'Nie udało się dołączyć:', en: 'Failed to join game:' },
        game_in_progress_text: { pl: '⚡ Gra w toku! (Pytanie {number})', en: '⚡ Game in progress! (Question {number})' },
        late_joiner_text: { pl: 'Dołączyłeś późno — zaczniesz od następnego pytania.', en: "You're a late joiner. You'll start participating from the next question." },
        joined_in_progress_toast: { pl: 'Dołączono do gry w toku. Zaczniesz od następnego pytania.', en: "Joined game in progress! You'll start from the next question." },
        reconnected_toast: { pl: 'Połączono ponownie z grą!', en: 'Successfully reconnected to game!' },
        auto_reconnected_toast: { pl: 'Automatycznie połączono z Twoją grą!', en: 'Auto-reconnected to your game!' },
        recovered_session_toast: { pl: 'Przywrócono poprzednią sesję!', en: 'Recovered your previous session!' },
        game_expired_error: { pl: 'Gra wygasła z powodu braku aktywności.', en: 'Game has expired due to inactivity.' },
        submit_answer_failed_prefix: { pl: 'Nie udało się wysłać odpowiedzi:', en: 'Failed to submit answer:' },
        skip_question_failed_prefix: { pl: 'Nie udało się pominąć pytania:', en: 'Failed to skip question:' },
        player_won_toast: { pl: '🏆 Wygrana! Gratulacje!', en: '🏆 You won! Congratulations!' },
        game_finished_placement_toast: { pl: 'Koniec gry! Zająłeś {position} z {total}.', en: 'Game finished! You placed {position} of {total}' },
        final_position_format: { pl: 'Miejsce: {position}/{total}', en: 'Position: {position}/{total}' }
    };

    function formatTranslation(key, params = {}, lang = getPreferredLanguage()) {
        let text = getTranslation(key, lang);
        Object.entries(params).forEach(([paramKey, value]) => {
            text = text.split(`{${paramKey}}`).join(String(value));
        });
        return text;
    }

    function buildSseUrl({ gameId, playerId, type }) {
        const params = new URLSearchParams({
            game_id: gameId,
            player_id: playerId,
            type: type
        });
        return `${API_ENDPOINTS.events}?${params.toString()}`;
    }

    function getPreferredLanguage() {
        const select = document.getElementById('language');
        if (select && select.value) {
            return select.value;
        }
        const saved = localStorage.getItem('liveQuizLanguage');
        if (saved) {
            return saved;
        }
        return document.documentElement.lang || 'pl';
    }

    function applyTranslations(lang = getPreferredLanguage()) {
        const activeLang = lang || 'pl';

        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            const translation = TRANSLATIONS[key]?.[activeLang];
            if (!translation) return;

            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (typeof el.placeholder !== 'undefined') {
                    el.placeholder = translation;
                }
            } else {
                el.innerHTML = translation;
            }
        });

        document.querySelectorAll('[data-title-lang-key]').forEach(el => {
            const key = el.dataset.titleLangKey;
            const translation = TRANSLATIONS[key]?.[activeLang];
            if (translation) {
                el.title = translation;
            }
        });
    }

    function getTranslation(key, lang = getPreferredLanguage()) {
        return TRANSLATIONS[key]?.[lang] || TRANSLATIONS[key]?.en || '';
    }

    function setLanguage(lang) {
        const normalized = lang || 'pl';
        document.documentElement.lang = normalized;
        localStorage.setItem('liveQuizLanguage', normalized);
        applyTranslations(normalized);
    }

    // API helper
    async function apiCall(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(endpoint, options);
            let result = null;
            try {
                result = await response.json();
            } catch (parseError) {
                result = null;
            }
            
            if (!response.ok) {
                let message = 'API call failed';
                if (result) {
                    if (typeof result.detail === 'string') {
                        message = result.detail;
                    } else if (Array.isArray(result.detail)) {
                        message = result.detail.map(item => item.msg || JSON.stringify(item)).join(', ');
                    } else if (result.detail) {
                        message = JSON.stringify(result.detail);
                    } else if (result.error) {
                        message = result.error;
                    }
                }
                throw new Error(message);
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            showNotification('Error: ' + error.message, 'error');
            throw error;
        }
    }

    // UI Helpers
    function showScreen(screenId) {
        document.querySelectorAll('#setup-screen, #lobby-screen, #game-screen, #results-screen, #join-screen, #question-screen, #final-results-screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            // Auto-save current screen for session recovery
            saveCurrentScreen(screenId);
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
            type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600'
        }`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    function showLoading(text = 'Loading...') {
        const loadingElement = document.getElementById('loading-text');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (loadingElement) {
            loadingElement.textContent = text;
        }
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }
    }

    function hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }

    // Populate category presets
    function populateCategoryPresets() {
        const presetSelect = document.getElementById('category-preset-select');
        const language = getPreferredLanguage();
        
        if (presetSelect) {
            const placeholder = TRANSLATIONS.category_preset_placeholder?.[language] || 'Choose a preset...';
            presetSelect.innerHTML = `<option value="">${placeholder}</option>`;
            
            const presets = window.CATEGORY_PRESETS || [];
            presets.forEach((preset, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = preset.name[language] || preset.name.en;
                presetSelect.appendChild(option);
            });
        }
    }

    // Update category inputs
    function updateCategoryInputs(categories) {
        const inputs = document.querySelectorAll('.category-input');
        categories.slice(0, 6).forEach((category, index) => {
            if (inputs[index]) {
                inputs[index].value = category;
            }
        });
    }

    // QR Code Generation - Large for lobby
    function generateQRCode(url) {
        const qrContainer = document.getElementById('qr-code');
        if (!qrContainer) return;
        
        // Clear the container
        const innerContainer = qrContainer.querySelector('.qr-code-inner');
        if (innerContainer) {
            innerContainer.innerHTML = '';
        } else {
            qrContainer.innerHTML = '';
        }
        
        try {
            // Generate QR code
            const qr = qrcode(0, 'M');
            qr.addData(url);
            qr.make();
            
            // Create much larger canvas for better visibility in half-screen display
            const canvas = document.createElement('canvas');
            canvas.width = 500; // Much larger for better visibility
            canvas.height = 500;
            const ctx = canvas.getContext('2d');
            
            // Set white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw QR code (with adequate margin for scanning)
            const margin = 40;
            const availableSize = canvas.width - (margin * 2);
            const moduleSize = availableSize / qr.getModuleCount();
            
            // Draw dark modules
            ctx.fillStyle = '#000000';
            for (let row = 0; row < qr.getModuleCount(); row++) {
                for (let col = 0; col < qr.getModuleCount(); col++) {
                    if (qr.isDark(row, col)) {
                        const x = margin + (col * moduleSize);
                        const y = margin + (row * moduleSize);
                        ctx.fillRect(x, y, moduleSize, moduleSize);
                    }
                }
            }
            
            // Add canvas to the appropriate container
            if (innerContainer) {
                innerContainer.appendChild(canvas);
            } else {
                qrContainer.appendChild(canvas);
            }
            
            console.log('Large QR code generated successfully (500x500)');
        } catch (error) {
            console.error('QR Code generation failed:', error);
            const errorContainer = innerContainer || qrContainer;
            errorContainer.innerHTML = '<p class="text-sm text-gray-400">QR code unavailable</p>';
        }
    }

    // Local Storage Functions
    function saveGameSetup() {
        const setup = {
            knowledgeLevel: document.getElementById('knowledge-level')?.value || 'intermediate',
            language: document.getElementById('language')?.value || 'pl',
            questionModel: document.getElementById('question-model')?.value || '',
            theme: document.getElementById('theme')?.value || '',
            includeTheme: document.getElementById('include-theme')?.checked ?? true,
            questionsPerCategory: document.getElementById('questions-per-category')?.value || '3',
            answerTime: document.getElementById('answer-time')?.value || '60',
            autoAdvanceTime: document.getElementById('auto-advance-slider')?.value || '15',
            categories: Array.from(document.querySelectorAll('.category-input'))
                .map(input => input.value)
        };
        localStorage.setItem('liveQuizSetup', JSON.stringify(setup));
    }

    function loadGameSetup() {
        const saved = localStorage.getItem('liveQuizSetup');
        if (saved) {
            try {
                const setup = JSON.parse(saved);
                if (setup.knowledgeLevel && document.getElementById('knowledge-level')) {
                    document.getElementById('knowledge-level').value = setup.knowledgeLevel;
                }
                if (setup.language && document.getElementById('language')) {
                    document.getElementById('language').value = setup.language;
                }
                if (setup.questionModel && document.getElementById('question-model')) {
                    document.getElementById('question-model').value = setup.questionModel;
                }
                if (setup.theme && document.getElementById('theme')) {
                    document.getElementById('theme').value = setup.theme;
                }
                if (setup.includeTheme !== undefined && document.getElementById('include-theme')) {
                    document.getElementById('include-theme').checked = setup.includeTheme;
                }
                if (setup.questionsPerCategory && document.getElementById('questions-per-category')) {
                    document.getElementById('questions-per-category').value = setup.questionsPerCategory;
                }
                if (setup.answerTime && document.getElementById('answer-time')) {
                    document.getElementById('answer-time').value = setup.answerTime;
                }
                if (setup.autoAdvanceTime && document.getElementById('auto-advance-slider')) {
                    document.getElementById('auto-advance-slider').value = setup.autoAdvanceTime;
                }
                if (setup.categories && setup.categories.length > 0) {
                    updateCategoryInputs(setup.categories);
                }
                
                // Update slider displays
                updateSliderDisplays();
            } catch (error) {
                console.log('Failed to load saved setup:', error);
            }
        }
    }
    
    function updateSliderDisplays() {
        // Update questions per category slider display
        const questionsSlider = document.getElementById('questions-per-category');
        const questionsSliderValue = document.getElementById('questions-slider-value');
        if (questionsSlider && questionsSliderValue) {
            questionsSliderValue.textContent = questionsSlider.value;
        }
        
        // Update answer time slider display
        const answerTimeSlider = document.getElementById('answer-time');
        const answerTimeSliderValue = document.getElementById('answer-time-slider-value');
        if (answerTimeSlider && answerTimeSliderValue) {
            answerTimeSliderValue.textContent = answerTimeSlider.value;
        }
        
        // Update auto-advance slider displays
        const autoAdvanceSlider = document.getElementById('auto-advance-slider');
        const autoAdvanceSliderValue = document.getElementById('auto-advance-slider-value');
        if (autoAdvanceSlider && autoAdvanceSliderValue) {
            autoAdvanceSliderValue.textContent = autoAdvanceSlider.value;
        }
        
        const fullscreenAutoAdvanceSlider = document.getElementById('fullscreen-auto-advance-slider');
        const fullscreenAutoAdvanceSliderValue = document.getElementById('fullscreen-auto-advance-slider-value');
        if (fullscreenAutoAdvanceSlider && fullscreenAutoAdvanceSliderValue) {
            fullscreenAutoAdvanceSliderValue.textContent = fullscreenAutoAdvanceSlider.value;
        }
    }

    function getCategoryPresets() {
        return window.CATEGORY_PRESETS || [];
    }

    // Session Storage Functions
    function saveToSession(key, data) {
        try {
            sessionStorage.setItem(`liveQuiz_${key}`, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save to session storage:', error);
        }
    }

    function loadFromSession(key, defaultValue = null) {
        try {
            const saved = sessionStorage.getItem(`liveQuiz_${key}`);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Failed to load from session storage:', error);
        }
        return defaultValue;
    }

    function removeFromSession(key) {
        try {
            sessionStorage.removeItem(`liveQuiz_${key}`);
        } catch (error) {
            console.warn('Failed to remove from session storage:', error);
        }
    }

    function clearSession() {
        try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.startsWith('liveQuiz_')) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('Failed to clear session storage:', error);
        }
    }

    function saveCurrentScreen(screenId) {
        saveToSession('currentScreen', { screenId, timestamp: Date.now() });
    }

    function loadCurrentScreen() {
        return loadFromSession('currentScreen');
    }

    return {
        apiCall,
        showScreen,
        showNotification,
        showLoading,
        hideLoading,
        populateCategoryPresets,
        updateCategoryInputs,
        generateQRCode,
        saveGameSetup,
        loadGameSetup,
        updateSliderDisplays,
        getCategoryPresets,
        getPreferredLanguage,
        applyTranslations,
        setLanguage,
        getTranslation,
        formatTranslation,
        buildSseUrl,
        API_ENDPOINTS,
        MAX_PLAYERS,
        DEFAULT_TOTAL_QUESTIONS,
        DEFAULT_QUESTION_MODEL,
        DEFAULT_EXPLANATION_MODEL,
        DEFAULT_CATEGORY_MODEL,
        saveToSession,
        loadFromSession,
        removeFromSession,
        clearSession,
        saveCurrentScreen,
        loadCurrentScreen
    };
})();
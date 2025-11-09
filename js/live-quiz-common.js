// Live Quiz Common Utilities
window.LiveQuizCommon = (function() {
    'use strict';

    // Category Presets from board game
    const CATEGORY_PRESETS = [
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
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || 'API call failed');
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
        const language = document.getElementById('language')?.value || 'pl';
        
        if (presetSelect) {
            presetSelect.innerHTML = '<option value="">Choose a preset...</option>';
            
            CATEGORY_PRESETS.forEach((preset, index) => {
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
            theme: document.getElementById('theme')?.value || '',
            includeTheme: document.getElementById('include-theme')?.checked ?? true,
            questionModel: document.getElementById('question-model')?.value || 'auto',
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
                if (setup.theme && document.getElementById('theme')) {
                    document.getElementById('theme').value = setup.theme;
                }
                if (setup.includeTheme !== undefined && document.getElementById('include-theme')) {
                    document.getElementById('include-theme').checked = setup.includeTheme;
                }
                if (setup.questionModel && document.getElementById('question-model')) {
                    document.getElementById('question-model').value = setup.questionModel;
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
        return CATEGORY_PRESETS;
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
        saveToSession,
        loadFromSession,
        removeFromSession,
        clearSession,
        saveCurrentScreen,
        loadCurrentScreen
    };
})();
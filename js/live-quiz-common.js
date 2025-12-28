// Live Quiz Common Utilities
window.LiveQuizCommon = (function() {
    'use strict';

    // Category Presets are now imported from config.js or accessed via window.CATEGORY_PRESETS

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
        saveToSession,
        loadFromSession,
        removeFromSession,
        clearSession,
        saveCurrentScreen,
        loadCurrentScreen
    };
})();
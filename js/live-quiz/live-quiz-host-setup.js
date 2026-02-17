// Live Quiz Host Setup Logic
window.LiveQuizHostSetup = (function(Common) {
    'use strict';

    // Load available models
    async function loadModels() {
        try {
            console.log('Loading models...');
            
            const questionModels = await Common.apiCall(Common.API_ENDPOINTS.modelsQuestions);
            console.log('Question models loaded:', questionModels);
            
            // Populate question models (without "Auto" option)
            const questionModelSelect = document.getElementById('question-model');
            if (questionModelSelect) {
                questionModelSelect.innerHTML = ''; // Clear existing options
                if (Array.isArray(questionModels) && questionModels.length > 0) {
                    // Set the first model as selected by default
                    questionModels.forEach((model, index) => {
                        const option = document.createElement('option');
                        option.value = model.id;
                        option.textContent = model.name;
                        if (index === 0) {
                            option.selected = true;
                        }
                        questionModelSelect.appendChild(option);
                    });
                } else {
                    // Fallback if no models available
                    questionModelSelect.innerHTML = '<option value="default">Default Model</option>';
                }

                // Restore saved model selection if available
                try {
                    const saved = localStorage.getItem('liveQuizSetup');
                    if (saved) {
                        const setup = JSON.parse(saved);
                        if (setup.questionModel) {
                            questionModelSelect.value = setup.questionModel;
                        }
                    }
                } catch (error) {
                    console.log('Failed to restore saved question model:', error);
                }
            }
            
            console.log('Models loaded successfully');
        } catch (error) {
            console.error('Failed to load models:', error);
            console.log('Using default model options');
            // Set default model
            const questionModelSelect = document.getElementById('question-model');
            if (questionModelSelect) {
                questionModelSelect.innerHTML = '<option value="default">Default Model</option>';
            }
        }
    }

    // Setup screen event listeners
    function setupEventListeners() {
        // Load saved setup
        Common.loadGameSetup();
        
        // Add auto-save to all form elements
        const formElements = [
            'knowledge-level', 'language', 'theme',
            'include-theme', 'questions-per-category',
            'answer-time', 'auto-advance-slider', 'question-model'
        ];
        formElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', Common.saveGameSetup);
                element.addEventListener('input', Common.saveGameSetup);
            }
        });
        
        // Category inputs auto-save
        document.querySelectorAll('.category-input').forEach(input => {
            input.addEventListener('input', Common.saveGameSetup);
        });
        
        // Generate categories
        setupCategoryGeneration();
        
        // Load preset functionality
        setupPresetLoading();
        
        // Language change handler
        setupLanguageChange();
        
        // Create room button
        document.getElementById('create-room')?.addEventListener('click', createRoom);
    }

    function setupCategoryGeneration() {
        document.getElementById('generate-categories')?.addEventListener('click', async () => {
            const theme = document.getElementById('theme').value.trim();
            if (!theme) {
                Common.showNotification(Common.getTranslation('theme_required_error'), 'error');
                return;
            }
            
            Common.showLoading(Common.getTranslation('generating_categories_loading'));
            try {
                const response = await Common.apiCall(Common.API_ENDPOINTS.generateCategories, 'POST', {
                    model: Common.DEFAULT_CATEGORY_MODEL,
                    theme: theme,
                    language: document.getElementById('language').value
                });
                
                Common.updateCategoryInputs(response.categories);
                Common.saveGameSetup(); // Save after generating
                Common.showNotification(Common.getTranslation('categories_generated_success'), 'success');
            } catch (error) {
                // Categories generation failed, but don't block the user
                Common.showNotification(Common.getTranslation('categories_generated_failed'), 'error');
            } finally {
                Common.hideLoading();
            }
        });
    }

    function setupPresetLoading() {
        document.getElementById('load-preset')?.addEventListener('click', () => {
            const selectedIndex = document.getElementById('category-preset-select').value;
            if (selectedIndex === '') {
                Common.showNotification(Common.getTranslation('preset_select_required'), 'error');
                return;
            }
            
            const selectedPreset = Common.getCategoryPresets()[parseInt(selectedIndex)];
            const language = document.getElementById('language').value;
            
            const categoryNames = selectedPreset.categories.map(cat => cat[language] || cat.en);
            Common.updateCategoryInputs(categoryNames);
            
            const presetName = selectedPreset.name[language] || selectedPreset.name.en;
            document.getElementById('theme').value = presetName;
            Common.saveGameSetup(); // Save after loading preset
            
            Common.showNotification(Common.getTranslation('preset_loaded_success'), 'success');
        });
    }

    function setupLanguageChange() {
        document.getElementById('language')?.addEventListener('change', () => {
            Common.setLanguage(document.getElementById('language').value);
            Common.populateCategoryPresets();
            Common.saveGameSetup();
        });
    }

    async function createRoom() {
        // Save current setup to localStorage
        Common.saveGameSetup();
        
        // Validate categories
        const categories = Array.from(document.querySelectorAll('.category-input'))
            .map(input => input.value.trim())
            .filter(cat => cat !== '');
        
        if (categories.length !== 6) {
            Common.showNotification(Common.getTranslation('fill_all_categories_error'), 'error');
            return;
        }
        
        const questionsPerCategory = parseInt(document.getElementById('questions-per-category').value);
        const totalQuestions = categories.length * questionsPerCategory;
        
        Common.showLoading(Common.getTranslation('creating_room_loading'));
        try {
            const selectedQuestionModel = document.getElementById('question-model')?.value || Common.DEFAULT_QUESTION_MODEL;
            const response = await Common.apiCall(Common.API_ENDPOINTS.createRoom, 'POST', {
                categories: categories,
                game_mode: 'mcq', // Always multiple choice
                knowledge_level: document.getElementById('knowledge-level').value,
                language: document.getElementById('language').value,
                theme: document.getElementById('theme').value.trim() || null,
                include_category_theme: document.getElementById('include-theme').checked,
                selected_question_model: selectedQuestionModel,
                selected_explanation_model: Common.DEFAULT_EXPLANATION_MODEL,
                selected_category_model: Common.DEFAULT_CATEGORY_MODEL,
                questions_per_category: questionsPerCategory,
                answer_time: parseInt(document.getElementById('answer-time').value)
            });
            
            // Update game state
            const gameState = window.LiveQuizHostState || (window.LiveQuizHostState = {});
            gameState.gameId = response.game_id;
            gameState.roomCode = response.room_code;
            gameState.hostId = response.host_id;
            gameState.categories = categories;
            gameState.questionsPerCategory = questionsPerCategory;
            gameState.totalQuestions = totalQuestions;
            
            // Update lobby screen
            document.getElementById('room-code').textContent = response.room_code;
            document.getElementById('game-id').textContent = response.game_id;
            const joinUrl = `${window.location.origin}/live-quiz/player?room=${response.room_code}`;
            document.getElementById('join-url').value = joinUrl;
            
            // Generate QR code
            Common.generateQRCode(joinUrl);
            
            Common.showScreen('lobby-screen');
            
            // Initialize lobby and SSE
            if (window.LiveQuizHostLobby) {
                window.LiveQuizHostLobby.setupSSE();
            }
            
        } catch (error) {
            Common.showNotification(`${Common.getTranslation('create_room_failed_prefix')} ${error.message}`, 'error');
        } finally {
            Common.hideLoading();
        }
    }

    function init() {
        setupEventListeners();
        Common.setLanguage(document.getElementById('language')?.value || Common.getPreferredLanguage());
        loadModels();
    }

    return {
        init: init,
        loadModels: loadModels
    };
})(window.LiveQuizCommon);
// Live Quiz Host Setup Logic
window.LiveQuizHostSetup = (function(Common) {
    'use strict';

    // Load available models
    async function loadModels() {
        try {
            console.log('Loading models...');
            
            const questionModels = await Common.apiCall('/api/models/questions');
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
        // Load models and saved setup
        loadModels();
        Common.loadGameSetup();
        
        // Add auto-save to all form elements
        const formElements = [
            'knowledge-level', 'language', 'theme',
            'include-theme', 'question-model', 'questions-per-category',
            'answer-time', 'auto-advance-time'
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
                Common.showNotification('Please enter a theme first', 'error');
                return;
            }
            
            Common.showLoading('Generating categories...');
            try {
                const response = await Common.apiCall('/api/generate-categories', 'POST', {
                    model: 'auto', // Use default model
                    theme: theme,
                    language: document.getElementById('language').value
                });
                
                Common.updateCategoryInputs(response.categories);
                Common.saveGameSetup(); // Save after generating
                Common.showNotification('Categories generated successfully!', 'success');
            } catch (error) {
                // Categories generation failed, but don't block the user
                Common.showNotification('Failed to generate categories, you can add them manually', 'error');
            } finally {
                Common.hideLoading();
            }
        });
    }

    function setupPresetLoading() {
        document.getElementById('load-preset')?.addEventListener('click', () => {
            const selectedIndex = document.getElementById('category-preset-select').value;
            if (selectedIndex === '') {
                Common.showNotification('Please select a preset first', 'error');
                return;
            }
            
            const selectedPreset = Common.getCategoryPresets()[parseInt(selectedIndex)];
            const language = document.getElementById('language').value;
            
            const categoryNames = selectedPreset.categories.map(cat => cat[language] || cat.en);
            Common.updateCategoryInputs(categoryNames);
            
            const presetName = selectedPreset.name[language] || selectedPreset.name.en;
            document.getElementById('theme').value = presetName;
            Common.saveGameSetup(); // Save after loading preset
            
            Common.showNotification('Preset loaded successfully!', 'success');
        });
    }

    function setupLanguageChange() {
        document.getElementById('language')?.addEventListener('change', () => {
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
            Common.showNotification('Please fill in all 6 categories', 'error');
            return;
        }
        
        const questionsPerCategory = parseInt(document.getElementById('questions-per-category').value);
        const totalQuestions = categories.length * questionsPerCategory;
        
        Common.showLoading('Creating room...');
        try {
            const response = await Common.apiCall('/api/live-quiz/create-room', 'POST', {
                categories: categories,
                game_mode: 'mcq', // Always multiple choice
                knowledge_level: document.getElementById('knowledge-level').value,
                language: document.getElementById('language').value,
                theme: document.getElementById('theme').value.trim() || null,
                include_category_theme: document.getElementById('include-theme').checked,
                selected_question_model: document.getElementById('question-model').value,
                selected_explanation_model: 'auto', // Default value
                selected_category_model: 'auto', // Default value
                questions_per_category: questionsPerCategory
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
            Common.showNotification('Failed to create room: ' + error.message, 'error');
        } finally {
            Common.hideLoading();
        }
    }

    function init() {
        setupEventListeners();
    }

    return {
        init: init,
        loadModels: loadModels
    };
})(window.LiveQuizCommon);
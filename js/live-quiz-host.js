// Live Quiz Host Logic
window.LiveQuizHost = (function(Common) {
    'use strict';

    // Global game state
    let gameState = {
        gameId: null,
        roomCode: null,
        hostId: null,
        categories: [],
        players: [],
        currentQuestion: null,
        timer: null,
        timerSeconds: 60,
        sse: null,
        questionsPerCategory: null,
        totalQuestions: null
    };

    // Session Storage Functions with better debugging
    function saveHostState(screenName = null) {
        try {
            const stateData = {
                gameState: {
                    gameId: gameState.gameId,
                    roomCode: gameState.roomCode,
                    hostId: gameState.hostId,
                    categories: gameState.categories,
                    players: gameState.players,
                    currentQuestion: gameState.currentQuestion,
                    timerSeconds: gameState.timerSeconds,
                    questionsPerCategory: gameState.questionsPerCategory,
                    totalQuestions: gameState.totalQuestions
                },
                currentScreen: screenName,
                timestamp: Date.now(),
                version: '2.0'
            };
            
            Common.saveToSession('hostState', stateData);
            console.log('✅ Host state saved:', stateData);
        } catch (error) {
            console.error('❌ Failed to save host state:', error);
        }
    }

    function loadHostState() {
        try {
            const savedState = Common.loadFromSession('hostState');
            console.log('📁 Loaded host state:', savedState);
            
            if (savedState && savedState.version === '2.0' && savedState.gameState) {
                // Restore game state
                gameState.gameId = savedState.gameState.gameId;
                gameState.roomCode = savedState.gameState.roomCode;
                gameState.hostId = savedState.gameState.hostId;
                gameState.categories = savedState.gameState.categories || [];
                gameState.players = savedState.gameState.players || [];
                gameState.currentQuestion = savedState.gameState.currentQuestion;
                gameState.timerSeconds = savedState.gameState.timerSeconds || 60;
                gameState.questionsPerCategory = savedState.gameState.questionsPerCategory;
                gameState.totalQuestions = savedState.gameState.totalQuestions;
                
                return savedState;
            }
        } catch (error) {
            console.error('❌ Failed to load host state:', error);
        }
        return null;
    }

    function clearHostState() {
        try {
            Common.removeFromSession('hostState');
            console.log('🗑️ Host state cleared');
        } catch (error) {
            console.error('❌ Failed to clear host state:', error);
        }
    }

    function recoverHostState() {
        console.log('🔄 === HOST STATE RECOVERY START ===');
        
        // Check for saved state
        const savedState = loadHostState();
        if (!savedState) {
            console.log('❌ No saved state found, starting fresh');
            return false;
        }
        
        const stateAge = Date.now() - savedState.timestamp;
        console.log('⏰ State age:', Math.round(stateAge / 1000), 'seconds');
        
        // Only recover if state is less than 2 hours old
        if (stateAge > 7200000) {
            console.log('⏰ State too old, clearing');
            clearHostState();
            return false;
        }
        
        // Restore screen
        const targetScreen = savedState.currentScreen || 'setup-screen';
        console.log('🎯 Target screen:', targetScreen);
        
        // Validate we can recover
        if ((targetScreen === 'lobby-screen' || targetScreen === 'game-screen') && 
            (!gameState.gameId || !gameState.hostId)) {
            console.log('❌ Missing game IDs, falling back to setup');
            clearHostState();
            return false;
        }
        
        // Show screen
        console.log('🖥️ Showing screen:', targetScreen);
        Common.showScreen(targetScreen);
        
        // Set up recovery actions
        setTimeout(() => {
            if (targetScreen === 'lobby-screen' || targetScreen === 'game-screen') {
                console.log('🔗 Setting up SSE connection...');
                setupSSE();
                
                if (targetScreen === 'lobby-screen') {
                    console.log('📊 Restoring lobby data...');
                    restoreLobbyData();
                }
                
                if (targetScreen === 'game-screen' && gameState.currentQuestion) {
                    console.log('❓ Restoring question...');
                    setTimeout(() => {
                        startQuestion(gameState.currentQuestion);
                    }, 300);
                }
            }
        }, 200);
        
        console.log('✅ Host state recovery completed');
        return true;
    }
    
    function restoreLobbyData() {
        try {
            const roomCodeElement = document.getElementById('room-code');
            const gameIdElement = document.getElementById('game-id');
            const joinUrlElement = document.getElementById('join-url');
            
            if (roomCodeElement) roomCodeElement.textContent = gameState.roomCode;
            if (gameIdElement) gameIdElement.textContent = gameState.gameId;
            if (joinUrlElement) {
                const joinUrl = `${window.location.origin}/live-quiz/player?room=${gameState.roomCode}`;
                joinUrlElement.value = joinUrl;
            }
            
            if (gameState.roomCode) {
                Common.generateQRCode(`${window.location.origin}/live-quiz/player?room=${gameState.roomCode}`);
            }
            
            if (gameState.players) {
                updatePlayersList(gameState.players);
                updatePlayerCount(gameState.players.filter(p => p.id !== gameState.hostId).length);
            }
        } catch (error) {
            console.error('❌ Failed to restore lobby data:', error);
        }
    }

    // Load available models
    async function loadModels() {
        try {
            console.log('Loading models...');
            
            const questionModels = await Common.apiCall('/api/models/questions');
            console.log('Question models loaded:', questionModels);
            
            // Populate question models
            const questionModelSelect = document.getElementById('question-model');
            if (questionModelSelect) {
                questionModelSelect.innerHTML = '<option value="auto" selected>Auto</option>';
                if (Array.isArray(questionModels)) {
                    questionModels.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.id;
                        option.textContent = model.name;
                        questionModelSelect.appendChild(option);
                    });
                }
            }
            
            console.log('Models loaded successfully');
        } catch (error) {
            console.error('Failed to load models:', error);
            console.log('Using default model options');
        }
    }

    // Setup screen logic
    function setupEventListeners() {
        // Load models and saved setup
        loadModels();
        Common.loadGameSetup();
        
        // Add auto-save to all form elements
        const formElements = [
            'host-name', 'knowledge-level', 'language', 'theme',
            'include-theme', 'question-model', 'questions-per-category'
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

        // Load preset
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

        // Language change updates presets
        document.getElementById('language')?.addEventListener('change', () => {
            Common.populateCategoryPresets();
            Common.saveGameSetup();
        });

        // Create room
        document.getElementById('create-room')?.addEventListener('click', createRoom);
        
        // Copy room code
        document.getElementById('copy-room-code')?.addEventListener('click', () => {
            navigator.clipboard.writeText(gameState.roomCode);
            Common.showNotification('Room code copied!', 'success');
        });
        
        // Copy join URL
        document.getElementById('copy-join-url')?.addEventListener('click', () => {
            const url = document.getElementById('join-url').value;
            navigator.clipboard.writeText(url);
            Common.showNotification('Join URL copied!', 'success');
        });
        
        // Start game
        document.getElementById('start-game')?.addEventListener('click', startGame);
        
        // Back to setup
        document.getElementById('back-to-setup')?.addEventListener('click', () => {
            if (gameState.sse) {
                gameState.sse.close();
            }
            clearHostState();
            Common.showScreen('setup-screen');
        });
        
        // Game controls
        document.getElementById('pause-timer')?.addEventListener('click', () => hostControl('pause_timer'));
        document.getElementById('resume-timer')?.addEventListener('click', () => hostControl('resume_timer'));
        document.getElementById('regenerate-question')?.addEventListener('click', () => hostControl('regenerate_question'));
        document.getElementById('next-question')?.addEventListener('click', () => hostControl('next_question'));
        
        // Fullscreen controls
        document.getElementById('toggle-fullscreen')?.addEventListener('click', enterFullscreen);
        document.getElementById('exit-fullscreen')?.addEventListener('click', exitFullscreen);
        document.getElementById('fullscreen-pause-timer')?.addEventListener('click', () => hostControl('pause_timer'));
        document.getElementById('fullscreen-resume-timer')?.addEventListener('click', () => hostControl('resume_timer'));
        document.getElementById('fullscreen-regenerate-question')?.addEventListener('click', () => hostControl('regenerate_question'));
        document.getElementById('fullscreen-next-question')?.addEventListener('click', () => hostControl('next_question'));
        
        // Results screen
        document.getElementById('new-game')?.addEventListener('click', () => {
            if (gameState.sse) {
                gameState.sse.close();
            }
            clearHostState();
            Common.showScreen('setup-screen');
        });
        
        document.getElementById('exit-game')?.addEventListener('click', () => {
            if (gameState.sse) {
                gameState.sse.close();
            }
            clearHostState();
            Common.showScreen('setup-screen');
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
                host_name: document.getElementById('host-name').value || 'Host',
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
            setupSSE();
            saveHostState('lobby-screen'); // Save state after successful room creation
            
        } catch (error) {
            Common.showNotification('Failed to create room: ' + error.message, 'error');
        } finally {
            Common.hideLoading();
        }
    }

    function setupSSE() {
        const sseUrl = `/api/live-quiz/events?game_id=${gameState.gameId}&player_id=${gameState.hostId}&type=host`;
        gameState.sse = new EventSource(sseUrl);
        
        gameState.sse.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleSSEEvent(data);
        };
        
        gameState.sse.onerror = (error) => {
            console.error('SSE Error:', error);
            Common.showNotification('Connection lost. Please refresh the page.', 'error');
        };
    }

    function handleSSEEvent(event) {
        switch (event.type) {
            case 'connected':
                // Filter out host from initial lobby data
                if (event.data.players) {
                    const filteredPlayers = event.data.players.filter(p => p.id !== gameState.hostId);
                    updateLobby({ ...event.data, players: filteredPlayers });
                } else {
                    updateLobby(event.data);
                }
                break;
                
            case 'players_update':
                // Filter out host from player updates
                const filteredPlayers = event.data.players.filter(p => p.id !== gameState.hostId);
                updatePlayersList(filteredPlayers);
                updatePlayerCount(filteredPlayers.length);
                break;
                
            case 'player_joined':
                addPlayer(event.data.player);
                Common.showNotification(`${event.data.player.name} joined the game!`, 'success');
                break;
                
            case 'question_started':
                startQuestion(event.data);
                saveHostState('game-screen'); // Save state when question starts
                break;
                
            case 'timer_update':
                updateTimer(event.data.remaining_seconds);
                saveHostState('game-screen'); // Save state on timer updates
                break;
                
            case 'timer_paused':
                showTimerPaused();
                saveHostState('game-screen'); // Save state when timer paused
                break;
                
            case 'timer_resumed':
                showTimerResumed();
                saveHostState('game-screen'); // Save state when timer resumed
                break;
                
            case 'answer_submitted':
                updateAnswerStatus(event.data);
                break;
                
            case 'question_results':
                showQuestionResults(event.data);
                saveHostState('game-screen'); // Save state when results shown
                break;
                
            case 'question_regenerated':
                Common.showNotification('Question regenerated!', 'info');
                saveHostState('game-screen'); // Save state when question regenerated
                break;
                
            case 'game_started':
                Common.showScreen('game-screen');
                Common.showNotification('Game started!', 'success');
                saveHostState('game-screen'); // Save state when game starts
                break;
                
            case 'game_finished':
                showFinalResults(event.data);
                saveHostState('results-screen'); // Save state when game finishes
                break;
        }
    }

    function updateLobby(data) {
        // Update player count (exclude host)
        if (data && data.players) {
            gameState.players = data.players.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score
            }));
        }
        // Filter out host and update UI
        const nonHostPlayers = gameState.players.filter(p => {
            // Don't count host in player count
            if (gameState.hostId && p.id === gameState.hostId) {
                return false;
            }
            // Backup check: don't count host-like names
            if (p.name && (p.name.toLowerCase().includes('host') || p.name === 'Host')) {
                return false;
            }
            return true;
        });
        updatePlayersList(nonHostPlayers);
        updatePlayerCount(nonHostPlayers.length);
    }

    function updatePlayerCount(count) {
        const playerCountElement = document.getElementById('player-count');
        if (playerCountElement) {
            playerCountElement.textContent = `${count}/12`;
        }
    }

    function updatePlayersList(players) {
        const playersList = document.getElementById('players-list');
        if (!playersList) return;
        
        playersList.innerHTML = '';
        
        // Filter out host (primary check by ID, backup by name)
        const nonHostPlayers = players.filter(player => {
            // Don't show host in player list
            if (gameState.hostId && player.id === gameState.hostId) {
                return false;
            }
            // Backup check: don't show players with host-like names
            if (player.name && (player.name.toLowerCase().includes('host') || player.name === 'Host')) {
                return false;
            }
            return true;
        });
        
        nonHostPlayers.forEach((player, index) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'flex items-center justify-between p-3 bg-gray-700 rounded-lg';
            playerElement.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        ${player.name.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-white">${player.name}</span>
                </div>
                <div class="text-sm text-gray-400">Score: ${player.score}</div>
            `;
            playersList.appendChild(playerElement);
        });
    }

    function addPlayer(player) {
        // Don't add host to the players list
        if (player.id === gameState.hostId) {
            return;
        }
        
        // Add to game state
        if (!gameState.players.find(p => p.id === player.id)) {
            gameState.players.push(player);
        }
        
        // Update UI (only show non-host players)
        const playersList = document.getElementById('players-list');
        const playerElement = document.createElement('div');
        playerElement.className = 'flex items-center justify-between p-3 bg-gray-700 rounded-lg';
        playerElement.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    ${player.name.charAt(0).toUpperCase()}
                </div>
                <span class="text-white">${player.name}</span>
            </div>
            <div class="text-sm text-gray-400">Score: ${player.score}</div>
        `;
        playersList.appendChild(playerElement);
        
        // Update player count
        const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
        updatePlayerCount(nonHostPlayers.length);
    }

    async function startGame() {
        Common.showLoading('Starting game...');
        try {
            await hostControl('start_game');
        } catch (error) {
            Common.showNotification('Failed to start game: ' + error.message, 'error');
        } finally {
            Common.hideLoading();
        }
    }

    function startQuestion(data) {
        gameState.currentQuestion = data;
        gameState.timerSeconds = data.time_limit;
        
        // Hide results section when new question starts
        const questionResults = document.getElementById('question-results');
        if (questionResults) {
            questionResults.classList.add('hidden');
        }
        
        // Update UI
        document.getElementById('question-category').textContent = data.category;
        document.getElementById('question-number').textContent = `Question ${data.question_number}/${gameState.totalQuestions || 30}`;
        document.getElementById('question-text').textContent = data.question;
        
        // Update options in 2x2 grid for TV
        const optionsContainer = document.getElementById('question-options');
        optionsContainer.innerHTML = '';
        
        if (data.options && data.options.length > 0) {
            // Ensure we have exactly 4 options for 2x2 grid
            const displayOptions = data.options.slice(0, 4);
            while (displayOptions.length < 4) {
                displayOptions.push('Option ' + String.fromCharCode(65 + displayOptions.length));
            }
            
            displayOptions.forEach((option, index) => {
                const optionElement = document.createElement('div');
                optionElement.className = 'p-6 bg-gray-700 rounded-xl text-white border-2 border-gray-600 hover:border-blue-500 transition-colors';
                optionElement.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                            ${String.fromCharCode(65 + index)}
                        </div>
                        <span class="text-xl flex-1">${option}</span>
                    </div>
                `;
                optionsContainer.appendChild(optionElement);
            });
        }
        
        // Reset answer status (exclude host from count)
        const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
        updateAnswerStatus({ answered_count: 0, total_players: nonHostPlayers.length });
        
        // Update progress
        const totalQuestions = gameState.totalQuestions || 30;
        const progress = (data.question_number / totalQuestions) * 100;
        document.getElementById('progress-question').textContent = `${data.question_number}/${totalQuestions}`;
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        // Sync to fullscreen if active
        const fullscreenQuestion = document.getElementById('fullscreen-question');
        if (fullscreenQuestion && !fullscreenQuestion.classList.contains('hidden')) {
            syncFullscreenView();
        }
    }

    function updateTimer(seconds) {
        gameState.timerSeconds = seconds;
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = seconds;
            
            // Change color based on time remaining - larger for TV
            if (seconds <= 10) {
                timerElement.className = 'text-5xl font-mono font-bold text-red-400';
            } else if (seconds <= 30) {
                timerElement.className = 'text-5xl font-mono font-bold text-yellow-400';
            } else {
                timerElement.className = 'text-5xl font-mono font-bold text-white';
            }
        }
    }

    function showTimerPaused() {
        const pauseBtn = document.getElementById('pause-timer');
        const resumeBtn = document.getElementById('resume-timer');
        if (pauseBtn && resumeBtn) {
            pauseBtn.classList.add('hidden');
            resumeBtn.classList.remove('hidden');
        }
        Common.showNotification('Timer paused', 'info');
    }

    function showTimerResumed() {
        const pauseBtn = document.getElementById('pause-timer');
        const resumeBtn = document.getElementById('resume-timer');
        if (pauseBtn && resumeBtn) {
            pauseBtn.classList.remove('hidden');
            resumeBtn.classList.add('hidden');
        }
        Common.showNotification('Timer resumed', 'info');
    }

    function updateAnswerStatus(data) {
        const answerStatus = document.getElementById('answer-status');
        if (!answerStatus) return;
        
        const answered = data.answered_count || 0;
        const total = data.total_players || gameState.players.filter(p => p.id !== gameState.hostId).length;
        
        // Calculate percentage, avoiding division by zero
        const percentage = total > 0 ? (answered / total) * 100 : 0;
        
        answerStatus.innerHTML = `
            <div class="flex justify-between text-sm">
                <span class="text-gray-300">Answered:</span>
                <span class="text-white font-semibold">${answered}/${total}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2">
                <div class="bg-green-600 h-2 rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
            </div>
        `;
    }

    function showQuestionResults(data) {
        // Update scoreboard
        updateScoreboard(data.scores);
        
        // Show correct answer and explanation on host screen
        const correctAnswerElement = document.getElementById('correct-answer');
        const explanationElement = document.getElementById('question-explanation');
        if (correctAnswerElement) correctAnswerElement.textContent = data.correct_answer;
        if (explanationElement) explanationElement.textContent = data.explanation || 'No explanation available.';
        
        // Show the results section
        const questionResults = document.getElementById('question-results');
        if (questionResults) {
            questionResults.classList.remove('hidden');
        }
        
        // Show results notification
        const correctCount = Object.values(data.answers).filter(a => a.is_correct).length;
        Common.showNotification(`Question ${data.question_number} results: ${correctCount}/${Object.keys(data.answers).length} correct`, 'info');
        
        // Auto-advance to next question after 10 seconds (host can skip)
        setTimeout(() => {
            const gameScreen = document.getElementById('game-screen');
            if (gameScreen && !gameScreen.classList.contains('hidden')) {
                Common.showNotification('Ready for next question. Click "Next Question" to continue.', 'info');
            }
        }, 10000);
    }

    function updateScoreboard(scores) {
        const scoreboard = document.getElementById('scoreboard');
        if (!scoreboard) return;
        
        scoreboard.innerHTML = '';
        
        // Sort players by score (exclude host)
        const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
        const sortedPlayers = nonHostPlayers
            .map(player => ({
                ...player,
                score: scores[player.id] || 0
            }))
            .sort((a, b) => b.score - a.score);
        
        sortedPlayers.forEach((player, index) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'flex items-center justify-between p-2 bg-gray-700 rounded';
            playerElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="text-sm font-semibold text-gray-400">${index + 1}.</span>
                    <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
                        ${player.name.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-white">${player.name}</span>
                </div>
                <span class="text-white font-semibold">${player.score}</span>
            `;
            scoreboard.appendChild(playerElement);
        });
    }

    function showFinalResults(data) {
        Common.showScreen('results-screen');
        
        const finalScores = document.getElementById('final-scores');
        if (!finalScores) return;
        
        finalScores.innerHTML = '';
        
        // Filter out host from final results
        const nonHostScores = Object.entries(data.final_scores)
            .filter(([playerId, score]) => playerId !== gameState.hostId)
            .map(([playerId, score]) => {
                const player = gameState.players.find(p => p.id === playerId);
                return {
                    name: player ? player.name : 'Unknown',
                    score: score
                };
            })
            .sort((a, b) => b.score - a.score);
        
        // Add winner (if there are any non-host players)
        if (nonHostScores.length > 0) {
            const winner = nonHostScores[0];
            const winnerElement = document.createElement('div');
            winnerElement.className = 'bg-yellow-600 rounded-lg p-4 mb-4';
            winnerElement.innerHTML = `
                <h2 class="text-2xl font-bold text-white">🏆 Winner: ${winner.name}</h2>
                <p class="text-yellow-200">Final Score: ${winner.score} points</p>
            `;
            finalScores.appendChild(winnerElement);
            
            // Add all scores
            nonHostScores.forEach((player, index) => {
                if (index === 0) return; // Skip winner, already added
                
                const playerElement = document.createElement('div');
                playerElement.className = 'flex items-center justify-between p-3 bg-gray-700 rounded';
                playerElement.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <span class="text-lg font-semibold text-gray-400">${index + 1}.</span>
                        <span class="text-white">${player.name}</span>
                    </div>
                    <span class="text-white font-semibold">${player.score}</span>
                `;
                finalScores.appendChild(playerElement);
            });
        } else {
            // No non-host players played
            const noPlayersElement = document.createElement('div');
            noPlayersElement.className = 'bg-gray-700 rounded-lg p-4 mb-4 text-center';
            noPlayersElement.innerHTML = `
                <h2 class="text-xl font-bold text-white">No Players Participated</h2>
                <p class="text-gray-300">No non-host players joined the game</p>
            `;
            finalScores.appendChild(noPlayersElement);
        }
    }

    // Fullscreen Functions
    function enterFullscreen() {
        // Hide regular game screen and show fullscreen
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('fullscreen-question').classList.remove('hidden');
        
        // Sync current question data to fullscreen view
        syncFullscreenView();
    }
    
    function exitFullscreen() {
        // Hide fullscreen and show regular game screen
        document.getElementById('fullscreen-question').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
    }
    
    function syncFullscreenView() {
        // Copy all current question data to fullscreen view
        if (gameState.currentQuestion) {
            const q = gameState.currentQuestion;
            
            // Update header
            document.getElementById('fullscreen-question-category').textContent = q.category;
            document.getElementById('fullscreen-question-number').textContent = `Question ${q.question_number}/${gameState.totalQuestions || 30}`;
            
            // Update timer
            document.getElementById('fullscreen-timer').textContent = gameState.timerSeconds;
            updateFullscreenTimerStyle(gameState.timerSeconds);
            
            // Update question text
            document.getElementById('fullscreen-question-text').textContent = q.question;
            
            // Update options
            const fullscreenOptionsContainer = document.getElementById('fullscreen-question-options');
            fullscreenOptionsContainer.innerHTML = '';
            
            if (q.options && q.options.length > 0) {
                // Ensure we have exactly 4 options for 2x2 grid
                const displayOptions = q.options.slice(0, 4);
                while (displayOptions.length < 4) {
                    displayOptions.push('Option ' + String.fromCharCode(65 + displayOptions.length));
                }
                
                displayOptions.forEach((option, index) => {
                    const optionElement = document.createElement('div');
                    optionElement.className = 'p-8 bg-gray-700 rounded-2xl text-white border-2 border-gray-600 hover:border-blue-500 transition-colors';
                    optionElement.innerHTML = `
                        <div class="flex items-center space-x-6">
                            <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                                ${String.fromCharCode(65 + index)}
                            </div>
                            <span class="text-2xl flex-1">${option}</span>
                        </div>
                    `;
                    fullscreenOptionsContainer.appendChild(optionElement);
                });
            }
            
            // Update results if visible
            const resultsVisible = !document.getElementById('question-results').classList.contains('hidden');
            if (resultsVisible) {
                document.getElementById('fullscreen-question-results').classList.remove('hidden');
                document.getElementById('fullscreen-correct-answer').textContent = document.getElementById('correct-answer').textContent;
                document.getElementById('fullscreen-question-explanation').textContent = document.getElementById('question-explanation').textContent;
            } else {
                document.getElementById('fullscreen-question-results').classList.add('hidden');
            }
            
            // Sync timer control buttons
            const pauseBtn = document.getElementById('pause-timer');
            const resumeBtn = document.getElementById('resume-timer');
            const fullscreenPauseBtn = document.getElementById('fullscreen-pause-timer');
            const fullscreenResumeBtn = document.getElementById('fullscreen-resume-timer');
            
            if (pauseBtn && fullscreenPauseBtn && fullscreenResumeBtn) {
                if (pauseBtn.classList.contains('hidden')) {
                    fullscreenPauseBtn.classList.add('hidden');
                    fullscreenResumeBtn.classList.remove('hidden');
                } else {
                    fullscreenPauseBtn.classList.remove('hidden');
                    fullscreenResumeBtn.classList.add('hidden');
                }
            }
        }
    }
    
    function updateFullscreenTimerStyle(seconds) {
        const timerElement = document.getElementById('fullscreen-timer');
        if (timerElement) {
            if (seconds <= 10) {
                timerElement.className = 'text-8xl font-mono font-bold text-red-400';
            } else if (seconds <= 30) {
                timerElement.className = 'text-8xl font-mono font-bold text-yellow-400';
            } else {
                timerElement.className = 'text-8xl font-mono font-bold text-white';
            }
        }
    }
    
    // Override functions to sync with fullscreen
    const originalUpdateTimer = updateTimer;
    updateTimer = function(seconds) {
        originalUpdateTimer(seconds);
        // Also update fullscreen timer if it's visible
        if (!document.getElementById('fullscreen-question').classList.contains('hidden')) {
            document.getElementById('fullscreen-timer').textContent = seconds;
            updateFullscreenTimerStyle(seconds);
        }
    };
    
    const originalShowTimerPaused = showTimerPaused;
    showTimerPaused = function() {
        originalShowTimerPaused();
        // Sync to fullscreen
        if (!document.getElementById('fullscreen-question').classList.contains('hidden')) {
            document.getElementById('fullscreen-pause-timer').classList.add('hidden');
            document.getElementById('fullscreen-resume-timer').classList.remove('hidden');
            document.getElementById('fullscreen-timer').textContent = '⏸️';
        }
    };
    
    const originalShowTimerResumed = showTimerResumed;
    showTimerResumed = function() {
        originalShowTimerResumed();
        // Sync to fullscreen
        if (!document.getElementById('fullscreen-question').classList.contains('hidden')) {
            document.getElementById('fullscreen-pause-timer').classList.remove('hidden');
            document.getElementById('fullscreen-resume-timer').classList.add('hidden');
            document.getElementById('fullscreen-timer').textContent = gameState.timerSeconds;
            updateFullscreenTimerStyle(gameState.timerSeconds);
        }
    };
    
    const originalShowQuestionResults = showQuestionResults;
    showQuestionResults = function(data) {
        originalShowQuestionResults(data);
        // Sync to fullscreen
        if (!document.getElementById('fullscreen-question').classList.contains('hidden')) {
            document.getElementById('fullscreen-question-results').classList.remove('hidden');
            document.getElementById('fullscreen-correct-answer').textContent = data.correct_answer;
            document.getElementById('fullscreen-question-explanation').textContent = data.explanation || 'No explanation available.';
        }
    };

    async function hostControl(action) {
        try {
            await Common.apiCall('/api/live-quiz/host-control', 'POST', {
                game_id: gameState.gameId,
                action: action
            });
        } catch (error) {
            Common.showNotification('Action failed: ' + error.message, 'error');
        }
    }

    function init() {
        setupEventListeners();
        Common.populateCategoryPresets();
        
        // Try to recover previous state after a delay
        setTimeout(() => {
            const recovered = recoverHostState();
            if (!recovered) {
                Common.showScreen('setup-screen');
            } else {
                Common.showNotification('Recovered your previous session!', 'success');
            }
        }, 200);
    }

    return {
        init: init,
        gameState: gameState
    };
})(window.LiveQuizCommon);
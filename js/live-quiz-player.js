// Live Quiz Player Logic
window.LiveQuizPlayer = (function(Common) {
    'use strict';

    // Global game state
    let gameState = {
        gameId: null,
        playerId: null,
        roomCode: null,
        currentQuestion: null,
        hasAnswered: false,
        timer: null,
        timerSeconds: 60,
        sse: null,
        player: null
    };

    // Session Storage Functions with better debugging
    function savePlayerState(screenName = null) {
        try {
            const stateData = {
                gameState: {
                    gameId: gameState.gameId,
                    playerId: gameState.playerId,
                    roomCode: gameState.roomCode,
                    currentQuestion: gameState.currentQuestion,
                    hasAnswered: gameState.hasAnswered,
                    timerSeconds: gameState.timerSeconds,
                    player: gameState.player
                },
                currentScreen: screenName,
                timestamp: Date.now(),
                version: '2.0'
            };
            
            Common.saveToSession('playerState', stateData);
            console.log('✅ Player state saved:', stateData);
        } catch (error) {
            console.error('❌ Failed to save player state:', error);
        }
    }

    function loadPlayerState() {
        try {
            const savedState = Common.loadFromSession('playerState');
            console.log('📁 Loaded player state:', savedState);
            
            if (savedState && savedState.version === '2.0' && savedState.gameState) {
                // Restore game state
                gameState.gameId = savedState.gameState.gameId;
                gameState.playerId = savedState.gameState.playerId;
                gameState.roomCode = savedState.gameState.roomCode;
                gameState.currentQuestion = savedState.gameState.currentQuestion;
                gameState.hasAnswered = savedState.gameState.hasAnswered;
                gameState.timerSeconds = savedState.gameState.timerSeconds || 60;
                gameState.player = savedState.gameState.player;
                
                return savedState;
            }
        } catch (error) {
            console.error('❌ Failed to load player state:', error);
        }
        return null;
    }

    function clearPlayerState() {
        try {
            Common.removeFromSession('playerState');
            console.log('🗑️ Player state cleared');
        } catch (error) {
            console.error('❌ Failed to clear player state:', error);
        }
    }

    function recoverPlayerState() {
        console.log('🔄 === PLAYER STATE RECOVERY START ===');
        
        // Check for saved state
        const savedState = loadPlayerState();
        if (!savedState) {
            console.log('❌ No saved state found, starting fresh');
            return false;
        }
        
        const stateAge = Date.now() - savedState.timestamp;
        console.log('⏰ State age:', Math.round(stateAge / 1000), 'seconds');
        
        // Only recover if state is less than 2 hours old
        if (stateAge > 7200000) {
            console.log('⏰ State too old, clearing');
            clearPlayerState();
            return false;
        }
        
        // Restore screen
        const targetScreen = savedState.currentScreen || 'join-screen';
        console.log('🎯 Target screen:', targetScreen);
        
        // Validate we can recover
        if (targetScreen !== 'join-screen' && (!gameState.gameId || !gameState.playerId)) {
            console.log('❌ Missing game IDs, falling back to join screen');
            clearPlayerState();
            return false;
        }
        
        // Show screen
        console.log('🖥️ Showing screen:', targetScreen);
        Common.showScreen(targetScreen);
        
        // Set up recovery actions
        setTimeout(() => {
            if (targetScreen === 'lobby-screen' || targetScreen === 'question-screen' ||
                targetScreen === 'results-screen' || targetScreen === 'final-results-screen') {
                
                console.log('🔗 Setting up SSE connection...');
                setupSSE();
                
                if (targetScreen === 'lobby-screen') {
                    console.log('📊 Restoring lobby data...');
                    const displayRoomCodeElement = document.getElementById('display-room-code');
                    if (displayRoomCodeElement && gameState.roomCode) {
                        displayRoomCodeElement.textContent = gameState.roomCode;
                    }
                }
                
                // If we were in question screen, restore question data
                if ((targetScreen === 'question-screen' || targetScreen === 'results-screen') && gameState.currentQuestion) {
                    console.log('❓ Restoring question...');
                    setTimeout(() => {
                        startQuestion(gameState.currentQuestion);
                        
                        // If we had already answered, restore that state
                        if (gameState.hasAnswered) {
                            console.log('✅ Restoring answer state...');
                            setTimeout(() => {
                                const answerStatus = document.getElementById('answer-status');
                                if (answerStatus) {
                                    answerStatus.innerHTML = '<div class="text-sm text-green-400">✓ Answer submitted!</div>';
                                }
                                
                                // Disable all buttons
                                document.querySelectorAll('#answer-options button').forEach(button => {
                                    button.disabled = true;
                                    button.classList.add('opacity-50', 'cursor-not-allowed');
                                });
                            }, 300);
                        }
                    }, 300);
                }
            }
        }, 200);
        
        console.log('✅ Player state recovery completed');
        return true;
    }

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');

    // Event listeners
    function setupEventListeners() {
        // Join game
        document.getElementById('join-game')?.addEventListener('click', joinGame);
        
        // Enter room code input
        document.getElementById('room-code')?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, ''); // Only numbers
            if (e.target.value.length === 6) {
                document.getElementById('player-name')?.focus();
            }
        });
        
        // Join with Enter
        document.getElementById('player-name')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinGame();
            }
        });
        
        // Leave lobby
        document.getElementById('leave-lobby')?.addEventListener('click', () => {
            if (gameState.sse) {
                gameState.sse.close();
            }
            clearPlayerState();
            resetGame();
            Common.showScreen('join-screen');
        });
        
        // Play again
        document.getElementById('play-again')?.addEventListener('click', () => {
            if (gameState.sse) {
                gameState.sse.close();
            }
            clearPlayerState();
            resetGame();
            Common.showScreen('join-screen');
        });
        
        // Player fullscreen controls
        document.getElementById('player-toggle-fullscreen')?.addEventListener('click', playerEnterFullscreen);
        document.getElementById('player-exit-fullscreen')?.addEventListener('click', playerExitFullscreen);
        
        // Skip question button
        document.getElementById('skip-question')?.addEventListener('click', skipQuestion);
        document.getElementById('player-skip-question')?.addEventListener('click', skipQuestion);
    }

    function resetGame() {
        gameState = {
            gameId: null,
            playerId: null,
            roomCode: null,
            currentQuestion: null,
            hasAnswered: false,
            timer: null,
            timerSeconds: 60,
            sse: null,
            player: null
        };
    }

    async function joinGame() {
        const roomCode = document.getElementById('room-code').value.trim();
        const playerName = document.getElementById('player-name').value.trim();
        
        if (!roomCode || roomCode.length !== 6) {
            Common.showNotification('Please enter a valid 6-digit room code', 'error');
            return;
        }
        
        if (!playerName) {
            Common.showNotification('Please enter your name', 'error');
            return;
        }
        
        Common.showLoading('Joining game...');
        try {
            const response = await Common.apiCall('/api/live-quiz/join-room', 'POST', {
                room_code: roomCode,
                player_name: playerName
            });
            
            gameState.gameId = response.game_id;
            gameState.playerId = response.player_id;
            gameState.roomCode = roomCode;
            
            // Check if this is a late join (game already in progress)
            const isLateJoin = response.game_status === 'playing';
            
            if (isLateJoin) {
                // Show game in progress screen
                Common.showScreen('question-screen');
                
                // Add categories to show what's being played
                const categoriesList = document.getElementById('categories-list');
                if (categoriesList) {
                    categoriesList.innerHTML = '';
                    response.categories.forEach(category => {
                        const categoryElement = document.createElement('div');
                        categoryElement.className = 'text-sm text-gray-300 bg-gray-600 rounded px-3 py-1';
                        categoryElement.textContent = category;
                        categoriesList.appendChild(categoryElement);
                    });
                }
                
                // Update status message
                const answerStatus = document.getElementById('answer-status');
                if (answerStatus) {
                    const currentQuestion = response.current_question || '?';
                    answerStatus.innerHTML = `
                        <div class="text-lg text-yellow-400">
                            ⚡ Game in progress! (Question ${currentQuestion})
                        </div>
                        <div class="text-sm text-gray-400 mt-1">
                            You're a late joiner. You'll start participating from the next question.
                        </div>
                    `;
                }
                
                Common.showNotification('Joined game in progress! You\'ll start from the next question.', 'info');
                savePlayerState('question-screen');
            } else {
                // Normal lobby join
                // Update lobby screen
                const displayRoomCodeElement = document.getElementById('display-room-code');
                if (displayRoomCodeElement) {
                    displayRoomCodeElement.textContent = roomCode;
                }
                
                // Add categories
                const categoriesList = document.getElementById('categories-list');
                if (categoriesList) {
                    categoriesList.innerHTML = '';
                    response.categories.forEach(category => {
                        const categoryElement = document.createElement('div');
                        categoryElement.className = 'text-sm text-gray-300 bg-gray-600 rounded px-3 py-1';
                        categoryElement.textContent = category;
                        categoriesList.appendChild(categoryElement);
                    });
                }
                
                Common.showScreen('lobby-screen');
                savePlayerState('lobby-screen'); // Save state after successful join
                Common.showNotification('Joined game successfully!', 'success');
            }
            
            setupSSE(); // Always setup SSE to receive real-time updates
            
        } catch (error) {
            Common.showNotification('Failed to join game: ' + error.message, 'error');
        } finally {
            Common.hideLoading();
        }
    }

    function setupSSE() {
        const sseUrl = `/api/live-quiz/events?game_id=${gameState.gameId}&player_id=${gameState.playerId}&type=player`;
        gameState.sse = new EventSource(sseUrl);
        
        gameState.sse.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleSSEEvent(data);
        };
        
        gameState.sse.onerror = (error) => {
            console.error('SSE Error:', error);
            showConnectionStatus();
        };
    }

    function handleSSEEvent(event) {
        hideConnectionStatus();
        
        switch (event.type) {
            case 'connected':
                updateLobby();
                break;
                
            case 'player_joined':
                Common.showNotification(`${event.data.player.name} joined the game!`, 'success');
                break;
                
            case 'question_started':
                startQuestion(event.data);
                savePlayerState('question-screen'); // Save state when question starts
                break;
                
            case 'timer_update':
                updateTimer(event.data.remaining_seconds);
                savePlayerState('question-screen'); // Save state on timer updates
                break;
                
            case 'timer_paused':
                showTimerPaused();
                savePlayerState('question-screen'); // Save state when timer paused
                break;
                
            case 'timer_resumed':
                showTimerResumed();
                savePlayerState('question-screen'); // Save state when timer resumed
                break;
                
            case 'question_results':
                showQuestionResults(event.data);
                savePlayerState('results-screen'); // Save state when results shown
                break;
                
            case 'game_started':
                Common.showNotification('Game started!', 'success');
                savePlayerState('question-screen'); // Save state when game starts
                break;
                
            case 'game_finished':
                showFinalResults(event.data);
                savePlayerState('final-results-screen'); // Save state when game finishes
                break;
        }
    }

    function updateLobby() {
        // Update player count
        // This will be updated through the SSE events
    }

    function startQuestion(data) {
        gameState.currentQuestion = data;
        gameState.hasAnswered = false;
        gameState.timerSeconds = data.time_limit;
        
        // Update UI
        document.getElementById('question-category').textContent = data.category;
        document.getElementById('question-number').textContent = `Question ${data.question_number}/30`;
        document.getElementById('question-text').textContent = data.question;
        
        // Update options in 2x2 grid
        const optionsContainer = document.getElementById('answer-options');
        optionsContainer.innerHTML = '';
        
        if (data.options && data.options.length > 0) {
            // Ensure we have exactly 4 options for 2x2 grid
            const displayOptions = data.options.slice(0, 4);
            while (displayOptions.length < 4) {
                displayOptions.push('Option ' + String.fromCharCode(65 + displayOptions.length));
            }
            
            displayOptions.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'w-full p-6 text-left answer-option bg-gray-700 hover:bg-gray-600 rounded-xl text-white border-2 border-gray-600 hover:border-blue-500 transition-colors';
                button.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-lg font-semibold">
                            ${String.fromCharCode(65 + index)}
                        </div>
                        <span class="text-lg flex-1">${option}</span>
                    </div>
                `;
                button.addEventListener('click', () => submitAnswer(option));
                optionsContainer.appendChild(button);
            });
        }
        
        // Reset answer status
        const answerStatus = document.getElementById('answer-status');
        if (answerStatus) {
            answerStatus.innerHTML = '<div class="text-lg text-gray-400">Select your answer</div>';
        }
        
        // Enable skip button for new question
        const skipButton = document.getElementById('skip-question');
        const fullscreenSkipButton = document.getElementById('player-skip-question');
        
        if (skipButton) {
            skipButton.disabled = false;
            skipButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        
        if (fullscreenSkipButton) {
            fullscreenSkipButton.disabled = false;
            fullscreenSkipButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        
        Common.showScreen('question-screen');
        
        // Sync to fullscreen if active
        const playerFullscreenQuestion = document.getElementById('player-fullscreen-question');
        if (playerFullscreenQuestion && !playerFullscreenQuestion.classList.contains('hidden')) {
            syncPlayerFullscreenView();
        }
    }

    function updateTimer(seconds) {
        gameState.timerSeconds = seconds;
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = seconds;
            
            // Change color based on time remaining
            if (seconds <= 10) {
                timerElement.className = 'timer-display text-red-400 font-bold';
            } else if (seconds <= 30) {
                timerElement.className = 'timer-display text-yellow-400 font-bold';
            } else {
                timerElement.className = 'timer-display text-white font-bold';
            }
        }
    }

    function showTimerPaused() {
        Common.showNotification('Timer paused by host', 'info');
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = '⏸️';
        }
        
        // Sync to player fullscreen if active
        const fullscreenTimer = document.getElementById('player-fullscreen-timer');
        if (fullscreenTimer) {
            fullscreenTimer.textContent = '⏸️';
        }
    }

    function showTimerResumed() {
        Common.showNotification('Timer resumed', 'info');
        
        // Sync to player fullscreen if active
        const fullscreenTimer = document.getElementById('player-fullscreen-timer');
        if (fullscreenTimer) {
            fullscreenTimer.textContent = gameState.timerSeconds;
            updatePlayerFullscreenTimerStyle(gameState.timerSeconds);
        }
    }

    async function submitAnswer(answer) {
        if (gameState.hasAnswered) return;
        
        gameState.hasAnswered = true;
        savePlayerState('question-screen'); // Save state when answer submitted
        
        // Disable all buttons
        document.querySelectorAll('#answer-options button').forEach(button => {
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed');
        });
        
        // Update status
        const answerStatus = document.getElementById('answer-status');
        if (answerStatus) {
            answerStatus.innerHTML = '<div class="text-sm text-green-400">✓ Answer submitted!</div>';
        }
        
        try {
            await Common.apiCall('/api/live-quiz/submit-answer', 'POST', {
                game_id: gameState.gameId,
                player_id: gameState.playerId,
                answer: answer
            });
        } catch (error) {
            Common.showNotification('Failed to submit answer: ' + error.message, 'error');
            gameState.hasAnswered = false;
            savePlayerState('question-screen'); // Save state after reverting
        }
    }

    async function skipQuestion() {
        if (gameState.hasAnswered) return;
        
        gameState.hasAnswered = true;
        savePlayerState('question-screen'); // Save state when question is skipped
        
        // Disable all answer buttons
        document.querySelectorAll('#answer-options button').forEach(button => {
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed');
        });
        
        // Hide skip button
        const skipButton = document.getElementById('skip-question');
        const fullscreenSkipButton = document.getElementById('player-skip-question');
        
        if (skipButton) {
            skipButton.disabled = true;
            skipButton.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        if (fullscreenSkipButton) {
            fullscreenSkipButton.disabled = true;
            fullscreenSkipButton.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        // Update status for both views
        const answerStatus = document.getElementById('answer-status');
        const fullscreenAnswerStatus = document.getElementById('player-fullscreen-answer-status');
        
        if (answerStatus) {
            answerStatus.innerHTML = '<div class="text-sm text-gray-400">⏭️ Question skipped</div>';
        }
        
        if (fullscreenAnswerStatus) {
            fullscreenAnswerStatus.innerHTML = '<div class="text-lg text-gray-400">⏭️ Question skipped</div>';
        }
        
        try {
            await Common.apiCall('/api/live-quiz/submit-answer', 'POST', {
                game_id: gameState.gameId,
                player_id: gameState.playerId,
                answer: "", // Empty string for skipped questions
                skipped: true
            });
        } catch (error) {
            Common.showNotification('Failed to skip question: ' + error.message, 'error');
            gameState.hasAnswered = false;
            savePlayerState('question-screen'); // Save state after reverting
        }
    }

    function showQuestionResults(data) {
        const wasCorrect = data.answers[gameState.playerId]?.is_correct;
        const playerAnswer = data.answers[gameState.playerId]?.answer;
        const isSkipped = data.answers[gameState.playerId]?.skipped;
        
        // Update result UI
        const resultIcon = document.getElementById('result-icon');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        
        if (isSkipped) {
            if (resultIcon) resultIcon.textContent = '⏭️';
            if (resultTitle) resultTitle.textContent = 'Skipped';
            if (resultMessage) resultMessage.textContent = 'You skipped this question';
        } else {
            if (resultIcon) resultIcon.textContent = wasCorrect ? '✅' : '❌';
            if (resultTitle) resultTitle.textContent = wasCorrect ? 'Correct!' : 'Incorrect';
            if (resultMessage) resultMessage.textContent = wasCorrect ? 'Great job!' : 'Better luck next time!';
        }
        
        // Show answers (hide if skipped)
        const yourAnswerDiv = document.getElementById('your-answer');
        const answerText = document.getElementById('answer-text');
        if (yourAnswerDiv && answerText) {
            if (isSkipped) {
                yourAnswerDiv.classList.add('hidden');
            } else {
                yourAnswerDiv.classList.remove('hidden');
                answerText.textContent = playerAnswer;
            }
        }
        
        const correctAnswerDiv = document.getElementById('correct-answer');
        const correctAnswerText = document.getElementById('correct-answer-text');
        if (correctAnswerDiv && correctAnswerText) {
            if (isSkipped) {
                correctAnswerDiv.classList.add('hidden');
            } else {
                correctAnswerDiv.classList.remove('hidden');
                correctAnswerText.textContent = data.correct_answer;
            }
        }
        
        const explanationDiv = document.getElementById('explanation');
        const explanationText = document.getElementById('explanation-text');
        if (explanationDiv && explanationText && data.explanation && !isSkipped) {
            explanationDiv.classList.remove('hidden');
            explanationText.textContent = data.explanation;
        } else if (explanationDiv) {
            explanationDiv.classList.add('hidden');
        }
        
        Common.showScreen('results-screen');
    }

    function showFinalResults(data) {
        // Get final score for this player
        const finalScore = data.final_scores[gameState.playerId] || 0;
        
        // Calculate position
        const allScores = Object.values(data.final_scores);
        const sortedScores = allScores.sort((a, b) => b - a);
        const position = sortedScores.indexOf(finalScore) + 1;
        const totalPlayers = sortedScores.length;
        
        // Update UI
        const finalScoreElement = document.getElementById('final-score');
        const positionTextElement = document.getElementById('final-position-text');
        
        if (finalScoreElement) finalScoreElement.textContent = finalScore;
        if (positionTextElement) positionTextElement.textContent = `Position: ${position}/${totalPlayers}`;
        
        Common.showScreen('final-results-screen');
        
        // Show result notification
        if (position === 1) {
            Common.showNotification('🏆 You won! Congratulations!', 'success');
        } else {
            Common.showNotification(`Game finished! You placed ${position} of ${totalPlayers}`, 'info');
        }
    }

    // Player Fullscreen Functions
    function playerEnterFullscreen() {
        // Hide regular question screen and show fullscreen
        document.getElementById('question-screen').classList.add('hidden');
        document.getElementById('player-fullscreen-question').classList.remove('hidden');
        
        // Sync current question data to fullscreen view
        syncPlayerFullscreenView();
    }
    
    function playerExitFullscreen() {
        // Hide fullscreen and show regular question screen
        document.getElementById('player-fullscreen-question').classList.add('hidden');
        document.getElementById('question-screen').classList.remove('hidden');
    }
    
    function syncPlayerFullscreenView() {
        // Copy all current question data to fullscreen view
        if (gameState.currentQuestion) {
            const q = gameState.currentQuestion;
            
            // Update header
            const categoryElement = document.getElementById('player-fullscreen-question-category');
            const numberElement = document.getElementById('player-fullscreen-question-number');
            const textElement = document.getElementById('player-fullscreen-question-text');
            
            if (categoryElement) categoryElement.textContent = q.category;
            if (numberElement) numberElement.textContent = `Question ${q.question_number}/30`;
            
            // Update timer
            const timerElement = document.getElementById('player-fullscreen-timer');
            if (timerElement) {
                timerElement.textContent = gameState.timerSeconds;
                updatePlayerFullscreenTimerStyle(gameState.timerSeconds);
            }
            
            if (textElement) textElement.textContent = q.question;
            
            // Update options
            const fullscreenOptionsContainer = document.getElementById('player-fullscreen-question-options');
            if (fullscreenOptionsContainer) {
                fullscreenOptionsContainer.innerHTML = '';
                
                if (q.options && q.options.length > 0) {
                    // Ensure we have exactly 4 options for 2x2 grid
                    const displayOptions = q.options.slice(0, 4);
                    while (displayOptions.length < 4) {
                        displayOptions.push('Option ' + String.fromCharCode(65 + displayOptions.length));
                    }
                    
                    displayOptions.forEach((option, index) => {
                        const button = document.createElement('button');
                        button.className = 'w-full p-6 text-left answer-option bg-gray-700 hover:bg-gray-600 rounded-xl text-white border-2 border-gray-600 hover:border-blue-500 transition-colors';
                        button.innerHTML = `
                            <div class="flex items-center space-x-4">
                                <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-semibold">
                                    ${String.fromCharCode(65 + index)}
                                </div>
                                <span class="text-xl flex-1">${option}</span>
                            </div>
                        `;
                        button.addEventListener('click', () => submitAnswer(option));
                        fullscreenOptionsContainer.appendChild(button);
                    });
                }
            }
            
            // Update answer status
            const answerStatus = document.getElementById('answer-status');
            const fullscreenAnswerStatus = document.getElementById('player-fullscreen-answer-status');
            if (answerStatus && fullscreenAnswerStatus) {
                fullscreenAnswerStatus.innerHTML = answerStatus.innerHTML;
            }
            
            // Disable buttons if already answered
            if (gameState.hasAnswered) {
                document.querySelectorAll('#player-fullscreen-question-options button').forEach(button => {
                    button.disabled = true;
                    button.classList.add('opacity-50', 'cursor-not-allowed');
                });
                
                // Also disable skip button in fullscreen
                const fullscreenSkipButton = document.getElementById('player-skip-question');
                if (fullscreenSkipButton) {
                    fullscreenSkipButton.disabled = true;
                    fullscreenSkipButton.classList.add('opacity-50', 'cursor-not-allowed');
                }
            } else {
                // Enable skip button if not answered
                const fullscreenSkipButton = document.getElementById('player-skip-question');
                if (fullscreenSkipButton) {
                    fullscreenSkipButton.disabled = false;
                    fullscreenSkipButton.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }
        }
    }
    
    function updatePlayerFullscreenTimerStyle(seconds) {
        const timerElement = document.getElementById('player-fullscreen-timer');
        if (timerElement) {
            if (seconds <= 10) {
                timerElement.className = 'text-6xl font-mono font-bold text-red-400';
            } else if (seconds <= 30) {
                timerElement.className = 'text-6xl font-mono font-bold text-yellow-400';
            } else {
                timerElement.className = 'text-6xl font-mono font-bold text-white';
            }
        }
    }
    
    // Override the original updateTimer function to also update fullscreen
    const originalPlayerUpdateTimer = updateTimer;
    updateTimer = function(seconds) {
        originalPlayerUpdateTimer(seconds);
        // Also update fullscreen timer if it's visible
        if (!document.getElementById('player-fullscreen-question').classList.contains('hidden')) {
            const fullscreenTimer = document.getElementById('player-fullscreen-timer');
            if (fullscreenTimer) {
                fullscreenTimer.textContent = seconds;
                updatePlayerFullscreenTimerStyle(seconds);
            }
        }
    };

    // Connection status helpers
    function showConnectionStatus() {
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.classList.remove('hidden');
        }
    }

    function hideConnectionStatus() {
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            connectionStatus.classList.add('hidden');
        }
    }

    function init() {
        setupEventListeners();
        
        // Pre-fill room code if provided in URL
        if (roomFromUrl) {
            const roomCodeInput = document.getElementById('room-code');
            const playerNameInput = document.getElementById('player-name');
            
            if (roomCodeInput) {
                roomCodeInput.value = roomFromUrl;
            }
            if (playerNameInput) {
                playerNameInput.focus();
            }
        }
        
        // Try to recover previous state after a delay
        setTimeout(() => {
            const recovered = recoverPlayerState();
            if (!recovered) {
                Common.showScreen('join-screen');
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
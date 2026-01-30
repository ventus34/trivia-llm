// Live Quiz Host Lobby Management
window.LiveQuizHostLobby = (function(Common) {
    'use strict';

    // Global game state (shared across modules)
    let gameState = window.LiveQuizHostState || (window.LiveQuizHostState = {
        gameId: null,
        roomCode: null,
        hostId: null,
        categories: [],
        players: [],
        currentQuestion: null,
        timer: null,
        timerSeconds: 60,
        sse: null
    });

    // Setup event listeners for lobby actions
    function setupLobbyEventListeners() {
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
            Common.showScreen('setup-screen');
        });
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
                // Update total questions if present
                if (event.data.total_questions) {
                    gameState.totalQuestions = event.data.total_questions;
                }

                // Check if game is already in progress and redirect host
                if (event.data.game_status === 'playing' && event.data.current_question) {
                    Common.showScreen('game-screen');
                    Common.showNotification('Reconnected to active game!', 'info');
                }

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

            case 'late_player_joined':
                addPlayer(event.data.player);
                Common.showNotification(`${event.data.player.name} joined the game!`, 'success');
                break;
                
            case 'question_started':
                if (event.data.total_questions) {
                    gameState.totalQuestions = event.data.total_questions;
                }
                if (window.LiveQuizHostGame) {
                    window.LiveQuizHostGame.startQuestion(event.data);
                }
                break;
                
            case 'timer_update':
                if (window.LiveQuizHostGame) {
                    window.LiveQuizHostGame.updateTimer(event.data.remaining_seconds);
                }
                break;
                
            case 'timer_paused':
                if (window.LiveQuizHostGame) {
                    window.LiveQuizHostGame.showTimerPaused();
                }
                break;
                
            case 'timer_resumed':
                if (window.LiveQuizHostGame) {
                    window.LiveQuizHostGame.showTimerResumed();
                }
                break;
                
            case 'answer_submitted':
                if (window.LiveQuizHostGame) {
                    window.LiveQuizHostGame.updateAnswerStatus(event.data);
                }
                break;
                
            case 'question_results':
                if (window.LiveQuizHostGame) {
                    window.LiveQuizHostGame.showQuestionResults(event.data);
                }
                break;
                
            case 'question_regenerated':
                if (window.LiveQuizHostGame) {
                    // When a question is regenerated, we need to get the new question data
                    // The backend should send updated question data, but for now we'll refresh the current question
                    Common.showNotification('Question regenerated!', 'info');
                    
                    // If we have current question data, refresh the UI
                    if (gameState.currentQuestion) {
                        // Create updated question data from the event
                        const updatedQuestionData = {
                            ...gameState.currentQuestion,
                            question: event.data.question,
                            options: event.data.options
                        };
                        
                        // Update game state
                        gameState.currentQuestion = updatedQuestionData;
                        
                        // Refresh the UI
                        window.LiveQuizHostGame.refreshQuestionUI(updatedQuestionData);
                    }
                }
                break;
                
            case 'game_started':
                Common.showScreen('game-screen');
                Common.showNotification('Game started!', 'success');
                break;
                
            case 'game_finished':
                if (window.LiveQuizHostResults) {
                    window.LiveQuizHostResults.showFinalResults(event.data);
                }
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
        setupLobbyEventListeners();
    }

    return {
        init: init,
        setupSSE: setupSSE,
        hostControl: hostControl,
        gameState: gameState
    };
})(window.LiveQuizCommon);
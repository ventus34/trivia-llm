// Live Quiz Host Game Logic
window.LiveQuizHostGame = (function(Common) {
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
        sse: null,
        isActionInProgress: false
    });

    // Game control event listeners
    function setupGameEventListeners() {
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
    }

    function startQuestion(data) {
        gameState.currentQuestion = data;
        gameState.timerSeconds = data.time_limit;
        
        refreshQuestionUI(data);
    }

    function refreshQuestionUI(data) {
        // Hide results section when new question starts
        const questionResults = document.getElementById('question-results');
        if (questionResults) {
            questionResults.classList.add('hidden');
        }
        
        // Update UI with current question data
        updateQuestionDisplay(data);
        
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

    function updateQuestionDisplay(data) {
        // Update header information
        const categoryElement = document.getElementById('question-category');
        const numberElement = document.getElementById('question-number');
        const textElement = document.getElementById('question-text');

        if (categoryElement) categoryElement.textContent = data.category;
        if (numberElement) numberElement.textContent = `Question ${data.question_number}/${gameState.totalQuestions || 30}`;
        if (textElement) textElement.textContent = data.question;
        
        // Update options in 2x2 grid for TV
        const optionsContainer = document.getElementById('question-options');
        if (optionsContainer) {
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

    async function hostControl(action) {
        // Prevent multiple simultaneous actions
        if (gameState.isActionInProgress) {
            console.log('Action already in progress, skipping...');
            return;
        }

        gameState.isActionInProgress = true;

        // Disable relevant buttons during action
        const buttonsToDisable = {
            'next_question': ['next-question', 'fullscreen-next-question'],
            'regenerate_question': ['regenerate-question', 'fullscreen-regenerate-question'],
            'pause_timer': ['pause-timer', 'fullscreen-pause-timer'],
            'resume_timer': ['resume-timer', 'fullscreen-resume-timer']
        };

        if (buttonsToDisable[action]) {
            buttonsToDisable[action].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            });
        }

        try {
            await Common.apiCall('/api/live-quiz/host-control', 'POST', {
                game_id: gameState.gameId,
                action: action
            });
            
            // Show success notification for user feedback
            const actionNames = {
                'next_question': 'Next question',
                'regenerate_question': 'Question regenerated',
                'pause_timer': 'Timer paused',
                'resume_timer': 'Timer resumed'
            };
            
            if (actionNames[action]) {
                Common.showNotification(`${actionNames[action]}!`, 'success');
            }
        } catch (error) {
            Common.showNotification('Action failed: ' + error.message, 'error');
        } finally {
            // Re-enable buttons after action completes
            if (buttonsToDisable[action]) {
                setTimeout(() => {
                    buttonsToDisable[action].forEach(id => {
                        const btn = document.getElementById(id);
                        if (btn) {
                            btn.disabled = false;
                            btn.classList.remove('opacity-50', 'cursor-not-allowed');
                        }
                    });
                }, 500);
            }
            
            gameState.isActionInProgress = false;
        }
    }

    function init() {
        setupGameEventListeners();
        
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
        
        // Add support for question regeneration events
        // This will be called when the SSE receives a question_started event after regeneration
        if (window.LiveQuizHostLobby && window.LiveQuizHostLobby.setupSSE) {
            // The SSE setup in host-lobby.js will handle question regeneration automatically
            // by calling startQuestion with the new data
        }
    }

    return {
        init: init,
        startQuestion: startQuestion,
        refreshQuestionUI: refreshQuestionUI,
        updateQuestionDisplay: updateQuestionDisplay,
        updateTimer: updateTimer,
        showTimerPaused: showTimerPaused,
        showTimerResumed: showTimerResumed,
        updateAnswerStatus: updateAnswerStatus,
        showQuestionResults: showQuestionResults,
        enterFullscreen: enterFullscreen,
        exitFullscreen: exitFullscreen,
        gameState: gameState
    };
})(window.LiveQuizCommon);
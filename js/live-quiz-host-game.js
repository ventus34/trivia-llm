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
        isActionInProgress: false,
        currentQuestionVotes: {}, // Track current question votes
        previousScores: {}, // Track previous scores for calculating changes
        currentScores: {} // Track current scores
    });

    // Game control event listeners
    function setupGameEventListeners() {
        // Results toggle
        document.getElementById('toggle-results')?.addEventListener('click', toggleResults);
        document.getElementById('fullscreen-toggle-results')?.addEventListener('click', toggleFullscreenResults);
        
        // Auto-advance toggle
        document.getElementById('auto-advance-toggle')?.addEventListener('change', syncAutoAdvanceToggle);
        document.getElementById('fullscreen-auto-advance-toggle')?.addEventListener('change', syncFullscreenAutoAdvanceToggle);
        
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
        // Clear previous question votes
        gameState.currentQuestionVotes = {};
        
        // Hide results section when new question starts
        const questionResults = document.getElementById('question-results');
        if (questionResults) {
            questionResults.classList.add('hidden');
        }
        
        // Reset results toggle button text
        const toggleResultsBtn = document.getElementById('toggle-results');
        if (toggleResultsBtn) {
            toggleResultsBtn.textContent = '📋 Show Explanation';
        }
        
        // Reset fullscreen results toggle button text
        const fullscreenToggleResultsBtn = document.getElementById('fullscreen-toggle-results');
        if (fullscreenToggleResultsBtn) {
            fullscreenToggleResultsBtn.textContent = '📋 Show Explanation';
        }
        
        // Remove any previous answer highlighting
        clearAnswerHighlighting();
        
        // Update UI with current question data
        updateQuestionDisplay(data);
        
        // Reset answer status (exclude host from count)
        const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
        updateAnswerStatus({ answered_count: 0, total_players: nonHostPlayers.length });
        
        // Reset previous scores to track changes for next question
        gameState.previousScores = { ...gameState.currentScores };
        
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
                    optionElement.className = 'p-6 bg-gray-700 rounded-xl text-white border-2 border-gray-600 hover:border-blue-500 transition-colors answer-option';
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
        
        // Get non-host players
        const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
        
        // Build player list with their answers showing letter circles
        let playerListHtml = '';
        nonHostPlayers.forEach(player => {
            const playerAnswer = gameState.currentQuestionVotes[player.id];
            if (playerAnswer) {
                // Player has answered - show their choice with letter circle
                const optionLetter = getOptionLetter(playerAnswer.selected_option);
                playerListHtml += `
                    <div class="flex justify-between items-center py-1 px-2 bg-gray-700 rounded text-sm">
                        <span class="text-white">${player.name}</span>
                        <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            ${optionLetter}
                        </div>
                    </div>
                `;
            } else {
                // Player hasn't answered yet
                playerListHtml += `
                    <div class="flex justify-between items-center py-1 px-2 bg-gray-600 rounded text-sm">
                        <span class="text-gray-300">${player.name}</span>
                        <span class="text-gray-400">...</span>
                    </div>
                `;
            }
        });
        
        answerStatus.innerHTML = `
            <div class="flex justify-between text-sm mb-3">
                <span class="text-gray-300">Answered:</span>
                <span class="text-white font-semibold">${answered}/${total}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2 mb-4">
                <div class="bg-green-600 h-2 rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
            </div>
            <div class="space-y-1">
                <h4 class="text-sm font-semibold text-gray-300 mb-2">Players:</h4>
                ${playerListHtml}
            </div>
        `;
    }
    
    // Helper function to get option letter (A, B, C, D) from option text
    function getOptionLetter(optionText) {
        if (!gameState.currentQuestion || !gameState.currentQuestion.options) {
            return '?';
        }
        
        const optionIndex = gameState.currentQuestion.options.indexOf(optionText);
        if (optionIndex >= 0 && optionIndex < 4) {
            return String.fromCharCode(65 + optionIndex); // A, B, C, D
        }
        return '?';
    }
    
    // Removed old functions that are no longer needed
    // - updateOptionPlayerNames()
    // - updateOptionDisplay()
    // - testPlayerNamesDisplay()
    // All player vote display is now handled in updateAnswerStatus()
    
    // Function to record a player's vote
    function recordPlayerVote(playerId, selectedOption) {
        const player = gameState.players.find(p => p.id === playerId);
        console.log(`recordPlayerVote: Player ${playerId} (${player?.name}) voting for "${selectedOption}"`);
        
        if (player && selectedOption) {
            // Store by player ID for easy lookup
            gameState.currentQuestionVotes[playerId] = {
                player: player,
                selected_option: selectedOption
            };
            console.log(`Recorded ${player.name} -> "${selectedOption}"`);
            console.log('Current votes:', gameState.currentQuestionVotes);
        } else {
            console.log(`Failed to record vote - Player: ${player}, Option: ${selectedOption}`);
        }
    }

    // Toggle results visibility
    function toggleResults() {
        const questionResults = document.getElementById('question-results');
        const toggleBtn = document.getElementById('toggle-results');
        
        if (questionResults && toggleBtn) {
            if (questionResults.classList.contains('hidden')) {
                questionResults.classList.remove('hidden');
                toggleBtn.textContent = '📋 Hide Explanation';
            } else {
                questionResults.classList.add('hidden');
                toggleBtn.textContent = '📋 Show Explanation';
            }
        }
    }
    
    // Toggle fullscreen results visibility
    function toggleFullscreenResults() {
        const questionResults = document.getElementById('fullscreen-question-results');
        const toggleBtn = document.getElementById('fullscreen-toggle-results');
        
        if (questionResults && toggleBtn) {
            if (questionResults.classList.contains('hidden')) {
                questionResults.classList.remove('hidden');
                toggleBtn.textContent = '📋 Hide Explanation';
            } else {
                questionResults.classList.add('hidden');
                toggleBtn.textContent = '📋 Show Explanation';
            }
        }
    }
    
    // Sync auto-advance toggle between regular and fullscreen
    function syncAutoAdvanceToggle() {
        const regularToggle = document.getElementById('auto-advance-toggle');
        const fullscreenToggle = document.getElementById('fullscreen-auto-advance-toggle');
        
        if (regularToggle && fullscreenToggle) {
            fullscreenToggle.checked = regularToggle.checked;
        }
    }
    
    function syncFullscreenAutoAdvanceToggle() {
        const regularToggle = document.getElementById('auto-advance-toggle');
        const fullscreenToggle = document.getElementById('fullscreen-auto-advance-toggle');
        
        if (regularToggle && fullscreenToggle) {
            regularToggle.checked = fullscreenToggle.checked;
        }
    }
    
    // Clear previous answer highlighting (preserve player name containers)
    function clearAnswerHighlighting() {
        const optionsContainer = document.getElementById('question-options');
        if (optionsContainer) {
            const options = optionsContainer.querySelectorAll('.answer-option');
            options.forEach(option => {
                // Remove highlighting class, keep base classes
                option.classList.remove('correct-answer-highlight');
                // Reset background and border colors
                option.style.backgroundColor = '';
                option.style.borderColor = '';
            });
        }
        
        // Clear fullscreen options too
        const fullscreenOptionsContainer = document.getElementById('fullscreen-question-options');
        if (fullscreenOptionsContainer) {
            const options = fullscreenOptionsContainer.querySelectorAll('.answer-option');
            options.forEach(option => {
                // Remove highlighting class, keep base classes
                option.classList.remove('correct-answer-highlight');
                // Reset background and border colors
                option.style.backgroundColor = '';
                option.style.borderColor = '';
            });
        }
    }
    
    // Highlight correct answer in green (preserve player name containers)
    function highlightCorrectAnswer(correctAnswerText) {
        // Clear all highlighting first
        clearAnswerHighlighting();
        
        // Highlight in regular view
        const optionsContainer = document.getElementById('question-options');
        if (optionsContainer) {
            const options = optionsContainer.querySelectorAll('.answer-option');
            options.forEach(option => {
                // Get the text content from the option (last span contains the actual answer text)
                const spans = option.querySelectorAll('span');
                const optionText = spans[spans.length - 1].textContent;
                
                console.log(`Comparing: "${optionText}" with "${correctAnswerText}"`);
                
                if (optionText === correctAnswerText) {
                    console.log('Found correct answer, highlighting...');
                    // Add highlighting class and force background color
                    option.classList.add('correct-answer-highlight');
                    option.style.backgroundColor = '#15803d'; // bg-green-700
                    option.style.borderColor = '#22c55e'; // border-green-500
                }
            });
        }
        
        // Highlight in fullscreen view
        const fullscreenOptionsContainer = document.getElementById('fullscreen-question-options');
        if (fullscreenOptionsContainer) {
            const options = fullscreenOptionsContainer.querySelectorAll('.answer-option');
            options.forEach(option => {
                // Get the text content from the option (last span contains the actual answer text)
                const spans = option.querySelectorAll('span');
                const optionText = spans[spans.length - 1].textContent;
                
                if (optionText === correctAnswerText) {
                    // Add highlighting class and force background color
                    option.classList.add('correct-answer-highlight');
                    option.style.backgroundColor = '#15803d'; // bg-green-700
                    option.style.borderColor = '#22c55e'; // border-green-500
                }
            });
        }
    }
    
    // Show player votes in results
    function showPlayerVotes(answersData) {
        // This function is now simpler since we show votes in answer status
        // We can keep it for the modal but it might not be needed
        console.log('showPlayerVotes called - votes are now shown in Answer Status section');
    }
    
    function showQuestionResults(data) {
        console.log('=== showQuestionResults called ===');
        console.log('Full data:', data);
        console.log('Answers data:', data.answers);
        
        // Record all player votes for display in answer status
        Object.entries(data.answers).forEach(([playerId, answerData]) => {
            if (answerData && answerData.answer && answerData.answer !== "No Answer" && answerData.answer !== "Skipped") {
                console.log(`Recording vote: Player ${playerId} chose "${answerData.answer}"`);
                recordPlayerVote(playerId, answerData.answer);
            } else {
                console.log(`Skipping vote for player ${playerId}:`, answerData);
            }
        });
        
        console.log('=== Current question votes after recording ===', gameState.currentQuestionVotes);
        
        // Update answer status with player votes
        const nonHostPlayers = gameState.players.filter(p => p.id !== gameState.hostId);
        updateAnswerStatus({ answered_count: nonHostPlayers.length, total_players: nonHostPlayers.length });
        
        // Update scoreboard
        updateScoreboard(data.scores);
        
        // Show correct answer and explanation on host screen
        const correctAnswerElement = document.getElementById('correct-answer');
        const explanationElement = document.getElementById('question-explanation');
        if (correctAnswerElement) correctAnswerElement.textContent = data.correct_answer;
        if (explanationElement) explanationElement.textContent = data.explanation || 'No explanation available.';
        
        // Highlight correct answer
        highlightCorrectAnswer(data.correct_answer);
        
        // Show results notification
        const correctCount = Object.values(data.answers).filter(a => a.is_correct).length;
        Common.showNotification(`Question ${data.question_number} results: ${correctCount}/${Object.keys(data.answers).length} correct`, 'info');
        
        // Auto-advance to next question based on toggle setting
        const autoAdvanceToggle = document.getElementById('auto-advance-toggle');
        const isAutoAdvanceEnabled = autoAdvanceToggle ? autoAdvanceToggle.checked : false;
        
        if (isAutoAdvanceEnabled) {
            // Auto-advance after 15 seconds (configurable from setup)
            const autoAdvanceTime = parseInt(document.getElementById('auto-advance-time')?.value || 15) * 1000;
            setTimeout(() => {
                const gameScreen = document.getElementById('game-screen');
                if (gameScreen && !gameScreen.classList.contains('hidden')) {
                    // Auto-advance to next question
                    hostControl('next_question');
                    Common.showNotification('Auto-advancing to next question...', 'info');
                }
            }, autoAdvanceTime);
        } else {
            // Show manual advance notification after 10 seconds
            setTimeout(() => {
                const gameScreen = document.getElementById('game-screen');
                if (gameScreen && !gameScreen.classList.contains('hidden')) {
                    Common.showNotification('Ready for next question. Click "Next Question" to continue.', 'info');
                }
            }, 10000);
        }
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
        
        // Initialize score tracking objects if they don't exist
        if (!gameState.currentScores) {
            gameState.currentScores = {};
        }
        if (!gameState.previousScores) {
            gameState.previousScores = {};
        }
        
        // Update current scores and calculate changes
        sortedPlayers.forEach(player => {
            const previousScore = gameState.currentScores[player.id] || 0;
            const currentScore = player.score;
            const scoreChange = currentScore - previousScore;
            
            // Store the current score for next time
            gameState.currentScores[player.id] = currentScore;
        });
        
        sortedPlayers.forEach((player, index) => {
            const previousScore = gameState.previousScores[player.id] || 0;
            const currentScore = gameState.currentScores[player.id] || 0;
            const scoreChange = currentScore - previousScore;
            
            // Update previous scores for next calculation
            gameState.previousScores[player.id] = currentScore;
            
            const playerElement = document.createElement('div');
            playerElement.className = 'flex items-center justify-between p-2 bg-gray-700 rounded';
            
            // Format score change display
            let changeDisplay = '';
            if (scoreChange > 0) {
                changeDisplay = `<span class="text-green-400 text-xs">+${scoreChange}</span>`;
            } else if (scoreChange < 0) {
                changeDisplay = `<span class="text-red-400 text-xs">${scoreChange}</span>`;
            }
            
            playerElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="text-sm font-semibold text-gray-400">${index + 1}.</span>
                    <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
                        ${player.name.charAt(0).toUpperCase()}
                    </div>
                    <span class="text-white">${player.name}</span>
                </div>
                <div class="flex items-center space-x-2">
                    ${changeDisplay}
                    <span class="text-white font-semibold">${currentScore}</span>
                </div>
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
                    optionElement.className = 'p-8 bg-gray-700 rounded-2xl text-white border-2 border-gray-600 hover:border-blue-500 transition-colors answer-option';
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
            
            // Sync results visibility and toggle button
            const resultsVisible = !document.getElementById('question-results').classList.contains('hidden');
            const fullscreenResults = document.getElementById('fullscreen-question-results');
            const fullscreenToggleBtn = document.getElementById('fullscreen-toggle-results');
            if (resultsVisible) {
                fullscreenResults.classList.remove('hidden');
                if (fullscreenToggleBtn) fullscreenToggleBtn.textContent = '📋 Hide Explanation';
                document.getElementById('fullscreen-correct-answer').textContent = document.getElementById('correct-answer').textContent;
                document.getElementById('fullscreen-question-explanation').textContent = document.getElementById('question-explanation').textContent;
                
                // Sync player votes display
                const regularPlayerVotes = document.getElementById('player-votes');
                const fullscreenPlayerVotes = document.getElementById('fullscreen-player-votes');
                const regularPlayerVotesContent = document.getElementById('player-votes-content');
                const fullscreenPlayerVotesContent = document.getElementById('fullscreen-player-votes-content');
                
                if (regularPlayerVotes && !regularPlayerVotes.classList.contains('hidden') &&
                    fullscreenPlayerVotes && fullscreenPlayerVotesContent) {
                    fullscreenPlayerVotesContent.innerHTML = regularPlayerVotesContent.innerHTML;
                    fullscreenPlayerVotes.classList.remove('hidden');
                }
            } else {
                fullscreenResults.classList.add('hidden');
                if (fullscreenToggleBtn) fullscreenToggleBtn.textContent = '📋 Show Explanation';
            }
            
            // Update player names in fullscreen answer options
            updateOptionPlayerNames();
            
            // Sync timer control buttons
            const pauseBtn = document.getElementById('pause-timer');
            const resumeBtn = document.getElementById('resume-timer');
            const fullscreenPauseBtn = document.getElementById('fullscreen-pause-timer');
            const fullscreenResumeBtn = document.getElementById('fullscreen-resume-timer');
            
            if (pauseBtn && resumeBtn && fullscreenPauseBtn && fullscreenResumeBtn) {
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
                // Set results content
                document.getElementById('fullscreen-correct-answer').textContent = data.correct_answer;
                document.getElementById('fullscreen-question-explanation').textContent = data.explanation || 'No explanation available.';
                
                // Sync player votes if visible in regular view
                const regularPlayerVotes = document.getElementById('player-votes');
                if (regularPlayerVotes && !regularPlayerVotes.classList.contains('hidden')) {
                    document.getElementById('fullscreen-player-votes-content').innerHTML = document.getElementById('player-votes-content').innerHTML;
                    document.getElementById('fullscreen-player-votes').classList.remove('hidden');
                }
                
                // Don't automatically show results in fullscreen - let host decide
                // document.getElementById('fullscreen-question-results').classList.remove('hidden');
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
        toggleResults: toggleResults,
        highlightCorrectAnswer: highlightCorrectAnswer,
        showPlayerVotes: showPlayerVotes,
        recordPlayerVote: recordPlayerVote,
        getOptionLetter: getOptionLetter,
        enterFullscreen: enterFullscreen,
        exitFullscreen: exitFullscreen,
        syncAutoAdvanceToggle: syncAutoAdvanceToggle,
        syncFullscreenAutoAdvanceToggle: syncFullscreenAutoAdvanceToggle,
        gameState: gameState
    };
})(window.LiveQuizCommon);
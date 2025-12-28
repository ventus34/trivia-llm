// Live Quiz Player UI Components
window.LiveQuizPlayerUI = (function(Common) {
    'use strict';

    // Join Game Component
    function createJoinGameComponent() {
        const container = document.createElement('div');
        container.className = 'max-w-md mx-auto';
        container.innerHTML = `
            <h1 class="text-3xl font-bold text-center mb-8 text-white">🎮 Live Quiz</h1>
            
            <div class="bg-gray-800 rounded-2xl p-6 space-y-6">
                <div class="text-center">
                    <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                        📱
                    </div>
                    <h2 class="text-xl font-semibold text-white mb-2">Join a Game</h2>
                    <p class="text-gray-400 text-sm">Enter the room code provided by the host</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Room Code</label>
                    <input type="text" id="room-code" placeholder="123456" maxlength="6" class="w-full px-4 py-3 text-center text-2xl font-mono bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                    <input type="text" id="player-name" placeholder="Enter your name" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
                
                <button id="join-game" class="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                    Join Game
                </button>
                
                <div class="text-center">
                    <p class="text-xs text-gray-500">
                        Or scan the QR code to join automatically
                    </p>
                </div>
            </div>
        `;
        return container;
    }

    // Lobby Component
    function createLobbyComponent() {
        const container = document.createElement('div');
        container.className = 'max-w-md mx-auto';
        container.innerHTML = `
            <h1 class="text-2xl font-bold text-center mb-8 text-white">🏠 Waiting Room</h1>
            
            <div class="bg-gray-800 rounded-2xl p-6 space-y-6">
                <div class="text-center">
                    <div class="text-4xl font-mono font-bold text-blue-400 mb-2" id="display-room-code">------</div>
                    <p class="text-gray-400 text-sm">Room Code</p>
                </div>
                
                <div class="bg-gray-700 rounded-lg p-4">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-300">Players Connected:</span>
                        <span class="text-white font-semibold" id="player-count">0</span>
                    </div>
                </div>
                
                <div class="bg-gray-700 rounded-lg p-4">
                    <h3 class="text-white font-semibold mb-3">Game Categories:</h3>
                    <div id="categories-list" class="space-y-2">
                        <!-- Categories will be added here -->
                    </div>
                </div>
                
                <div class="bg-blue-900 rounded-lg p-4 text-center">
                    <div class="text-2xl mb-2">⏳</div>
                    <p class="text-blue-200">Waiting for host to start the game...</p>
                </div>
                
                <button id="leave-lobby" class="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                    Leave Game
                </button>
            </div>
        `;
        return container;
    }

    // Question Display Component
    function createQuestionDisplayComponent() {
        return {
            updateQuestion: function(data, questionNumber, totalQuestions) {
                // Update category and number
                const categoryElement = document.getElementById('question-category');
                if (categoryElement) {
                    categoryElement.textContent = data.category;
                }

                const numberElement = document.getElementById('question-number');
                if (numberElement) {
                    numberElement.textContent = `Question ${questionNumber}/${totalQuestions || 30}`;
                }

                // Update question text
                const questionTextElement = document.getElementById('question-text');
                if (questionTextElement) {
                    questionTextElement.textContent = data.question;
                }

                // Update options
                this.updateOptions(data.options || []);
            },

            updateOptions: function(options, submitCallback) {
                const optionsContainer = document.getElementById('answer-options');
                if (!optionsContainer) return;

                optionsContainer.innerHTML = '';

                // Ensure we have exactly 4 options for 2x2 grid
                const displayOptions = options.slice(0, 4);
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
                    if (submitCallback) {
                        button.addEventListener('click', () => submitCallback(option));
                    }
                    optionsContainer.appendChild(button);
                });
            },

            resetAnswerStatus: function() {
                const answerStatus = document.getElementById('answer-status');
                if (answerStatus) {
                    answerStatus.innerHTML = '<div class="text-lg text-gray-400">Select your answer</div>';
                }
            },

            disableOptions: function() {
                document.querySelectorAll('#answer-options button').forEach(button => {
                    button.disabled = true;
                    button.classList.add('opacity-50', 'cursor-not-allowed');
                });
            },

            showAnswered: function() {
                const answerStatus = document.getElementById('answer-status');
                if (answerStatus) {
                    answerStatus.innerHTML = '<div class="text-sm text-green-400">✓ Answer submitted!</div>';
                }
            },

            showSkipped: function() {
                const answerStatus = document.getElementById('answer-status');
                if (answerStatus) {
                    answerStatus.innerHTML = '<div class="text-sm text-gray-400">⏭️ Question skipped</div>';
                }
            },

            enableSkipButton: function(enabled = true) {
                const skipButton = document.getElementById('skip-question');
                if (skipButton) {
                    skipButton.disabled = !enabled;
                    skipButton.classList.toggle('opacity-50', !enabled);
                    skipButton.classList.toggle('cursor-not-allowed', !enabled);
                }
            }
        };
    }

    // Results Display Component
    function createResultsDisplayComponent() {
        return {
            showResults: function(playerAnswer, isCorrect, correctAnswer, explanation) {
                // Update result UI
                const resultIcon = document.getElementById('result-icon');
                const resultTitle = document.getElementById('result-title');
                const resultMessage = document.getElementById('result-message');
                
                if (resultIcon) resultIcon.textContent = isCorrect ? '✅' : '❌';
                if (resultTitle) resultTitle.textContent = isCorrect ? 'Correct!' : 'Incorrect';
                if (resultMessage) resultMessage.textContent = isCorrect ? 'Great job!' : 'Better luck next time!';
                
                // Show player's answer
                const yourAnswerDiv = document.getElementById('your-answer');
                const answerText = document.getElementById('answer-text');
                if (yourAnswerDiv && answerText) {
                    yourAnswerDiv.classList.remove('hidden');
                    answerText.textContent = playerAnswer;
                }
                
                // Show correct answer
                const correctAnswerDiv = document.getElementById('correct-answer');
                const correctAnswerText = document.getElementById('correct-answer-text');
                if (correctAnswerDiv && correctAnswerText) {
                    correctAnswerDiv.classList.remove('hidden');
                    correctAnswerText.textContent = correctAnswer;
                }
                
                // Show explanation if available
                const explanationDiv = document.getElementById('explanation');
                const explanationText = document.getElementById('explanation-text');
                if (explanationDiv && explanationText && explanation) {
                    explanationDiv.classList.remove('hidden');
                    explanationText.textContent = explanation;
                }
            }
        };
    }

    // Final Results Component
    function createFinalResultsComponent() {
        return {
            showResults: function(finalScore, position, totalPlayers) {
                // Update UI
                const finalScoreElement = document.getElementById('final-score');
                const positionTextElement = document.getElementById('final-position-text');
                
                if (finalScoreElement) finalScoreElement.textContent = finalScore;
                if (positionTextElement) positionTextElement.textContent = `Position: ${position}/${totalPlayers}`;
            }
        };
    }

    // Timer Component
    function createTimerComponent() {
        return {
            update: function(seconds) {
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
            },

            showPaused: function() {
                const timerElement = document.getElementById('timer');
                if (timerElement) {
                    timerElement.textContent = '⏸️';
                }
            }
        };
    }

    // Fullscreen Question Display
    function createFullscreenQuestionComponent() {
        return {
            updateQuestion: function(data, questionNumber, totalQuestions) {
                // Update header
                const categoryElement = document.getElementById('player-fullscreen-question-category');
                const numberElement = document.getElementById('player-fullscreen-question-number');
                const textElement = document.getElementById('player-fullscreen-question-text');
                
                if (categoryElement) categoryElement.textContent = data.category;
                if (numberElement) numberElement.textContent = `Question ${questionNumber}/${totalQuestions || 30}`;
                if (textElement) textElement.textContent = data.question;
            },

            updateOptions: function(options, submitCallback) {
                const optionsContainer = document.getElementById('player-fullscreen-question-options');
                if (!optionsContainer) return;

                optionsContainer.innerHTML = '';

                // Ensure we have exactly 4 options for 2x2 grid
                const displayOptions = options.slice(0, 4);
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
                    button.addEventListener('click', () => submitCallback(option));
                    optionsContainer.appendChild(button);
                });
            },

            updateAnswerStatus: function(statusHtml) {
                const answerStatus = document.getElementById('player-fullscreen-answer-status');
                if (answerStatus) {
                    answerStatus.innerHTML = statusHtml;
                }
            },

            disableOptions: function() {
                document.querySelectorAll('#player-fullscreen-question-options button').forEach(button => {
                    button.disabled = true;
                    button.classList.add('opacity-50', 'cursor-not-allowed');
                });
            }
        };
    }

    // Connection Status Component
    function createConnectionStatusComponent() {
        return {
            show: function() {
                const connectionStatus = document.getElementById('connection-status');
                if (connectionStatus) {
                    connectionStatus.classList.remove('hidden');
                }
            },

            hide: function() {
                const connectionStatus = document.getElementById('connection-status');
                if (connectionStatus) {
                    connectionStatus.classList.add('hidden');
                }
            }
        };
    }

    // Mobile Optimizations
    function addMobileOptimizations() {
        const style = document.createElement('style');
        style.textContent = `
            /* Mobile-first optimizations */
            body {
                font-size: 16px; /* Prevent zoom on iOS */
            }
            
            .answer-option {
                min-height: 60px;
                font-size: 1.1rem;
            }
            
            .timer-display {
                font-size: 3rem;
                line-height: 1;
            }
            
            .question-text {
                font-size: 1.2rem;
                line-height: 1.4;
            }
        `;
        document.head.appendChild(style);
    }

    function init() {
        // Add mobile optimizations
        addMobileOptimizations();
    }

    return {
        init: init,
        createJoinGameComponent: createJoinGameComponent,
        createLobbyComponent: createLobbyComponent,
        createQuestionDisplayComponent: createQuestionDisplayComponent,
        createResultsDisplayComponent: createResultsDisplayComponent,
        createFinalResultsComponent: createFinalResultsComponent,
        createTimerComponent: createTimerComponent,
        createFullscreenQuestionComponent: createFullscreenQuestionComponent,
        createConnectionStatusComponent: createConnectionStatusComponent
    };
})(window.LiveQuizCommon);
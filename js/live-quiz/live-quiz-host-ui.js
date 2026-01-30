// Live Quiz Host UI Components
window.LiveQuizHostUI = (function(Common) {
    'use strict';

    // Host Setup Form Component
    function createHostSetupForm() {
        const container = document.createElement('div');
        container.innerHTML = `
            <h2 class="text-2xl font-semibold mb-6 text-center">Game Setup</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Basic Settings -->
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Knowledge Level</label>
                        <select id="knowledge-level" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="basic">Basic</option>
                            <option value="intermediate" selected>Intermediate</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Language</label>
                        <select id="language" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="pl" selected>Polski</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Answer Time (seconds)</label>
                        <select id="answer-time" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="30">30 seconds</option>
                            <option value="45">45 seconds</option>
                            <option value="60" selected>60 seconds</option>
                            <option value="90">90 seconds</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Auto-advance Time (seconds)</label>
                        <select id="auto-advance-time" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="5">5 seconds</option>
                            <option value="10">10 seconds</option>
                            <option value="15" selected>15 seconds</option>
                            <option value="20">20 seconds</option>
                            <option value="30">30 seconds</option>
                        </select>
                    </div>
                </div>
                
                <!-- Model & Category Settings -->
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Question Model</label>
                        <select id="question-model" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <!-- Auto option will be removed by setup script -->
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Questions per Category</label>
                        <div class="space-y-2">
                            <input type="range" id="questions-per-category" min="1" max="10" value="3" class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider">
                            <div class="flex justify-between text-sm text-gray-400">
                                <span>1</span>
                                <span id="questions-slider-value" class="text-white font-semibold">3</span>
                                <span>10</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Categories Section -->
            <div class="mt-6">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Category Presets</label>
                    <div class="flex gap-2">
                        <select id="category-preset-select" class="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Choose a preset...</option>
                        </select>
                        <button id="load-preset" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">Load Preset</button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Theme (Optional)</label>
                        <input type="text" id="theme" placeholder="e.g., Lord of the Rings" class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    </div>
                    <div class="flex items-end">
                        <button id="generate-categories" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">🎲 Generate Categories</button>
                    </div>
                </div>
                
                <div class="flex items-center mb-4">
                    <input type="checkbox" id="include-theme" checked class="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500">
                    <label for="include-theme" class="ml-2 text-sm text-gray-300">Include theme in questions</label>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-300 mb-2">Categories (6 required)</label>
                </div>
                <div id="categories-container" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Category 1" class="category-input px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <input type="text" placeholder="Category 2" class="category-input px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <input type="text" placeholder="Category 3" class="category-input px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <input type="text" placeholder="Category 4" class="category-input px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <input type="text" placeholder="Category 5" class="category-input px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <input type="text" placeholder="Category 6" class="category-input px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
            </div>
            
            <div class="mt-8">
                <button id="create-room" class="w-full py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">🎮 Create Room</button>
                
                <!-- Game Rules Section -->
                <div class="mt-6 p-4 bg-gray-700 rounded-lg">
                    <h3 class="text-lg font-semibold text-white mb-3">📋 How to Play</h3>
                    <div class="text-sm text-gray-300 space-y-2">
                        <p>• Create a room, choose language and difficulty, then set time per question and questions per category.</p>
                        <p>• Choose or generate 6 categories (required); you can add a theme to influence generated questions.</p>
                        <p>• Share the room code, join link or QR so players can join on their phones.</p>
                        <p>• During the game, control the timer, regenerate questions, and reveal explanations when you decide.</p>
                        <p>• Use auto-advance if you want questions to move forward automatically after a short delay.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add slider functionality
        setTimeout(() => {
            const slider = document.getElementById('questions-per-category');
            const sliderValue = document.getElementById('questions-slider-value');
            if (slider && sliderValue) {
                slider.addEventListener('input', (e) => {
                    sliderValue.textContent = e.target.value;
                });
            }
        }, 100);
        
        return container;
    }

    // Room Info Component
    function createRoomInfoComponent() {
        const container = document.createElement('div');
        container.className = 'space-y-3';
        container.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-gray-300">Room Code:</span>
                <div class="flex items-center space-x-2">
                    <span id="room-code" class="text-2xl font-mono font-bold text-blue-400">------</span>
                    <button id="copy-room-code" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                        📋
                    </button>
                </div>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-gray-300">Game ID:</span>
                <span id="game-id" class="text-sm text-gray-400 font-mono">------------</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-gray-300">Players:</span>
                <span id="player-count" class="text-white font-semibold">0/12</span>
            </div>
            
            <div class="mt-6 p-4 bg-gray-700 rounded-lg">
                <h3 class="text-sm font-medium text-gray-300 mb-2">Share with players:</h3>
                <div class="flex items-center space-x-2">
                    <input type="text" id="join-url" readonly class="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-sm text-white" value="">
                    <button id="copy-join-url" class="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors">🔗</button>
                </div>
                <div class="mt-4 text-center">
                    <div id="qr-code" class="inline-block p-2 bg-white rounded-lg"></div>
                    <p class="text-xs text-gray-400 mt-2">Scan QR code to join</p>
                </div>
            </div>
        `;
        return container;
    }

    // Question Display Component
    function createQuestionDisplayComponent() {
        return {
            updateQuestion: function(data, totalQuestions) {
                // Update question text
                const questionTextElement = document.getElementById('question-text');
                if (questionTextElement) {
                    questionTextElement.textContent = data.question;
                }

                // Update category and number
                const categoryElement = document.getElementById('question-category');
                if (categoryElement) {
                    categoryElement.textContent = data.category;
                }

                const numberElement = document.getElementById('question-number');
                if (numberElement) {
                    numberElement.textContent = `Question ${data.question_number}/${totalQuestions}`;
                }

                // Update options
                this.updateOptions(data.options || []);
            },

            updateOptions: function(options) {
                const optionsContainer = document.getElementById('question-options');
                if (!optionsContainer) return;

                optionsContainer.innerHTML = '';

                // Ensure we have exactly 4 options for 2x2 grid
                const displayOptions = options.slice(0, 4);
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
            },

            showResults: function(data) {
                // Show correct answer and explanation
                const correctAnswerElement = document.getElementById('correct-answer');
                const explanationElement = document.getElementById('question-explanation');
                
                if (correctAnswerElement) {
                    correctAnswerElement.textContent = data.correct_answer;
                }
                
                if (explanationElement) {
                    explanationElement.textContent = data.explanation || 'No explanation available.';
                }

                // Show the results section
                const questionResults = document.getElementById('question-results');
                if (questionResults) {
                    questionResults.classList.remove('hidden');
                }
            },

            hideResults: function() {
                const questionResults = document.getElementById('question-results');
                if (questionResults) {
                    questionResults.classList.add('hidden');
                }
            }
        };
    }

    // Scoreboard Component
    function createScoreboardComponent() {
        return {
            update: function(players, scores) {
                const scoreboard = document.getElementById('scoreboard');
                if (!scoreboard) return;

                scoreboard.innerHTML = '';

                // Sort players by score
                const sortedPlayers = [...players]
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
        };
    }

    // Progress Component
    function createProgressComponent() {
        return {
            update: function(current, total) {
                const questionElement = document.getElementById('progress-question');
                const progressBar = document.getElementById('progress-bar');

                if (questionElement) {
                    questionElement.textContent = `${current}/${total}`;
                }

                if (progressBar) {
                    const progress = (current / total) * 100;
                    progressBar.style.width = `${progress}%`;
                }
            }
        };
    }

    // Answer Status Component
    function createAnswerStatusComponent() {
        return {
            update: function(answeredCount, totalCount) {
                const answerStatus = document.getElementById('answer-status');
                if (!answerStatus) return;

                const percentage = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

                answerStatus.innerHTML = `
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-300">Answered:</span>
                        <span class="text-white font-semibold">${answeredCount}/${totalCount}</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-2">
                        <div class="bg-green-600 h-2 rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
                    </div>
                `;
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
                        timerElement.className = 'text-5xl font-mono font-bold text-red-400';
                    } else if (seconds <= 30) {
                        timerElement.className = 'text-5xl font-mono font-bold text-yellow-400';
                    } else {
                        timerElement.className = 'text-5xl font-mono font-bold text-white';
                    }
                }
            },

            showPaused: function() {
                const pauseBtn = document.getElementById('pause-timer');
                const resumeBtn = document.getElementById('resume-timer');
                
                if (pauseBtn) pauseBtn.classList.add('hidden');
                if (resumeBtn) resumeBtn.classList.remove('hidden');
            },

            showResumed: function() {
                const pauseBtn = document.getElementById('pause-timer');
                const resumeBtn = document.getElementById('resume-timer');
                
                if (pauseBtn) pauseBtn.classList.remove('hidden');
                if (resumeBtn) resumeBtn.classList.add('hidden');
            }
        };
    }

    function init() {
        // Load host setup form
        const setupContent = document.getElementById('host-setup-content');
        if (setupContent) {
            const form = createHostSetupForm();
            setupContent.appendChild(form);
        }

        // Load room info
        const roomInfoContent = document.getElementById('room-info-content');
        if (roomInfoContent) {
            const roomInfo = createRoomInfoComponent();
            roomInfoContent.appendChild(roomInfo);
        }
    }

    return {
        init: init,
        createHostSetupForm: createHostSetupForm,
        createRoomInfoComponent: createRoomInfoComponent,
        createQuestionDisplayComponent: createQuestionDisplayComponent,
        createScoreboardComponent: createScoreboardComponent,
        createProgressComponent: createProgressComponent,
        createAnswerStatusComponent: createAnswerStatusComponent,
        createTimerComponent: createTimerComponent
    };
})(window.LiveQuizCommon);
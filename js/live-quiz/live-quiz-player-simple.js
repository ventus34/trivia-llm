// Category Presets from board game
const CATEGORY_PRESETS = [
    {
        name: {pl: 'Wiedza Ogólna – Klasyk', en: 'General Knowledge – Classic'},
        categories: [
            {pl: 'Historia', en: 'History'},
            {pl: 'Geografia', en: 'Geography'},
            {pl: 'Nauka', en: 'Science'},
            {pl: 'Kultura i sztuka', en: 'Culture & Art'},
            {pl: 'Sport', en: 'Sports'},
            {pl: 'Media i rozrywka', en: 'Media & Entertainment'}
        ]
    },
    {
        name: {pl: 'Wiedza Ogólna – Współczesność', en: 'General Knowledge – Modern Times'},
        categories: [
            {pl: 'Wydarzenia bieżące', en: 'Current Events'},
            {pl: 'Technologia', en: 'Technology'},
            {pl: 'Popkultura', en: 'Pop Culture'},
            {pl: 'Odkrycia naukowe', en: 'Scientific Discoveries'},
            {pl: 'Polityka', en: 'Politics'},
            {pl: 'Internet i media społecznościowe', en: 'Internet & Social Media'}
        ]
    },
    {
        name: {pl: 'Polska – Wiedza Ogólna', en: 'Poland – General Knowledge'},
        categories: [
            {pl: 'Historia', en: 'History'},
            {pl: 'Geografia', en: 'Geography'},
            {pl: 'Kultura i sztuka', en: 'Culture & Art'},
            {pl: 'Znani Polacy', en: 'Famous Poles'},
            {pl: 'Sport', en: 'Sports'},
            {pl: 'Społeczeństwo', en: 'Society'}
        ]
    },
    {
        name: {pl: 'Polska – Lata 90.', en: 'Poland – The 90s'},
        categories: [
            {pl: 'Historia', en: 'History'},
            {pl: 'Muzyka', en: 'Music'},
            {pl: 'Film i seriale', en: 'Movies & TV'},
            {pl: 'Życie codzienne', en: 'Everyday Life'},
            {pl: 'Sport', en: 'Sports'},
            {pl: 'Technologia', en: 'Technology'}
        ]
    },
    {
        name: {pl: 'Nauka – Podstawy', en: 'Science – The Basics'},
        categories: [
            {pl: 'Fizyka', en: 'Physics'},
            {pl: 'Chemia', en: 'Chemistry'},
            {pl: 'Biologia', en: 'Biology'},
            {pl: 'Astronomia', en: 'Astronomy'},
            {pl: 'Matematyka', en: 'Mathematics'},
            {pl: 'Wielcy odkrywcy', en: 'Great Discoverers'}
        ]
    },
    {
        name: {pl: 'Gry wideo', en: 'Video Games'},
        categories: [
            {pl: 'Historia gier', en: 'History of Games'},
            {pl: 'Serie i postacie', en: 'Series & Characters'},
            {pl: 'Konsole', en: 'Consoles'},
            {pl: 'Gatunki', en: 'Genres'},
            {pl: 'Kultura graczy', en: 'Gaming Culture'},
            {pl: 'E-sport', en: 'E-sports'}
        ]
    },
    {
        name: {pl: 'Rozrywka – Kino', en: 'Entertainment – Cinema'},
        categories: [
            {pl: 'Historia kina', en: 'History of Cinema'},
            {pl: 'Gatunki filmowe', en: 'Film Genres'},
            {pl: 'Reżyserzy', en: 'Directors'},
            {pl: 'Aktorzy', en: 'Actors'},
            {pl: 'Nagrody filmowe', en: 'Film Awards'},
            {pl: 'Kultowe filmy', en: 'Cult Movies'}
        ]
    },
    {
        name: {pl: 'Podróże – Świat', en: 'Travel – World'},
        categories: [
            {pl: 'Kontynenty', en: 'Continents'},
            {pl: 'Kraje', en: 'Countries'},
            {pl: 'Miasta', en: 'Cities'},
            {pl: 'Zabytki', en: 'Landmarks'},
            {pl: 'Cuda natury', en: 'Natural Wonders'},
            {pl: 'Kultury i tradycje', en: 'Cultures & Traditions'}
        ]
    },
    {
        name: {pl: 'Kuchnia Polska', en: 'Polish Cuisine'},
        categories: [
            {pl: 'Dania główne', en: 'Main Courses'},
            {pl: 'Zupy', en: 'Soups'},
            {pl: 'Przystawki', en: 'Appetizers'},
            {pl: 'Desery', en: 'Desserts'},
            {pl: 'Święta i tradycje kulinarne', en: 'Holiday & Traditional Foods'},
            {pl: 'Znane potrawy regionalne', en: 'Famous Regional Dishes'}
        ]
    },
    {
        name: {pl: 'Sport – Ogólne', en: 'Sport – General'},
        categories: [
            {pl: 'Igrzyska olimpijskie', en: 'Olympic Games'},
            {pl: 'Piłka nożna', en: 'Football (Soccer)'},
            {pl: 'Koszykówka', en: 'Basketball'},
            {pl: 'Lekkoatletyka', en: 'Athletics'},
            {pl: 'Sporty zimowe', en: 'Winter Sports'},
            {pl: 'Znani sportowcy', en: 'Famous Athletes'}
        ]
    }
];

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

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const roomFromUrl = urlParams.get('room');

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
    document.querySelectorAll('#join-screen, #lobby-screen, #question-screen, #results-screen, #final-results-screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function showNotification(message, type = 'info') {
    // Create notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-lg text-white text-sm z-50 max-w-sm ${
        type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-blue-600'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showLoading(text = 'Loading...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showConnectionStatus() {
    document.getElementById('connection-status').classList.remove('hidden');
}

function hideConnectionStatus() {
    document.getElementById('connection-status').classList.add('hidden');
}

// Event listeners
function setupEventListeners() {
    // Join game
    document.getElementById('join-game').addEventListener('click', joinGame);
    
    // Enter room code input
    document.getElementById('room-code').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, ''); // Only numbers
        if (e.target.value.length === 6) {
            document.getElementById('player-name').focus();
        }
    });
    
    // Join with Enter
    document.getElementById('player-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinGame();
        }
    });
    
    // Leave lobby
    document.getElementById('leave-lobby').addEventListener('click', () => {
        if (gameState.sse) {
            gameState.sse.close();
        }
        resetGame();
        showScreen('join-screen');
    });
    
    // Play again
    document.getElementById('play-again').addEventListener('click', () => {
        if (gameState.sse) {
            gameState.sse.close();
        }
        resetGame();
        showScreen('join-screen');
    });
    
    // Player fullscreen controls
    document.getElementById('player-toggle-fullscreen').addEventListener('click', playerEnterFullscreen);
    document.getElementById('player-exit-fullscreen').addEventListener('click', playerExitFullscreen);
    
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
        showNotification('Please enter a valid 6-digit room code', 'error');
        return;
    }
    
    if (!playerName) {
        showNotification('Please enter your name', 'error');
        return;
    }
    
    showLoading('Joining game...');
    try {
        const response = await apiCall('/api/live-quiz/join-room', 'POST', {
            room_code: roomCode,
            player_name: playerName
        });
        
        gameState.gameId = response.game_id;
        gameState.playerId = response.player_id;
        gameState.roomCode = roomCode;
        gameState.hostId = response.host_id;
        
        // Update lobby screen
        document.getElementById('display-room-code').textContent = roomCode;
        
        // Add categories
        const categoriesList = document.getElementById('categories-list');
        categoriesList.innerHTML = '';
        response.categories.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'text-sm text-gray-300 bg-gray-600 rounded px-3 py-1';
            categoryElement.textContent = category;
            categoriesList.appendChild(categoryElement);
        });
        
        showScreen('lobby-screen');
        setupSSE();
        
        showNotification('Joined game successfully!', 'success');
        
    } catch (error) {
        showNotification('Failed to join game: ' + error.message, 'error');
    } finally {
        hideLoading();
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
            showNotification(`${event.data.player.name} joined the game!`, 'success');
            break;
            
        case 'question_started':
            startQuestion(event.data);
            break;
            
        case 'timer_update':
            updateTimer(event.data.remaining_seconds);
            break;
            
        case 'timer_paused':
            showTimerPaused();
            break;
            
        case 'timer_resumed':
            showTimerResumed();
            break;
            
        case 'question_results':
            showQuestionResults(event.data);
            break;
            
        case 'game_started':
            showNotification('Game started!', 'success');
            break;
            
        case 'game_finished':
            showFinalResults(event.data);
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
    document.getElementById('answer-status').innerHTML = '<div class="text-lg text-gray-400">Select your answer before time runs out. You can skip if you are not sure.</div>';
    
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
    
    showScreen('question-screen');
    
    // Sync to fullscreen if active
    if (!document.getElementById('player-fullscreen-question').classList.contains('hidden')) {
        syncPlayerFullscreenView();
    }
}

function updateTimer(seconds) {
    gameState.timerSeconds = seconds;
    document.getElementById('timer').textContent = seconds;
    
    // Change color based on time remaining
    const timerElement = document.getElementById('timer');
    if (seconds <= 10) {
        timerElement.className = 'timer-display text-red-400 font-bold';
    } else if (seconds <= 30) {
        timerElement.className = 'timer-display text-yellow-400 font-bold';
    } else {
        timerElement.className = 'timer-display text-white font-bold';
    }
}

function showTimerPaused() {
    showNotification('Timer paused by host', 'info');
    document.getElementById('timer').textContent = '⏸️';
    
    // Sync to player fullscreen if active
    if (!document.getElementById('player-fullscreen-question').classList.contains('hidden')) {
        document.getElementById('player-fullscreen-timer').textContent = '⏸️';
    }
}

function showTimerResumed() {
    showNotification('Timer resumed', 'info');
    
    // Sync to player fullscreen if active
    if (!document.getElementById('player-fullscreen-question').classList.contains('hidden')) {
        document.getElementById('player-fullscreen-timer').textContent = gameState.timerSeconds;
        updatePlayerFullscreenTimerStyle(gameState.timerSeconds);
    }
}

async function submitAnswer(answer) {
    if (gameState.hasAnswered) return;

    gameState.hasAnswered = true;

    // Get the selected button
    const buttons = document.querySelectorAll('#answer-options button');
    const selectedButton = Array.from(buttons).find(btn => {
        const textSpan = btn.querySelector('.flex-1');
        return textSpan && textSpan.textContent === answer;
    });

    // Add loading state to selected button
    if (selectedButton) {
        selectedButton.classList.add('loading');
    }

    // Disable all buttons
    buttons.forEach(button => {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
    });

    // Also disable skip button
    const skipButton = document.getElementById('skip-question');
    if (skipButton) {
        skipButton.disabled = true;
        skipButton.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // Update status
    document.getElementById('answer-status').innerHTML = '<div class="text-sm text-green-400">✓ Answer submitted!</div>';

    try {
        await apiCall('/api/live-quiz/submit-answer', 'POST', {
            game_id: gameState.gameId,
            player_id: gameState.playerId,
            answer: answer
        });
    } catch (error) {
        showNotification('Failed to submit answer: ' + error.message, 'error');
        gameState.hasAnswered = false;
    } finally {
        // Remove loading state and mark as selected
        if (selectedButton) {
            selectedButton.classList.remove('loading');
            selectedButton.classList.add('selected');
        }
    }
}

async function skipQuestion() {
    if (gameState.hasAnswered) return;
    
    gameState.hasAnswered = true;
    
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
        await apiCall('/api/live-quiz/submit-answer', 'POST', {
            game_id: gameState.gameId,
            player_id: gameState.playerId,
            answer: "", // Empty string for skipped questions
            skipped: true
        });
    } catch (error) {
        showNotification('Failed to skip question: ' + error.message, 'error');
        gameState.hasAnswered = false;
    }
}

function showQuestionResults(data) {
    const wasCorrect = data.answers[gameState.playerId]?.is_correct;
    const playerAnswer = data.answers[gameState.playerId]?.answer;
    
    // Update result UI
    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    
    if (wasCorrect) {
        resultIcon.textContent = '✅';
        resultTitle.textContent = 'Correct!';
        resultMessage.textContent = 'Great job!';
    } else {
        resultIcon.textContent = '❌';
        resultTitle.textContent = 'Incorrect';
        resultMessage.textContent = 'Better luck next time!';
    }
    
    // Show answers
    document.getElementById('your-answer').classList.remove('hidden');
    document.getElementById('answer-text').textContent = playerAnswer;
    
    document.getElementById('correct-answer').classList.remove('hidden');
    document.getElementById('correct-answer-text').textContent = data.correct_answer;
    
    if (data.explanation) {
        document.getElementById('explanation').classList.remove('hidden');
        document.getElementById('explanation-text').textContent = data.explanation;
    }
    
    showScreen('results-screen');
}

function showFinalResults(data) {
    // Get final score for this player
    const finalScore = data.final_scores[gameState.playerId] || 0;
    
    // Calculate position (exclude host from calculation)
    const nonHostScores = Object.entries(data.final_scores)
        .filter(([playerId, score]) => playerId !== gameState.hostId)
        .map(([playerId, score]) => score);
    
    const sortedScores = nonHostScores.sort((a, b) => b - a);
    const position = sortedScores.indexOf(finalScore) + 1;
    const totalPlayers = sortedScores.length;
    
    // Update UI
    document.getElementById('final-score').textContent = finalScore;
    document.getElementById('final-position-text').textContent = `Position: ${position}/${totalPlayers}`;
    
    showScreen('final-results-screen');
    
    // Show result notification
    if (position === 1) {
        showNotification('🏆 You won! Congratulations!', 'success');
    } else {
        showNotification(`Game finished! You placed ${position} of ${totalPlayers}`, 'info');
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
        document.getElementById('player-fullscreen-question-category').textContent = q.category;
        document.getElementById('player-fullscreen-question-number').textContent = `Question ${q.question_number}/30`;
        
        // Update timer
        document.getElementById('player-fullscreen-timer').textContent = gameState.timerSeconds;
        updatePlayerFullscreenTimerStyle(gameState.timerSeconds);
        
        // Update question text
        document.getElementById('player-fullscreen-question-text').textContent = q.question;
        
        // Update options
        const fullscreenOptionsContainer = document.getElementById('player-fullscreen-question-options');
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
        
        // Update answer status
        const answerStatus = document.getElementById('answer-status').innerHTML;
        document.getElementById('player-fullscreen-answer-status').innerHTML = answerStatus;
        
        // Disable buttons if already answered
        if (gameState.hasAnswered) {
            document.querySelectorAll('#player-fullscreen-question-options button').forEach(button => {
                button.disabled = true;
                button.classList.add('opacity-50', 'cursor-not-allowed');
            });
        }
    }
}

function updatePlayerFullscreenTimerStyle(seconds) {
    const timerElement = document.getElementById('player-fullscreen-timer');
    if (seconds <= 10) {
        timerElement.className = 'text-6xl font-mono font-bold text-red-400';
    } else if (seconds <= 30) {
        timerElement.className = 'text-6xl font-mono font-bold text-yellow-400';
    } else {
        timerElement.className = 'text-6xl font-mono font-bold text-white';
    }
}

// Override the original updateTimer function to also update fullscreen
const originalPlayerUpdateTimer = updateTimer;
updateTimer = function(seconds) {
    originalPlayerUpdateTimer(seconds);
    // Also update fullscreen timer if it's visible
    if (!document.getElementById('player-fullscreen-question').classList.contains('hidden')) {
        document.getElementById('player-fullscreen-timer').textContent = seconds;
        updatePlayerFullscreenTimerStyle(seconds);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Pre-fill room code if provided in URL
    if (roomFromUrl) {
        document.getElementById('room-code').value = roomFromUrl;
        document.getElementById('player-name').focus();
    }
    
    showScreen('join-screen');

    // Unregister any existing service workers
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
                registration.unregister();
                console.log('ServiceWorker unregistered');
            }
        });
    }
});

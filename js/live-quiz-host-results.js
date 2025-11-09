// Live Quiz Host Results Logic
window.LiveQuizHostResults = (function(Common) {
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

    // Setup event listeners for results screen
    function setupResultsEventListeners() {
        // New game button
        document.getElementById('new-game')?.addEventListener('click', () => {
            if (gameState.sse) {
                gameState.sse.close();
            }
            Common.showScreen('setup-screen');
        });
        
        // Exit game button
        document.getElementById('exit-game')?.addEventListener('click', () => {
            if (gameState.sse) {
                gameState.sse.close();
            }
            Common.showScreen('setup-screen');
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

    function init() {
        setupResultsEventListeners();
    }

    return {
        init: init,
        showFinalResults: showFinalResults
    };
})(window.LiveQuizCommon);
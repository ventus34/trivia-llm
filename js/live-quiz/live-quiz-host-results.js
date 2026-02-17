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
        const winnerHighlight = document.getElementById('winner-highlight');
        const winnerName = document.getElementById('winner-name');
        
        if (!finalScores) return;
        
        // Clear previous content
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
        
        // Add results to table
        if (nonHostScores.length > 0) {
            nonHostScores.forEach((player, index) => {
                const row = document.createElement('tr');
                row.className = 'border-b border-gray-600';
                const positionColor = index === 0 ? 'bg-yellow-600' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-600';
                row.innerHTML = `
                    <td class="py-3 px-4">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${positionColor} text-white">${index + 1}</span>
                    </td>
                    <td class="py-3 px-4 text-white">${player.name}</td>
                    <td class="py-3 px-4 text-white">${player.score}</td>
                `;
                finalScores.appendChild(row);
            });
            
            // Show winner highlight
            const winner = nonHostScores[0];
            if (winnerHighlight && winnerName) {
                winnerName.textContent = `${winner.name} (${winner.score} ${Common.getTranslation('points_label')})`;
                winnerHighlight.classList.remove('hidden');
            }
        } else {
            // No non-host players played
            const noPlayersElement = document.createElement('tr');
            noPlayersElement.innerHTML = `
                <td colspan="3" class="py-6 px-4 text-center text-gray-400">
                    <h2 class="text-xl font-bold text-white mb-2">${Common.getTranslation('no_players_title')}</h2>
                    <p>${Common.getTranslation('no_players_message')}</p>
                </td>
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
// Live Quiz Player API Wrapper
window.LiveQuizPlayerApi = (function(Common) {
    'use strict';

    async function joinRoom(roomCode, playerName) {
        return Common.apiCall(Common.API_ENDPOINTS.joinRoom, 'POST', {
            room_code: roomCode,
            player_name: playerName
        });
    }

    async function submitAnswer(gameId, playerId, answer, skipped = false) {
        return Common.apiCall(Common.API_ENDPOINTS.submitAnswer, 'POST', {
            game_id: gameId,
            player_id: playerId,
            answer: answer,
            skipped: skipped
        });
    }

    return {
        joinRoom,
        submitAnswer
    };
})(window.LiveQuizCommon);

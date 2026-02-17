// Live Quiz Player UI Helpers
window.LiveQuizPlayerUI = (function(Common) {
    'use strict';

    function setLobbyRoomCode(roomCode) {
        const displayRoomCodeElement = document.getElementById('display-room-code');
        if (displayRoomCodeElement) {
            displayRoomCodeElement.textContent = roomCode;
        }
    }

    function renderCategories(categories = []) {
        const categoriesList = document.getElementById('categories-list');
        if (!categoriesList) return;

        categoriesList.innerHTML = '';
        categories.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'text-sm text-gray-300 bg-gray-600 rounded px-3 py-1';
            categoryElement.textContent = category;
            categoriesList.appendChild(categoryElement);
        });
    }

    function setAnswerStatus(html) {
        const answerStatus = document.getElementById('answer-status');
        if (answerStatus) {
            answerStatus.innerHTML = html;
        }
    }

    function setFinalPositionText(position, total) {
        const positionTextElement = document.getElementById('final-position-text');
        if (positionTextElement) {
            positionTextElement.textContent = Common.formatTranslation('final_position_format', {
                position: position,
                total: total
            });
        }
    }

    return {
        setLobbyRoomCode,
        renderCategories,
        setAnswerStatus,
        setFinalPositionText
    };
})(window.LiveQuizCommon);
                position: position,
                total: total
            });
        }
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
        createConnectionStatusComponent: createConnectionStatusComponent,
        createSkeletonLoaderComponent: createSkeletonLoaderComponent,
        setLobbyRoomCode: setLobbyRoomCode,
        renderCategories: renderCategories,
        setAnswerStatus: setAnswerStatus,
        setFinalPositionText: setFinalPositionText
    };
})(window.LiveQuizCommon);
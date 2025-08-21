/**
 * @file main.js
 * This is the main entry point for the trivia board game application.
 * It initializes the game and sets up all event listeners.
 */

import { gameState } from './state.js';
import { UI } from './dom.js';
import {
    setLanguage, updateDescriptions, updatePlayerNameInputs,
    updateModelSelection, closePopupAndContinue, hideHistoryModal,
    showHistoryModal, setupGameMenu, populateModelSelectors
} from './ui.js';
import {
    loadGameState, restartGame, downloadGameState,
    handleStateUpload, restoreGameState
} from './persistence.js';
import {
    initializeGame, generateCategories, askQuestion,
    rollDice, handleOpenAnswer, handleManualVerification
} from './game.js';


/**
 * Initializes the entire application, sets up event listeners, and injects the API adapter.
 * @param {object} apiAdapter - An object with methods for communicating with the backend.
 */
export async function initializeApp(apiAdapter) {
    gameState.api = apiAdapter;

    await populateModelSelectors();

    const urlParams = new URLSearchParams(window.location.search);
    const shouldLoadGame = urlParams.get('loadGame') === 'true';
    const savedGame = loadGameState();

    if (savedGame) {
        UI.loadGameBtn.classList.remove('hidden');
        UI.loadGameBtn.addEventListener('click', () => {
            restoreGameState(savedGame);
        });
    }

    if (gameState.api.loadSettings) {
        gameState.api.loadSettings();
    }

    if (shouldLoadGame && savedGame) {
        restoreGameState(savedGame);
    } else {
        setLanguage(localStorage.getItem('trivia_lang') || 'pl');
    }

    // --- EVENT LISTENERS ---
    UI.langPlBtn.addEventListener('click', () => setLanguage('pl'));
    UI.langEnBtn.addEventListener('click', () => setLanguage('en'));
    UI.gameModeSelect.addEventListener('change', updateDescriptions);
    UI.knowledgeLevelSelect.addEventListener('change', updateDescriptions);
    UI.includeThemeToggle.addEventListener('change', () => {
        if (gameState.api.saveSettings) gameState.api.saveSettings();
    });
    UI.mutateCategoriesToggle.addEventListener('change', () => { if (gameState.api.saveSettings) gameState.api.saveSettings(); });
    UI.generateCategoriesBtn.addEventListener('click', generateCategories);
    UI.regenerateQuestionBtn.addEventListener('click', () => askQuestion(gameState.currentForcedCategoryIndex));
    UI.popupRegenerateBtn.addEventListener('click', () => {
        UI.answerPopup.classList.add('opacity-0', 'scale-90');
        setTimeout(() => UI.answerPopup.classList.add('hidden'), 500);
        askQuestion(gameState.currentForcedCategoryIndex);
    });

    UI.modelSelect.addEventListener('change', (e) => {
        updateModelSelection(e.target.value);
        if (gameState.api.saveSettings) {
            gameState.api.saveSettings();
        }
    });

    UI.gameMenuModelSelect.addEventListener('change', (e) => {
        updateModelSelection(e.target.value);
        if (gameState.api.saveSettings) {
            gameState.api.saveSettings();
        }
    });

    UI.playerCountInput.addEventListener('input', updatePlayerNameInputs);
    UI.startGameBtn.addEventListener('click', initializeGame);
    UI.diceElement.addEventListener('click', rollDice);
    UI.submitAnswerBtn.addEventListener('click', handleOpenAnswer);
    UI.answerInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleOpenAnswer(); });
    UI.acceptAnswerBtn.addEventListener('click', () => handleManualVerification(true));
    UI.rejectAnswerBtn.addEventListener('click', () => handleManualVerification(false));
    UI.closePopupBtn.addEventListener('click', closePopupAndContinue);
    UI.closeHistoryBtn.addEventListener('click', hideHistoryModal);
    UI.restartGameBtn.addEventListener('click', restartGame);
    UI.downloadStateBtn.addEventListener('click', downloadGameState);
    UI.uploadStateInput.addEventListener('change', handleStateUpload);
    UI.closeSuggestionModalBtn.addEventListener('click', () => {
        UI.suggestionModal.classList.remove('visible');
    });

    UI.playAgainBtn.addEventListener('click', () => {
        UI.winnerScreen.classList.add('hidden');
        UI.setupScreen.classList.remove('hidden');
        const oldSvg = UI.boardWrapper.querySelector('.board-connections');
        if (oldSvg) oldSvg.remove();
    });

    document.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-panel.active').forEach(panel => {
            if (!panel.parentElement.contains(e.target)) {
                panel.classList.remove('active');
            }
        });
    });

    setupGameMenu();
}
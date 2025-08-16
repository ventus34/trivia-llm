/**
 * @file persistence.js
 * Handles saving, loading, and restarting the game state.
 */

import { gameState } from './state.js';
import { translations } from './config.js';
import { UI } from './dom.js';
import { createBoardLayout } from './board.js';
import { setLanguage, renderBoard, renderCategoryLegend, updateUI, showNotification } from './ui.js';

/**
 * Creates a "clean" version of the game state for saving.
 * @returns {object} The cleaned game state object.
 */
function getCleanedState() {
    const stateToSave = JSON.parse(JSON.stringify(gameState));

    const excludeKeys = [
        'api', 'promptHistory', 'possiblePaths', 'currentQuestionData',
        'currentForcedCategoryIndex', 'currentPlayerAnswer', 'isAwaitingMove',
        'lastAnswerWasCorrect', 'board', 'isMutationPending'
    ];
    excludeKeys.forEach(key => delete stateToSave[key]);

    if (stateToSave.categoryTopicHistory && stateToSave.categories) {
        const currentCategories = new Set(stateToSave.categories);
        const cleanedHistory = {};
        for (const categoryName in stateToSave.categoryTopicHistory) {
            if (currentCategories.has(categoryName)) {
                cleanedHistory[categoryName] = stateToSave.categoryTopicHistory[categoryName];
            }
        }
        stateToSave.categoryTopicHistory = cleanedHistory;
    }

    return stateToSave;
}

/**
 * Saves the essential game state to localStorage.
 */
export function saveGameState() {
    const stateToSave = getCleanedState();
    localStorage.setItem('savedQuizGame', JSON.stringify(stateToSave));
    console.log("Game state saved (optimized).", new Date().toLocaleTimeString());
}

/**
 * Loads the game state from localStorage.
 * @returns {object|null} The loaded game state object, or null if not found.
 */
export function loadGameState() {
    const savedState = localStorage.getItem('savedQuizGame');
    if (savedState) {
        console.log("Found saved game state. Loading...");
        return JSON.parse(savedState);
    }
    return null;
}

/**
 * Restarts the game by clearing saved state and reloading the page.
 */
export function restartGame() {
    if (confirm(translations.restart_game_confirm[gameState.currentLanguage])) {
        localStorage.removeItem('savedQuizGame');
        window.location.reload();
    }
}

/**
 * Triggers a download of the current game state as a JSON file.
 */
export function downloadGameState() {
    const stateToSave = getCleanedState();
    const jsonString = JSON.stringify(stateToSave, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:]/g, "-");
    link.download = `trivia_save_${timestamp}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Handles the user uploading a game state file.
 * @param {Event} event - The file input change event.
 */
export function handleStateUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loadedState = JSON.parse(e.target.result);
            if (loadedState && loadedState.players && loadedState.categories) {
                restoreGameState(loadedState);
                showNotification({ title: "Success", body: translations.game_loaded_success[gameState.currentLanguage] }, 'success');
            } else {
                throw new Error("Invalid game state format.");
            }
        } catch (error) {
            console.error("Failed to load or parse game state:", error);
            showNotification({ title: "Error", body: translations.game_loaded_error[gameState.currentLanguage] }, 'error');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file, 'UTF-8');
}

/**
 * Restores the game from a loaded state object.
 * @param {object} stateToRestore - The game state object to load.
 */
export function restoreGameState(stateToRestore) {
    Object.assign(gameState, stateToRestore);

    if (!gameState.gameId) {
        console.warn("Loaded game state is missing a gameId. Generating a new one.");
        gameState.gameId = 'game-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    }

    gameState.isAwaitingMove = false;
    gameState.lastAnswerWasCorrect = false;

    createBoardLayout();
    setLanguage(gameState.currentLanguage);

    UI.setupScreen.classList.add('hidden');
    UI.gameScreen.classList.remove('hidden');

    const oldSvg = UI.boardWrapper.querySelector('.board-connections');
    if (oldSvg) oldSvg.remove();

    renderBoard();
    renderCategoryLegend();
    updateUI();

    UI.diceElement.disabled = false;
    UI.diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
    UI.gameMessageDiv.textContent = '';
}
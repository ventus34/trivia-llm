/**
 * @file main.js
 * This is the main entry point for the trivia board game application.
 * It initializes the game and sets up all event listeners.
 */

import { gameState } from './state.js';
import { UI } from './dom.js';
import { showNotification } from './ui-notifications.js';
import {
    setLanguage, populatePresetSelector,
    registerUIHandlers
} from './ui.js';
import {
    loadGameState, restoreGameState
} from './persistence.js';
import {
    askQuestion,
    handleSquareClick,
    checkWinCondition,
    nextTurn
} from './game-flow.js';
import { handleSuggestAlternatives } from './game-api.js';
import { setupEventListeners } from './ui-events.js';


/**
 * Global fetch wrapper for handling network errors gracefully.
 * @param {string} url - The URL to fetch.
 * @param {object} options - The fetch options.
 * @returns {Promise<Response>} The fetch response.
 */
export async function fetchWithErrorHandling(url, options) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    } catch (error) {
        console.error('Network error:', error);
        // Show a user-friendly error message
        if (typeof showNotification === 'function') {
            showNotification(
                { title: 'Network Error', body: 'Please check your internet connection and try again.' },
                'error',
                5000
            );
        }
        throw error;
    }
}

/**
 * Initializes the entire application, sets up event listeners, and injects the API adapter.
 * @param {object} apiAdapter - An object with methods for communicating with the backend.
 */
export async function initializeApp(apiAdapter) {
    gameState.api = apiAdapter;

    registerUIHandlers({
        handleSquareClick,
        askQuestion,
        nextTurn,
        checkWinCondition,
        handleSuggestAlternatives
    });

    await populatePresetSelector();

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

    setupEventListeners();

}
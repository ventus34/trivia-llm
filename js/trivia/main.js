/**
 * @file main.js
 * This is the main entry point for the trivia board game application.
 * It initializes the game and sets up all event listeners.
 */

import { UI } from './dom.js';
import { notify } from './error-bus.js';
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
import { setupStateSubscriptions } from './ui-state.js';
import { setApiAdapter, getApiAdapter } from './services/api-service.js';


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
        notify(
            { title: 'Network Error', body: 'Please check your internet connection and try again.' },
            'error',
            5000
        );
        throw error;
    }
}

/**
 * Initializes the entire application, sets up event listeners, and injects the API adapter.
 * @param {object} apiAdapter - An object with methods for communicating with the backend.
 */
export async function initializeApp(apiAdapter) {
    setApiAdapter(apiAdapter);

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

    const api = getApiAdapter();
    if (api && api.loadSettings) {
        api.loadSettings();
    }

    if (shouldLoadGame && savedGame) {
        restoreGameState(savedGame);
    } else {
        setLanguage(localStorage.getItem('trivia_lang') || 'pl');
    }

    setupStateSubscriptions();

    setupEventListeners();

}
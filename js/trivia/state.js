/**
 * @file state.js
 * Manages the dynamic game state for the application.
 */

import { emit } from './store.js';

/**
 * The main game state object. It holds all dynamic data related to the current game session.
 * It is exported to be accessible by other modules.
 * @property {string} currentLanguage - The current UI language ('pl' or 'en').
 * @property {Array} promptHistory - A log of prompts sent to the API and their responses.
 * @property {object} api - The API adapter for communicating with the language model.
 */
export let gameState = {
    currentLanguage: 'pl',
    promptHistory: []
};

/**
 * Shallow-merge updates into gameState and emit a store event.
 * @param {object} patch
 * @param {string} [event='state:update']
 */
export function setState(patch, event = 'state:update') {
    Object.assign(gameState, patch);
    emit(event);
}

/**
 * Emits a store event without mutating state.
 * @param {string} event
 * @param {object} [payload]
 */
export function notifyState(event, payload = {}) {
    emit(event, payload);
}
/**
 * @file api-service.js
 * Central access point for the trivia API adapter.
 */

import { gameState } from '../state.js';

/**
 * Sets the active API adapter.
 * @param {object} adapter
 */
export function setApiAdapter(adapter) {
    gameState.api = adapter;
}

/**
 * Gets the active API adapter.
 * @returns {object|null}
 */
export function getApiAdapter() {
    return gameState.api || null;
}

/**
 * Checks whether the API adapter is configured.
 * @returns {boolean}
 */
export function isApiConfigured() {
    const api = getApiAdapter();
    return Boolean(api && typeof api.isConfigured === 'function' && api.isConfigured());
}

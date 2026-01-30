/**
 * @file ui-handlers.js
 * Central registry for UI callbacks provided by game logic.
 */

export const uiHandlers = {
    handleSquareClick: null,
    askQuestion: null,
    nextTurn: null,
    checkWinCondition: null,
    handleSuggestAlternatives: null
};

/**
 * Registers handler callbacks used by UI modules.
 * @param {object} handlers
 */
export function registerUIHandlers(handlers) {
    Object.assign(uiHandlers, handlers);
}

/**
 * @file store.js
 * Minimal pub/sub store for UI state updates.
 */

const listeners = new Set();

/**
 * Subscribe to state events.
 * @param {(event: string, payload?: object) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Emit a state event.
 * @param {string} event
 * @param {object} [payload]
 */
export function emit(event, payload = {}) {
    listeners.forEach(listener => listener(event, payload));
}

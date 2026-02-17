/**
 * @file error-bus.js
 * Centralized notification helpers for trivia UI.
 */

import { showNotification } from './ui-notifications.js';

/**
 * Show a notification.
 * @param {{title: string, body: string}} message
 * @param {'info'|'success'|'error'} [type='info']
 * @param {number} [duration=5000]
 */
export function notify(message, type = 'info', duration = 5000) {
    showNotification(message, type, duration);
}

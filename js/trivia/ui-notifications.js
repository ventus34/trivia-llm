/**
 * @file ui-notifications.js
 * Toast notification helpers for trivia UI.
 */

import { UI } from './dom.js';

/**
 * Displays a notification on the screen.
 * @param {object} message - An object with `title` and `body` fields.
 * @param {string} [type='info'] - The type of notification ('info', 'success', 'error').
 * @param {number} [duration=5000] - The display duration in milliseconds.
 */
export function showNotification(message, type = 'info', duration = 5000) {
    if (!UI.notificationContainer) {
        UI.notificationContainer = document.createElement('div');
        UI.notificationContainer.id = 'notification-container';
        UI.notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(UI.notificationContainer);
    }

    const notif = document.createElement('div');
    notif.className = `notification ${type} opacity-0 transform translate-x-full`;

    const iconContainer = document.createElement('div');
    iconContainer.className = 'flex-shrink-0';

    let iconSvg = '';
    if (type === 'error') iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    else if (type === 'success') iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    else iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

    iconContainer.innerHTML = iconSvg;

    const textContainer = document.createElement('div');
    textContainer.innerHTML = `<p class="text-sm font-medium text-gray-900">${message.title}</p><p class="text-sm text-gray-500">${message.body}</p>`;

    notif.appendChild(iconContainer);
    notif.appendChild(textContainer);

    UI.notificationContainer.appendChild(notif);

    setTimeout(() => {
        notif.classList.remove('opacity-0', 'translate-x-full');
        notif.classList.add('opacity-100', 'translate-x-0');
    }, 10);

    setTimeout(() => {
        notif.classList.remove('opacity-100', 'translate-x-0');
        notif.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => notif.remove(), 500);
    }, duration);
}

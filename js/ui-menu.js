/**
 * @file ui-menu.js
 * Side menu setup for trivia UI.
 */

import { UI } from './dom.js';
import { showHistoryModal } from './ui-history.js';

/**
 * Sets up the side menu panel for game options.
 */
export function setupGameMenu() {
    const openBtn = UI.openGameMenuBtn;
    const panel = UI.gameMenuPanel;
    const overlay = UI.gameMenuOverlay;

    function closeMenu() {
        panel.classList.remove('visible');
        overlay.classList.remove('visible');
    }

    function openMenu() {
        panel.classList.add('visible');
        overlay.classList.add('visible');
    }

    if (openBtn) openBtn.addEventListener('click', openMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    if (UI.showHistoryBtn) {
        UI.showHistoryBtn.addEventListener('click', () => {
            closeMenu();
            showHistoryModal();
        });
    }
}

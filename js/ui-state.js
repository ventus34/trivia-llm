/**
 * @file ui-state.js
 * Subscribes UI updates to store events.
 */

import { subscribe } from './store.js';
import { updateUI, renderCategoryLegend } from './ui-board.js';

/**
 * Wires UI updates to store events.
 */
export function setupStateSubscriptions() {
    return subscribe((event) => {
        if (event === 'state:update') {
            updateUI();
        }
        if (event === 'categories:update') {
            renderCategoryLegend();
        }
    });
}

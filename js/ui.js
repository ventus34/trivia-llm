/**
 * @file ui.js
 * Handles all UI rendering, updates, notifications, and modal management.
 */

import { gameState } from './state.js';
import { UI } from './dom.js';
import { showHistoryModal } from './ui-history.js';
import { registerUIHandlers } from './ui-handlers.js';
export {
    promptCategoryChoice,
    showVerificationPopup,
    showAnswerPopup,
    showMutationScreen,
    closePopupAndContinue,
    showModal,
    hideModal
} from './ui-modals.js';
export {
    autoResizeTextarea,
    populatePresetSelector,
    setLanguage,
    updateDescriptions,
    updateCategoryInputs,
    updatePlayerNameInputs
} from './ui-setup.js';

export { registerUIHandlers };

/**
 * Automatically adjusts the height of a textarea to fit its content.
        div.appendChild(nameInput);
        div.appendChild(emojiPickerDiv);
        UI.playerNamesContainer.appendChild(div);
    }
}

/**
 * Renders the game board squares and their connections as an SVG overlay.
 */

/**
 * Displays the modal for choosing a category (used when on the HUB square).
 */

/**
 * Renders the prompt history in its dedicated modal.
 */
/**
 * Updates the model selection in the game state.
 * @param {string} modelId - The ID of the selected model.
 * @param {string} type - The type of model ('question', 'explanation', or 'category').
 */
export function updateModelSelection(modelId, type) {
    if (type === 'question') {
        gameState.selectedQuestionModel = modelId;
    } else if (type === 'explanation') {
        gameState.selectedExplanationModel = modelId;
    } else if (type === 'category') {
        gameState.selectedCategoryModel = modelId;
    }
}

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

    if(openBtn) openBtn.addEventListener('click', openMenu);
    if(overlay) overlay.addEventListener('click', closeMenu);

    if(UI.showHistoryBtn) {
        UI.showHistoryBtn.addEventListener('click', () => {
            closeMenu();
            showHistoryModal();
        });
    }
}

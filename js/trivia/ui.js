/**
 * @file ui.js
 * Facade for trivia UI modules.
 */

import { gameState, setState } from './state.js';
import { registerUIHandlers } from './ui-handlers.js';
export { setupGameMenu } from './ui-menu.js';
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
 * Updates the model selection in the game state.
 * @param {string} modelId - The ID of the selected model.
 * @param {string} type - The type of model ('question', 'explanation', or 'category').
 */
export function updateModelSelection(modelId, type) {
    if (type === 'question') {
        setState({ selectedQuestionModel: modelId }, 'state:model');
    } else if (type === 'explanation') {
        setState({ selectedExplanationModel: modelId }, 'state:model');
    } else if (type === 'category') {
        setState({ selectedCategoryModel: modelId }, 'state:model');
    }
}


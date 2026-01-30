/**
 * @file ui-history.js
 * Handles prompt history modal rendering and visibility.
 */

import { UI } from './dom.js';
import { gameState } from './state.js';
import { translations } from './config.js';

/**
 * Renders the prompt history in its dedicated modal.
 */
export function renderPromptHistory() {
    UI.historyContent.innerHTML = '';
    const lang = gameState.currentLanguage;

    if (gameState.promptHistory.length === 0) {
        UI.historyContent.textContent = translations.history_empty[lang];
        return;
    }

    const fragment = document.createDocumentFragment();
    gameState.promptHistory.slice().reverse().forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'p-4 border rounded-lg bg-gray-50';

        const promptTitle = document.createElement('h4');
        promptTitle.className = 'font-semibold text-gray-800';
        promptTitle.textContent = `${translations.history_prompt_title[lang]} #${gameState.promptHistory.length - index}`;

        const promptPre = document.createElement('pre');
        promptPre.className = 'mt-2 p-3 bg-gray-200 text-sm text-gray-700 rounded-md overflow-x-auto whitespace-pre-wrap';
        const promptCode = document.createElement('code');
        promptCode.textContent = entry.prompt;
        promptPre.appendChild(promptCode);

        const responseTitle = document.createElement('h4');
        responseTitle.className = 'mt-4 font-semibold text-gray-800';
        responseTitle.textContent = translations.history_response_title[lang];

        const responsePre = document.createElement('pre');
        responsePre.className = 'mt-2 p-3 bg-blue-100 text-sm text-blue-800 rounded-md overflow-x-auto whitespace-pre-wrap';
        const responseCode = document.createElement('code');
        responseCode.textContent = entry.response;
        responsePre.appendChild(responseCode);

        entryDiv.append(promptTitle, promptPre, responseTitle, responsePre);
        fragment.appendChild(entryDiv);
    });

    UI.historyContent.appendChild(fragment);
}

/** Shows the prompt history modal. */
export function showHistoryModal() {
    UI.historyModalTitle.textContent = translations.history_modal_title[gameState.currentLanguage];
    renderPromptHistory();
    UI.historyModal.classList.add('visible');
}

/** Hides the prompt history modal. */
export function hideHistoryModal() {
    UI.historyModal.classList.remove('visible');
}

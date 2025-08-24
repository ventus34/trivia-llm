/**
 * @file ui.js
 * Handles all UI rendering, updates, notifications, and modal management.
 */

import { CONFIG, translations } from './config.js';
import { gameState } from './state.js';
import { UI } from './dom.js';
import {
    handleSuggestAlternatives,
    askQuestion,
    handleMcqAnswer,
    nextTurn,
    checkWinCondition,
    handleSquareClick
} from './game.js';
import { saveGameState } from './persistence.js';

/**
 * Automatically adjusts the height of a textarea to fit its content.
 * @param {HTMLTextAreaElement} textarea - The textarea element to resize.
 */
export function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto'; // Reset height to correctly calculate scrollHeight
    textarea.style.height = `${textarea.scrollHeight}px`; // Set height to content height
}

export function updateModelSelection(selectedValue) {
    if (UI.modelSelect.value !== selectedValue) {
        UI.modelSelect.value = selectedValue;
    }
    if (UI.gameMenuModelSelect.value !== selectedValue) {
        UI.gameMenuModelSelect.value = selectedValue;
    }
}

/**
 * Displays a notification on the screen.
 * @param {object} message - An object with `title` and `body` fields.
 * @param {string} [type='info'] - The type of notification ('info', 'success', 'error').
 * @param {number} [duration=5000] - The display duration in milliseconds.
 */
export function showNotification(message, type = 'info', duration = 5000) {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;

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
        notif.classList.add('show');
    }, 10);

    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 500);
    }, duration);
}

/**
 * Sets the UI language and updates all translatable text elements.
 * @param {string} lang - The language code ('pl' or 'en').
 */
export function setLanguage(lang) {
    gameState.currentLanguage = lang;
    document.documentElement.lang = lang;
    UI.langPlBtn.classList.toggle('active', lang === 'pl');
    UI.langEnBtn.classList.toggle('active', lang === 'en');

    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        if (translations[key] && translations[key][lang]) {
            const translation = translations[key][lang];
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.placeholder) el.placeholder = translation;
            } else if (el.title && !el.textContent.trim()) {
                el.title = translation;
            } else {
                el.innerHTML = translation;
            }
        }
    });

    if (UI.suggestionModalTitle) {
        UI.suggestionModalTitle.textContent = translations.suggestion_modal_title[lang];
    }
    updateCategoryInputs(translations.default_categories[lang].split(', '));
    updatePlayerNameInputs();
    updateDescriptions();
}

/**
 * Updates the descriptive text below the game mode and knowledge level selectors.
 */
export function updateDescriptions() {
    const lang = gameState.currentLanguage;
    UI.gameModeDescription.textContent = translations[`game_mode_desc_${UI.gameModeSelect.value}`][lang];
    UI.knowledgeLevelDescription.textContent = translations[`knowledge_desc_${UI.knowledgeLevelSelect.value}`][lang];
}


/**
 * Populates the category name input fields using auto-sizing textareas.
 * @param {string[]} cats - An array of category names.
 */
export function updateCategoryInputs(cats) {
    UI.categoriesContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative';

        const textarea = document.createElement('textarea');
        textarea.className = 'category-input mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm';
        textarea.value = cats[i] || '';
        textarea.style.borderLeft = `5px solid ${CONFIG.CATEGORY_COLORS[i]}`;
        textarea.rows = 1;
        textarea.addEventListener('input', () => autoResizeTextarea(textarea));

        const suggestBtn = document.createElement('button');
        suggestBtn.type = 'button';
        suggestBtn.className = 'category-suggestion-btn';
        suggestBtn.title = translations.suggestion_button_title[gameState.currentLanguage];
        suggestBtn.innerHTML = '✨';
        suggestBtn.addEventListener('click', () => handleSuggestAlternatives(textarea));

        wrapper.appendChild(textarea);
        wrapper.appendChild(suggestBtn);
        UI.categoriesContainer.appendChild(wrapper);

        autoResizeTextarea(textarea);
    }
}

/**
 * Generates the input fields for player names and emoji pickers based on the selected player count.
 */
export function updatePlayerNameInputs() {
    const count = parseInt(UI.playerCountInput.value);
    UI.playerNamesContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'player-entry flex gap-2 items-center';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'player-name-input flex-grow block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm';
        nameInput.placeholder = translations.player_name_placeholder[gameState.currentLanguage].replace('{i}', i + 1);

        const emojiPickerDiv = document.createElement('div');
        emojiPickerDiv.className = 'emoji-picker';
        const emojiButton = document.createElement('button');
        emojiButton.className = 'emoji-button';
        emojiButton.textContent = CONFIG.EMOJI_OPTIONS[i % CONFIG.EMOJI_OPTIONS.length];
        const emojiPanel = document.createElement('div');
        emojiPanel.className = 'emoji-panel';

        CONFIG.EMOJI_OPTIONS.forEach(emoji => {
            const option = document.createElement('span');
            option.className = 'emoji-option';
            option.textContent = emoji;
            option.onclick = () => {
                emojiButton.textContent = emoji;
                emojiPanel.classList.remove('active');
            };
            emojiPanel.appendChild(option);
        });

        emojiButton.onclick = (e) => {
            e.preventDefault();
            emojiPanel.classList.toggle('active');
        };

        emojiPickerDiv.appendChild(emojiButton);
        emojiPickerDiv.appendChild(emojiPanel);

        div.appendChild(nameInput);
        div.appendChild(emojiPickerDiv);
        UI.playerNamesContainer.appendChild(div);
    }
}

/**
 * Renders the game board squares and their connections as an SVG overlay.
 */
export function renderBoard() {
    UI.boardElement.innerHTML = '';
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute('class', 'board-connections');
    UI.boardWrapper.insertBefore(svg, UI.boardElement);

    const drawnConnections = new Set();

    gameState.board.forEach(square => {
        const squareEl = document.createElement('div');
        squareEl.className = 'board-square';
        squareEl.id = `square-${square.id}`;
        squareEl.style.left = `calc(${square.pos.x}% - 3%)`;
        squareEl.style.top = `calc(${square.pos.y}% - 3%)`;

        const categoryColor = square.categoryIndex !== null ? CONFIG.CATEGORY_COLORS[square.categoryIndex] : '#f3f4f6';
        squareEl.style.backgroundColor = categoryColor;

        if (square.type === CONFIG.SQUARE_TYPES.HQ) {
            squareEl.style.transform = 'scale(1.4)';
            squareEl.style.borderRadius = '50%';
        }
        if (square.type === CONFIG.SQUARE_TYPES.ROLL_AGAIN) {
            squareEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M16 8h.01"></path><path d="M12 12h.01"></path><path d="M8 16h.01"></path></svg>`;
        }
        if (square.type === CONFIG.SQUARE_TYPES.HUB) {
            squareEl.style.transform = 'scale(1.2)';
            squareEl.style.background = 'radial-gradient(circle, #fff, #d1d5db)';
        }

        squareEl.addEventListener('click', () => handleSquareClick(square.id));
        UI.boardElement.appendChild(squareEl);

        square.connections.forEach(connId => {
            const key1 = `${square.id}-${connId}`;
            const key2 = `${connId}-${square.id}`;
            if (!drawnConnections.has(key1) && !drawnConnections.has(key2)) {
                const neighbor = gameState.board.find(s => s.id === connId);
                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', `${square.pos.x}%`);
                line.setAttribute('y1', `${square.pos.y}%`);
                line.setAttribute('x2', `${neighbor.pos.x}%`);
                line.setAttribute('y2', `${neighbor.pos.y}%`);
                svg.appendChild(line);
                drawnConnections.add(key1);
            }
        });
    });
}

/**
 * Renders the legend showing category names and their corresponding colors.
 */
export function renderCategoryLegend() {
    UI.categoryLegend.innerHTML = '';
    gameState.categories.forEach((cat, i) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'flex items-center gap-2';
        legendItem.id = `legend-cat-${i}`;
        legendItem.innerHTML = `<div class="w-4 h-4 rounded-full" style="background-color: ${CONFIG.CATEGORY_COLORS[i]}"></div><span>${cat}</span>`;
        UI.categoryLegend.appendChild(legendItem);
    });
}

/**
 * Renders player tokens on their current board positions.
 */
export function renderPlayerTokens() {
    document.querySelectorAll('.player-token').forEach(token => token.remove());
    gameState.players.forEach((player, playerIndex) => {
        const square = gameState.board.find(s => s.id === player.position);
        if (!square) return;

        const tokenEl = document.createElement('div');
        tokenEl.className = 'player-token';
        tokenEl.id = `token-${playerIndex}`;
        tokenEl.style.left = `calc(${square.pos.x}% - 1.75%)`;
        tokenEl.style.top = `calc(${square.pos.y}% - 1.75%)`;
        tokenEl.textContent = player.emoji;
        UI.boardElement.appendChild(tokenEl);
    });
}

/**
 * Updates the entire game UI, including the current player display, scores, and tokens.
 */
export function updateUI() {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    UI.currentPlayerEmojiSpan.textContent = currentPlayer.emoji;
    UI.currentPlayerNameDiv.textContent = currentPlayer.name;
    UI.currentPlayerNameDiv.style.color = currentPlayer.color;
    UI.playerScoresContainer.innerHTML = '';

    gameState.players.forEach((player, playerIndex) => {
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'p-2 rounded-lg flex items-center justify-between';
        scoreDiv.style.border = `1px solid ${player.color}`;
        let wedgesHTML = '';
        gameState.categories.forEach((cat, i) => {
            const hasWedge = player.wedges.includes(i);
            wedgesHTML += `<span class="category-wedge" style="background-color: ${hasWedge ? CONFIG.CATEGORY_COLORS[i] : '#e5e7eb'};" title="${cat}"></span>`;
        });
        scoreDiv.innerHTML = `<p class="font-semibold" style="color: ${player.color};">${player.emoji} ${player.name}</p><div>${wedgesHTML}</div>`;
        UI.playerScoresContainer.appendChild(scoreDiv);
    });

    renderPlayerTokens();
}

/*
 * Creates a realistic, multi-step tumble animation for the dice.
 * @param {number} roll - The final dice roll result (1-6).
 */
export async function animateDiceRoll(roll) {
    const rotations = {
        1: 'rotateY(0deg) rotateX(0deg)', 2: 'rotateX(-90deg)', 3: 'rotateY(90deg)',
        4: 'rotateY(-90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)'
    };
    const finalTransform = rotations[roll];

    let currentX = 0;
    let currentY = 0;
    const spinX = (Math.random() > 0.5 ? 1 : -1) * (350 + Math.random() * 200);
    const spinY = (Math.random() > 0.5 ? 1 : -1) * (350 + Math.random() * 200);
    const tumbleCount = 2;
    const tumbleDelay = 100;

    UI.diceElement.style.transition = 'transform 0.1s linear';

    for (let i = 0; i < tumbleCount; i++) {
        currentX += spinX / (i * 1.5 + 1);
        currentY += spinY / (i * 1.5 + 1);
        const tumbleTransform = `rotateX(${currentX}deg) rotateY(${currentY}deg)`;
        UI.diceElement.style.transform = tumbleTransform;
        await new Promise(resolve => setTimeout(resolve, tumbleDelay));
    }

    UI.diceElement.style.transition = 'transform 0.8s cubic-bezier(0.2, 1, 0.2, 1)';
    UI.diceElement.style.transform = finalTransform;
    await new Promise(resolve => setTimeout(resolve, 800));
    UI.diceElement.style.transition = '';
}

/**
 * Animates the player's token moving along a specified path.
 * @param {number[]} path - An array of square IDs representing the movement path.
 */
export async function animatePawnMovement(path) {
    const playerIndex = gameState.currentPlayerIndex;
    const tokenEl = document.getElementById(`token-${playerIndex}`);

    for (const squareId of path) {
        const newSquare = gameState.board.find(s => s.id === squareId);
        tokenEl.style.left = `calc(${newSquare.pos.x}% - 1.75%)`;
        tokenEl.style.top = `calc(${newSquare.pos.y}% - 1.75%)`;
        await new Promise(resolve => setTimeout(resolve, CONFIG.ANIMATION_DELAY_MS));
    }
}

/**
 * Displays the modal for choosing a category (used when on the HUB square).
 */
export function promptCategoryChoice() {
    UI.categoryChoiceButtons.innerHTML = '';
    gameState.categories.forEach((cat, index) => {
        const button = document.createElement('button');
        button.textContent = cat;
        button.className = 'w-full p-3 text-white font-semibold rounded-lg transition-transform hover:scale-105';
        button.style.backgroundColor = CONFIG.CATEGORY_COLORS[index];
        button.onclick = () => {
            UI.categoryChoiceModal.classList.remove('visible');
            askQuestion(index);
        };
        UI.categoryChoiceButtons.appendChild(button);
    });
    UI.categoryChoiceModal.classList.add('visible');
}

/**
 * Displays the popup for answer verification.
 * @param {string} playerAnswer - The player's submitted answer.
 * @param {string} correctAnswer - The correct answer from the question data.
 */
export function showVerificationPopup(playerAnswer, correctAnswer) {
    UI.playerAnswerText.textContent = playerAnswer;
    UI.correctAnswerText.textContent = correctAnswer;
    gameState.currentPlayerAnswer = playerAnswer;

    UI.explanationContainer.classList.add('hidden');
    UI.incorrectExplanationContainer.classList.add('hidden');
    UI.verifyAnswerBtn.classList.add('hidden');
    UI.incorrectExplanationText.innerHTML = '';
    if (UI.llmEvaluationContainer) {
        UI.llmEvaluationContainer.classList.add('hidden');
        UI.llmEvaluationText.innerHTML = '';
    }

    UI.explanationText.innerHTML = '';
    UI.verificationButtons.classList.remove('hidden');
    UI.postVerificationButtons.classList.add('hidden');
    UI.answerPopupTitle.textContent = translations.answer_evaluation[gameState.currentLanguage];

    // Always show the pre-generated explanation
    UI.explanationContainer.classList.remove('hidden');
    UI.explanationText.innerHTML = (gameState.currentQuestionData.explanation || "").replace(/\n/g, '<br>');


    showAnswerPopup();
}

/**
 * Displays the answer verification popup with a transition.
 */
export function showAnswerPopup() {
    UI.answerPopup.classList.remove('hidden');
    setTimeout(() => {
        UI.answerPopup.classList.remove('opacity-0', 'scale-90');
    }, 10);
}

/**
 * A helper function to handle the UI transition to the mutation screen.
 */
export async function showMutationScreen() {
    UI.standardPopupContent.classList.add('hidden');
    UI.mutationContent.classList.remove('hidden');
    UI.mutationLoader.classList.remove('hidden');
    UI.mutationButtons.classList.add('hidden');
    UI.postVerificationButtons.classList.add('hidden');
    UI.mutationContent.querySelector('h3').textContent = translations.choose_mutation_title[gameState.currentLanguage];

    const player = gameState.players[gameState.currentPlayerIndex];
    const square = gameState.board.find(s => s.id === player.position);
    const categoryIndex = gameState.currentForcedCategoryIndex !== null ? gameState.currentForcedCategoryIndex : square.categoryIndex;

    try {
        const oldCategory = gameState.categories[categoryIndex];
        const otherCategories = gameState.categories.filter((c, i) => i !== categoryIndex);
        const choices = await gameState.api.getCategoryMutationChoices(oldCategory, otherCategories);

        UI.mutationLoader.classList.add('hidden');
        UI.mutationButtons.classList.remove('hidden');
        UI.mutationButtons.innerHTML = '';

        choices.forEach(choice => {
            const button = document.createElement('button');
            button.className = 'w-full p-4 text-white rounded-lg transition-transform hover:scale-105 text-left themed-button';
            button.style.backgroundColor = CONFIG.CATEGORY_COLORS[categoryIndex];
            button.innerHTML = `<span class="block font-bold text-lg">${choice.name || ""}</span><p class="text-sm font-normal opacity-90 mt-1">${choice.description || ""}</p>`;

            button.onclick = () => {
                const newCategoryName = choice.name;
                gameState.categories[categoryIndex] = newCategoryName;

                renderCategoryLegend();
                delete gameState.categoryTopicHistory[oldCategory];
                if (!gameState.categoryTopicHistory[newCategoryName]) {
                    gameState.categoryTopicHistory[newCategoryName] = { subcategories: [], entities: [] };
                }
                showNotification({ title: translations.category_mutated[gameState.currentLanguage], body: translations.new_category_msg[gameState.currentLanguage].replace('{old_cat}', oldCategory).replace('{new_cat}', newCategoryName) }, 'info');

                closePopupAndContinue();
            };
            UI.mutationButtons.appendChild(button);
        });
    } catch (error) {
        console.error("Category mutation failed:", error);
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: "Failed to mutate category." }, 'error');
        closePopupAndContinue();
    }
}


/**
 * Closes the answer verification popup and continues the game.
 */
export function closePopupAndContinue() {
    if (gameState.isMutationPending) {
        gameState.isMutationPending = false;
        showMutationScreen();
        return;
    }

    UI.answerPopup.classList.add('opacity-0', 'scale-90');
    setTimeout(() => {
        UI.answerPopup.classList.add('hidden');
        UI.standardPopupContent.classList.remove('hidden');
        UI.mutationContent.classList.add('hidden');
        UI.postVerificationButtons.classList.remove('hidden');
    }, 500);

    if (gameState.lastAnswerWasCorrect) {
        UI.diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
        UI.diceElement.disabled = false;
    } else {
        nextTurn();
    }
    updateUI();
    checkWinCondition();
    saveGameState();
}

/**
 * Shows or hides the main question modal.
 * @param {boolean} show - True to show, false to hide.
 */
export function showModal(show) {
    if (show) {
        UI.questionModal.classList.add('visible');
        setTimeout(() => UI.modalContent.classList.remove('scale-95', 'opacity-0'), 10);
    } else {
        UI.modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => UI.questionModal.classList.remove('visible'), 300);
    }
}

/**
 * A convenience function to hide the question modal with proper cleanup.
 */
export function hideModal() {
    showModal(false);
    setTimeout(() => { if (UI.modalContent) UI.modalContent.style.borderTopColor = 'transparent'; }, 300);
}

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

/**
 * Fetches the available models from the backend and populates the select elements.
 */
export async function populateModelSelectors() {
    try {
        const response = await fetch('/trivia/api/models/questions');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const models = await response.json();

        const selects = [UI.modelSelect, UI.gameMenuModelSelect];
        selects.forEach(select => {
            if (select) {
                select.innerHTML = ''; // Clear existing options
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    if (model.selected) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            }
        });

        // Trigger change event to update any dependent UI elements
        UI.modelSelect.dispatchEvent(new Event('change'));

    } catch (error) {
        console.error("Could not fetch or populate models:", error);
        // Fallback or error message
        showNotification({ title: "Error", body: "Could not load language models." }, 'error');
    }
}
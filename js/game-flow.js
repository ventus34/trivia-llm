/**
 * @file game-flow.js
 * Core game flow, state updates, and UI orchestration.
 */

import { CONFIG, translations } from './config.js';
import { gameState } from './state.js';
import { UI } from './dom.js';
import { createBoardLayout, findPossibleMoves } from './board.js';
import {
    promptCategoryChoice,
    hideModal,
    showVerificationPopup,
    showModal
} from './ui.js';
import {
    updateUI,
    renderBoard,
    renderCategoryLegend,
    animateDiceRoll,
    animatePawnMovement
} from './ui-board.js';
import { renderExplanation } from './explanations.js';
import { saveGameState } from './persistence.js';
import { showNotification } from './ui-notifications.js';

function generateGameId() {
    return 'game-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

/**
 * Initializes the game state based on setup screen settings and transitions to the game screen.
 */
export function initializeGame() {
    const playerCount = parseInt(UI.playerCountInput.value);
    const playerInputs = document.querySelectorAll('#player-names-container > .player-entry');
    const playerNames = Array.from(playerInputs).map(div => div.querySelector('.player-name-input').value || div.querySelector('.player-name-input').placeholder);
    const playerEmojis = Array.from(playerInputs).map(div => div.querySelector('.emoji-button').textContent);
    const categories = Array.from(document.querySelectorAll('#categories-container .category-input')).map(input => input.value.trim());

    if (categories.some(c => c === '')) {
        showNotification({ title: "Setup Error", body: translations.min_categories_alert[gameState.currentLanguage] }, 'error');
        return;
    }

    Object.assign(gameState, {
        gameId: generateGameId(),
        players: [],
        categories: categories,
        board: [],
        theme: UI.themeInput.value.trim(),
        includeCategoryTheme: UI.includeThemeToggle.checked,
        mutateCategories: UI.mutateCategoriesToggle.checked,
        currentPlayerIndex: 0,
        isAwaitingMove: false,
        lastAnswerWasCorrect: false,
        isMutationPending: false,
        gameMode: UI.gameModeSelect.value,
        knowledgeLevel: UI.knowledgeLevelSelect.value,
        currentQuestionData: null,
        categoryTopicHistory: JSON.parse(localStorage.getItem('globalQuizHistory')) || {},
        possiblePaths: {},
        selectedQuestionModel: 'trivia',
        selectedExplanationModel: 'trivia',
        selectedCategoryModel: 'trivia',
    });

    gameState.categories.forEach(cat => {
        if (!gameState.categoryTopicHistory[cat]) {
            gameState.categoryTopicHistory[cat] = { subcategories: [], entities: [] };
        }
    });

    for (let i = 0; i < playerCount; i++) {
        gameState.players.push({
            name: playerNames[i],
            emoji: playerEmojis[i],
            position: 0,
            color: CONFIG.PLAYER_COLORS[i],
            wedges: []
        });
    }

    createBoardLayout();
    renderBoard();
    renderCategoryLegend();
    updateUI();
    UI.diceResultDiv.classList.add('hint-pulsate');
    UI.setupScreen.classList.add('hidden');
    UI.gameScreen.classList.remove('hidden');
}

/**
 * Fetches a question from the API and displays it in the question modal.
 * @param {number|null} [forcedCategoryIndex=null] - The index of a category to use.
 */
export async function askQuestion(forcedCategoryIndex = null) {
    gameState.currentForcedCategoryIndex = forcedCategoryIndex;
    const player = gameState.players[gameState.currentPlayerIndex];
    const square = gameState.board.find(s => s.id === player.position);
    const categoryIndex = forcedCategoryIndex !== null ? forcedCategoryIndex : square.categoryIndex;

    if (categoryIndex === null || categoryIndex === undefined) {
        console.error("Invalid category index on the current square:", square);
        nextTurn();
        return;
    }

    const category = gameState.categories[categoryIndex];
    const categoryColor = CONFIG.CATEGORY_COLORS[categoryIndex];

    UI.questionCategoryH3.textContent = translations.category_title[gameState.currentLanguage].replace('{category}', category);
    UI.questionCategoryH3.style.color = categoryColor;
    UI.modalContent.style.borderTopColor = categoryColor;

    showModal(true);
    UI.llmLoader.classList.remove('hidden');
    UI.questionContent.classList.add('hidden');
    UI.mcqOptionsContainer.innerHTML = '';

    try {
        const data = await gameState.api.generateQuestion(category);
        gameState.currentQuestionData = data;
        UI.questionTextP.textContent = data.question;

        if (gameState.gameMode === 'mcq') {
            UI.answerSection.classList.add('hidden');
            UI.mcqOptionsContainer.classList.remove('hidden');
            data.options.forEach(option => {
                const button = document.createElement('button');
                button.className = "w-full p-3 text-center bg-gray-100 hover:bg-indigo-100 rounded-lg transition-colors flex justify-center items-center";
                button.innerHTML = `<span>${option}</span>`;
                button.onclick = () => handleMcqAnswer(option);
                UI.mcqOptionsContainer.appendChild(button);
            });
        } else {
            UI.answerSection.classList.remove('hidden');
            UI.mcqOptionsContainer.classList.add('hidden');
            UI.answerInput.focus();
        }
        UI.questionContent.classList.remove('hidden');
        UI.llmLoader.classList.add('hidden');

        if (gameState.api.preloadQuestions) {
            console.log("Triggering question preload while player is thinking...");
            gameState.api.preloadQuestions();
        }

    } catch (error) {
        console.error('Question generation error:', error);
        const errorMessage = error.message || translations.question_generation_error[gameState.currentLanguage];
        showNotification({ title: translations.api_error[gameState.currentLanguage], body: errorMessage }, 'error');

        UI.llmLoader.classList.add('hidden');
        UI.questionTextP.textContent = translations.question_generation_error[gameState.currentLanguage];
        UI.questionContent.classList.remove('hidden');
        setTimeout(() => {
            hideModal();
            UI.diceElement.disabled = false;
            UI.gameMessageDiv.textContent = 'Error, roll again.';
        }, 10000);
    }
}

/**
 * Handles the dice roll action, calculates possible moves, and highlights them.
 */
export async function rollDice() {
    UI.diceResultDiv.classList.remove('hint-pulsate');
    if (UI.diceElement.disabled || gameState.isAwaitingMove) return;

    UI.diceElement.disabled = true;
    UI.gameMessageDiv.textContent = '';
    const roll = Math.floor(Math.random() * 6) + 1;

    await animateDiceRoll(roll);

    UI.diceResultDiv.querySelector('span').textContent = translations.dice_roll_result[gameState.currentLanguage].replace('{roll}', roll);

    const player = gameState.players[gameState.currentPlayerIndex];
    const possiblePaths = findPossibleMoves(player.position, roll);
    gameState.possiblePaths = possiblePaths;

    const destinationIds = Object.keys(possiblePaths);

    if (destinationIds.length > 0) {
        gameState.isAwaitingMove = true;
        UI.gameMessageDiv.textContent = translations.choose_move[gameState.currentLanguage];
        destinationIds.forEach(id => document.getElementById(`square-${id}`).classList.add('highlighted-move'));
    } else {
        nextTurn();
    }
}

/**
 * Handles a player's click on a board square to move their token.
 * @param {number} squareId - The ID of the clicked square.
 */
export async function handleSquareClick(squareId) {
    if (!gameState.isAwaitingMove) return;

    const path = gameState.possiblePaths[squareId];
    if (!path) return;

    document.querySelectorAll('.highlighted-move').forEach(el => el.classList.remove('highlighted-move'));
    gameState.isAwaitingMove = false;
    UI.gameMessageDiv.textContent = '';

    await animatePawnMovement(path.slice(1));

    const player = gameState.players[gameState.currentPlayerIndex];
    player.position = squareId;

    const landedSquare = gameState.board.find(s => s.id === squareId);
    if (landedSquare.type === CONFIG.SQUARE_TYPES.ROLL_AGAIN) {
        UI.diceResultDiv.querySelector('span').textContent = translations.roll_again[gameState.currentLanguage];
        UI.diceElement.disabled = false;
    } else if (landedSquare.type === CONFIG.SQUARE_TYPES.HUB) {
        promptCategoryChoice();
    } else {
        askQuestion();
    }
}

/**
 * Proceeds to the next player's turn.
 */
export function nextTurn() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    updateUI();

    UI.diceResultDiv.querySelector('span').textContent = translations.roll_to_start[gameState.currentLanguage];
    UI.diceElement.disabled = false;
    saveGameState();
    UI.diceResultDiv.classList.add('hint-pulsate');
}

/**
 * Checks if a player has met the win condition (collected all 6 wedges).
 */
export function checkWinCondition() {
    const winner = gameState.players.find(p => new Set(p.wedges).size === gameState.categories.length);
    if (winner) {
        UI.gameScreen.classList.add('hidden');
        UI.winnerScreen.classList.remove('hidden');
        UI.winnerNameSpan.textContent = winner.name;
    }
}

/**
 * Handles an answer submission in Multiple Choice Question (MCQ) mode.
 * @param {string} selectedOption - The text of the selected answer option.
 */
export function handleMcqAnswer(selectedOption) {
    hideModal();
    setTimeout(() => showVerificationPopup(selectedOption, gameState.currentQuestionData.answer), 300);
}

/**
 * Handles an answer submission in open-ended answer mode.
 */
export function handleOpenAnswer() {
    const userAnswer = UI.answerInput.value.trim();
    if (!userAnswer) {
        showNotification({ title: "Input Error", body: translations.empty_answer_error[gameState.currentLanguage] }, 'error');
        return;
    }
    hideModal();
    setTimeout(() => showVerificationPopup(userAnswer, gameState.currentQuestionData.answer), 300);
}

/**
 * Processes the result of a manual answer verification (correct/incorrect).
 * @param {boolean} isCorrect - Whether the player's answer was deemed correct.
 */
export async function handleManualVerification(isCorrect) {
    gameState.lastAnswerWasCorrect = isCorrect;

    const player = gameState.players[gameState.currentPlayerIndex];
    const square = gameState.board.find(s => s.id === player.position);
    const categoryIndex = gameState.currentForcedCategoryIndex !== null ? gameState.currentForcedCategoryIndex : square.categoryIndex;
    const isHqSquare = square.type === CONFIG.SQUARE_TYPES.HQ;

    if (isCorrect && isHqSquare && !player.wedges.includes(categoryIndex)) {
        player.wedges.push(categoryIndex);
    }

    if (categoryIndex !== null && gameState.currentQuestionData.subcategory) {
        const oldCategory = gameState.categories[categoryIndex];
        if (!gameState.categoryTopicHistory[oldCategory] || Array.isArray(gameState.categoryTopicHistory[oldCategory])) {
            gameState.categoryTopicHistory[oldCategory] = { subcategories: [], entities: [] };
        }

        const history = gameState.categoryTopicHistory[oldCategory];
        const newSubcategory = gameState.currentQuestionData.subcategory;
        if (!history.subcategories.includes(newSubcategory)) {
            history.subcategories.push(newSubcategory);
        }
        if (Array.isArray(gameState.currentQuestionData.key_entities)) {
            gameState.currentQuestionData.key_entities.forEach(entity => {
                if (!history.entities.includes(entity)) {
                    history.entities.push(entity);
                }
            });
        }

        if (history.subcategories.length > CONFIG.MAX_SUBCATEGORY_HISTORY_ITEMS) {
            history.subcategories = history.subcategories.slice(-CONFIG.MAX_SUBCATEGORY_HISTORY_ITEMS);
        }
        if (history.entities.length > CONFIG.MAX_ENTITY_HISTORY_ITEMS) {
            history.entities = history.entities.slice(-CONFIG.MAX_ENTITY_HISTORY_ITEMS);
        }

        localStorage.setItem('globalQuizHistory', JSON.stringify(gameState.categoryTopicHistory));
    }

    gameState.isMutationPending = isCorrect && isHqSquare && gameState.mutateCategories;

    UI.verificationButtons.classList.add('hidden');
    UI.postVerificationButtons.classList.remove('hidden');

    renderExplanation({
        questionData: gameState.currentQuestionData,
        lang: gameState.currentLanguage,
        containerEl: UI.explanationContainer,
        textEl: UI.explanationText,
        isCorrect
    });
}

/**
 * @file ui-board.js
 * Board rendering and board-related UI updates.
 */

import { CONFIG } from './config.js';
import { gameState } from './state.js';
import { UI } from './dom.js';
import { uiHandlers } from './ui-handlers.js';

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

        squareEl.addEventListener('click', () => {
            if (typeof uiHandlers.handleSquareClick === 'function') {
                uiHandlers.handleSquareClick(square.id);
            }
        });
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
    if (!gameState.players || gameState.players.length === 0) {
        return;
    }

    renderCategoryLegend();

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) {
        return;
    }
    UI.currentPlayerEmojiSpan.textContent = currentPlayer.emoji;
    UI.currentPlayerNameDiv.textContent = currentPlayer.name;
    UI.currentPlayerNameDiv.style.color = currentPlayer.color;
    UI.playerScoresContainer.innerHTML = '';

    gameState.players.forEach((player) => {
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

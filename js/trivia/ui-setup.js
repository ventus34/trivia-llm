/**
 * @file ui-setup.js
 * Setup screen helpers (language, categories, players, presets).
 */

import { CONFIG, translations, CATEGORY_PRESETS } from './config.js';
import { gameState, setState } from './state.js';
import { UI } from './dom.js';
import { uiHandlers } from './ui-handlers.js';

/**
 * Automatically adjusts the height of a textarea to fit its content.
 * Uses modern CSS field-sizing: content with JS fallback.
 * @param {HTMLTextAreaElement} textarea - The textarea element to resize.
 */
export function autoResizeTextarea(textarea) {
    if ('fieldSizingMode' in textarea.style) {
        textarea.style.fieldSizing = 'content';
        textarea.style.height = 'auto';
    } else {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
}

/**
 * Populates the category preset selector dropdown and adds an event listener.
 */
export function populatePresetSelector() {
    const lang = gameState.currentLanguage;
    const select = UI.categoryPresetSelect;
    if (!select) return;

    select.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.textContent = translations.category_preset_placeholder[lang];
    defaultOption.value = '';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);

    CATEGORY_PRESETS.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = preset.name[lang] || preset.name.en;
        select.appendChild(option);
    });
}

/**
 * Sets the UI language and updates all translatable text elements.
 * @param {string} lang - The language code ('pl' or 'en').
 */
export function setLanguage(lang) {
    setState({ currentLanguage: lang }, 'language:update');
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
    populatePresetSelector();
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
        suggestBtn.addEventListener('click', () => {
            if (typeof uiHandlers.handleSuggestAlternatives === 'function') {
                uiHandlers.handleSuggestAlternatives(textarea);
            }
        });

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

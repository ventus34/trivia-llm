/**
 * @file explanations.js
 * Shared helpers for rendering question explanations.
 */

/**
 * Builds a localized explanation string for correct/incorrect answers.
 * @param {object} questionData
 * @param {string} lang - 'pl' | 'en'
 * @returns {string}
 */
export function buildExplanationContent(questionData, lang) {
    const explanationParts = [];

    const correctLabelPl = 'Wyjaśnienie poprawnej odpowiedzi:';
    const correctLabelEn = 'Explanation of correct answer:';
    const correctLabel = lang === 'pl' ? correctLabelPl : correctLabelEn;

    if (questionData?.explanation_correct) {
        explanationParts.push(`${correctLabel}\n${questionData.explanation_correct}`);
    } else if (questionData?.explanation) {
        explanationParts.push(`${correctLabel}\n${questionData.explanation}`);
    }

    const incorrectExplanation = questionData?.explanation_distractors || questionData?.explanation_incorrect;
    if (incorrectExplanation) {
        const incorrectLabelPl = 'Wyjaśnienie odpowiedzi niepoprawnych:';
        const incorrectLabelEn = 'Explanation of incorrect answers:';
        const incorrectLabel = lang === 'pl' ? incorrectLabelPl : incorrectLabelEn;
        explanationParts.push(`${incorrectLabel}\n${incorrectExplanation}`);
    }

    if (explanationParts.length > 0) {
        return explanationParts.join('\n\n');
    }

    return lang === 'pl' ? 'Brak dostępnych wyjaśnień.' : 'No explanations available.';
}

/**
 * Renders explanation content and styles into provided elements.
 * @param {object} options
 * @param {object} options.questionData
 * @param {string} options.lang
 * @param {HTMLElement} options.containerEl
 * @param {HTMLElement} options.textEl
 * @param {boolean} options.isCorrect
 */
export function renderExplanation({ questionData, lang, containerEl, textEl, isCorrect }) {
    const explanationContent = buildExplanationContent(questionData, lang);

    containerEl.classList.remove('hidden');
    textEl.innerHTML = explanationContent.replace(/\n/g, '<br>');

    if (isCorrect) {
        textEl.classList.remove('bg-yellow-100', 'bg-red-100');
        textEl.classList.add('bg-green-100');
    } else {
        textEl.classList.remove('bg-yellow-100', 'bg-green-100');
        textEl.classList.add('bg-red-100');
    }
}

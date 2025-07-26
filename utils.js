/**
 * @file utils.js
 * This file contains shared utility functions used across different modules,
 * primarily for API interaction and data manipulation.
 */

import { gameState } from './game_core.js';

/**
 * Custom error class to represent API rate limit issues.
 */
export class RateLimitError extends Error {
    constructor(message) {
        super(message);
        this.name = "RateLimitError";
    }
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array<any>} array The array to shuffle.
 */
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * A generic, backend-agnostic function to call a chat/text generation API.
 * It includes logic for retries and robust JSON parsing from the response.
 * @param {string} prompt The complete prompt to send to the model.
 * @param {boolean} expectJson Whether the response should be parsed as JSON.
 * @param {string} url The target API endpoint URL.
 * @param {object} headers The HTTP headers for the request.
 * @param {function(string): object} getPayload A function that takes the prompt and returns the request body payload.
 * @returns {Promise<any>} The API response, parsed as JSON if requested, otherwise as text.
 */
export async function callApi(prompt, expectJson = true, url, headers, getPayload) {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const payload = getPayload(prompt);
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                // Special handling for "Too Many Requests"
                if (response.status === 429) {
                    console.warn("API Rate Limit Exceeded.");
                    throw new RateLimitError("API rate limit reached.");
                }
                const errorBody = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            // Extract the main content from the response, supporting both Gemini and OpenAI-compatible structures.
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || data.choices?.[0]?.message?.content || '';

            if (!content) {
                throw new Error("Invalid or empty response from API.");
            }

            // Log the full response (including any Chain-of-Thought text) to the history.
            gameState.promptHistory.push({ prompt, response: content });

            if (expectJson) {
                // A reliable method to extract a JSON object from a string, which might be wrapped in markdown.
                const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*})/;
                const match = content.match(jsonRegex);

                if (!match) {
                    throw new Error("No JSON object found in the response string.");
                }

                // Prioritize the content inside the markdown block, otherwise take the first JSON-like object.
                const jsonString = match[1] || match[2];
                return JSON.parse(jsonString);
            }

            return content; // Return raw text if JSON is not expected.
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) throw error;
        }
    }
}
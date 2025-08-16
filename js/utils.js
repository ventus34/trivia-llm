/**
 * @file utils.js
 * This file contains shared utility functions.
 */

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * A generic function to call the application's own backend API, with a built-in retry mechanism.
 * @param {string} endpoint The backend API endpoint (e.g., '/api/generate-question').
 * @param {object} payload The request body payload to send to the backend.
 * @returns {Promise<any>} The JSON response from the backend.
 */
export async function callApi(endpoint, payload) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 3000;
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                // If the response is successful, parse and return it immediately.
                return await response.json();
            }

            // Handle non-ok HTTP statuses (e.g., 500, 429) which are not caught as network errors.
            const errorText = await response.text();
            let errorBody;
            try {
                errorBody = JSON.parse(errorText);
            } catch (e) {
                errorBody = { detail: errorText || `Request failed with status ${response.status}` };
            }
            lastError = new ApiError(errorBody.detail || `Request failed with status ${response.status}`, response.status);

        } catch (error) {
            // Handle network errors (e.g., DNS, connection refused).
            lastError = error;
        }

        // If the attempt failed, wait before the next one, unless it's the last attempt.
        if (attempt < MAX_RETRIES) {
            console.warn(`API call to ${endpoint} failed. Attempt ${attempt}/${MAX_RETRIES}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }

    // If all retries have failed, log the final error and throw it.
    console.error(`Failed to call backend endpoint ${endpoint} after ${MAX_RETRIES} attempts:`, lastError);
    throw lastError;
}
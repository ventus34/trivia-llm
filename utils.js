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
 * A generic function to call the application's own backend API.
 * @param {string} endpoint The backend API endpoint (e.g., '/api/generate-question').
 * @param {object} payload The request body payload to send to the backend.
 * @returns {Promise<any>} The JSON response from the backend.
 */
export async function callApi(endpoint, payload) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => response.text());
            console.error(`Backend API Error: ${response.status}`, errorBody);
            throw new ApiError(errorBody.detail || `Request failed with status ${response.status}`, response.status);
        }

        return await response.json();

    } catch (error) {
        console.error(`Failed to call backend endpoint ${endpoint}:`, error);
        throw error;
    }
}
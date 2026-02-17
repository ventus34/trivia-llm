# Project Overview

Trivia LLM is a browser-based trivia game system that generates categories, questions, and explanations with an OpenAI-compatible LLM. It ships two play modes:

1. **Classic board mode**: a single-screen, turn-based trivia board game rendered in the browser.
2. **Live quiz mode**: a host-driven, real-time quiz with players joining via room code and receiving updates over Server‑Sent Events (SSE).

The backend is a FastAPI service that:
- Serves static frontend assets and templates.
- Calls the LLM for categories, questions, and explanations.
- Caches and persists generated content in SQLite.
- Manages live-quiz state, scoring, and SSE broadcasting.

## Key Features
- LLM-generated content (categories, questions, explanations).
- Multiple languages supported by the model list (PL and EN are primary).
- Preloading and blueprint-based generation for faster gameplay and better variety.
- Live quiz rooms with host controls, timers, and scoring.
- SQLite persistence for generated questions, prompt history, and error logs.

## Primary UI Pages
- Trivia board: [templates/trivia.html](templates/trivia.html)
- Live quiz host: [templates/live-quiz-host.html](templates/live-quiz-host.html)
- Live quiz player: [templates/live-quiz-player.html](templates/live-quiz-player.html)
- Database browser: [templates/db.html](templates/db.html)

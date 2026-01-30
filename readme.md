# Trivia LLM

LLM-powered trivia game with two modes:
- **Classic board**: single-screen, turn-based trivia board.
- **Live quiz**: host + players in real time via SSE.

The backend is a FastAPI service that serves the frontend, calls an OpenAI-compatible LLM, and persists data in SQLite.

## Documentation
Start here: [docs/README.md](docs/README.md)

## Features
- LLM-generated categories, questions, and explanations
- Difficulty and game mode selection (MCQ or short answer)
- Preloading and blueprint-based question generation
- Live quiz rooms with host controls, timers, and scoring
- SQLite persistence and admin DB browser

## Quick Start (Docker)
1. Create [.env](.env) from [.env_template](.env_template)
2. Run: docker-compose up --build
3. Open http://localhost:8000

## Local Development
1. Create [.env](.env) from [.env_template](.env_template)
2. Install dependencies from [requirements.txt](requirements.txt)
3. Run: uvicorn server:app --reload

## UI Routes
- / → Trivia board
- /live-quiz/host → Live quiz host
- /live-quiz/player → Live quiz player
- /db → Database browser

## Configuration
- Models: [models.json](models.json)
- Prompts: [prompts.json](prompts.json)
- Env and limits: [docs/configuration.md](docs/configuration.md)
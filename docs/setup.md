# Setup

## Prerequisites
- Docker (recommended for quick start)
- Python 3.12+ for local development
- Node.js 18+ for linting/tests (frontend tooling)

## Environment Configuration
Copy the template and fill in the API credentials:
- [.env_template](.env_template) → create [.env](.env)

Required variables:
- OPENAI_API_KEY
- OPENAI_API_BASE

Optional:
- DEBUG (true/false)

More options are documented in [docs/configuration.md](docs/configuration.md).

## Docker (Recommended)
1. Create [.env](.env) from [.env_template](.env_template).
2. Build and run:

- docker-compose up --build

The app will be available at http://localhost:8000

## Local Development (Python)
1. Create and activate a virtual environment.
2. Install dependencies from [requirements.txt](requirements.txt).
3. Run the server:

- uvicorn backend.server:app --reload

## Frontend Tooling
The frontend is served by FastAPI. Use Node tooling only for linting/formatting/tests:

- npm install
- npm run lint
- npm run format
- npm test

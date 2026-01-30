# Configuration

## Environment Variables
These are read in [config.py](config.py).

Required:
- OPENAI_API_KEY
- OPENAI_API_BASE

Optional:
- DEBUG (default: false)
- GENERATIVE_RATE_LIMIT_COUNT (default: 20)
- GENERATIVE_RATE_LIMIT_PERIOD (default: 60)
- GENERATIVE_INFLIGHT_LIMIT (default: 3)
- MAX_CONCURRENT_PRELOAD_TASKS (default: 3)
- MAX_PRELOAD_CATEGORIES (default: 20)
- MIN_PRELOAD_INTERVAL_SECONDS (default: 10)
- GEN_CALL_MAX_ATTEMPTS (default: 2)

## Model Configuration
- [models.json](models.json) defines available model IDs and labels for the UI.
- At runtime, the server may overwrite this list with dynamic models from the LLM provider.
- The server routes all generation through the "trivia" router model internally.

## Prompt Templates
- [prompts.json](prompts.json) contains the system and task prompts used for:
  - Category generation
  - Question generation
  - Blueprint generation
  - Category mutation
  - Incorrect answer explanations

## Validation Rules
Theme strings are validated in [models.py](models.py):
- Max 8 words
- Only letters, digits, spaces, and - . , < >

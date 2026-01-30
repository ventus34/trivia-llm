# Troubleshooting

## Startup Error: OPENAI_API_KEY and OPENAI_API_BASE must be set
Create [.env](.env) from [.env_template](.env_template) and set valid values.

## 400: Model not supported
The server validates model IDs. Ensure the UI sends one of the models from:
- [models.json](models.json)

## Slow or Failed Generation
- Check rate-limit settings in [docs/configuration.md](docs/configuration.md).
- Verify that the LLM provider is reachable at OPENAI_API_BASE.

## Live Quiz Rooms Expire
Rooms are cleaned up after 24 hours of inactivity. This is controlled in:
- [live_quiz_routes.py](live_quiz_routes.py)

## Database Not Persisting (Docker)
By default, the SQLite file is [questions.db](questions.db) in the app working directory. If you need persistence across container restarts, ensure the file path is mounted to a Docker volume.

# Live Quiz Mode

Live quiz is a host-controlled, real‑time mode using Server‑Sent Events (SSE). The host starts a room, players join with a room code, and the server broadcasts events (questions, timers, results).

## Endpoints
See [docs/api.md](docs/api.md) for full endpoint details.

## Typical Flow
1. Host calls POST /api/live-quiz/create-room with 6 categories.
2. Players join with POST /api/live-quiz/join-room using the room code.
3. Host connects to SSE at GET /api/live-quiz/events?game_id=...&player_id=...&type=host.
4. Players connect to SSE at GET /api/live-quiz/events?game_id=...&player_id=...&type=player.
5. Host starts the game via POST /api/live-quiz/host-control with action start_game.
6. For each question:
   - Server broadcasts question_started.
   - Players submit answers with /api/live-quiz/submit-answer.
   - Server broadcasts question_results.
7. Host advances via action next_question until game_finished.

## Scoring Rules
- Correct answer: +100
- Incorrect answer: -35
- Skipped answer: 0

## Event Types
Events are JSON payloads emitted over SSE. Common types include:
- game_started
- player_joined
- player_reconnected
- question_started
- timer_update
- answer_submitted
- question_results
- game_finished
- timer_paused
- timer_resumed
- question_regenerated

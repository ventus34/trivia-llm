# API Reference

Base URL: http://localhost:8000

All JSON endpoints accept and return application/json unless noted.

## Classic Trivia Endpoints

### GET /api/db/stats
Returns model performance statistics from SQLite.

### GET /api/db/prompts
Returns recent prompt history (max 50 rows).

### GET /api/db/errors
Returns error log entries.

### GET /api/models/questions
Returns available question models.

### GET /api/models/explanations
Returns available explanation models.

### GET /api/models/categories
Returns available category models.

### POST /api/preload-questions
Preloads a single category question in the background and caches it.

Request body:
- model (string)
- gameId (string)
- category (string)
- gameMode (string: mcq | short_answer)
- knowledgeLevel (string: basic | intermediate | expert)
- language (string: pl | en)
- theme (string, optional)
- includeCategoryTheme (boolean)

Response:
- 202 Accepted when preloading starts

### POST /api/generate-question
Generates a question for one category.

Request body:
- model (string)
- gameId (string)
- category (string)
- gameMode (string: mcq | short_answer)
- knowledgeLevel (string: basic | intermediate | expert)
- language (string: pl | en)
- theme (string, optional)
- includeCategoryTheme (boolean)

Response (success):
- question (string)
- options (string[])
- answer (string)
- explanation (string)
- subcategory (string, optional)
- key_entities (string[])

### POST /api/generate-categories
Generates a list of categories for a theme.

Request body:
- model (string)
- theme (string)
- language (string: pl | en)
- gameId (string, optional)

Response:
- categories (string[])

### POST /api/mutate-category
Generates alternative category names.

Request body:
- language (string: pl | en)
- old_category (string)
- theme (string, optional)
- existing_categories (string[])
- gameId (string, optional)

Response:
- choices (array of { name, description })

### POST /api/explain-incorrect
Evaluates a player answer and returns a neutral explanation.

Request body:
- model (string)
- gameId (string)
- language (string: pl | en)
- question (string)
- correct_answer (string)
- player_answer (string)

Response:
- verdict_for (string: player | game)
- verdict_certainty (number 0-100)
- explanation (string)

## Live Quiz Endpoints

### POST /api/live-quiz/create-room
Creates a new live quiz session.

Request body:
- categories (string[6])
- game_mode (string: mcq | short_answer)
- knowledge_level (string: basic | intermediate | expert)
- language (string: pl | en)
- theme (string, optional)
- include_category_theme (boolean)
- selected_question_model (string)
- selected_explanation_model (string)
- selected_category_model (string)
- questions_per_category (number)

Response:
- game_id
- room_code
- host_id

### POST /api/live-quiz/join-room
Joins a room by code.

Request body:
- room_code
- player_name

Response:
- game_id
- player_id
- room_code
- host_id
- categories
- game_status

### GET /api/live-quiz/room-status/{game_id}
Returns room summary status.

### POST /api/live-quiz/submit-answer
Submits an answer for the current question.

Request body:
- game_id
- player_id
- answer (string, optional)
- skipped (boolean)

### POST /api/live-quiz/host-control
Host controls (start, next, pause, resume, regenerate).

Request body:
- game_id
- action (start_game | next_question | pause_timer | resume_timer | regenerate_question)
- data (object, optional)

### GET /api/live-quiz/events
SSE stream.

Query params:
- game_id
- player_id
- type (player | host)

## UI Routes
- GET / → trivia board UI
- GET /live-quiz/host → host UI
- GET /live-quiz/player → player UI
- GET /db → database browser

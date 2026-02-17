# Database

The application uses a SQLite database file stored as [questions.db](questions.db). The schema is defined in [backend/database.py](../backend/database.py).

## Tables

### generated_questions
Stores all generated questions permanently.

Columns:
- id
- model
- language
- category
- knowledge_level
- game_mode
- theme
- question_text
- answer_text
- explanation
- subcategory
- key_entities_json
- options_json
- created_at

### preloaded_questions_cache
Short-term cache for preloaded questions.

Columns:
- id
- category
- question_data_json
- created_at

### model_stats
Aggregated model performance metrics.

Columns:
- model_name
- generated_questions
- errors
- total_response_time

### error_logs
Errors captured by the backend.

Columns:
- id
- timestamp
- endpoint
- error_details_json

### prompt_history
Stores recent prompts and raw model responses (max 50 rows).

Columns:
- id
- timestamp
- model
- prompt
- raw_response

### question_blueprints
Blueprints used for structured question generation.

Columns:
- id
- category
- subcategory
- modifier
- target_answer
- is_used
- created_at

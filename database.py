import aiosqlite
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

DATABASE_FILE = "/app/data/questions.db"

def get_db_connection():
    """Returns an asynchronous database connection object (not yet connected)."""
    conn = aiosqlite.connect(DATABASE_FILE, timeout=10)
    return conn

async def init_db():
    """Initializes all necessary tables in the database if they don't exist."""
    async with get_db_connection() as conn:
        conn.row_factory = aiosqlite.Row
        # Table for permanently storing all generated questions
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS generated_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT, model TEXT NOT NULL, language TEXT NOT NULL,
                category TEXT NOT NULL, knowledge_level TEXT NOT NULL, game_mode TEXT NOT NULL,
                theme TEXT, question_text TEXT NOT NULL UNIQUE, answer_text TEXT NOT NULL,
                explanation TEXT, subcategory TEXT, key_entities_json TEXT, options_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Table for the shared, preloaded questions cache
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS preloaded_questions_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                question_data_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Table for model performance statistics
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS model_stats (
                model_name TEXT PRIMARY KEY,
                generated_questions INTEGER DEFAULT 0,
                errors INTEGER DEFAULT 0,
                total_response_time REAL DEFAULT 0.0
            )
        """)
        # Table for logging errors
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                endpoint TEXT,
                error_details_json TEXT
            )
        """)
        # Table for prompt history (capped at 50 entries)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS prompt_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                model TEXT,
                prompt TEXT,
                raw_response TEXT
            )
        """)
        
        # Table for storing question blueprints
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS question_blueprints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                subcategory TEXT NOT NULL,
                modifier TEXT,
                target_answer TEXT NOT NULL,
                is_used BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Index for quick lookup of unused blueprints
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_blueprints_cat_used ON question_blueprints(category, is_used)")
        
        await conn.commit()
    print("SQLite database and all tables initialized successfully.")

async def save_blueprints_batch(category: str, blueprints: List[Dict[str, str]]):
    """Saves a batch of generated blueprints to the database."""
    async with get_db_connection() as conn:
        data_to_insert = [
            (category, b['subcategory'], b.get('modifier', ''), b['target_answer'])
            for b in blueprints
        ]
        await conn.executemany("""
            INSERT INTO question_blueprints (category, subcategory, modifier, target_answer)
            VALUES (?, ?, ?, ?)
        """, data_to_insert)
        await conn.commit()

async def get_unused_blueprint(category: str) -> Optional[Dict[str, Any]]:
    """Retrieves one unused blueprint and marks it as used (atomically)."""
    async with get_db_connection() as conn:
        conn.row_factory = aiosqlite.Row
        try:
            # Get one random unused blueprint
            async with conn.execute("""
                SELECT id, subcategory, modifier, target_answer
                FROM question_blueprints
                WHERE category = ? AND is_used = 0
                ORDER BY RANDOM() LIMIT 1
            """, (category,)) as cursor:
                row = await cursor.fetchone()
            
            if row:
                blueprint = dict(row)
                # Mark as used
                await conn.execute("UPDATE question_blueprints SET is_used = 1 WHERE id = ?", (blueprint['id'],))
                await conn.commit()
                return blueprint
            return None
        except Exception as e:
            print(f"Error getting blueprint: {e}")
            await conn.rollback()
            return None

async def get_blueprint_count(category: str) -> int:
    """Counts how many unused blueprints are available for a category."""
    async with get_db_connection() as conn:
        async with conn.execute("""
            SELECT COUNT(*) FROM question_blueprints
            WHERE category = ? AND is_used = 0
        """, (category,)) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else 0

async def add_question(question_data: Dict[str, Any], inputs: Dict[str, Any]):
    """Adds a new, generated question to the permanent storage table."""
    category_name = inputs.get('category', 'Unknown') # Default for safety
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO generated_questions (
                    model, language, category, knowledge_level, game_mode, theme,
                    question_text, answer_text, explanation, subcategory,
                    key_entities_json, options_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                inputs.get("model"), inputs.get("language"), category_name,
                inputs.get("knowledgeLevel"), inputs.get("gameMode"),
                inputs.get("theme") if inputs.get("includeCategoryTheme") else None,
                question_data.get("question"),
                question_data.get("answer"),
                question_data.get("explanation"),
                question_data.get("subcategory"),
                json.dumps(question_data.get("key_entities", [])),
                json.dumps(question_data.get("options", []))
            ))
            await conn.commit()
            print(f"Saved new question for '{category_name}' in the 'generated_questions' table.")
    except aiosqlite.IntegrityError:
        print(f"INFO: Question for '{category_name}' already existed in the permanent storage (IntegrityError).")
    except Exception as e:
        print(f"ERROR: Failed to save question to the 'generated_questions' table for category '{category_name}'. Reason: {e}")

async def cache_question(category: str, question_data: Dict[str, Any]):
    """Adds a preloaded question to the shared cache table."""
    try:
        async with get_db_connection() as conn:
            await conn.execute(
                "INSERT INTO preloaded_questions_cache (category, question_data_json) VALUES (?, ?)",
                (category, json.dumps(question_data))
            )
            await conn.commit()
    except Exception as e:
        print(f"ERROR: Failed to cache a question for category '{category}'. Reason: {e}")

async def get_and_remove_cached_question(category: str) -> Optional[Dict[str, Any]]:
    """Atomically retrieves and deletes one question for a category from the cache."""
    async with get_db_connection() as conn:
        conn.row_factory = aiosqlite.Row
        try:
            # Find the oldest question for the category
            async with conn.execute(
                "SELECT id, question_data_json FROM preloaded_questions_cache WHERE category = ? ORDER BY id LIMIT 1",
                (category,)
            ) as cursor:
                row = await cursor.fetchone()

            if row:
                question_id = row['id']
                question_data = json.loads(row['question_data_json'])

                # Delete the question that was just retrieved
                await conn.execute("DELETE FROM preloaded_questions_cache WHERE id = ?", (question_id,))
                await conn.commit()
                return question_data
            else:
                return None
        except Exception as e:
            print(f"ERROR: Failed during get_and_remove_cached_question for '{category}'. Reason: {e}")
            await conn.rollback() # Rollback transaction on error
            return None

async def get_cache_count_for_category(category: str) -> int:
    """Counts how many questions are currently cached for a specific category."""
    async with get_db_connection() as conn:
        async with conn.execute("SELECT COUNT(*) FROM preloaded_questions_cache WHERE category = ?", (category,)) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else 0

async def update_model_stats_db(model_name: str, success: bool, response_time: float):
    """Updates model statistics in the database."""
    async with get_db_connection() as conn:
        if success:
            await conn.execute("""
                INSERT INTO model_stats (model_name, generated_questions, total_response_time)
                VALUES (?, 1, ?)
                ON CONFLICT(model_name) DO UPDATE SET
                    generated_questions = generated_questions + 1,
                    total_response_time = total_response_time + excluded.total_response_time
            """, (model_name, response_time))
        else:
            await conn.execute("""
                INSERT INTO model_stats (model_name, errors)
                VALUES (?, 1)
                ON CONFLICT(model_name) DO UPDATE SET
                    errors = errors + 1
            """, (model_name,))
        await conn.commit()

async def log_error_db(endpoint: str, error_details: Dict[str, Any]):
    """Logs an error entry into the database."""
    async with get_db_connection() as conn:
        # Ensure details are JSON serializable
        try:
            details_str = json.dumps(error_details)
        except TypeError:
            details_str = json.dumps(str(error_details)) # Fallback to string representation

        await conn.execute(
            "INSERT INTO error_logs (endpoint, error_details_json) VALUES (?, ?)",
            (endpoint, details_str)
        )
        await conn.commit()

async def add_prompt_history_db(history_entry: Dict[str, Any]):
    """Adds a new prompt to the history and ensures the table does not exceed 50 entries."""
    async with get_db_connection() as conn:
        # Add the new entry
        await conn.execute(
            "INSERT INTO prompt_history (timestamp, model, prompt, raw_response) VALUES (?, ?, ?, ?)",
            (history_entry['timestamp'], history_entry['model'], history_entry['prompt'], history_entry['raw_response'])
        )
        # Check count and delete the oldest if necessary
        async with conn.execute("SELECT COUNT(*) FROM prompt_history") as cursor:
            row = await cursor.fetchone()
            count = row[0] if row else 0
            
        if count > 50:
            await conn.execute("DELETE FROM prompt_history WHERE id IN (SELECT id FROM prompt_history ORDER BY id ASC LIMIT ?)", (count - 50,))
        await conn.commit()

async def get_all_stats() -> List[Dict[str, Any]]:
    async with get_db_connection() as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT model_name, generated_questions, errors, total_response_time FROM model_stats ORDER BY model_name") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def get_prompt_history() -> List[Dict[str, Any]]:
    async with get_db_connection() as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT id, timestamp, model, prompt, raw_response FROM prompt_history ORDER BY id DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def get_error_logs() -> List[Dict[str, Any]]:
    async with get_db_connection() as conn:
        conn.row_factory = aiosqlite.Row
        async with conn.execute("SELECT id, timestamp, endpoint, error_details_json FROM error_logs ORDER BY id DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

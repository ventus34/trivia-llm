import sqlite3
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

DATABASE_FILE = "questions.db"

def get_db_connection():
    """Creates and returns a database connection."""
    conn = sqlite3.connect(DATABASE_FILE, timeout=10) # Increased timeout for concurrent access
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes all necessary tables in the database if they don't exist."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Table for permanently storing all generated questions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS generated_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT, model TEXT NOT NULL, language TEXT NOT NULL,
                category TEXT NOT NULL, knowledge_level TEXT NOT NULL, game_mode TEXT NOT NULL,
                theme TEXT, question_text TEXT NOT NULL UNIQUE, answer_text TEXT NOT NULL,
                explanation TEXT, subcategory TEXT, key_entities_json TEXT, options_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Table for the shared, preloaded questions cache
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS preloaded_questions_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                question_data_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Table for model performance statistics
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_stats (
                model_name TEXT PRIMARY KEY,
                generated_questions INTEGER DEFAULT 0,
                errors INTEGER DEFAULT 0,
                total_response_time REAL DEFAULT 0.0
            )
        """)
        # Table for logging errors
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                endpoint TEXT,
                error_details_json TEXT
            )
        """)
        # Table for prompt history (capped at 50 entries)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prompt_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                model TEXT,
                prompt TEXT,
                raw_response TEXT
            )
        """)
        conn.commit()
    print("SQLite database and all tables initialized successfully.")

def add_question(question_data: Dict[str, Any], inputs: Dict[str, Any]):
    """Adds a new, generated question to the permanent storage table."""
    category_name = inputs.get('category', 'Unknown') # Default for safety
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
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
            conn.commit()
            print(f"Saved new question for '{category_name}' in the 'generated_questions' table.")
    except sqlite3.IntegrityError:
        print(f"INFO: Question for '{category_name}' already existed in the permanent storage (IntegrityError).")
    except Exception as e:
        print(f"ERROR: Failed to save question to the 'generated_questions' table for category '{category_name}'. Reason: {e}")

def cache_question(category: str, question_data: Dict[str, Any]):
    """Adds a preloaded question to the shared cache table."""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO preloaded_questions_cache (category, question_data_json) VALUES (?, ?)",
                (category, json.dumps(question_data))
            )
            conn.commit()
    except Exception as e:
        print(f"ERROR: Failed to cache a question for category '{category}'. Reason: {e}")

def get_and_remove_cached_question(category: str) -> Optional[Dict[str, Any]]:
    """Atomically retrieves and deletes one question for a category from the cache."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            # Find the oldest question for the category
            cursor.execute(
                "SELECT id, question_data_json FROM preloaded_questions_cache WHERE category = ? ORDER BY id LIMIT 1",
                (category,)
            )
            row = cursor.fetchone()

            if row:
                question_id = row['id']
                question_data = json.loads(row['question_data_json'])

                # Delete the question that was just retrieved
                cursor.execute("DELETE FROM preloaded_questions_cache WHERE id = ?", (question_id,))
                conn.commit()
                return question_data
            else:
                return None
        except Exception as e:
            print(f"ERROR: Failed during get_and_remove_cached_question for '{category}'. Reason: {e}")
            conn.rollback() # Rollback transaction on error
            return None

def get_cache_count_for_category(category: str) -> int:
    """Counts how many questions are currently cached for a specific category."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM preloaded_questions_cache WHERE category = ?", (category,))
        return cursor.fetchone()[0]

def update_model_stats_db(model_name: str, success: bool, response_time: float):
    """Updates model statistics in the database."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if success:
            cursor.execute("""
                INSERT INTO model_stats (model_name, generated_questions, total_response_time)
                VALUES (?, 1, ?)
                ON CONFLICT(model_name) DO UPDATE SET
                    generated_questions = generated_questions + 1,
                    total_response_time = total_response_time + excluded.total_response_time
            """, (model_name, response_time))
        else:
            cursor.execute("""
                INSERT INTO model_stats (model_name, errors)
                VALUES (?, 1)
                ON CONFLICT(model_name) DO UPDATE SET
                    errors = errors + 1
            """, (model_name,))
        conn.commit()

def log_error_db(endpoint: str, error_details: Dict[str, Any]):
    """Logs an error entry into the database."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Ensure details are JSON serializable
        try:
            details_str = json.dumps(error_details)
        except TypeError:
            details_str = json.dumps(str(error_details)) # Fallback to string representation

        cursor.execute(
            "INSERT INTO error_logs (endpoint, error_details_json) VALUES (?, ?)",
            (endpoint, details_str)
        )
        conn.commit()

def add_prompt_history_db(history_entry: Dict[str, Any]):
    """Adds a new prompt to the history and ensures the table does not exceed 50 entries."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Add the new entry
        cursor.execute(
            "INSERT INTO prompt_history (timestamp, model, prompt, raw_response) VALUES (?, ?, ?, ?)",
            (history_entry['timestamp'], history_entry['model'], history_entry['prompt'], history_entry['raw_response'])
        )
        # Check count and delete the oldest if necessary
        cursor.execute("SELECT COUNT(*) FROM prompt_history")
        count = cursor.fetchone()[0]
        if count > 50:
            cursor.execute("DELETE FROM prompt_history WHERE id IN (SELECT id FROM prompt_history ORDER BY id ASC LIMIT ?)", (count - 50,))
        conn.commit()

def get_all_stats() -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT model_name, generated_questions, errors, total_response_time FROM model_stats ORDER BY model_name")
        return [dict(row) for row in cursor.fetchall()]

def get_prompt_history() -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, timestamp, model, prompt, raw_response FROM prompt_history ORDER BY id DESC")
        return [dict(row) for row in cursor.fetchall()]

def get_error_logs() -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, timestamp, endpoint, error_details_json FROM error_logs ORDER BY id DESC")
        return [dict(row) for row in cursor.fetchall()]
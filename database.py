# database.py
import sqlite3
import json
from typing import List, Dict, Any

DATABASE_FILE = "questions.db"

def get_db_connection():
    """Creates and returns a database connection."""
    conn = sqlite3.connect(DATABASE_FILE)
    # Returns rows as dictionary-like objects, which is more convenient
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Creates the table and adds the last_used_at column if they don't exist."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # Creating the main table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS generated_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT, model TEXT NOT NULL, language TEXT NOT NULL,
                category TEXT NOT NULL, knowledge_level TEXT NOT NULL, game_mode TEXT NOT NULL,
                theme TEXT, question_text TEXT NOT NULL UNIQUE, answer_text TEXT NOT NULL,
                explanation TEXT, subcategory TEXT, key_entities_json TEXT, options_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Checking for and adding the new column if it's missing (migration)
        cursor.execute("PRAGMA table_info(generated_questions)")
        columns = [column['name'] for column in cursor.fetchall()]
        if 'last_used_at' not in columns:
            print("Adding 'last_used_at' column to the database...")
            cursor.execute("ALTER TABLE generated_questions ADD COLUMN last_used_at TIMESTAMP")

        conn.commit()
    print("SQLite database initialized successfully.")

def mark_question_as_used(question_id: int):
    """Updates the timestamp for a used question."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE generated_questions
            SET last_used_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (question_id,))
        conn.commit()
    print(f"Updated timestamp for question with ID: {question_id}")

def find_questions(inputs: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Finds questions, ignoring those used within the last hour."""
    # Define a "cooldown" period, e.g., 1 hour
    cooldown_period = "-1 hour"

    query = """
        SELECT id, question_text, answer_text, explanation, subcategory, key_entities_json, options_json
        FROM generated_questions
        WHERE model = ? AND language = ? AND category = ? AND knowledge_level = ? AND game_mode = ?
        AND (last_used_at IS NULL OR last_used_at <= datetime('now', ?))
    """
    params = [
        inputs.get("model"), inputs.get("language"), inputs.get("category"),
        inputs.get("knowledgeLevel"), inputs.get("gameMode"),
        cooldown_period
    ]

    if inputs.get("includeCategoryTheme") and inputs.get("theme"):
        query += " AND theme = ?"
        params.append(inputs.get("theme"))
    else:
        query += " AND theme IS NULL"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        # Converts Row objects to dictionaries
        return [dict(row) for row in rows]

def add_question(question_data: Dict[str, Any], inputs: Dict[str, Any]):
    """Adds a new, generated question to the database."""
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
                inputs.get("model"), inputs.get("language"), inputs.get("category"),
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
            print(f"Saved new question for '{inputs.get('category')}' in the database.")
    except sqlite3.IntegrityError:
        print(f"INFO: Question for '{inputs.get('category')}' already existed in the database (IntegrityError).")
    except Exception as e:
        print(f"ERROR: Failed to save question to the database. Reason: {e}")
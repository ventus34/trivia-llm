import asyncio
import pickle
import os
from collections import deque
from typing import Dict, Any, Optional

# --- In-memory State ---
CATEGORY_GENERATION_HISTORY = {}  # Format: { "category_name": {"subcategories": deque, "entities": deque} }
MAX_SUBCATEGORY_HISTORY = 10
MAX_ENTITY_HISTORY = 20
MAX_CATEGORIES_TRACKED = 100

# Background task state tracking
# Format: { "gameId": {"state": "scheduled|running|done", "event": asyncio.Event(), "last_scheduled": ts, "req_signature": str, ...} }
PRELOAD_TASK_STATUS: Dict[str, Dict[str, Any]] = {}

MAX_QUESTIONS_PER_CATEGORY_IN_CACHE = 2

# placeholders to be initialized on startup
PRELOAD_CONCURRENCY_SEMAPHORE: Optional[asyncio.Semaphore] = None
PRELOAD_STATUS_LOCK: Optional[asyncio.Lock] = None

# --- Live Quiz State ---
LIVE_QUIZ_GAMES: Dict[str, Any] = {}
ROOM_CODES: Dict[str, str] = {}  # room_code -> game_id mapping

STATE_FILE = "game_state.pickle"

def get_preload_status(game_id: str) -> Optional[Dict[str, Any]]:
    return PRELOAD_TASK_STATUS.get(game_id)

def set_preload_status(game_id: str, status: Dict[str, Any]):
    PRELOAD_TASK_STATUS[game_id] = status

def save_state_to_disk():
    """Serializes active games to a local file."""
    try:
        # We need to handle objects that might not be picklable (like asyncio.Task)
        # For now, we'll just try to pickle the whole thing, but in a real app
        # we should only pickle the data, not the runtime objects.
        state = {
            "LIVE_QUIZ_GAMES": LIVE_QUIZ_GAMES,
            "ROOM_CODES": ROOM_CODES
        }
        with open(STATE_FILE, "wb") as f:
            pickle.dump(state, f)
        print(f"Game state saved to {STATE_FILE}")
    except Exception as e:
        print(f"Error saving game state: {e}")

def load_state_from_disk():
    """Reloads games from a local file."""
    global LIVE_QUIZ_GAMES, ROOM_CODES
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "rb") as f:
                state = pickle.load(f)
                LIVE_QUIZ_GAMES.update(state.get("LIVE_QUIZ_GAMES", {}))
                ROOM_CODES.update(state.get("ROOM_CODES", {}))
            print(f"Game state loaded from {STATE_FILE}")
        except Exception as e:
            print(f"Error loading game state: {e}")

async def periodic_save_task():
    """Background task to save state periodically."""
    while True:
        await asyncio.sleep(60)  # Save every minute
        save_state_to_disk()

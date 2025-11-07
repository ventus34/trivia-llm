import asyncio
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
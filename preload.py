import asyncio
import random
from datetime import datetime
from typing import Dict, Any

import database
from config import MODELS_BY_LANGUAGE, DEBUG_MODE
from state import PRELOAD_CONCURRENCY_SEMAPHORE, MAX_QUESTIONS_PER_CATEGORY_IN_CACHE
from generative import call_generative_model
from utils import build_question_prompt, is_question_valid, format_explanation_part, update_generation_history
from models import PreloadRequest

# Background preload task with concurrency limits and safe status handling
async def _preload_task(game_id: str, model_selection: str, request_data: PreloadRequest):
    # Mark as running and acquire global preload concurrency semaphore
    from state import PRELOAD_TASK_STATUS  # Import here to avoid circular import
    status = PRELOAD_TASK_STATUS.get(game_id)
    if not status:
        # if status was removed meanwhile, create a fallback to ensure the event exists
        PRELOAD_TASK_STATUS[game_id] = {"state": "running", "event": asyncio.Event(), "last_scheduled": datetime.utcnow().timestamp()}

    PRELOAD_TASK_STATUS[game_id]["state"] = "running"
    PRELOAD_TASK_STATUS[game_id]["started_at"] = datetime.utcnow().isoformat()

    # local helper to pick model
    def get_model_for_generation():
        if model_selection == "random-pl" and MODELS_BY_LANGUAGE["pl"]:
            return random.choice(MODELS_BY_LANGUAGE["pl"])
        if model_selection == "random-en" and MODELS_BY_LANGUAGE["en"]:
            return random.choice(MODELS_BY_LANGUAGE["en"])
        return model_selection

    async def generate_one_for_category(category: str):
        model_to_use = get_model_for_generation()
        if DEBUG_MODE:
            print(f"[{game_id}] Preloading for '{category}' using model '{model_to_use}'...")
        try:
            params = request_data.model_dump()
            prompt = build_question_prompt(params, category)
            # call with timeout to avoid long blocking
            data, raw_response = await asyncio.wait_for(call_generative_model(prompt, model_to_use, temperature=1.2, return_raw=True), timeout=30.0)
            is_valid, error_msg = is_question_valid(data, params.get("gameMode"))
            if is_valid:
                explanation_parts = [format_explanation_part(data.get(key)) for key in ["explanation_correct", "explanation_distractors", "explanation_summary"]]
                data["explanation"] = "\n\n".join(filter(None, explanation_parts))
                inputs_for_db = {**params, 'model': model_to_use, 'category': category}
                database.add_question(data, inputs_for_db)
                database.cache_question(category, data)
                update_generation_history(category, data.get("subcategory"), data.get("key_entities"))
            else:
                print(f"WARNING: Preloaded question for '{category}' was invalid. Reason: {error_msg}. Raw response snippet: '{raw_response[:300]}...'")
                database.log_error_db("preload_task_validation", {"category": category, "error": error_msg, "raw_response_snippet": raw_response[:300]})
        except asyncio.TimeoutError:
            print(f"ERROR: Preload timed out for category '{category}'")
            database.log_error_db("preload_task_timeout", {"category": category})
        except Exception as e:
            detailed_error = repr(e)
            print(f"ERROR: Preloading one question for '{category}' failed. Reason: {detailed_error}.")
            database.log_error_db("preload_task_exception", {"category": category, "error": detailed_error})

    try:
        # Acquire global preload concurrency semaphore
        sem = PRELOAD_CONCURRENCY_SEMAPHORE
        if sem is None:
            class _NoOp:
                async def __aenter__(self): pass
                async def __aexit__(self, exc_type, exc, tb): pass
            sem_ctx = _NoOp()
        else:
            sem_ctx = sem

        async with sem_ctx:
            while True:
                # compute categories that still need caching
                categories_to_process = [cat for cat in request_data.categories if database.get_cache_count_for_category(cat) < MAX_QUESTIONS_PER_CATEGORY_IN_CACHE]
                if not categories_to_process:
                    break
                categories_to_process.sort(key=lambda cat: database.get_cache_count_for_category(cat))

                for cat in categories_to_process:
                    await generate_one_for_category(cat)
                    # modest delay between requests to avoid burst (additional to call_generative_model limiter)
                    await asyncio.sleep(0.2)

    finally:
        # mark finished and notify waiters
        PRELOAD_TASK_STATUS[game_id]["state"] = "done"
        PRELOAD_TASK_STATUS[game_id]["finished_at"] = datetime.utcnow().isoformat()
        try:
            PRELOAD_TASK_STATUS[game_id]["event"].set()
        except Exception:
            pass
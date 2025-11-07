import asyncio
import time
import random
from typing import Any, Tuple
from datetime import datetime

import database
from config import client, DEBUG_MODE, GEN_CALL_MAX_ATTEMPTS, FALLBACK_MODEL, generative_api_limiter, GENERATIVE_CONCURRENCY_SEMAPHORE
from utils import extract_json_from_response, validate_model

# Rate-limit / retry aware call to generative model
async def call_generative_model(prompt: str, model_name: str, return_raw=False) -> Any:
    """
    Robust wrapper with:
    - global concurrency semaphore (to limit simultaneous external calls)
    - time-based AsyncLimiter (to shape requests per minute)
    - exponential backoff on detected rate limits (429)
    - fallback-to-other-model logic (but not used for rate limit retries)
    """
    validate_model(model_name)
    last_exception = None
    start_time = time.time()
    current_model = model_name
    raw_response = None

    max_attempts = max(1, GEN_CALL_MAX_ATTEMPTS)

    for attempt in range(1, max_attempts + 1):
        # check semaphores (initialized during startup)
        try:
            concurrency_sem = GENERATIVE_CONCURRENCY_SEMAPHORE
            if concurrency_sem is None:
                # fallback to a no-op async context if not initialized (shouldn't happen after startup)
                class _NoOp:
                    async def __aenter__(self): pass
                    async def __aexit__(self, exc_type, exc, tb): pass
                concurrency_ctx = _NoOp()
            else:
                concurrency_ctx = concurrency_sem

            limiter = generative_api_limiter
            if limiter is None:
                # fallback no-op limiter
                class _NoOp:
                    async def __aenter__(self): pass
                    async def __aexit__(self, exc_type, exc, tb): pass
                limiter_ctx = _NoOp()
            else:
                limiter_ctx = limiter

            async with concurrency_ctx:
                async with limiter_ctx:
                    messages = [{"role": "user", "content": prompt}]
                    request_params = {"model": current_model, "messages": messages, "response_format": {"type": "json_object"}}
                    response = await client.chat.completions.create(**request_params)
                    response_text = response.choices[0].message.content
                    raw_response = response_text
                    if DEBUG_MODE:
                        print(f"Raw response: {raw_response}")
                    response_time = time.time() - start_time
                    database.update_model_stats_db(model_name=current_model, success=True, response_time=response_time)
                    history_entry = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "model": current_model, "prompt": prompt, "raw_response": response_text
                    }
                    database.add_prompt_history_db(history_entry)
                    parsed_data = extract_json_from_response(response_text)
                    if return_raw:
                        return parsed_data, response_text
                    return parsed_data
        except Exception as e:
            last_exception = e
            err_text = str(e).lower()
            is_rate_limit = False
            try:
                # heuristics to detect 429 or rate-limit
                if '429' in err_text or 'rate limit' in err_text or 'ratelimit' in err_text or 'too many requests' in err_text:
                    is_rate_limit = True
                elif hasattr(e, 'status_code') and int(getattr(e, 'status_code', 0)) == 429:
                    is_rate_limit = True
                elif hasattr(e, 'status') and int(getattr(e, 'status', 0)) == 429:
                    is_rate_limit = True
            except Exception:
                is_rate_limit = False

            # Rate-limit specific handling: exponential backoff + jitter, do NOT immediately switch model
            if is_rate_limit:
                backoff = min(60, (2 ** attempt)) + random.random()
                print(f"Rate-limited by API. Backing off {backoff:.1f}s (attempt {attempt}/{max_attempts}).")
                await asyncio.sleep(backoff)
                # continue trying the same model after backoff
                continue

            print(f"ERROR: Attempt with model '{current_model}' failed: {e}")
            # If not rate limit, consider fallback model once
            if FALLBACK_MODEL and current_model != FALLBACK_MODEL:
                print(f"INFO: Attempting fallback to model: {FALLBACK_MODEL}")
                current_model = FALLBACK_MODEL
                # proceed to next iteration to try fallback
                continue
            else:
                # small delay before next attempt to avoid hot-looping
                await asyncio.sleep(min(5, 0.5 * attempt))
                continue

    # All attempts exhausted
    response_time = time.time() - start_time
    try:
        database.update_model_stats_db(model_name=current_model, success=False, response_time=response_time)
    except Exception:
        pass
    database.log_error_db("call_generative_model", {"model": current_model, "error": str(last_exception), "raw_response_snippet": raw_response[:200] if raw_response else "None"})
    raise last_exception if last_exception else Exception("Unknown error in call_generative_model")
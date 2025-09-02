import os
import re
import json
import random
import asyncio
import time
from collections import deque
from datetime import datetime
from typing import List, Any, Dict, Optional

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from aiolimiter import AsyncLimiter
from openai import AsyncOpenAI

import database

# --- Configuration ---
load_dotenv()
app = FastAPI(title="Trivia Game Backend", version="1.0.0")

# Runtime-configurable limits (override via env)
GENERATIVE_RATE_LIMIT_COUNT = int(os.getenv("GENERATIVE_RATE_LIMIT_COUNT", "20"))
GENERATIVE_RATE_LIMIT_PERIOD = int(os.getenv("GENERATIVE_RATE_LIMIT_PERIOD", "60"))
GENERATIVE_INFLIGHT_LIMIT = int(os.getenv("GENERATIVE_INFLIGHT_LIMIT", "3"))

MAX_CONCURRENT_PRELOAD_TASKS = int(os.getenv("MAX_CONCURRENT_PRELOAD_TASKS", "3"))
MAX_PRELOAD_CATEGORIES = int(os.getenv("MAX_PRELOAD_CATEGORIES", "20"))
MIN_PRELOAD_INTERVAL = int(os.getenv("MIN_PRELOAD_INTERVAL_SECONDS", "10"))

GEN_CALL_MAX_ATTEMPTS = int(os.getenv("GEN_CALL_MAX_ATTEMPTS", "4"))

# placeholders to be initialized on startup
generative_api_limiter: Optional[AsyncLimiter] = None
GENERATIVE_CONCURRENCY_SEMAPHORE: Optional[asyncio.Semaphore] = None
PRELOAD_CONCURRENCY_SEMAPHORE: Optional[asyncio.Semaphore] = None
PRELOAD_STATUS_LOCK: Optional[asyncio.Lock] = None

try:
    DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"
    api_key = os.getenv("OPENAI_API_KEY")
    api_base_url = os.getenv("OPENAI_API_BASE")
    if not api_key or not api_base_url:
        raise ValueError("OPENAI_API_KEY and OPENAI_API_BASE must be set in the .env file.")

    client = AsyncOpenAI(api_key=api_key, base_url=api_base_url)
    print("OpenAI client configured successfully.")

    with open('models.json', 'r', encoding='utf-8') as f:
        MODELS_CONFIG = json.load(f)
        QUESTION_MODELS = MODELS_CONFIG.get("question_models", [])
        EXPLANATION_MODELS = MODELS_CONFIG.get("explanation_models", [])
        CATEGORY_MODELS = MODELS_CONFIG.get("category_models", [])
        FALLBACK_MODEL = MODELS_CONFIG.get("fallback_model")

    MODELS_BY_LANGUAGE = {"pl": [], "en": []}
    for model in QUESTION_MODELS:
        if "languages" in model:
            if "pl" in model["languages"]:
                MODELS_BY_LANGUAGE["pl"].append(model["id"])
            if "en" in model["languages"]:
                MODELS_BY_LANGUAGE["en"].append(model["id"])

    print(f"Models available for PL: {len(MODELS_BY_LANGUAGE['pl'])}")
    print(f"Models available for EN: {len(MODELS_BY_LANGUAGE['en'])}")

    ALLOWED_MODELS = {model['id'] for model_list in [QUESTION_MODELS, EXPLANATION_MODELS, CATEGORY_MODELS] for model in model_list}
    if FALLBACK_MODEL:
        ALLOWED_MODELS.add(FALLBACK_MODEL)

    print(f"Models configuration loaded. Fallback model set to: {FALLBACK_MODEL}")

    with open('prompts.json', 'r', encoding='utf-8') as f:
        PROMPTS = json.load(f)
    print("Prompt templates file loaded successfully.")

    if DEBUG_MODE:
        print(f"DEBUG mode is enabled.")

except Exception as e:
    print(f"CRITICAL ERROR during server initialization: {e}")
    with open("error.log", "a", encoding="utf-8") as f:
        f.write(f"[{datetime.utcnow().isoformat()}] CRITICAL STARTUP ERROR: {e}\n")
    exit(1)

# --- In-memory State ---
CATEGORY_GENERATION_HISTORY = {}  # Format: { "category_name": {"subcategories": deque, "entities": deque} }
MAX_SUBCATEGORY_HISTORY = 10
MAX_ENTITY_HISTORY = 20
MAX_CATEGORIES_TRACKED = 100

# Background task state tracking
# Format: { "gameId": {"state": "scheduled|running|done", "event": asyncio.Event(), "last_scheduled": ts, "req_signature": str, ...} }
PRELOAD_TASK_STATUS: Dict[str, Dict[str, Any]] = {}

MAX_QUESTIONS_PER_CATEGORY_IN_CACHE = 2

# --- Pydantic Models ---
class BaseModelWithModel(BaseModel):
    model: str
    gameId: str

class GenerateCategoriesRequest(BaseModel):
    theme: str
    language: str

class QuestionRequest(BaseModelWithModel):
    category: str
    gameMode: str
    knowledgeLevel: str
    language: str
    theme: Optional[str] = None
    includeCategoryTheme: bool

class ExplanationRequest(BaseModelWithModel):
    language: str
    question: str
    correct_answer: str
    player_answer: str

class MutationRequest(BaseModel):
    gameId: Optional[str] = None
    language: str
    old_category: str
    theme: Optional[str] = None
    existing_categories: List[str]

class PreloadRequest(BaseModelWithModel):
    categories: List[str]
    gameMode: str
    knowledgeLevel: str
    language: str
    theme: Optional[str] = None
    includeCategoryTheme: bool

# --- Helper Logic ---
def update_generation_history(category: str, subcategory: str, key_entities: List[str]):
    if category not in CATEGORY_GENERATION_HISTORY:
        if len(CATEGORY_GENERATION_HISTORY) >= MAX_CATEGORIES_TRACKED:
            oldest = next(iter(CATEGORY_GENERATION_HISTORY))
            del CATEGORY_GENERATION_HISTORY[oldest]
            print(f"Removed oldest category '{oldest}' to enforce limit of {MAX_CATEGORIES_TRACKED}.")

        CATEGORY_GENERATION_HISTORY[category] = {
            "subcategories": deque(maxlen=MAX_SUBCATEGORY_HISTORY),
            "entities": deque(maxlen=MAX_ENTITY_HISTORY)
        }
    if subcategory:
        CATEGORY_GENERATION_HISTORY[category]["subcategories"].append(subcategory)
    if key_entities:
        for entity in key_entities:
            CATEGORY_GENERATION_HISTORY[category]["entities"].append(entity)

def is_question_valid(data: Any, game_mode: str) -> (bool, str):
    if not data or not isinstance(data, dict):
        return False, "Response is not a valid, non-empty dictionary."
    question = data.get("question")
    if not question or not isinstance(question, str) or not question.strip():
        return False, "Response is missing a valid 'question' string."
    if not (10 < len(question) < 500):
        return False, f"Question length ({len(question)}) is outside the optimal range (10-500 chars)."
    if not data.get("explanation_correct") or not data.get("explanation_summary"):
        return False, "Response is missing one or more required explanation fields."
    if not data.get("subcategory") or not data.get("key_entities"):
        return False, "Response is missing 'subcategory' or 'key_entities' metadata."
    if game_mode == "mcq":
        options = data.get("options")
        answer = data.get("answer")
        if not options or not isinstance(options, list) or len(options) != 4:
            return False, f"MCQ mode: Expected 4 options in a list, but found {len(options) if isinstance(options, list) else 'none'}."
        if any(not isinstance(opt, str) or not opt.strip() for opt in options):
            return False, "MCQ mode: One or more options are invalid (not a string or empty)."
        if len(set(options)) != len(options):
            return False, "MCQ mode: Duplicate options found."
        if not answer or not isinstance(answer, str) or not answer.strip():
            return False, "MCQ mode: Missing or invalid 'answer' string."
        if answer not in options:
            return False, "MCQ mode: The provided 'answer' is not in the 'options' list."
    return True, "Validation successful."

def validate_model(model: str):
    if model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model '{model}' is not supported.")

def build_question_prompt(params: Dict[str, Any], category: str) -> str:
    lang = params.get("language")
    prompt_struct = PROMPTS["generate_question"][lang]

    history = CATEGORY_GENERATION_HISTORY.get(category, {})
    subcategory_history = list(history.get("subcategories", []))
    entity_history = list(history.get("entities", []))

    random.shuffle(subcategory_history)
    random.shuffle(entity_history)

    knowledge_prompt = PROMPTS["knowledge_prompts"][params.get("knowledgeLevel")][lang]
    game_mode_prompt = PROMPTS["game_mode_prompts"][params.get("gameMode")][lang]
    theme_context = f"The question must relate to the theme: {params.get('theme')}." if params.get("includeCategoryTheme") and params.get("theme") else "No additional theme."
    subcategory_history_prompt = ', '.join(f'"{item}"' for item in subcategory_history) if subcategory_history else "No history."
    entity_history_prompt = ', '.join(f'"{item}"' for item in entity_history) if entity_history else "No history."

    context_lines = [line.format(category=category, knowledge_prompt=knowledge_prompt, game_mode_prompt=game_mode_prompt, theme_context=theme_context) for line in prompt_struct["context_lines"]]
    rules = [rule.format(subcategory_history_prompt=subcategory_history_prompt, entity_history_prompt=entity_history_prompt) for rule in prompt_struct["rules"]]

    combined_rules = context_lines + rules
    random.shuffle(combined_rules)
    prompt = "\n".join([prompt_struct["persona"], prompt_struct["chain_of_thought"], prompt_struct["context_header"], "\n".join(combined_rules), prompt_struct["output_format"]])

    return prompt

def extract_json_from_response(text: str) -> Any:
    if not text or not isinstance(text, str):
        return {"error": "Input text is empty or invalid."}

    cleaned_text = text.strip()
    cleaned_text = re.sub(r'```(?:json)?', '', cleaned_text)
    cleaned_text = cleaned_text.lstrip('`').rstrip('`')

    try:
        return json.loads(cleaned_text)
    except (json.JSONDecodeError, ValueError):
        pass

    json_match_md = re.search(r'{[\s\S]*?}', cleaned_text, re.DOTALL)
    if json_match_md:
        json_str = json_match_md.group().strip()
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, ValueError):
            pass

    first_brace_index = cleaned_text.find('{')
    if first_brace_index != -1:
        candidate = cleaned_text[first_brace_index:]
        brace_count = 0
        for i, char in enumerate(candidate):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
            if brace_count == 0:
                json_str = candidate[:i+1].strip()
                try:
                    return json.loads(json_str)
                except (json.JSONDecodeError, ValueError):
                    break

    print(f"ERROR: JSON parsing failed after all attempts. Raw snippet: {text[:200]}...")
    return {"error": "Unable to parse JSON from response. Check model output format."}

# Rate-limit / retry aware call to generative model
async def call_generative_model(prompt: str, model_name: str, temperature: float, return_raw=False):
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
                    request_params = {"model": current_model, "messages": messages, "temperature": temperature, "response_format": {"type": "json_object"}}
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

def format_explanation_part(part: Any) -> str:
    if isinstance(part, str): return part
    if isinstance(part, list): return "\n".join(str(item) for item in part if item)
    if isinstance(part, dict): return "\n".join(f"- {key}: {value}" for key, value in part.items())
    return ""

# Background preload task with concurrency limits and safe status handling
async def _preload_task(game_id: str, model_selection: str, request_data: PreloadRequest):
    # Mark as running and acquire global preload concurrency semaphore
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

# --- API Endpoints ---
@app.get("/api/db/stats")
async def get_db_stats():
    return JSONResponse(content=database.get_all_stats())

@app.get("/api/db/prompts")
async def get_db_prompts():
    return JSONResponse(content=database.get_prompt_history())

@app.get("/api/db/errors")
async def get_db_errors():
    return JSONResponse(content=database.get_error_logs())

@app.get("/api/models/questions")
async def get_question_models():
    return JSONResponse(content=QUESTION_MODELS)

@app.post("/api/preload-questions", status_code=202)
async def preload_questions(req: PreloadRequest, background_tasks: BackgroundTasks):
    # Basic validation
    if not req.gameId:
        raise HTTPException(status_code=400, detail="gameId is required")
    if not req.categories:
        raise HTTPException(status_code=400, detail="categories list is required")
    if len(req.categories) > MAX_PRELOAD_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Too many categories requested. Max allowed: {MAX_PRELOAD_CATEGORIES}")

    # signature for deduplication
    req_signature = json.dumps(req.model_dump(), sort_keys=True)

    # Use a lock to avoid race conditions when scheduling multiple preload tasks concurrently
    async with PRELOAD_STATUS_LOCK:
        status = PRELOAD_TASK_STATUS.get(req.gameId)
        now_ts = datetime.utcnow().timestamp()
        if status:
            # If same payload already scheduled or running => dedupe
            if status.get("req_signature") == req_signature and status.get("state") in ("scheduled", "running"):
                return JSONResponse(content={"message": "Preloading is already in progress."}, status_code=202)

            # If last schedule attempt was too recent, throttle
            last = status.get("last_scheduled", 0)
            if now_ts - last < MIN_PRELOAD_INTERVAL:
                raise HTTPException(status_code=429, detail="Too many preload requests. Try again later.")

        # reserve the slot / mark as scheduled so other concurrent requests won't spawn duplicates
        PRELOAD_TASK_STATUS[req.gameId] = {
            "state": "scheduled",
            "event": asyncio.Event(),
            "last_scheduled": now_ts,
            "req_signature": req_signature
        }

        # schedule background task
        background_tasks.add_task(_preload_task, req.gameId, req.model, req)
        return JSONResponse(content={"message": "Preloading started."}, status_code=202)

@app.post("/api/generate-question")
async def generate_question(req: QuestionRequest):
    cached_question = database.get_and_remove_cached_question(req.category)
    if cached_question:
        if DEBUG_MODE: print(f"Serving question for '{req.category}' from DB cache.")
        return JSONResponse(content=cached_question)

    # If a preload is scheduled/running for this gameId, wait a short time for it to finish
    if status := PRELOAD_TASK_STATUS.get(req.gameId):
        try:
            await asyncio.wait_for(status["event"].wait(), timeout=30.0)
            cached_question = database.get_and_remove_cached_question(req.category)
            if cached_question:
                if DEBUG_MODE: print(f"Serving question for '{req.category}' from cache after waiting.")
                return JSONResponse(content=cached_question)
        except asyncio.TimeoutError:
            if DEBUG_MODE: print(f"[{req.gameId}] Preload wait timed out for '{req.category}'. Generating on the fly.")

    MAX_RETRIES = 2
    last_error = None
    raw_response_last = None
    for attempt in range(MAX_RETRIES):
        try:
            if DEBUG_MODE: print(f"--- On-the-fly generation attempt {attempt + 1}/{MAX_RETRIES} for '{req.category}' ---")

            if attempt > 0:
                req.includeCategoryTheme = not req.includeCategoryTheme  # Toggle theme inclusion for variation

            prompt = build_question_prompt(req.model_dump(), req.category)
            data, raw_response = await call_generative_model(prompt, req.model, temperature=1.2, return_raw=True)
            raw_response_last = raw_response
            is_valid, error_message = is_question_valid(data, req.gameMode)
            if is_valid:
                explanation_parts = [format_explanation_part(data.get(key)) for key in ["explanation_correct", "explanation_distractors", "explanation_summary"]]
                data["explanation"] = "\n\n".join(filter(None, explanation_parts))
                database.add_question(data, req.model_dump())
                update_generation_history(req.category, data.get("subcategory"), data.get("key_entities"))
                return JSONResponse(content=data)
            else:
                last_error = ValueError(error_message)
                print(f"WARNING: Validation failed on attempt {attempt + 1}: {error_message}. Raw response snippet: '{raw_response[:300]}...'")
                database.log_error_db("generate_question_validation", {"request": req.model_dump(), "error": error_message, "raw_response_snippet": raw_response[:300]})
        except Exception as e:
            last_error = e
            raw_response_last = raw_response_last or "No raw response captured."
            print(f"Exception on attempt {attempt + 1}/{MAX_RETRIES} for '{req.category}': {e}. Raw response snippet: '{raw_response_last[:300]}...'")
            database.log_error_db("generate_question_exception", {"request": req.model_dump(), "error": str(e), "raw_response_snippet": raw_response_last[:300]})
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)

    error_message = f"Failed to generate a valid question for category '{req.category}' after {MAX_RETRIES} attempts. Final error: {last_error}"
    print(f"{error_message}. Last raw response snippet: '{raw_response_last[:300]}...'")
    database.log_error_db("generate_question", {"request": req.model_dump(), "error": str(last_error), "raw_response_snippet": raw_response_last[:300]})
    fallback_response = {"question": "Wystąpił błąd podczas generowania pytania.", "options": [], "answer": "", "explanation": "Błąd serwera.", "subcategory": "Błąd", "key_entities": []}
    return JSONResponse(content=fallback_response, status_code=500)

@app.post("/api/generate-categories")
async def generate_categories(req: GenerateCategoriesRequest):
    MAX_RETRIES = 2
    for attempt in range(MAX_RETRIES + 1):
        try:
            model_to_use = random.choice(CATEGORY_MODELS)['id'] if CATEGORY_MODELS else FALLBACK_MODEL
            prompt = PROMPTS["generate_categories"][req.language].format(theme=req.theme)
            response_data, raw_response = await call_generative_model(prompt, model_to_use, temperature=0.8, return_raw=True)
            if response_data and isinstance(response_data, dict):
                return JSONResponse(content=response_data)
            else:
                if isinstance(response_data, dict) and response_data.get("error"):
                    print(f"Attempt {attempt + 1} failed: {response_data['error']}. Raw snippet: '{raw_response[:300]}...'")
                    database.log_error_db("generate_categories_error", {"request": req.__dict__, "error": response_data['error'], "raw_response_snippet": raw_response[:300]})
        except Exception as e:
            raw_response = raw_response if 'raw_response' in locals() else "No response captured."
            print(f"Attempt {attempt + 1} failed for generate-categories: {e}. Raw snippet: '{raw_response[:300]}...'")
            database.log_error_db("generate_categories_exception", {"request": req.__dict__, "error": str(e), "raw_response_snippet": raw_response[:300]})
            if attempt == MAX_RETRIES:
                raise HTTPException(status_code=500, detail=f"Failed to generate categories: {e}")
            await asyncio.sleep(1)

@app.post("/api/mutate-category")
async def get_category_mutation(req: MutationRequest):
    try:
        model_to_use = random.choice(CATEGORY_MODELS)['id'] if CATEGORY_MODELS else FALLBACK_MODEL
        prompt = PROMPTS["mutate_category"][req.language].format(old_category=req.old_category, theme=req.theme or "general", existing_categories=req.existing_categories)
        response_data, raw_response = await call_generative_model(prompt, model_to_use, temperature=1.5, return_raw=True)
        return JSONResponse(content=response_data) if isinstance(response_data, dict) else {"error": "Invalid response", "raw_snippet": raw_response[:300]}
    except Exception as e:
        raw_response = raw_response if 'raw_response' in locals() else "No response captured."
        print(f"ERROR in mutate-category: {e}. Raw snippet: '{raw_response[:300]}...'")
        database.log_error_db("mutate_category", {"request": req.__dict__, "error": str(e), "raw_response_snippet": raw_response[:300]})
        raise HTTPException(status_code=500, detail=f"Failed to mutate category: {e}")

@app.post("/api/explain-incorrect")
async def get_incorrect_explanation(req: ExplanationRequest):
    try:
        model_to_use = random.choice(EXPLANATION_MODELS)['id'] if EXPLANATION_MODELS else FALLBACK_MODEL
        prompt = PROMPTS["explain_incorrect"][req.language].format(question=req.question, correct_answer=req.correct_answer, player_answer=req.player_answer)
        response_data, raw_response = await call_generative_model(prompt, model_to_use, temperature=0.2, return_raw=True)
        if isinstance(response_data, str):
            response_data = {"explanation": response_data}
        if isinstance(response_data, dict):
            return JSONResponse(content=response_data)
        else:
            print(f"ERROR: Invalid response format. Raw snippet: '{raw_response[:300]}...'")
            raise ValueError("Response from model could not be processed into a valid format.")
    except Exception as e:
        raw_response = raw_response if 'raw_response' in locals() else "No response captured."
        print(f"ERROR in explain-incorrect: {e}. Raw snippet: '{raw_response[:300]}...'")
        database.log_error_db("explain_incorrect", {"request": req.__dict__, "error": str(e), "raw_response_snippet": raw_response[:300]})
        raise HTTPException(status_code=500, detail=f"Failed to get explanation: {e}")

# --- App Lifecycle and Static Files ---
@app.on_event("startup")
async def startup_event():
    global generative_api_limiter, GENERATIVE_CONCURRENCY_SEMAPHORE, PRELOAD_CONCURRENCY_SEMAPHORE, PRELOAD_STATUS_LOCK
    database.init_db()
    generative_api_limiter = AsyncLimiter(GENERATIVE_RATE_LIMIT_COUNT, GENERATIVE_RATE_LIMIT_PERIOD)
    GENERATIVE_CONCURRENCY_SEMAPHORE = asyncio.Semaphore(GENERATIVE_INFLIGHT_LIMIT)
    PRELOAD_CONCURRENCY_SEMAPHORE = asyncio.Semaphore(MAX_CONCURRENT_PRELOAD_TASKS)
    PRELOAD_STATUS_LOCK = asyncio.Lock()
    if DEBUG_MODE:
        print("Startup completed. Rate limiter and semaphores initialized.")
        print(f"Generative rate limit: {GENERATIVE_RATE_LIMIT_COUNT}/{GENERATIVE_RATE_LIMIT_PERIOD}s, inflight: {GENERATIVE_INFLIGHT_LIMIT}")
        print(f"Preload concurrency limit: {MAX_CONCURRENT_PRELOAD_TASKS}, max categories per preload: {MAX_PRELOAD_CATEGORIES}")

@app.get("/", include_in_schema=False)
async def root(): return FileResponse('trivia.html')

@app.get("/manifest.json", include_in_schema=False)
async def manifest(): return FileResponse('manifest.json')

@app.get("/service-worker.js", include_in_schema=False)
async def service_worker(): return FileResponse('service-worker.js', media_type='application/javascript')

app.mount("/", StaticFiles(directory=".", html=True), name="static")
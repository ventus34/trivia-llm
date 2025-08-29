import os
import re
import json
import random
import sqlite3
import asyncio
import time
import threading
from collections import deque
from datetime import datetime

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Any, Dict, Optional
from dotenv import load_dotenv
from aiolimiter import AsyncLimiter
from openai import AsyncOpenAI

import database

# --- Configuration ---
load_dotenv()
app = FastAPI(title="Trivia Game Backend", version="1.0.0")

# --- Throttler Initialization ---
generative_api_limiter = AsyncLimiter(20, 60)

# --- Locks for thread-safe file writing and stats ---
HISTORY_LOCK = threading.Lock()
ERROR_LOCK = threading.Lock()
STATS_LOCK = threading.Lock()


# --- Global Configuration & State ---
try:
    DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"
    STATS_FILENAME = "stats.json"
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

        ALLOWED_MODELS = {model['id'] for model_list in [QUESTION_MODELS, EXPLANATION_MODELS, CATEGORY_MODELS] for model
                          in model_list}
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
    # Log critical startup error
    with ERROR_LOCK:
        with open("error.log", "a", encoding="utf-8") as f:
            f.write(f"[{datetime.utcnow().isoformat()}] CRITICAL STARTUP ERROR: {e}\n")
    exit(1)

# --- In-memory State ---
game_sessions = {}
prompt_history = deque(maxlen=50) # Store last 50 prompts and responses
MODEL_STATS = {} # For model performance tracking
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
    subcategoryHistory: List[str] = Field(default_factory=list)
    entityHistory: List[str] = Field(default_factory=list)

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
    subcategoryHistory: Dict[str, List[str]]
    entityHistory: Dict[str, List[str]]


# --- Helper Logic ---

def append_to_json_log(file_path: str, data: dict, lock: threading.Lock):
    """Appends a dictionary entry to a JSON file containing a list."""
    with lock:
        try:
            # Try to read existing data
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                file_data = [] # If file is missing or empty, start with an empty list

            # Ensure it's a list and append
            if not isinstance(file_data, list):
                file_data = [] # Overwrite if content is not a list
            file_data.append(data)

            # Write the whole list back
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(file_data, f, indent=2, ensure_ascii=False)

        except Exception as e:
            print(f"CRITICAL: Failed to write to log file {file_path}. Error: {e}")

def save_history():
    """Saves the current state of the prompt_history deque to history.json, overwriting the file."""
    with HISTORY_LOCK:
        try:
            with open("history.json", "w", encoding="utf-8") as f:
                json.dump(list(prompt_history), f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"ERROR: Could not write to history.json: {e}")

def log_error(error_details: dict):
    error_details["timestamp"] = datetime.utcnow().isoformat()
    append_to_json_log("error.json", error_details, ERROR_LOCK)

# --- Helper Logic ---

def load_model_stats():
    """Loads model statistics from the JSON file on server startup."""
    global MODEL_STATS
    try:
        with open(STATS_FILENAME, "r", encoding="utf-8") as f:
            MODEL_STATS = json.load(f)
            print("Model stats loaded successfully from file.")
    except (FileNotFoundError, json.JSONDecodeError):
        print("Model stats file not found or invalid. Starting with empty stats.")
        MODEL_STATS = {}

def update_model_stats(model_name: str, success: bool, response_time: float):
    """Updates model statistics in memory and saves them to a file."""
    with STATS_LOCK:
        # Update in-memory stats
        if model_name not in MODEL_STATS:
            MODEL_STATS[model_name] = {
                "generated_questions": 0,
                "errors": 0,
                "total_response_time": 0.0,
                "average_response_time": 0.0,
            }

        stats = MODEL_STATS[model_name]
        if success:
            stats["generated_questions"] += 1
            stats["total_response_time"] += response_time
            stats["average_response_time"] = stats["total_response_time"] / stats["generated_questions"]
        else:
            stats["errors"] += 1

        # Save updated stats to file
        try:
            with open(STATS_FILENAME, "w", encoding="utf-8") as f:
                json.dump(MODEL_STATS, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"ERROR: Could not write to model_stats.json: {e}")


def is_question_valid(data: Any, game_mode: str) -> (bool, str):
    """
    Performs comprehensive validation of the generated question JSON,
    including content quality and data consistency checks.

    Args:
        data: The parsed JSON data from the language model.
        game_mode: The game mode ('mcq' or 'short_answer').

    Returns:
        A tuple (bool, str) indicating if the data is valid and a message.
    """
    # 1. Is it a non-empty dictionary?
    if not data or not isinstance(data, dict):
        return False, "Response is not a valid, non-empty dictionary."

    # 2. Does it contain a non-empty, reasonably-sized question?
    question = data.get("question")
    if not question or not isinstance(question, str) or not question.strip():
        return False, "Response is missing a valid 'question' string."
    if not (10 < len(question) < 300):
        return False, f"Question length ({len(question)}) is outside the optimal range (10-300 chars)."

    # 3. Does it contain the core explanation fields?
    if not data.get("explanation_correct") or not data.get("explanation_summary"):
        return False, "Response is missing one or more required explanation fields."

    # 4. Does it contain expected metadata?
    if not data.get("subcategory") or not data.get("key_entities"):
        return False, "Response is missing 'subcategory' or 'key_entities' metadata."

    # 5. Specific checks for Multiple Choice Questions (MCQ)
    if game_mode == "mcq":
        options = data.get("options")
        answer = data.get("answer")

        # 5a. Are options a list of exactly 4 items?
        if not options or not isinstance(options, list):
            return False, "MCQ mode: Missing or invalid 'options' field (must be a list)."
        if len(options) != 4:
            return False, f"MCQ mode: Expected 4 options, but found {len(options)}."

        # 5b. Are all options valid, non-empty strings?
        for opt in options:
            if not isinstance(opt, str) or not opt.strip():
                return False, f"MCQ mode: An option is invalid (not a string or empty): '{opt}'."

        # 5c. Are there any duplicate options?
        if len(set(options)) != len(options):
            return False, "MCQ mode: Duplicate options found in the list."

        # 5d. Is the answer a valid, non-empty string?
        if not answer or not isinstance(answer, str) or not answer.strip():
            return False, "MCQ mode: Missing or invalid 'answer' string."

        # 5e. Is the answer one of the options?
        if answer not in options:
            return False, "MCQ mode: The provided 'answer' is not in the 'options' list."

    # All checks passed
    return True, "Validation successful."


def validate_model(model: str):
    if model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model '{model}' is not supported.")

def build_question_prompt(params: Dict[str, Any], category: str) -> str:
    lang = params.get("language")
    prompt_struct = PROMPTS["generate_question"][lang]

    if isinstance(params.get("subcategoryHistory"), dict):
        subcategory_history = params.get("subcategoryHistory", {}).get(category, [])
        entity_history = params.get("entityHistory", {}).get(category, [])
    else:
        subcategory_history = params.get("subcategoryHistory", [])
        entity_history = params.get("entityHistory", [])

    # Shuffle history to add randomness to the prompt context
    random.shuffle(subcategory_history)
    random.shuffle(entity_history)

    knowledge_prompt = PROMPTS["knowledge_prompts"][params.get("knowledgeLevel")][lang]
    game_mode_prompt = PROMPTS["game_mode_prompts"][params.get("gameMode")][lang]
    theme_context = f"The question must relate to the theme: {params.get('theme')}." if params.get(
        "includeCategoryTheme") and params.get("theme") else "No additional theme."

    subcategory_history_prompt = ', '.join(f'"{item}"' for item in subcategory_history) if subcategory_history else "No history."
    entity_history_prompt = ', '.join(f'"{item}"' for item in entity_history) if entity_history else "No history."

    context_lines = [line.format(category=category, knowledge_prompt=knowledge_prompt, game_mode_prompt=game_mode_prompt, theme_context=theme_context) for line in prompt_struct["context_lines"]]
    rules = [rule.format(subcategory_history_prompt=subcategory_history_prompt, entity_history_prompt=entity_history_prompt) for rule in prompt_struct["rules"]]

    combined_rules = context_lines + rules
    random.shuffle(combined_rules)
    return "\n".join([prompt_struct["persona"], prompt_struct["chain_of_thought"], prompt_struct["context_header"], "\n".join(combined_rules), prompt_struct["output_format"]])

def extract_json_from_response(text: str) -> Any:
    try:
        json_match_md = re.search(r'```json\s*({[\s\S]*?})\s*```', text, re.DOTALL)
        if json_match_md:
            json_str = json_match_md.group(1)
            return json.loads(json_str)

        json_match_raw = re.search(r'{[\s\S]*}', text, re.DOTALL)
        if json_match_raw:
            full_match = json_match_raw.group(0)
            open_braces, end_index = 0, -1
            for i, char in enumerate(full_match):
                if char == '{':
                    open_braces += 1
                elif char == '}':
                    open_braces -= 1
                if open_braces == 0:
                    end_index = i + 1
                    break
            json_str = full_match[:end_index] if end_index != -1 else full_match
            return json.loads(json_str)

        raise ValueError("No valid JSON object found in response.")
    except (json.JSONDecodeError, ValueError) as e:
        if DEBUG_MODE:
            print(f"ERROR: JSON parsing failed. Reason: {e}. Raw text: {text[:500]}")
        return text

async def call_generative_model(prompt: str, model_name: str, temperature: float):
    validate_model(model_name)
    MAX_RETRIES = 1
    last_exception = None
    start_time = time.time()

    try:
        for attempt in range(MAX_RETRIES):
            current_model = model_name
            try:
                async with generative_api_limiter:
                    messages = [{"role": "user", "content": prompt}]
                    request_params = {"model": current_model, "messages": messages, "temperature": temperature, "response_format": {"type": "json_object"}}
                    response = await client.chat.completions.create(**request_params)
                    response_text = response.choices[0].message.content

                    response_time = time.time() - start_time
                    update_model_stats(model_name=current_model, success=True, response_time=response_time)

                    # Append to in-memory deque and save the entire deque to file
                    history_entry = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "model": current_model,
                        "prompt": prompt,
                        "raw_response": response_text
                    }
                    prompt_history.append(history_entry)
                    save_history()

                    return extract_json_from_response(response_text)

            except Exception as e:
                last_exception = e
                print(f"ERROR: Attempt {attempt + 1} with model '{current_model}' failed: {e}")

                if FALLBACK_MODEL and current_model != FALLBACK_MODEL:
                    print(f"INFO: Attempting fallback to model: {FALLBACK_MODEL}")
                    current_model = FALLBACK_MODEL
                    try:
                        async with generative_api_limiter:
                            messages = [{"role": "user", "content": prompt}]
                            request_params = {
                                "model": current_model,
                                "messages": messages,
                                "temperature": temperature,
                                "response_format": {"type": "json_object"},
                                "max_tokens": 1024,
                            }
                            response = await client.chat.completions.create(**request_params, timeout=30.0)
                            response_text = response.choices[0].message.content

                            response_time = time.time() - start_time
                            update_model_stats(model_name=current_model, success=True, response_time=response_time)

                            # Append to in-memory deque and save the entire deque to file
                            history_entry = {"timestamp": datetime.utcnow().isoformat(), "model": current_model, "prompt": prompt, "raw_response": response_text}
                            prompt_history.append(history_entry)
                            save_history()

                            return extract_json_from_response(response_text)
                    except Exception as fallback_e:
                        last_exception = fallback_e
                        print(f"ERROR: Fallback attempt also failed: {fallback_e}")

            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)

        raise last_exception if last_exception else Exception("Unknown error in call_generative_model")

    except Exception as final_error:
        response_time = time.time() - start_time
        update_model_stats(model_name=model_name, success=False, response_time=response_time)
        log_error({"endpoint": "call_generative_model", "model": model_name, "error": str(final_error)})
        raise final_error


def format_explanation_part(part: Any) -> str:
    """Safely formats a part of an explanation, handling strings, lists, and dicts."""
    if isinstance(part, str):
        return part
    if isinstance(part, list):
        # Join list items, filtering out any non-string elements just in case
        return "\n".join(str(item) for item in part if item)
    if isinstance(part, dict):
        # Format dict items into a readable string
        return "\n".join(f"- {key}: {value}" for key, value in part.items())
    return "" # Return empty string for any other type


# --- Background Task for Preloading ---
async def _preload_task(game_id: str, model_selection: str, request_data: PreloadRequest):
    if game_id not in game_sessions:
        game_sessions[game_id] = {"preloaded_questions": {}, "is_preloading": False}

    game_sessions[game_id]["is_preloading"] = True

    def get_model_for_generation():
        if model_selection == "random-pl" and MODELS_BY_LANGUAGE["pl"]:
            return random.choice(MODELS_BY_LANGUAGE["pl"])
        if model_selection == "random-en" and MODELS_BY_LANGUAGE["en"]:
            return random.choice(MODELS_BY_LANGUAGE["en"])
        return model_selection

    async def generate_one_for_category(category: str):
        model_to_use = get_model_for_generation()
        print(f"[{game_id}] Preloading for '{category}' using model '{model_to_use}'...")

        try:
            if category not in game_sessions[game_id]["preloaded_questions"]:
                game_sessions[game_id]["preloaded_questions"][category] = []

            params = request_data.model_dump()
            params['category'] = category
            prompt = build_question_prompt(params, category)

            data = await asyncio.wait_for(
                call_generative_model(prompt, model_to_use, temperature=1.2),
                timeout=30.0
            )

            if data and isinstance(data, dict) and data.get("question"):
                explanation_correct = format_explanation_part(data.get("explanation_correct"))
                explanation_distractors = format_explanation_part(data.get("explanation_distractors"))
                explanation_summary = format_explanation_part(data.get("explanation_summary"))

                # Filter out empty parts before joining
                explanation_parts = [part for part in [explanation_correct, explanation_distractors, explanation_summary] if part]
                data["explanation"] = "\n\n".join(explanation_parts)
                params['model'] = model_to_use

                game_sessions[game_id]["preloaded_questions"][category].append(data)
                database.add_question(data, params)
        except Exception as e:
            detailed_error = repr(e)
            error_message = f"ERROR: Preloading one question for '{category}' failed. Reason: {detailed_error}"
            print(error_message)
            log_error({"task": "_preload_task", "category": category, "error": detailed_error})

    # Main loop: continue as long as any category is not fully cached
    while True:
        # Identify categories that still need questions
        categories_to_process = [
            cat for cat in request_data.categories
            if len(game_sessions[game_id].get("preloaded_questions", {}).get(cat, [])) < MAX_QUESTIONS_PER_CATEGORY_IN_CACHE
        ]

        # If all categories are fully cached, exit the loop
        if not categories_to_process:
            break

        # Prioritize categories with the fewest questions in the cache
        categories_to_process.sort(
            key=lambda cat: len(game_sessions[game_id].get("preloaded_questions", {}).get(cat, []))
        )

        # Generate one question for each under-cached category in parallel for this "round"
        await asyncio.gather(*(generate_one_for_category(cat) for cat in categories_to_process))

    game_sessions[game_id]["is_preloading"] = False
    if game_id in game_sessions and game_sessions[game_id].get("preload_event"):
        game_sessions[game_id]["preload_event"].set()

# --- API Endpoints ---
@app.get("/api/stats")
async def get_stats():
    with STATS_LOCK:
        return JSONResponse(content=MODEL_STATS)

@app.get("/api/models/questions")
async def get_question_models():
    return JSONResponse(content=QUESTION_MODELS)

@app.post("/api/preload-questions", status_code=202)
async def preload_questions(req: PreloadRequest, background_tasks: BackgroundTasks):
    if req.gameId not in game_sessions:
        game_sessions[req.gameId] = {"preloaded_questions": {}, "is_preloading": False}
    game_sessions[req.gameId]["preload_event"] = asyncio.Event()
    if not game_sessions[req.gameId].get("is_preloading"):
        background_tasks.add_task(_preload_task, req.gameId, req.model, req)
    return {"message": "Preloading started."}

@app.post("/api/generate-question")
async def generate_question(req: QuestionRequest):
    # Caching logic first (remains unchanged)
    cache = game_sessions.get(req.gameId, {}).get("preloaded_questions", {})
    if cache.get(req.category):
        question = cache[req.category].pop(0)
        if question:  # Ensure question is not None from a failed preload
            if DEBUG_MODE: print(f"Serving question for '{req.category}' from preload cache.")
            return JSONResponse(content=question)

    if event := game_sessions.get(req.gameId, {}).get("preload_event"):
        try:
            await asyncio.wait_for(event.wait(), timeout=30.0)
            if cache.get(req.category):
                question = cache[req.category].pop(0)
                if question:
                    if DEBUG_MODE: print(f"Serving question for '{req.category}' from cache after waiting.")
                    return JSONResponse(content=question)
        except asyncio.TimeoutError:
            if DEBUG_MODE: print(f"[{req.gameId}] Preload wait timed out for '{req.category}'. Generating on the fly.")

    MAX_RETRIES = 2
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            if DEBUG_MODE:
                print(f"--- Generation attempt {attempt + 1}/{MAX_RETRIES} for category '{req.category}' ---")

            prompt = build_question_prompt(req.model_dump(), req.category)
            data = await call_generative_model(prompt, req.model, temperature=1.2)

            is_valid, error_message = is_question_valid(data, req.gameMode)

            if is_valid:
                # Combine explanation parts into a single string
                explanation_correct = format_explanation_part(data.get("explanation_correct"))
                explanation_distractors = format_explanation_part(data.get("explanation_distractors"))
                explanation_summary = format_explanation_part(data.get("explanation_summary"))

                explanation_parts = [part for part in [explanation_correct, explanation_distractors, explanation_summary] if part]
                data["explanation"] = "\n\n".join(explanation_parts)

                database.add_question(data, req.model_dump())
                return JSONResponse(content=data)
            else:
                last_error = ValueError(error_message)
                if DEBUG_MODE:
                    print(f"Validation failed: {error_message}. Raw data: {data}")
            # --- END OF VALIDATION BLOCK ---

        except Exception as e:
            last_error = e
            print(f"Exception on attempt {attempt + 1}/{MAX_RETRIES} for '{req.category}': {e}")

        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(1)

    # Fallback response on failure (remains unchanged)
    error_message = f"Failed to generate a valid question for category '{req.category}' after {MAX_RETRIES} attempts. Final error: {last_error}"
    print(error_message)
    log_error({"endpoint": "generate_question", "request": req.model_dump(), "error": str(last_error)})

    fallback_response = {
        "question": f"Wystąpił błąd podczas generowania pytania. Spróbuj ponownie. ({str(last_error)})",
        "options": [],
        "answer": "",
        "explanation": "Błąd serwera.",
        "subcategory": "Błąd",
        "entity": "Błąd"
    }
    return JSONResponse(content=fallback_response, status_code=500)

@app.post("/api/generate-categories")
async def generate_categories(req: GenerateCategoriesRequest):
    MAX_RETRIES = 2
    for attempt in range(MAX_RETRIES + 1):
        try:
            model_to_use = random.choice(CATEGORY_MODELS)['id'] if CATEGORY_MODELS else FALLBACK_MODEL
            prompt = PROMPTS["generate_categories"][req.language].format(theme=req.theme)
            response_data = await call_generative_model(prompt, model_to_use, temperature=0.8)
            if response_data and isinstance(response_data, dict):
                return JSONResponse(content=response_data)
        except Exception as e:
            print(f"Attempt {attempt + 1} failed for generate-categories: {e}")
            if attempt == MAX_RETRIES:
                log_error({"endpoint": "generate_categories", "request": req.model_dump(), "error": str(e)})
                raise HTTPException(status_code=500, detail=f"Failed to generate categories: {e}")
            await asyncio.sleep(1)

@app.post("/api/mutate-category")
async def get_category_mutation(req: MutationRequest):
    try:
        model_to_use = random.choice(CATEGORY_MODELS)['id'] if CATEGORY_MODELS else FALLBACK_MODEL
        prompt = PROMPTS["mutate_category"][req.language].format(old_category=req.old_category, theme=req.theme or "general", existing_categories=req.existing_categories)
        response_data = await call_generative_model(prompt, model_to_use, temperature=1.5)
        return JSONResponse(content=response_data)
    except Exception as e:
        log_error({"endpoint": "mutate-category", "request": req.model_dump(), "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Failed to mutate category: {e}")

@app.post("/api/explain-incorrect")
async def get_incorrect_explanation(req: ExplanationRequest):
    try:
        model_to_use = random.choice(EXPLANATION_MODELS)['id'] if EXPLANATION_MODELS else FALLBACK_MODEL
        prompt = PROMPTS["explain_incorrect"][req.language].format(question=req.question, correct_answer=req.correct_answer, player_answer=req.player_answer)
        response_data = await call_generative_model(prompt, model_to_use, temperature=0.2)

        if isinstance(response_data, str):
            response_data = {"explanation": response_data, "verdict_for": "game", "verdict_certainty": 50}

        if isinstance(response_data, dict):
            return JSONResponse(content=response_data)
        else:
            raise ValueError("Response from model could not be processed into a valid format.")

    except Exception as e:
        log_error({"endpoint": "explain-incorrect", "request": req.model_dump(), "error": str(e)})
        raise HTTPException(status_code=500, detail=f"Failed to get explanation: {e}")

# --- App Lifecycle and Static Files ---
@app.on_event("startup")
async def startup_event():
    database.init_db()
    load_model_stats()

@app.get("/", include_in_schema=False)
async def root():
    return FileResponse('trivia.html')

@app.get("/manifest.json", include_in_schema=False)
async def manifest():
    return FileResponse('manifest.json')

@app.get("/service-worker.js", include_in_schema=False)
async def service_worker():
    return FileResponse('service-worker.js', media_type='application/javascript')

app.mount("/", StaticFiles(directory=".", html=True), name="static")
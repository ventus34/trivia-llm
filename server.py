import os
import re
import json
import random
import sqlite3
import asyncio
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

# --- Global Configuration & State ---
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
    exit(1)

game_sessions = {}


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

    knowledge_prompt = PROMPTS["knowledge_prompts"][params.get("knowledgeLevel")][lang]
    game_mode_prompt = PROMPTS["game_mode_prompts"][params.get("gameMode")][lang]
    theme_context = f"The question must relate to the theme: {params.get('theme')}." if params.get(
        "includeCategoryTheme") and params.get("theme") else "No additional theme."

    subcategory_history_prompt = ', '.join(
        f'"{item}"' for item in subcategory_history) if subcategory_history else "No history."
    entity_history_prompt = ', '.join(f'"{item}"' for item in entity_history) if entity_history else "No history."

    context_lines = [
        line.format(
            category=category,
            knowledge_prompt=knowledge_prompt,
            game_mode_prompt=game_mode_prompt,
            theme_context=theme_context
        ) for line in prompt_struct["context_lines"]
    ]
    rules = [
        rule.format(
            subcategory_history_prompt=subcategory_history_prompt,
            entity_history_prompt=entity_history_prompt
        ) for rule in prompt_struct["rules"]
    ]
    combined_rules = context_lines + rules
    random.shuffle(combined_rules)
    return "\n".join([
        prompt_struct["persona"],
        prompt_struct["chain_of_thought"],
        prompt_struct["context_header"],
        "\n".join(combined_rules),
        prompt_struct["output_format"]
    ])


def extract_json_from_response(text: str) -> Any:
    # Restored to a simpler, more stable version.
    try:
        # First, try to find a JSON object within a markdown block.
        json_match_md = re.search(r'```json\s*({[\s\S]*?})\s*```', text, re.DOTALL)
        if json_match_md:
            json_str = json_match_md.group(1)
            return json.loads(json_str)

        # If not found, try to find a raw JSON object.
        json_match_raw = re.search(r'{[\s\S]*}', text, re.DOTALL)
        if json_match_raw:
            full_match = json_match_raw.group(0)
            # This logic finds the correct closing brace for the first opening brace.
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
        # Return the original text if parsing fails, allowing for graceful degradation.
        return text


async def call_generative_model(prompt: str, model_name: str, temperature: float):
    validate_model(model_name)
    MAX_RETRIES = 3
    last_exception = None

    for attempt in range(MAX_RETRIES):
        current_model = model_name
        try:
            if DEBUG_MODE:
                print(f"\n--- API Call Attempt {attempt + 1}/{MAX_RETRIES} ---")

            async with generative_api_limiter:
                messages = [{"role": "user", "content": prompt}]
                request_params = {
                    "model": current_model,
                    "messages": messages,
                    "temperature": temperature,
                    "response_format": {"type": "json_object"},
                }

                if DEBUG_MODE:
                    print(f"REQUEST to OpenAI API:\n{json.dumps(request_params, indent=2)}")

                response = await client.chat.completions.create(**request_params)

                if DEBUG_MODE:
                    response_data = response.model_dump()
                    print(f"FULL RESPONSE OBJECT from OpenAI API:\n{json.dumps(response_data, indent=2)}")

                response_text = response.choices[0].message.content

                if DEBUG_MODE:
                    print(f"RAW TEXT CONTENT from response before parsing:\n---\n{response_text}\n---")

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
                        }
                        if DEBUG_MODE:
                            print(f"FALLBACK REQUEST to OpenAI API:\n{json.dumps(request_params, indent=2)}")

                        response = await client.chat.completions.create(**request_params)

                        if DEBUG_MODE:
                            response_data = response.model_dump()
                            print(
                                f"FULL FALLBACK RESPONSE OBJECT from OpenAI API:\n{json.dumps(response_data, indent=2)}")

                        response_text = response.choices[0].message.content

                        if DEBUG_MODE:
                            print(f"RAW TEXT CONTENT from fallback response before parsing:\n---\n{response_text}\n---")

                        return extract_json_from_response(response_text)
                except Exception as fallback_e:
                    last_exception = fallback_e
                    print(f"ERROR: Fallback attempt also failed: {fallback_e}")

        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(1)

    raise last_exception if last_exception else Exception("Unknown error in call_generative_model")


# --- Background Task for Preloading ---
async def _preload_task(game_id: str, model: str, request_data: PreloadRequest):
    if game_id not in game_sessions:
        game_sessions[game_id] = {"preloaded_questions": {}, "is_preloading": False}

    current_cache = game_sessions[game_id].get("preloaded_questions", {})
    categories_to_preload = [cat for cat in request_data.categories if not current_cache.get(cat)]

    if not categories_to_preload:
        if game_sessions.get(game_id, {}).get("preload_event"):
            game_sessions[game_id]["preload_event"].set()
        return

    game_sessions[game_id]["is_preloading"] = True

    async def generate_for_category(category: str):
        try:
            params = request_data.model_dump()
            params['category'] = category
            prompt = build_question_prompt(params, category)
            data = await call_generative_model(prompt, model, temperature=1.2)

            if data and isinstance(data, dict) and data.get("question"):
                # Combine explanation parts into a single string
                explanation = "\n\n".join([
                    data.get("explanation_correct", ""),
                    data.get("explanation_distractors", ""),
                    data.get("explanation_summary", "")
                ])
                data["explanation"] = explanation.strip()

                game_sessions[game_id]["preloaded_questions"][category] = data
                database.add_question(data, params)
        except Exception as e:
            print(f"ERROR: Preloading for '{category}' failed after all retries. Reason: {e}")
            game_sessions[game_id]["preloaded_questions"][category] = None

    await asyncio.gather(*(generate_for_category(cat) for cat in categories_to_preload))

    game_sessions[game_id]["is_preloading"] = False
    if game_id in game_sessions and game_sessions[game_id].get("preload_event"):
        game_sessions[game_id]["preload_event"].set()


# --- API Endpoints ---
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
    # Caching logic first
    cache = game_sessions.get(req.gameId, {}).get("preloaded_questions", {})
    if question := cache.pop(req.category, None):
        if DEBUG_MODE:
            print(f"Serving question for '{req.category}' from preload cache.")
        return JSONResponse(content=question)

    if event := game_sessions.get(req.gameId, {}).get("preload_event"):
        try:
            await asyncio.wait_for(event.wait(), timeout=30.0)
            if question := cache.pop(req.category, None):
                if DEBUG_MODE:
                    print(f"Serving question for '{req.category}' from preload cache after waiting.")
                return JSONResponse(content=question)
        except asyncio.TimeoutError:
            if DEBUG_MODE:
                print(f"[{req.gameId}] Preload wait timed out for '{req.category}'. Generating on the fly.")

    MAX_RETRIES = 3
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            if DEBUG_MODE:
                print(f"--- Generation attempt {attempt + 1}/{MAX_RETRIES} for category '{req.category}' ---")

            prompt = build_question_prompt(req.model_dump(), req.category)
            data = await call_generative_model(prompt, req.model, temperature=1.2)

            if data and isinstance(data, dict) and data.get("question"):
                answer = data.get("answer")
                options = data.get("options", [])
                is_valid = False
                if req.gameMode == "mcq":
                    if answer and options and answer in options:
                        is_valid = True
                    else:
                        is_valid = False
                else:  # short_answer mode
                    is_valid = True

                if is_valid:
                    # Combine explanation parts into a single string
                    explanation = "\n\n".join([
                        data.get("explanation_correct", ""),
                        data.get("explanation_distractors", ""),
                        data.get("explanation_summary", "")
                    ])
                    data["explanation"] = explanation.strip()

                    database.add_question(data, req.model_dump())
                    return JSONResponse(content=data)
                else:
                    last_error = ValueError("Generated data failed validation: answer not in options.")
                    if DEBUG_MODE:
                        print(str(last_error))
            else:
                last_error = ValueError("Generated data is not a valid dictionary or is missing the 'question' key.")
                if DEBUG_MODE:
                    print(str(last_error))

        except Exception as e:
            last_error = e
            print(f"Exception on attempt {attempt + 1}/{MAX_RETRIES}: {e}")

        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(1)

    print(
        f"Failed to generate a valid question for category '{req.category}' after {MAX_RETRIES} attempts. Final error: {last_error}")
    raise HTTPException(status_code=500, detail=f"Failed to generate a valid question. Error: {last_error}")


@app.post("/api/generate-categories")
async def generate_categories(req: GenerateCategoriesRequest):
    try:
        model_to_use = random.choice(CATEGORY_MODELS)['id'] if CATEGORY_MODELS else FALLBACK_MODEL
        prompt = PROMPTS["generate_categories"][req.language].format(theme=req.theme)
        response_data = await call_generative_model(prompt, model_to_use, temperature=0.8)
        return JSONResponse(content=response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate categories: {e}")


@app.post("/api/mutate-category")
async def get_category_mutation(req: MutationRequest):
    try:
        model_to_use = random.choice(CATEGORY_MODELS)['id'] if CATEGORY_MODELS else FALLBACK_MODEL
        prompt = PROMPTS["mutate_category"][req.language].format(
            old_category=req.old_category,
            theme=req.theme or "general",
            existing_categories=req.existing_categories
        )
        response_data = await call_generative_model(prompt, model_to_use, temperature=1.5)
        return JSONResponse(content=response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mutate category: {e}")


@app.post("/api/explain-incorrect")
async def get_incorrect_explanation(req: ExplanationRequest):
    if DEBUG_MODE:
        print("\n--- NEW EXPLAIN-INCORRECT REQUEST ---")
        print(f"1. Received request data: {req.model_dump_json(indent=2)}")

    try:
        model_to_use = None
        if EXPLANATION_MODELS:
            model_to_use = random.choice(EXPLANATION_MODELS)['id']
        else:
            model_to_use = FALLBACK_MODEL

        if DEBUG_MODE:
            print(f"2. Selected model: {model_to_use}")

        prompt = PROMPTS["explain_incorrect"][req.language].format(
            question=req.question,
            correct_answer=req.correct_answer,
            player_answer=req.player_answer
        )

        if DEBUG_MODE:
            print(f"3. Generated prompt:\n{prompt}")

        response_data = await call_generative_model(prompt, model_to_use, temperature=0.2)

        if DEBUG_MODE:
            print(f"4. Received data from model: {response_data}")

        if isinstance(response_data, str):
            if DEBUG_MODE:
                print("5a. Response is a raw string. Wrapping it in a JSON object.")
            response_data = {
                "explanation": response_data,
                "verdict_for": "game",
                "verdict_certainty": 50
            }

        if isinstance(response_data, dict):
            if DEBUG_MODE:
                print("5b. Response is a valid dictionary. Sending to client.")
            return JSONResponse(content=response_data)
        else:
            if DEBUG_MODE:
                print("5c. ERROR: Response could not be processed into a valid format.")
            raise ValueError("Response from model could not be processed into a valid format.")

    except Exception as e:
        print(f"!!! FATAL ERROR in get_incorrect_explanation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get explanation: {e}")


# --- App Lifecycle and Static Files ---
@app.on_event("startup")
async def startup_event():
    database.init_db()


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
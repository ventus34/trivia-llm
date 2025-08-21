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
generative_api_limiter = AsyncLimiter(10, 60)

# --- Global Configuration & State ---
try:
    DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"
    MODEL_TEMPERATURE = float(os.getenv("MODEL_TEMPERATURE", "0.6"))
    api_key = os.getenv("OPENAI_API_KEY")
    api_base_url = os.getenv("OPENAI_API_BASE")

    if not api_key or not api_base_url:
        raise ValueError("OPENAI_API_KEY and OPENAI_API_BASE must be set in the .env file.")

    client = AsyncOpenAI(api_key=api_key, base_url=api_base_url)
    print("OpenAI client configured successfully for OpenWebUI.")

    with open('models.json', 'r', encoding='utf-8') as f:
        AVAILABLE_MODELS_CONFIG = json.load(f)
        ALLOWED_MODELS = {model['id'] for model in AVAILABLE_MODELS_CONFIG}
        FALLBACK_MODEL = next((model['id'] for model in AVAILABLE_MODELS_CONFIG if model.get('fallback')), None)
    print(f"Models configuration loaded. Fallback model set to: {FALLBACK_MODEL}")

    with open('prompts.json', 'r', encoding='utf-8') as f:
        PROMPTS = json.load(f)
    print("Prompt templates file loaded successfully.")

    if DEBUG_MODE:
        print(f"DEBUG mode is enabled. Model temperature set to: {MODEL_TEMPERATURE}")

except Exception as e:
    print(f"CRITICAL ERROR during server initialization: {e}")
    exit(1)

game_sessions = {}

# --- Pydantic Models ---
class BaseModelWithModel(BaseModel):
    model: str
    gameId: str

class GenerateCategoriesRequest(BaseModel):
    model: str
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
    model: str
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
    # ... (rest of the build logic is unchanged)
    if isinstance(params.get("subcategoryHistory"), dict):
        subcategory_history = params.get("subcategoryHistory", {}).get(category, [])
        entity_history = params.get("entityHistory", {}).get(category, [])
    else:
        subcategory_history = params.get("subcategoryHistory", [])
        entity_history = params.get("entityHistory", [])

    knowledge_prompt = PROMPTS["knowledge_prompts"][params.get("knowledgeLevel")][lang]
    game_mode_prompt = PROMPTS["game_mode_prompts"][params.get("gameMode")][lang]
    theme_context = f"The question must relate to the theme: {params.get('theme')}." if params.get("includeCategoryTheme") and params.get("theme") else "No additional theme."

    inspirational_words_pool = PROMPTS["inspirational_words"][lang]
    random.shuffle(inspirational_words_pool)
    inspirational_words = ", ".join(inspirational_words_pool[:2])

    subcategory_history_prompt = ', '.join(f'"{item}"' for item in subcategory_history) if subcategory_history else "No history."
    entity_history_prompt = ', '.join(f'"{item}"' for item in entity_history) if entity_history else "No history."

    context_lines = [
        line.format(
            category=category,
            knowledge_prompt=knowledge_prompt,
            game_mode_prompt=game_mode_prompt,
            theme_context=theme_context,
            inspirational_words=inspirational_words
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
    # ... (function logic is unchanged)
    json_str = ""
    try:
        json_match_md = re.search(r'```json\s*({[\s\S]*?})\s*```', text, re.DOTALL)
        if json_match_md:
            json_str = json_match_md.group(1)
        else:
            json_match_raw = re.search(r'{[\s\S]*}', text, re.DOTALL)
            if json_match_raw:
                full_match = json_match_raw.group(0)
                open_braces, end_index = 0, -1
                for i, char in enumerate(full_match):
                    if char == '{': open_braces += 1
                    elif char == '}': open_braces -= 1
                    if open_braces == 0:
                        end_index = i + 1
                        break
                json_str = full_match[:end_index] if end_index != -1 else full_match
        if not json_str: raise ValueError("No JSON object found in response.")
        return json.loads(json_str)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"ERROR: JSON parsing failed. Reason: {e}. Raw text: {text[:500]}")
        return text

async def call_generative_model(prompt: str, model_name: str, is_fallback_attempt: bool = False):
    """Calls the generative model, with a single fallback attempt."""
    validate_model(model_name)
    if DEBUG_MODE:
        print(f"\n{'='*25} PROMPT TO API (model: {model_name}) {'='*25}\n{prompt}\n{'='*80}\n")

    try:
        async with generative_api_limiter:
            messages = [{"role": "user", "content": prompt}]
            request_params = {
                "model": model_name,
                "messages": messages,
                "temperature": MODEL_TEMPERATURE,
                "response_format": {"type": "json_object"},
            }
            response = await client.chat.completions.create(**request_params)
            response_text = response.choices[0].message.content
            if DEBUG_MODE:
                print(f"\n{'*'*25} RAW RESPONSE FROM API ({model_name}) {'*'*25}\n{response_text}\n{'*'*80}\n")
            return extract_json_from_response(response_text)
    except Exception as e:
        print(f"ERROR: Exception during call_generative_model for model '{model_name}'. Exception: {e}")
        if not is_fallback_attempt and FALLBACK_MODEL and FALLBACK_MODEL != model_name:
            print(f"INFO: Attempting to use fallback model: {FALLBACK_MODEL}")
            return await call_generative_model(prompt, FALLBACK_MODEL, is_fallback_attempt=True)
        # If it's already a fallback or no fallback is defined, re-raise
        raise HTTPException(status_code=500, detail=f"An error occurred with the generative model, and the fallback also failed or was not configured: {e}")


# --- Background Task for Preloading ---
async def _preload_task(game_id: str, model: str, request_data: PreloadRequest):
    # ... (function logic is unchanged)
    if game_id not in game_sessions:
        game_sessions[game_id] = {"preloaded_questions": {}, "is_preloading": False}
    current_cache = game_sessions[game_id].get("preloaded_questions", {})
    categories_to_preload = [cat for cat in request_data.categories if not current_cache.get(cat)]
    if not categories_to_preload:
        if game_sessions[game_id].get("preload_event"): game_sessions[game_id]["preload_event"].set()
        return
    game_sessions[game_id]["is_preloading"] = True
    async def generate_for_category(category: str):
        try:
            params = request_data.model_dump()
            params['category'] = category
            prompt = build_question_prompt(params, category)
            data = await call_generative_model(prompt, model)
            if data and isinstance(data, dict) and data.get("question"):
                game_sessions[game_id]["preloaded_questions"][category] = data
                database.add_question(data, params)
        except Exception as e:
            game_sessions[game_id]["preloaded_questions"][category] = None
            print(f"ERROR [{game_id}]: Failed to preload for '{category}'. Reason: {e}")
    await asyncio.gather(*(generate_for_category(cat) for cat in categories_to_preload))
    game_sessions[game_id]["is_preloading"] = False
    if game_id in game_sessions and game_sessions[game_id].get("preload_event"):
        game_sessions[game_id]["preload_event"].set()

# --- API Endpoints ---
@app.get("/api/models")
async def get_models():
    return JSONResponse(content=AVAILABLE_MODELS_CONFIG)

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
    # ... (endpoint logic is largely unchanged, but now relies on the new call_generative_model)
    cache = game_sessions.get(req.gameId, {}).get("preloaded_questions", {})
    if question := cache.pop(req.category, None):
        return JSONResponse(content=question)
    if event := game_sessions.get(req.gameId, {}).get("preload_event"):
        try:
            await asyncio.wait_for(event.wait(), timeout=15.0)
            if question := cache.pop(req.category, None):
                return JSONResponse(content=question)
        except asyncio.TimeoutError:
            print(f"[{req.gameId}] Preload wait timed out.")
    prompt = build_question_prompt(req.model_dump(), req.category)
    data = await call_generative_model(prompt, req.model)
    if data and isinstance(data, dict) and data.get("question"):
        database.add_question(data, req.model_dump())
    return JSONResponse(content=data)

@app.post("/api/generate-categories")
async def generate_categories(req: GenerateCategoriesRequest):
    prompt = PROMPTS["generate_categories"][req.language].format(theme=req.theme)
    response_data = await call_generative_model(prompt, req.model)
    return JSONResponse(content=response_data)

@app.post("/api/mutate-category")
async def get_category_mutation(req: MutationRequest):
    prompt = PROMPTS["mutate_category"][req.language].format(
        old_category=req.old_category,
        theme=req.theme or "general",
        existing_categories=req.existing_categories
    )
    response_data = await call_generative_model(prompt, req.model)
    return JSONResponse(content=response_data)

@app.post("/api/explain-incorrect")
async def get_incorrect_explanation(req: ExplanationRequest):
    prompt = PROMPTS["explain_incorrect"][req.language].format(
        question=req.question,
        correct_answer=req.correct_answer,
        player_answer=req.player_answer
    )
    response_data = await call_generative_model(prompt, req.model)
    if isinstance(response_data, dict) and "explanation" in response_data:
        return JSONResponse(content=response_data)
    elif isinstance(response_data, str):
        return JSONResponse(content={"explanation": response_data})
    else:
        raise HTTPException(status_code=500, detail="Invalid explanation format from model.")

# --- App Lifecycle and Static Files ---
@app.on_event("startup")
async def startup_event():
    database.init_db()

@app.get("/", include_in_schema=False)
async def root():
    return FileResponse('trivia.html')

app.mount("/", StaticFiles(directory=".", html=True), name="static")
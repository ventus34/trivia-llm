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
from typing import List, Any, Dict
from dotenv import load_dotenv

import database
import google.generativeai as genai

# --- Configuration ---
load_dotenv()
app = FastAPI(title="Trivia Game Backend", version="1.0.0")

ALLOWED_MODELS = {
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemma-3-27b-it",
}

# --- Global Configuration & State ---
try:
    DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"
    MODEL_TEMPERATURE = float(os.getenv("MODEL_TEMPERATURE", "1.0"))
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        raise ValueError("GEMINI_API_KEY is not set or is invalid in the .env file.")
    genai.configure(api_key=api_key)
    print("Google API client configured successfully.")

    with open('prompts.json', 'r', encoding='utf-8') as f:
        PROMPTS = json.load(f)
    print("Prompt templates file loaded successfully.")

    if DEBUG_MODE:
        print(f"DEBUG mode is enabled. Model temperature set to: {MODEL_TEMPERATURE}")

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    exit(1)

# Global dictionary to store game session states, including the preload event
game_sessions = {}


# --- Pydantic Models ---
class BaseModelWithModel(BaseModel):
    model: str
    gameId: str


class ThemeRequest(BaseModelWithModel):
    theme: str
    language: str


class QuestionRequest(BaseModelWithModel):
    category: str
    gameMode: str
    knowledgeLevel: str
    language: str
    theme: str | None = None
    includeCategoryTheme: bool
    subcategoryHistory: List[str] = Field(default_factory=list)
    entityHistory: List[str] = Field(default_factory=list)


class ExplanationRequest(BaseModelWithModel):
    language: str
    question: str
    correct_answer: str
    player_answer: str


class MutationRequest(BaseModelWithModel):
    language: str
    old_category: str
    theme: str | None = None
    existing_categories: List[str]


class PreloadRequest(BaseModelWithModel):
    categories: List[str]
    gameMode: str
    knowledgeLevel: str
    language: str
    theme: str | None = None
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

    inspirational_words_pool = PROMPTS["inspirational_words"][lang]
    random.shuffle(inspirational_words_pool)
    inspirational_words = ", ".join(inspirational_words_pool[:2])

    subcategory_history_prompt = ', '.join(
        f'"{item}"' for item in subcategory_history) if subcategory_history else "No history."
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
    json_str = ""
    try:
        json_match_md = re.search(r'```json\s*({[\s\S]*?})\s*```', text, re.DOTALL)
        if json_match_md:
            json_str = json_match_md.group(1)
        else:
            json_match_raw = re.search(r'{[\s\S]*}', text, re.DOTALL)
            if json_match_raw:
                full_match = json_match_raw.group(0)
                open_braces = 0
                end_index = -1
                for i, char in enumerate(full_match):
                    if char == '{':
                        open_braces += 1
                    elif char == '}':
                        open_braces -= 1
                    if open_braces == 0:
                        end_index = i + 1
                        break
                if end_index != -1:
                    json_str = full_match[:end_index]
                else:
                    json_str = full_match
        if not json_str: raise ValueError("No JSON object found in response.")
        return json.loads(json_str)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"JSON parsing failed, returning raw text. Reason: {e}")
        return text


async def call_generative_model(prompt: str, model_name: str):
    validate_model(model_name)
    if DEBUG_MODE:
        print(f"\n{'=' * 25} PROMPT TO API (model: {model_name}) {'=' * 25}")
        print(prompt)
        print("=" * 80 + "\n")

    use_json_mode = not model_name.startswith("gemma")
    try:
        model = genai.GenerativeModel(model_name)
        config = {"temperature": MODEL_TEMPERATURE}
        if use_json_mode:
            config["response_mime_type"] = "application/json"
        generation_config = genai.types.GenerationConfig(**config)
        response = await model.generate_content_async(prompt, generation_config=generation_config)
        if DEBUG_MODE:
            print(f"\n{'*' * 25} RAW RESPONSE FROM API ({model_name}) {'*' * 25}")
            print(response.text)
            print("*" * 80 + "\n")
        return extract_json_from_response(response.text)
    except Exception as e:
        print(f"API call error ({model_name}): {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Background Task for Preloading ---
async def _preload_task(game_id: str, model: str, request_data: PreloadRequest):
    if game_id not in game_sessions:
        game_sessions[game_id] = {"preloaded_questions": {}, "is_preloading": False}

    current_cache = game_sessions[game_id].get("preloaded_questions", {})
    categories_to_preload = [cat for cat in request_data.categories if not current_cache.get(cat)]

    if not categories_to_preload:
        print(f"[{game_id}] Cache is full. No preload needed.")
        if game_sessions[game_id].get("preload_event"):
            game_sessions[game_id]["preload_event"].set()
        return

    game_sessions[game_id]["is_preloading"] = True
    print(f"[{game_id}] Preload started for missing categories: {categories_to_preload}")

    async def generate_for_category(category: str):
            try:
                single_question_params = request_data.model_dump()
                single_question_params['category'] = category

                final_prompt = build_question_prompt(single_question_params, category)
                question_data = await call_generative_model(final_prompt, model)

                if question_data and isinstance(question_data, dict) and question_data.get("question"):

                    game_sessions[game_id]["preloaded_questions"][category] = question_data

                    database.add_question(question_data, single_question_params)

                    print(f"[{game_id}] Success: preloaded and saved question for '{category}'")
                else:
                     raise ValueError("Invalid data received from the model.")
            except Exception as e:
                game_sessions[game_id]["preloaded_questions"][category] = None
                print(f"[{game_id}] Error: failed to preload question for '{category}'. Reason: {e}")

        await asyncio.gather(*(generate_for_category(cat) for cat in categories_to_preload))

        game_sessions[game_id]["is_preloading"] = False
        if game_id in game_sessions and game_sessions[game_id].get("preload_event"):
            game_sessions[game_id]["preload_event"].set()
        print(f"[{game_id}] Preload finished.")


# --- API Endpoints ---
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
    preloaded_question = game_sessions.get(req.gameId, {}).get("preloaded_questions", {}).pop(req.category, None)

    if preloaded_question:
        print(f"[{req.gameId}] Serving preloaded question for '{req.category}'")
        return JSONResponse(content=preloaded_question)

    print(f"[{req.gameId}] Cache miss for '{req.category}'. Waiting for preload to finish...")

    session_event = game_sessions.get(req.gameId, {}).get("preload_event")
    if session_event:
        try:
            await asyncio.wait_for(session_event.wait(), timeout=15.0)
            rechecked_question = game_sessions[req.gameId]["preloaded_questions"].pop(req.category, None)
            if rechecked_question:
                print(f"[{req.gameId}] Question available after waiting. Serving for '{req.category}'")
                return JSONResponse(content=rechecked_question)
        except asyncio.TimeoutError:
            print(f"[{req.gameId}] Preload wait timed out. Generating question on demand.")

    print(f"[{req.gameId}] Question unavailable after preload. Generating on demand (fallback).")
    final_prompt = build_question_prompt(req.model_dump(), req.category)
    response_data = await call_generative_model(final_prompt, req.model)

    if response_data and isinstance(response_data, dict) and response_data.get("question"):
        database.add_question(response_data, req.model_dump())

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
        print("INFO: Received raw text as explanation. Packing into JSON format.")
        return JSONResponse(content={"explanation": response_data})
    else:
        raise HTTPException(status_code=500, detail="Invalid response format from the generative model.")


# --- App Lifecycle and Static Files ---
@app.on_event("startup")
async def startup_event():
    database.init_db()


@app.get("/", include_in_schema=False)
async def root():
    return FileResponse('trivia.html')


app.mount("/", StaticFiles(directory=".", html=True), name="static")
import os
import re
import json
import random
import asyncio
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Any, Dict
from dotenv import load_dotenv

# Import our new database module
import database
import google.generativeai as genai

# --- Configuration ---
load_dotenv()
app = FastAPI(title="Trivia Game Backend", version="1.0.0")

# Defined, constant list of allowed models
ALLOWED_MODELS = {
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemma-3-27b-it",
}

# --- Global Configuration ---
try:
    DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "TWOJ_KLUCZ_API_GOOGLE_GEMINI":
        raise ValueError("Klucz GEMINI_API_KEY nie jest ustawiony w pliku .env.")
    genai.configure(api_key=api_key)
    print("Klient Google API został pomyślnie skonfigurowany.")

    with open('prompts.json', 'r', encoding='utf-8') as f:
        PROMPTS = json.load(f)
    print("Plik z szablonami promptów został wczytany.")
    if DEBUG_MODE:
        print("Tryb DEBUG jest włączony. Prompty będą logowane do konsoli.")

except (ValueError, FileNotFoundError, json.JSONDecodeError) as e:
    print(f"BŁĄD KRYTYCZNY: {e}")
    exit(1)

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

# --- Helper Logic ---
def validate_model(model: str):
    """Checks if the provided model is in the allowed list."""
    if model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model '{model}' is not supported.")

def extract_json_from_response(text: str) -> Any:
    """Reliably extracts a JSON object from the model's text response."""
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

        if not json_str:
            raise ValueError("Nie znaleziono żadnego obiektu JSON w odpowiedzi.")

        return json.loads(json_str)

    except (json.JSONDecodeError, ValueError) as e:
        print(f"Błąd parsowania JSON, zwracam surowy tekst. Powód: {e}")
        return text

async def call_generative_model(prompt: str, model_name: str):
    """Calls the generative model, dynamically adjusting parameters based on model type."""
    validate_model(model_name)

    if DEBUG_MODE:
        print(f"\n{'='*25} PROMPT DO API (model: {model_name}) {'='*25}")
        print(prompt)
        print("="*80 + "\n")

    temperature = 1.0
    use_json_mode = not model_name.startswith("gemma")

    try:
        model = genai.GenerativeModel(model_name)

        config = {"temperature": temperature}
        if use_json_mode:
            config["response_mime_type"] = "application/json"

        generation_config = genai.types.GenerationConfig(**config)
        response = await model.generate_content_async(prompt, generation_config=generation_config)

        if DEBUG_MODE:
            print(f"\n{'*'*25} SUROWA ODPOWIEDŹ Z API ({model_name}) {'*'*25}")
            print(response.text)
            print("*"*80 + "\n")

        return extract_json_from_response(response.text)

    except Exception as e:
        print(f"Błąd wywołania API ({model_name}): {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- API Endpoints ---
@app.post("/api/generate-categories")
async def generate_categories(req: ThemeRequest):
    prompt = PROMPTS["generate_categories"][req.language].format(theme=req.theme)
    response_data = await call_generative_model(prompt, req.model)
    return JSONResponse(content=response_data)

@app.post("/api/generate-question")
async def generate_question(req: QuestionRequest):
    # In this mode, we always generate a new question to populate the database,
    # bypassing any cache lookup.

    print(f"[{req.gameId}] Generuję nowe pytanie dla '{req.category}' w celu rozbudowy bazy danych.")

    # Step 1: Build the prompt
    lang = req.language
    prompt_struct = PROMPTS["generate_question"][lang]
    knowledge_prompt = PROMPTS["knowledge_prompts"][req.knowledgeLevel][lang]
    game_mode_prompt = PROMPTS["game_mode_prompts"][req.gameMode][lang]
    theme_context = f"Pytanie musi dotyczyć motywu: {req.theme}." if req.includeCategoryTheme and req.theme else "Brak dodatkowego motywu."
    inspirational_words_pool = PROMPTS["inspirational_words"][lang]
    random.shuffle(inspirational_words_pool)
    inspirational_words = ", ".join(inspirational_words_pool[:2])

    subcategory_history_prompt = ', '.join(f'"{item}"' for item in req.subcategoryHistory) if req.subcategoryHistory else "Brak historii."
    entity_history_prompt = ', '.join(f'"{item}"' for item in req.entityHistory) if req.entityHistory else "Brak historii."

    context_lines = [
        line.format(
            category=req.category,
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
    final_prompt = "\n".join([
        prompt_struct["persona"],
        prompt_struct["chain_of_thought"],
        prompt_struct["context_header"],
        "\n".join(combined_rules),
        prompt_struct["output_format"]
    ])

    # Step 2: Call the AI model
    response_data = await call_generative_model(final_prompt, req.model)

    # Step 3: Save the new question to the database
    if response_data and isinstance(response_data, dict) and response_data.get("question"):
        database.add_question(response_data, req.model_dump())

    return JSONResponse(content=response_data)

@app.post("/api/mutate-category")
async def get_category_mutation(req: MutationRequest):
    prompt = PROMPTS["mutate_category"][req.language].format(
        old_category=req.old_category,
        theme=req.theme or "ogólny",
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
        print("INFO: Otrzymano surowy tekst jako wyjaśnienie. Pakuję do formatu JSON.")
        return JSONResponse(content={"explanation": response_data})
    else:
        raise HTTPException(status_code=500, detail="Otrzymano nieprawidłowy format odpowiedzi z modelu generatywnego.")

# --- App Lifecycle and Static Files ---
@app.on_event("startup")
async def startup_event():
    """Function to run when the server starts."""
    database.init_db()

@app.get("/", include_in_schema=False)
async def root():
    return FileResponse('trivia.html')

app.mount("/", StaticFiles(directory=".", html=True), name="static")
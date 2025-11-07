import os
import json
import asyncio
from datetime import datetime
from aiolimiter import AsyncLimiter
from openai import AsyncOpenAI
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()
DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"
api_key = os.getenv("OPENAI_API_KEY")
api_base_url = os.getenv("OPENAI_API_BASE")
if not api_key or not api_base_url:
    raise ValueError("OPENAI_API_KEY and OPENAI_API_BASE must be set in the .env file.")

client = AsyncOpenAI(api_key=api_key, base_url=api_base_url)
print("OpenAI client configured successfully.")

async def fetch_models_from_api():
    """Fetch list of models from OpenAI-compatible endpoint."""
    try:
        response = await client.models.list()
        models = [model.id for model in response.data]
        return models
    except Exception as e:
        print(f"Failed to fetch models from API: {e}")
        return None

# Runtime-configurable limits (override via env)
GENERATIVE_RATE_LIMIT_COUNT = int(os.getenv("GENERATIVE_RATE_LIMIT_COUNT", "20"))
GENERATIVE_RATE_LIMIT_PERIOD = int(os.getenv("GENERATIVE_RATE_LIMIT_PERIOD", "60"))
GENERATIVE_INFLIGHT_LIMIT = int(os.getenv("GENERATIVE_INFLIGHT_LIMIT", "3"))

MAX_CONCURRENT_PRELOAD_TASKS = int(os.getenv("MAX_CONCURRENT_PRELOAD_TASKS", "3"))
MAX_PRELOAD_CATEGORIES = int(os.getenv("MAX_PRELOAD_CATEGORIES", "20"))
MIN_PRELOAD_INTERVAL = int(os.getenv("MIN_PRELOAD_INTERVAL_SECONDS", "10"))

GEN_CALL_MAX_ATTEMPTS = int(os.getenv("GEN_CALL_MAX_ATTEMPTS", "2"))

# Load static models and prompts as fallback
with open('models.json', 'r', encoding='utf-8') as f:
    STATIC_MODELS_CONFIG = json.load(f)
    STATIC_QUESTION_MODELS = STATIC_MODELS_CONFIG.get("question_models", [])
    STATIC_EXPLANATION_MODELS = STATIC_MODELS_CONFIG.get("explanation_models", [])
    STATIC_CATEGORY_MODELS = STATIC_MODELS_CONFIG.get("category_models", [])
    STATIC_FALLBACK_MODEL = STATIC_MODELS_CONFIG.get("fallback_model")

# Dynamic models (to be populated on startup)
DYNAMIC_MODELS = None
QUESTION_MODELS = STATIC_QUESTION_MODELS
EXPLANATION_MODELS = STATIC_EXPLANATION_MODELS
CATEGORY_MODELS = STATIC_CATEGORY_MODELS
FALLBACK_MODEL = STATIC_FALLBACK_MODEL

# Initialize ALLOWED_MODELS and MODELS_BY_LANGUAGE with static models
MODELS_BY_LANGUAGE = {"pl": [], "en": []}
for model in STATIC_QUESTION_MODELS:
    if "languages" in model:
        if "pl" in model["languages"]:
            MODELS_BY_LANGUAGE["pl"].append(model["id"])
        if "en" in model["languages"]:
            MODELS_BY_LANGUAGE["en"].append(model["id"])

ALLOWED_MODELS = {model['id'] for model_list in [STATIC_QUESTION_MODELS, STATIC_EXPLANATION_MODELS, STATIC_CATEGORY_MODELS] for model in model_list}
if STATIC_FALLBACK_MODEL:
    ALLOWED_MODELS.add(STATIC_FALLBACK_MODEL)

def initialize_models(dynamic_models=None):
    global DYNAMIC_MODELS, QUESTION_MODELS, EXPLANATION_MODELS, CATEGORY_MODELS, FALLBACK_MODEL, MODELS_BY_LANGUAGE, ALLOWED_MODELS
    if dynamic_models:
        DYNAMIC_MODELS = dynamic_models
        # Use dynamic models for all categories, with display names
        QUESTION_MODELS = [{"id": model_id, "name": model_id} for model_id in dynamic_models]
        EXPLANATION_MODELS = [{"id": model_id, "name": model_id} for model_id in dynamic_models]
        CATEGORY_MODELS = [{"id": model_id, "name": model_id} for model_id in dynamic_models]
        FALLBACK_MODEL = dynamic_models[0] if dynamic_models else STATIC_FALLBACK_MODEL
    else:
        # Fallback to static models
        QUESTION_MODELS = STATIC_QUESTION_MODELS
        EXPLANATION_MODELS = STATIC_EXPLANATION_MODELS
        CATEGORY_MODELS = STATIC_CATEGORY_MODELS
        FALLBACK_MODEL = STATIC_FALLBACK_MODEL

    MODELS_BY_LANGUAGE = {"pl": [], "en": []}
    for model in QUESTION_MODELS:
        if "languages" in model:
            if "pl" in model["languages"]:
                MODELS_BY_LANGUAGE["pl"].append(model["id"])
            if "en" in model["languages"]:
                MODELS_BY_LANGUAGE["en"].append(model["id"])

    ALLOWED_MODELS = {model['id'] for model_list in [QUESTION_MODELS, EXPLANATION_MODELS, CATEGORY_MODELS] for model in model_list}
    if FALLBACK_MODEL:
        ALLOWED_MODELS.add(FALLBACK_MODEL)

    print(f"Models available for PL: {len(MODELS_BY_LANGUAGE['pl'])}")
    print(f"Models available for EN: {len(MODELS_BY_LANGUAGE['en'])}")
    print(f"Models configuration loaded. Fallback model set to: {FALLBACK_MODEL}")
    if DYNAMIC_MODELS:
        print(f"Using {len(DYNAMIC_MODELS)} dynamic models from API.")
    else:
        print("Using static models from models.json.")

with open('prompts.json', 'r', encoding='utf-8') as f:
    PROMPTS = json.load(f)
print("Prompt templates file loaded successfully.")

if DEBUG_MODE:
    print(f"DEBUG mode is enabled.")

# placeholders to be initialized on startup
generative_api_limiter: AsyncLimiter = None
GENERATIVE_CONCURRENCY_SEMAPHORE: asyncio.Semaphore = None

def initialize_async_resources():
    from state import PRELOAD_CONCURRENCY_SEMAPHORE, PRELOAD_STATUS_LOCK
    global generative_api_limiter, GENERATIVE_CONCURRENCY_SEMAPHORE, PRELOAD_CONCURRENCY_SEMAPHORE, PRELOAD_STATUS_LOCK
    generative_api_limiter = AsyncLimiter(GENERATIVE_RATE_LIMIT_COUNT, GENERATIVE_RATE_LIMIT_PERIOD)
    GENERATIVE_CONCURRENCY_SEMAPHORE = asyncio.Semaphore(GENERATIVE_INFLIGHT_LIMIT)
    PRELOAD_CONCURRENCY_SEMAPHORE = asyncio.Semaphore(MAX_CONCURRENT_PRELOAD_TASKS)
    PRELOAD_STATUS_LOCK = asyncio.Lock()
    if DEBUG_MODE:
        print("Startup completed. Rate limiter and semaphores initialized.")
        print(f"Generative rate limit: {GENERATIVE_RATE_LIMIT_COUNT}/{GENERATIVE_RATE_LIMIT_PERIOD}s, inflight: {GENERATIVE_INFLIGHT_LIMIT}")
        print(f"Preload concurrency limit: {MAX_CONCURRENT_PRELOAD_TASKS}, max categories per preload: {MAX_PRELOAD_CATEGORIES}")
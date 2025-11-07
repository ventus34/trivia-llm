import os
from datetime import datetime

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

import database
from config import initialize_async_resources, fetch_models_from_api, initialize_models, DEBUG_MODE, MAX_CONCURRENT_PRELOAD_TASKS, MAX_PRELOAD_CATEGORIES, GENERATIVE_RATE_LIMIT_COUNT, GENERATIVE_RATE_LIMIT_PERIOD, GENERATIVE_INFLIGHT_LIMIT

# Import routes to register them
from routes import (
    get_db_stats, get_db_prompts, get_db_errors, get_question_models,
    get_explanation_models, get_category_models,
    preload_questions, generate_question, generate_categories,
    get_category_mutation, get_incorrect_explanation,
    root, manifest, service_worker
)

# --- Configuration ---
app = FastAPI(title="Trivia Game Backend", version="1.0.0")

# Register API routes
app.get("/api/db/stats")(get_db_stats)
app.get("/api/db/prompts")(get_db_prompts)
app.get("/api/db/errors")(get_db_errors)
app.get("/api/models/questions")(get_question_models)
app.get("/api/models/explanations")(get_explanation_models)
app.get("/api/models/categories")(get_category_models)
app.post("/api/preload-questions")(preload_questions)
app.post("/api/generate-question")(generate_question)
app.post("/api/generate-categories")(generate_categories)
app.post("/api/mutate-category")(get_category_mutation)
app.post("/api/explain-incorrect")(get_incorrect_explanation)

# Register static file routes
app.get("/", include_in_schema=False)(root)
app.get("/manifest.json", include_in_schema=False)(manifest)
app.get("/service-worker.js", include_in_schema=False)(service_worker)

# --- App Lifecycle and Static Files ---
@app.on_event("startup")
async def startup_event():
    database.init_db()
    initialize_async_resources()

    # Fetch models from API and initialize
    dynamic_models = await fetch_models_from_api()
    initialize_models(dynamic_models)

    if DEBUG_MODE:
        print("Startup completed. Rate limiter and semaphores initialized.")
        print(f"Generative rate limit: {GENERATIVE_RATE_LIMIT_COUNT}/{GENERATIVE_RATE_LIMIT_PERIOD}s, inflight: {GENERATIVE_INFLIGHT_LIMIT}")
        print(f"Preload concurrency limit: {MAX_CONCURRENT_PRELOAD_TASKS}, max categories per preload: {MAX_PRELOAD_CATEGORIES}")

app.mount("/", StaticFiles(directory=".", html=True), name="static")
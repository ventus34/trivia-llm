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
    root
)

# Import live quiz routes
from live_quiz_routes import (
    create_room, join_room, get_room_status, submit_answer, host_control, sse_endpoint
)

# --- Configuration ---
app = FastAPI(title="Trivia Game Backend", version="1.0.0")

# Import cleanup functions
from live_quiz_routes import start_cleanup_task, stop_cleanup_task
from state import load_state_from_disk, save_state_to_disk, periodic_save_task

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

# Live Quiz API routes
app.post("/api/live-quiz/create-room")(create_room)
app.post("/api/live-quiz/join-room")(join_room)
app.get("/api/live-quiz/room-status/{game_id}")(get_room_status)
app.post("/api/live-quiz/submit-answer")(submit_answer)
app.post("/api/live-quiz/host-control")(host_control)
app.get("/api/live-quiz/events")(sse_endpoint)

# Register static file routes
app.get("/", include_in_schema=False)(root)

# Live Quiz static routes
app.get("/live-quiz/host", include_in_schema=False)(lambda: FileResponse('live-quiz-host.html'))
app.get("/live-quiz/player", include_in_schema=False)(lambda: FileResponse('live-quiz-player.html'))
app.get("/test", include_in_schema=False)(lambda: FileResponse('test_live_quiz.html'))

# --- App Lifecycle and Static Files ---
@app.on_event("startup")
async def startup_event():
    await database.init_db()
    initialize_async_resources()

    # Fetch models from API and initialize
    dynamic_models = await fetch_models_from_api()
    initialize_models(dynamic_models)

    # Start background cleanup task for live quiz games
    start_cleanup_task()

    if DEBUG_MODE:
        print("Startup completed. Rate limiter and semaphores initialized.")
        print(f"Generative rate limit: {GENERATIVE_RATE_LIMIT_COUNT}/{GENERATIVE_RATE_LIMIT_PERIOD}s, inflight: {GENERATIVE_INFLIGHT_LIMIT}")
        print(f"Preload concurrency limit: {MAX_CONCURRENT_PRELOAD_TASKS}, max categories per preload: {MAX_PRELOAD_CATEGORIES}")
        print("Live quiz cleanup task started.")

@app.on_event("shutdown")
async def shutdown_event():
    # Stop background cleanup task
    stop_cleanup_task()
    # Save game state to disk
    save_state_to_disk()
    print("Shutdown completed. Cleanup task stopped and state saved.")

app.mount("/", StaticFiles(directory=".", html=True), name="static")
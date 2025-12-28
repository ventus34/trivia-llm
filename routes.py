import json
import asyncio
from datetime import datetime
from fastapi import Request, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse

import database
from config import CATEGORY_MODELS, EXPLANATION_MODELS, FALLBACK_MODEL, PROMPTS, MAX_PRELOAD_CATEGORIES, MIN_PRELOAD_INTERVAL, DEBUG_MODE
from state import PRELOAD_STATUS_LOCK, PRELOAD_TASK_STATUS
from generative import call_generative_model, ensure_blueprints_exist
from preload import _preload_task
from utils import build_question_prompt, is_question_valid, format_explanation_part, update_generation_history
from models import GenerateCategoriesRequest, QuestionRequest, ExplanationRequest, MutationRequest, PreloadRequest

# --- API Endpoints ---
async def get_db_stats():
    return JSONResponse(content=await database.get_all_stats())

async def get_db_prompts():
    return JSONResponse(content=await database.get_prompt_history())

async def get_db_errors():
    return JSONResponse(content=await database.get_error_logs())

async def get_question_models():
    from config import QUESTION_MODELS
    return JSONResponse(content=QUESTION_MODELS)

async def get_explanation_models():
    from config import EXPLANATION_MODELS
    return JSONResponse(content=EXPLANATION_MODELS)

async def get_category_models():
    from config import CATEGORY_MODELS
    return JSONResponse(content=CATEGORY_MODELS)

async def preload_questions(req: PreloadRequest, background_tasks: BackgroundTasks):
    # Basic validation
    if not req.gameId:
        raise HTTPException(status_code=400, detail="gameId is required")
    if not req.category:
        raise HTTPException(status_code=400, detail="category is required")

    # Hardcode model to "trivia" router
    req.model = "trivia"

    # signature for deduplication
    req_signature = json.dumps(req.model_dump(), sort_keys=True)

    # Use a lock to avoid race conditions when scheduling multiple preload tasks concurrently
    from state import PRELOAD_STATUS_LOCK
    if PRELOAD_STATUS_LOCK is None:
        # Initialize if not done yet (fallback for race conditions)
        import asyncio
        PRELOAD_STATUS_LOCK = asyncio.Lock()
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
        background_tasks.add_task(_preload_task, req.gameId, "trivia", req)
        return JSONResponse(content={"message": "Preloading started."}, status_code=202)

async def generate_question(req: QuestionRequest):
    # Hardcode model to "trivia" router
    req.model = "trivia"
    
    cached_question = await database.get_and_remove_cached_question(req.category)
    if cached_question:
        if DEBUG_MODE: print(f"Serving question for '{req.category}' from DB cache.")
        
        # Format explanations for cached questions too, in case they were stored with old format
        if "explanation" in cached_question and isinstance(cached_question["explanation"], str):
            # Check if the explanation already has labels (to avoid double-formatting)
            has_labels = any(label in cached_question["explanation"] for label in ["Wyjaśnienie poprawnej odpowiedzi:", "Explanation of correct answer:"])
             
            if not has_labels and all(key in cached_question for key in ["explanation_correct", "explanation_distractors"]):
                # Get language from request to provide proper labels
                language = req.language if hasattr(req, 'language') else 'pl'
                 
                # Format explanation parts with clear labels
                explanation_parts = []
                 
                # Explanation of correct answer
                correct_explanation = format_explanation_part(cached_question.get("explanation_correct"))
                if correct_explanation:
                    if language == 'pl':
                        explanation_parts.append(f"Wyjaśnienie poprawnej odpowiedzi:\n{correct_explanation}")
                    else:  # English
                        explanation_parts.append(f"Explanation of correct answer:\n{correct_explanation}")
                 
                # Explanation of distractors
                distractors_explanation = format_explanation_part(cached_question.get("explanation_distractors"))
                if distractors_explanation:
                    if language == 'pl':
                        explanation_parts.append(f"Wyjaśnienie odpowiedzi niepoprawnych:\n{distractors_explanation}")
                    else:  # English
                        explanation_parts.append(f"Explanation of incorrect answers:\n{distractors_explanation}")
                 
                 
                cached_question["explanation"] = "\n\n".join(explanation_parts)
         
        return JSONResponse(content=cached_question)

    # If a preload is scheduled/running for this gameId, wait a short time for it to finish
    if status := PRELOAD_TASK_STATUS.get(req.gameId):
        try:
            await asyncio.wait_for(status["event"].wait(), timeout=30.0)
            cached_question = await database.get_and_remove_cached_question(req.category)
            if cached_question:
                if DEBUG_MODE: print(f"Serving question for '{req.category}' from cache after waiting.")
                return JSONResponse(content=cached_question)
        except asyncio.TimeoutError:
            if DEBUG_MODE: print(f"[{req.gameId}] Preload wait timed out for '{req.category}'. Generating on the fly.")

    # Ensure we have blueprints for this category
    language = req.language if hasattr(req, 'language') else 'pl'
    theme = req.theme if hasattr(req, 'theme') else 'General knowledge'
    try:
        await ensure_blueprints_exist(req.category, language, theme, "trivia")
    except Exception as e:
        print(f"Warning: Could not ensure blueprints for '{req.category}': {e}. Falling back to old generation.")
        # Continue with old method

    blueprint = await database.get_unused_blueprint(req.category)
    if blueprint:
        if DEBUG_MODE:
            print(f"Using blueprint for '{req.category}': subcategory={blueprint['subcategory']}, modifier={blueprint['modifier']}, target_answer={blueprint['target_answer']}")
        # Build prompt from blueprint
        prompt_struct = PROMPTS["generate_question_from_blueprint"][language]
        static_part = [
            prompt_struct["persona"],
            "\n".join(prompt_struct["static_instructions"])
        ]
        static_content = "\n\n".join(static_part)
        knowledge_key = req.knowledgeLevel if hasattr(req, 'knowledgeLevel') else 'basic'
        knowledge_prompt = PROMPTS["knowledge_prompts"][knowledge_key][language]
        game_mode_key = req.gameMode if hasattr(req, 'gameMode') else 'mcq'
        game_mode_prompt = PROMPTS["game_mode_prompts"][game_mode_key][language]
        dynamic_content = prompt_struct["task_template"].format(
            category=req.category,
            subcategory=blueprint['subcategory'],
            modifier=blueprint['modifier'] or '',
            target_answer=blueprint['target_answer'],
            knowledge_level=knowledge_prompt,
            game_mode=game_mode_prompt
        )
        full_prompt = f"{static_content}\n\n{dynamic_content}"
        
        MAX_RETRIES = 2
        last_error = None
        raw_response_last = None
        for attempt in range(MAX_RETRIES):
            try:
                if DEBUG_MODE: print(f"--- Blueprint-based generation attempt {attempt + 1}/{MAX_RETRIES} for '{req.category}' ---")
                data, raw_response = await call_generative_model(full_prompt, "trivia", return_raw=True)
                raw_response_last = raw_response
                is_valid, error_message = is_question_valid(data, req.gameMode)
                if is_valid:
                    # Ensure the answer matches the target_answer (optional check)
                    if data.get("answer") != blueprint['target_answer']:
                        print(f"Warning: Generated answer '{data.get('answer')}' does not match target '{blueprint['target_answer']}'. Still accepting.")
                    # Format explanations
                    explanation_parts = []
                    correct_explanation = format_explanation_part(data.get("explanation_correct"))
                    if correct_explanation:
                        if language == 'pl':
                            explanation_parts.append(f"Wyjaśnienie poprawnej odpowiedzi:\n{correct_explanation}")
                        else:
                            explanation_parts.append(f"Explanation of correct answer:\n{correct_explanation}")
                    distractors_explanation = format_explanation_part(data.get("explanation_distractors"))
                    if distractors_explanation:
                        if language == 'pl':
                            explanation_parts.append(f"Wyjaśnienie odpowiedzi niepoprawnych:\n{distractors_explanation}")
                        else:
                            explanation_parts.append(f"Explanation of incorrect answers:\n{distractors_explanation}")
                    data["explanation"] = "\n\n".join(explanation_parts)
                    await database.add_question(data, req.model_dump())
                    update_generation_history(req.category, data.get("subcategory"), data.get("key_entities"))
                    return JSONResponse(content=data)
                else:
                    last_error = ValueError(error_message)
                    print(f"WARNING: Validation failed on attempt {attempt + 1}: {error_message}. Raw response snippet: '{raw_response[:300]}...'")
                    await database.log_error_db("generate_question_validation", {"request": req.model_dump(), "error": error_message, "raw_response_snippet": raw_response[:300]})
            except Exception as e:
                last_error = e
                raw_response_last = raw_response_last or "No raw response captured."
                print(f"Exception on attempt {attempt + 1}/{MAX_RETRIES} for '{req.category}': {e}. Raw response snippet: '{raw_response_last[:300]}...'")
                await database.log_error_db("generate_question_exception", {"request": req.model_dump(), "error": str(e), "raw_response_snippet": raw_response_last[:300]})
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(1)
        # If we reach here, blueprint generation failed
        print(f"Blueprint generation failed for '{req.category}'. Falling back to old method.")
        # Mark blueprint as unused? We'll keep it used for now.
    else:
        print(f"No blueprint available for '{req.category}'. Falling back to old method.")

    # Fallback to old generation method (without blueprints)
    MAX_RETRIES = 2
    last_error = None
    raw_response_last = None
    for attempt in range(MAX_RETRIES):
        try:
            if DEBUG_MODE: print(f"--- Fallback generation attempt {attempt + 1}/{MAX_RETRIES} for '{req.category}' ---")

            if attempt > 0:
                req.includeCategoryTheme = not req.includeCategoryTheme  # Toggle theme inclusion for variation

            prompt = build_question_prompt(req.model_dump(), req.category)
            data, raw_response = await call_generative_model(prompt, "trivia", return_raw=True)
            raw_response_last = raw_response
            is_valid, error_message = is_question_valid(data, req.gameMode)
            if is_valid:
                # Get language from request to provide proper labels
                language = req.language if hasattr(req, 'language') else 'pl'
                  
                # Format explanation parts with clear labels
                explanation_parts = []
                  
                # Explanation of correct answer
                correct_explanation = format_explanation_part(data.get("explanation_correct"))
                if correct_explanation:
                    if language == 'pl':
                        explanation_parts.append(f"Wyjaśnienie poprawnej odpowiedzi:\n{correct_explanation}")
                    else:  # English
                        explanation_parts.append(f"Explanation of correct answer:\n{correct_explanation}")
                  
                # Explanation of distractors
                distractors_explanation = format_explanation_part(data.get("explanation_distractors"))
                if distractors_explanation:
                    if language == 'pl':
                        explanation_parts.append(f"Wyjaśnienie odpowiedzi niepoprawnych:\n{distractors_explanation}")
                    else:  # English
                        explanation_parts.append(f"Explanation of incorrect answers:\n{distractors_explanation}")
                  
                  
                data["explanation"] = "\n\n".join(explanation_parts)
                await database.add_question(data, req.model_dump())
                update_generation_history(req.category, data.get("subcategory"), data.get("key_entities"))
                return JSONResponse(content=data)
            else:
                last_error = ValueError(error_message)
                print(f"WARNING: Validation failed on attempt {attempt + 1}: {error_message}. Raw response snippet: '{raw_response[:300]}...'")
                await database.log_error_db("generate_question_validation", {"request": req.model_dump(), "error": error_message, "raw_response_snippet": raw_response[:300]})
        except Exception as e:
            last_error = e
            raw_response_last = raw_response_last or "No raw response captured."
            print(f"Exception on attempt {attempt + 1}/{MAX_RETRIES} for '{req.category}': {e}. Raw response snippet: '{raw_response_last[:300]}...'")
            await database.log_error_db("generate_question_exception", {"request": req.model_dump(), "error": str(e), "raw_response_snippet": raw_response_last[:300]})
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)

    error_message = f"Failed to generate a valid question for category '{req.category}' after {MAX_RETRIES} attempts. Final error: {last_error}"
    print(f"{error_message}. Last raw response snippet: '{raw_response_last[:300]}...'")
    await database.log_error_db("generate_question", {"request": req.model_dump(), "error": str(last_error), "raw_response_snippet": raw_response_last[:300]})
    fallback_response = {"question": "Wystąpił błąd podczas generowania pytania.", "options": [], "answer": "", "explanation": "Błąd serwera.", "subcategory": "Błąd", "key_entities": []}
    return JSONResponse(content=fallback_response, status_code=500)

async def generate_categories(req: GenerateCategoriesRequest):
    MAX_RETRIES = 2
    for attempt in range(MAX_RETRIES + 1):
        try:
            # Hardcode model to "trivia" router
            model_to_use = "trivia"
             
            # Use the helper function to build the prompt properly
            from utils import build_categories_prompt
            prompt = build_categories_prompt(req.language, req.theme)
            response_data, raw_response = await call_generative_model(prompt, model_to_use, return_raw=True)
            if response_data and isinstance(response_data, dict):
                return JSONResponse(content=response_data)
            else:
                if isinstance(response_data, dict) and response_data.get("error"):
                    print(f"Attempt {attempt + 1} failed: {response_data['error']}. Raw snippet: '{raw_response[:300]}...'")
                    await database.log_error_db("generate_categories_error", {"request": req.__dict__, "error": response_data['error'], "raw_response_snippet": raw_response[:300]})
        except Exception as e:
            raw_response = raw_response if 'raw_response' in locals() else "No response captured."
            print(f"Attempt {attempt + 1} failed for generate-categories: {e}. Raw snippet: '{raw_response[:300]}...'")
            await database.log_error_db("generate_categories_exception", {"request": req.__dict__, "error": str(e), "raw_response_snippet": raw_response[:300]})
            if attempt == MAX_RETRIES:
                raise HTTPException(status_code=500, detail=f"Failed to generate categories: {e}")
            await asyncio.sleep(1)

async def get_category_mutation(req: MutationRequest):
    try:
        # Hardcode model to "trivia" router
        model_to_use = "trivia"
        prompt_struct = PROMPTS["mutate_category"][req.language]
        prompt = prompt_struct["task_template"].format(old_category=req.old_category, theme=req.theme or "general", existing_categories=req.existing_categories)
         
        # Combine with static instructions if available
        if "static_instructions" in prompt_struct:
            static_content = "\n".join(prompt_struct["static_instructions"])
            prompt = f"{static_content}\n\n{prompt}"
             
        response_data, raw_response = await call_generative_model(prompt, model_to_use, return_raw=True)
        return JSONResponse(content=response_data) if isinstance(response_data, dict) else {"error": "Invalid response", "raw_snippet": raw_response[:300]}
    except Exception as e:
        raw_response = raw_response if 'raw_response' in locals() else "No response captured."
        print(f"ERROR in mutate-category: {e}. Raw snippet: '{raw_response[:300]}...'")
        await database.log_error_db("mutate_category", {"request": req.__dict__, "error": str(e), "raw_response_snippet": raw_response[:300]})
        raise HTTPException(status_code=500, detail=f"Failed to mutate category: {e}")

async def get_incorrect_explanation(req: ExplanationRequest):
    try:
        # Hardcode model to "trivia" router
        model_to_use = "trivia"
        prompt_struct = PROMPTS["explain_incorrect"][req.language]
        prompt = prompt_struct["task_template"].format(question=req.question, correct_answer=req.correct_answer, player_answer=req.player_answer)
         
        # Combine with static instructions if available
        if "static_instructions" in prompt_struct:
            static_content = "\n".join(prompt_struct["static_instructions"])
            prompt = f"{static_content}\n\n{prompt}"
         
        response_data, raw_response = await call_generative_model(prompt, model_to_use, return_raw=True)
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
        await database.log_error_db("explain_incorrect", {"request": req.__dict__, "error": str(e), "raw_response_snippet": raw_response[:300]})
        raise HTTPException(status_code=500, detail=f"Failed to get explanation: {e}")

# --- Static Files ---
async def root(): return FileResponse('trivia.html')

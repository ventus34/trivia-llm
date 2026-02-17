import json
import asyncio
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import HTTPException
from fastapi.responses import JSONResponse

from ..live_quiz_models import (
    LiveQuizGameState, Player, GameQuestion, Question,
    CreateRoomRequest, JoinRoomRequest, SubmitAnswerRequest,
    RoomStatus
)
from ..state import LIVE_QUIZ_GAMES, ROOM_CODES
from ..generative import call_generative_model
from ..config import DEBUG_MODE

async def broadcast_to_game(game_id: str, event_type: str, data: dict, active_sse_queues: Dict[str, List[asyncio.Queue]]):
    """Broadcast an SSE event to all connected clients in a game."""
    if game_id not in active_sse_queues:
        return

    # Update last activity timestamp for the game
    if game_id in LIVE_QUIZ_GAMES:
        LIVE_QUIZ_GAMES[game_id].last_activity = datetime.now()

    event = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }

    message = f"data: {json.dumps(event)}\n\n"
    dead_queues = []

    for queue in active_sse_queues[game_id]:
        try:
            queue.put_nowait(message)
        except asyncio.QueueFull:
            print(f"Queue full for game {game_id}, marking for removal")
            dead_queues.append(queue)
        except Exception as e:
            print(f"Failed to send SSE message: {e}")
            dead_queues.append(queue)

    # Remove dead queues
    for dead_queue in dead_queues:
        active_sse_queues[game_id].remove(dead_queue)

def generate_room_code() -> str:
    """Generate a 6-digit room code."""
    return ''.join(random.choices(string.digits, k=6))

def generate_player_id() -> str:
    """Generate a unique player ID."""
    return f"player_{datetime.now().timestamp()}_{random.randint(1000, 9999)}"

def generate_game_id() -> str:
    """Generate a unique game ID."""
    return f"game_{datetime.now().timestamp()}_{random.randint(1000, 9999)}"

async def generate_live_quiz_question(game_state: LiveQuizGameState, category: str, question_number: int):
    """Generate a question using the existing AI system."""
    from ..models import QuestionRequest
    from ..utils import build_question_prompt as build_prompt
    
    # Create request for the existing question generation system
    req = QuestionRequest(
        model=game_state.selected_question_model,
        gameId=game_state.game_id,
        category=category,
        gameMode=game_state.game_mode,
        knowledgeLevel=game_state.knowledge_level,
        language=game_state.language,
        theme=game_state.theme,
        includeCategoryTheme=game_state.include_category_theme
    )
    
    # Use the existing generation logic
    prompt = build_prompt(req.model_dump(), category)
    data, raw_response = await call_generative_model(prompt, req.model, return_raw=True)
    
    if not data or not isinstance(data, dict) or not data.get('question'):
        raise ValueError("Failed to generate valid question")
    
    # Create Question object
    question = Question(
        id=f"q_{question_number}_{datetime.now().timestamp()}",
        question=data.get("question", ""),
        options=data.get("options", []),
        answer=data.get("answer", ""),
        explanation=data.get("explanation_correct", data.get("explanation", "")),
        category=category,
        subcategory=data.get("subcategory"),
        key_entities=data.get("key_entities", [])
    )
    
    # Update generation history to track subcategories and key entities
    if question.subcategory and question.key_entities:
        from ..utils import update_generation_history
        update_generation_history(category, question.subcategory, question.key_entities)
    
    return question

async def start_question(game_id: str, question_index: int, active_sse_queues: Dict[str, List[asyncio.Queue]]):
    """Start a specific question."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    
    # Stop any existing timer for the current question
    if hasattr(game_state, 'current_timer_task') and game_state.current_timer_task:
        game_state.current_timer_task.cancel()
        game_state.current_timer_task = None
    
    # Reset timer state
    game_state.timer_paused = False
    game_state.timer_pause_started = None
    
    # Ensure questions array is large enough
    while len(game_state.questions) <= question_index:
        game_state.questions.append(None)
    
    # Generate question if it doesn't exist
    if game_state.questions[question_index] is None:
        try:
            category_cycle_position = question_index % 6
            category = game_state.categories[category_cycle_position]
            question_number = question_index + 1
            
            question = await generate_live_quiz_question(game_state, category, question_number)
            game_question = GameQuestion(
                question=question,
                category=category,
                question_number=question_number,
                time_limit=60
            )
            game_state.questions[question_index] = game_question
        except Exception as e:
            print(f"Failed to generate question {question_index + 1}: {e}")
            # Fallback
            category = game_state.categories[question_index % 6]
            question_number = question_index + 1
            game_state.questions[question_index] = GameQuestion(
                question=Question(
                    id=f"fallback_{question_number}",
                    question=f"Error generating question {question_number}",
                    options=["Option A", "Option B", "Option C", "Option D"],
                    answer="Option A",
                    explanation="Fallback question.",
                    category=category
                ),
                category=category,
                question_number=question_number,
                time_limit=60
            )
    
    game_question = game_state.questions[question_index]
    
    # Reset player states
    players_only = [p for p in game_state.players if p.id != game_state.host_id]
    for player in players_only:
        player.has_answered = False
        player.last_answer = None
        player.is_correct = None
    
    # Set question as active
    game_question.is_active = True
    game_question.started_at = datetime.now()
    game_question.expires_at = game_question.started_at + timedelta(seconds=game_question.time_limit)
    game_question.answers = {}
    
    game_state.current_question_index = question_index
    game_state.question_started_at = game_question.started_at
    
    # Broadcast question start
    await broadcast_to_game(game_id, "question_started", {
        "question_number": game_question.question_number,
        "total_questions": game_state.total_questions,
        "category": game_question.category,
        "question": game_question.question.question,
        "options": game_question.question.options,
        "time_limit": game_question.time_limit,
        "expires_at": game_question.expires_at.isoformat()
    }, active_sse_queues)
    
    # Start timer
    from ..live_quiz_routes import question_timer
    game_state.current_timer_task = asyncio.create_task(question_timer(game_id, question_index))
    
    # Pre-generate next
    if question_index < game_state.total_questions - 1:
        asyncio.create_task(pregenerate_next_question(game_id, question_index + 1))

async def pregenerate_next_question(game_id: str, next_question_index: int):
    """Pre-generate the next question in the background."""
    try:
        game_state = LIVE_QUIZ_GAMES[game_id]
        while len(game_state.questions) <= next_question_index:
            game_state.questions.append(None)
        
        if game_state.questions[next_question_index] is None:
            category = game_state.categories[next_question_index % 6]
            question_number = next_question_index + 1
            question = await generate_live_quiz_question(game_state, category, question_number)
            game_state.questions[next_question_index] = GameQuestion(
                question=question,
                category=category,
                question_number=question_number,
                time_limit=60
            )
    except Exception as e:
        print(f"Failed to pre-generate question {next_question_index + 1}: {e}")

async def show_question_results(game_id: str, active_sse_queues: Dict[str, List[asyncio.Queue]]):
    """Show results for the current question."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    game_question = game_state.questions[game_state.current_question_index]
    game_question.is_active = False
    
    correct_answer = game_question.question.answer
    for player_id, answer_data in game_question.answers.items():
        player = next((p for p in game_state.players if p.id == player_id), None)
        if player:
            if answer_data.get("skipped", False) or (answer_data.get("answer", "").strip() == ""):
                is_correct = False
                answer_data["is_correct"] = is_correct
                player.is_correct = is_correct
            else:
                is_correct = answer_data["answer"].strip().lower() == correct_answer.lower()
                answer_data["is_correct"] = is_correct
                player.is_correct = is_correct
                if is_correct:
                    player.score += 100
                else:
                    player.score -= 35
    
    await broadcast_to_game(game_id, "question_results", {
        "question_number": game_question.question_number,
        "correct_answer": correct_answer,
        "explanation": game_question.question.explanation,
        "answers": {
            pid: {
                "player_name": next(p.name for p in game_state.players if p.id == pid),
                "answer": "Skipped" if (data.get("skipped", False) or data.get("answer", "").strip() == "") else data.get("answer", "No Answer"),
                "is_correct": data["is_correct"],
                "skipped": data.get("skipped", False) or data.get("answer", "").strip() == ""
            }
            for pid, data in game_question.answers.items()
        },
        "scores": {p.id: p.score for p in game_state.players}
    }, active_sse_queues)

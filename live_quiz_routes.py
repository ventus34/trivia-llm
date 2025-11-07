"""
@file live_quiz_routes.py
Routes and handlers for the live quiz game system using SSE.
"""

import json
import asyncio
import random
import string
from datetime import datetime, timedelta
from typing import Dict, List
from fastapi import Request, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse

from live_quiz_models import (
    LiveQuizGameState, Player, GameQuestion, Question,
    CreateRoomRequest, JoinRoomRequest, SubmitAnswerRequest, HostControlRequest,
    RoomStatus, SSEEvent, LIVE_QUIZ_GAMES, ROOM_CODES
)
from generative import call_generative_model
from config import PROMPTS, DEBUG_MODE

# --- SSE CONNECTION MANAGEMENT ---
# Store active SSE connections with their queues
ACTIVE_SSE_QUEUES: Dict[str, List[asyncio.Queue]] = {}

def generate_room_code() -> str:
    """Generate a 6-digit room code."""
    return ''.join(random.choices(string.digits, k=6))

def generate_player_id() -> str:
    """Generate a unique player ID."""
    return f"player_{datetime.now().timestamp()}_{random.randint(1000, 9999)}"

def generate_game_id() -> str:
    """Generate a unique game ID."""
    return f"game_{datetime.now().timestamp()}_{random.randint(1000, 9999)}"

# Store active SSE connections with their queues
ACTIVE_SSE_QUEUES: Dict[str, List[asyncio.Queue]] = {}

async def broadcast_to_game(game_id: str, event_type: str, data: dict):
    """Broadcast an SSE event to all connected clients in a game."""
    if game_id not in ACTIVE_SSE_QUEUES:
        return

    event = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }
    
    message = f"data: {json.dumps(event)}\n\n"
    dead_queues = []
    
    for queue in ACTIVE_SSE_QUEUES[game_id]:
        try:
            await queue.put(message)
        except Exception as e:
            print(f"Failed to send SSE message: {e}")
            dead_queues.append(queue)
    
    # Remove dead queues
    for dead_queue in dead_queues:
        ACTIVE_SSE_QUEUES[game_id].remove(dead_queue)

async def generate_live_quiz_question(game_state: LiveQuizGameState, category: str, question_number: int):
    """Generate a question using the existing AI system."""
    from models import QuestionRequest
    
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
    prompt = build_question_prompt(req.model_dump(), category)
    data, raw_response = await call_generative_model(prompt, req.model, temperature=1.2, return_raw=True)
    
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
    
    return question

def build_question_prompt(request_data: dict, category: str) -> str:
    """Build question prompt for live quiz (simplified version)."""
    from utils import build_question_prompt as build_prompt
    return build_prompt(request_data, category)

# --- API ENDPOINTS ---

async def create_room(req: CreateRoomRequest):
    """Create a new live quiz room."""
    if len(req.categories) != 6:
        raise HTTPException(status_code=400, detail="Exactly 6 categories are required")
    
    # Generate room code and game ID
    while True:
        room_code = generate_room_code()
        if room_code not in ROOM_CODES:
            break
    
    game_id = generate_game_id()
    
    # Create host player
    host_player = Player(
        id=f"host_{game_id}",
        name=req.host_name,
        joined_at=datetime.now()
    )
    
    # Create game state
    total_questions = len(req.categories) * req.questions_per_category
    game_state = LiveQuizGameState(
        game_id=game_id,
        room_code=room_code,
        host_id=host_player.id,
        categories=req.categories,
        players=[host_player],
        questions=[],  # Will be generated when game starts
        status="waiting",
        created_at=datetime.now(),
        game_mode=req.game_mode,
        knowledge_level=req.knowledge_level,
        language=req.language,
        theme=req.theme,
        include_category_theme=req.include_category_theme,
        selected_question_model=req.selected_question_model,
        selected_explanation_model=req.selected_explanation_model,
        selected_category_model=req.selected_category_model,
        questions_per_category=req.questions_per_category,
        total_questions=total_questions
    )
    
    # Store game
    LIVE_QUIZ_GAMES[game_id] = game_state
    ROOM_CODES[room_code] = game_id
    
    return JSONResponse(content={
        "game_id": game_id,
        "room_code": room_code,
        "host_id": host_player.id
    })

async def join_room(req: JoinRoomRequest):
    """Join an existing live quiz room."""
    if req.room_code not in ROOM_CODES:
        raise HTTPException(status_code=404, detail="Room not found")
    
    game_id = ROOM_CODES[req.room_code]
    game_state = LIVE_QUIZ_GAMES[game_id]
    
    if len(game_state.players) >= 12:  # Max 12 players
        raise HTTPException(status_code=400, detail="Room is full")
    
    # Check if game already started
    if game_state.status != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")
    
    # Create new player
    player = Player(
        id=generate_player_id(),
        name=req.player_name,
        joined_at=datetime.now()
    )
    
    game_state.players.append(player)
    
    # Broadcast to all clients
    await broadcast_to_game(game_id, "player_joined", {
        "player": {
            "id": player.id,
            "name": player.name,
            "score": player.score
        },
        "player_count": len(game_state.players)
    })
    
    # Also send updated player list specifically to host
    players_data = [{"id": p.id, "name": p.name, "score": p.score} for p in game_state.players]
    await broadcast_to_game(game_id, "players_update", {
        "player_count": len(game_state.players),
        "players": players_data
    })
    
    return JSONResponse(content={
        "game_id": game_id,
        "player_id": player.id,
        "room_code": game_state.room_code,
        "host_id": game_state.host_id,
        "categories": game_state.categories
    })

async def get_room_status(game_id: str):
    """Get current room status."""
    if game_id not in LIVE_QUIZ_GAMES:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = LIVE_QUIZ_GAMES[game_id]
    host_player = next((p for p in game_state.players if p.id == game_state.host_id), None)
    
    return JSONResponse(content=RoomStatus(
        game_id=game_id,
        room_code=game_state.room_code,
        host_name=host_player.name if host_player else "Unknown",
        status=game_state.status,
        player_count=len(game_state.players),
        categories=game_state.categories,
        current_question=game_state.current_question_index + 1 if game_state.status == "playing" else None,
        total_questions=game_state.total_questions,
        created_at=game_state.created_at
    ))

async def submit_answer(req: SubmitAnswerRequest):
    """Submit an answer for the current question."""
    if req.game_id not in LIVE_QUIZ_GAMES:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = LIVE_QUIZ_GAMES[req.game_id]
    current_question = game_state.questions[game_state.current_question_index]
    
    # Find player
    player = next((p for p in game_state.players if p.id == req.player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Record answer
    current_question.answers[req.player_id] = {
        "answer": req.answer,
        "timestamp": datetime.now().isoformat(),
        "is_correct": None  # Will be set when question is scored
    }
    
    player.has_answered = True
    player.last_answer = req.answer
    
    # Check if all players have answered (excluding host)
    players_only = [p for p in game_state.players if p.id != game_state.host_id]
    all_answered = all(p.has_answered for p in players_only)
    no_time_left = datetime.now() >= current_question.expires_at if current_question.expires_at else False
    
    # Count only non-host players for answer status
    players_only = [p for p in game_state.players if p.id != game_state.host_id]
    answered_count = sum(1 for p in players_only if p.has_answered)
    
    await broadcast_to_game(req.game_id, "answer_submitted", {
        "player_id": req.player_id,
        "player_name": player.name,
        "has_answered": True,
        "total_players": len(players_only),
        "answered_count": answered_count
    })
    
    # If all answered or time's up, show results
    if all_answered or no_time_left:
        await show_question_results(req.game_id)
    
    return JSONResponse(content={"message": "Answer submitted"})

async def host_control(req: HostControlRequest):
    """Handle host control actions."""
    if req.game_id not in LIVE_QUIZ_GAMES:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = LIVE_QUIZ_GAMES[req.game_id]
    
    if req.action == "start_game":
        return await start_game(req.game_id)
    elif req.action == "pause_timer":
        return await pause_timer(req.game_id)
    elif req.action == "resume_timer":
        return await resume_timer(req.game_id)
    elif req.action == "next_question":
        return await next_question(req.game_id)
    elif req.action == "regenerate_question":
        return await regenerate_question(req.game_id)
    else:
        raise HTTPException(status_code=400, detail="Unknown action")

# --- GAME FLOW FUNCTIONS ---

async def start_game(game_id: str):
    """Start the live quiz game."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    game_state.status = "playing"
    game_state.started_at = datetime.now()
    
    # Initialize questions array (will be generated on-demand)
    game_state.questions = []
    
    # Start first question (generate only the first one)
    await start_question(game_id, 0)
    
    await broadcast_to_game(game_id, "game_started", {
        "total_questions": game_state.total_questions,
        "categories": game_state.categories
    })
    
    return JSONResponse(content={"message": "Game started"})

async def start_question(game_id: str, question_index: int):
    """Start a specific question."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    
    # Ensure questions array is large enough
    while len(game_state.questions) <= question_index:
        game_state.questions.append(None)  # Placeholder for ungenerated questions
    
    # Generate question if it doesn't exist
    if game_state.questions[question_index] is None:
        try:
            # Calculate category using 6-category cycling system
            # Questions cycle through categories: 1,2,3,4,5,6,1,2,3,4,5,6...
            category_cycle_position = question_index % 6
            category_index = category_cycle_position  # Direct mapping: 0->Cat1, 1->Cat2, etc.
            category = game_state.categories[category_index]
            
            # Calculate question number within the category
            questions_per_round = len(game_state.categories)  # 6 questions per full cycle
            questions_in_current_round = question_index // questions_per_round
            question_number_in_category = questions_in_current_round + 1
            
            # Calculate overall question number (1-based)
            question_number = question_index + 1
            
            # Generate the question
            question = await generate_live_quiz_question(game_state, category, question_number)
            game_question = GameQuestion(
                question=question,
                category=category,
                question_number=question_number,
                time_limit=60
            )
            game_state.questions[question_index] = game_question
            
            print(f"Generated question {question_number} for category {category_cycle_position + 1}: {category} (round {question_number_in_category})")
            
        except Exception as e:
            print(f"Failed to generate question {question_index + 1}: {e}")
            # Add a fallback question
            category_cycle_position = question_index % 6
            category_index = category_cycle_position
            category = game_state.categories[category_index]
            question_number = question_index + 1
            
            fallback_question = GameQuestion(
                question=Question(
                    id=f"fallback_{question_number}",
                    question=f"Error generating question {question_number}",
                    options=["Option A", "Option B", "Option C", "Option D"],
                    answer="Option A",
                    explanation="This is a fallback question due to generation error.",
                    category=category
                ),
                category=category,
                question_number=question_number,
                time_limit=60
            )
            game_state.questions[question_index] = fallback_question
    
    game_question = game_state.questions[question_index]
    
    # Reset player states (exclude host from answering requirement)
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
        "category": game_question.category,
        "question": game_question.question.question,
        "options": game_question.question.options,
        "time_limit": game_question.time_limit,
        "expires_at": game_question.expires_at.isoformat()
    })
    
    # Start timer
    asyncio.create_task(question_timer(game_id, question_index))
    
    # Start pre-generating next question in background (but not the last one)
    if question_index < game_state.total_questions - 1:
        asyncio.create_task(pregenerate_next_question(game_id, question_index + 1))

async def pregenerate_next_question(game_id: str, next_question_index: int):
    """Pre-generate the next question in the background."""
    try:
        game_state = LIVE_QUIZ_GAMES[game_id]
        
        # Ensure questions array is large enough
        while len(game_state.questions) <= next_question_index:
            game_state.questions.append(None)
        
        # Only generate if not already generated
        if game_state.questions[next_question_index] is None:
            # Calculate category using 6-category cycling system
            category_cycle_position = next_question_index % 6
            category_index = category_cycle_position
            category = game_state.categories[category_index]
            
            # Calculate question number within the category
            questions_per_round = len(game_state.categories)  # 6 questions per full cycle
            questions_in_current_round = next_question_index // questions_per_round
            question_number_in_category = questions_in_current_round + 1
            question_number = next_question_index + 1
            
            question = await generate_live_quiz_question(game_state, category, question_number)
            game_question = GameQuestion(
                question=question,
                category=category,
                question_number=question_number,
                time_limit=60
            )
            game_state.questions[next_question_index] = game_question
            
            print(f"Pre-generated question {question_number} for category {category_cycle_position + 1}: {category} (round {question_number_in_category})")
            
    except Exception as e:
        print(f"Failed to pre-generate question {next_question_index + 1}: {e}")
        # Don't create fallback for pre-generation - let it generate on demand if needed

async def question_timer(game_id: str, question_index: int):
    """Handle question timer."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    game_question = game_state.questions[question_index]
    
    while game_question.is_active and datetime.now() < game_question.expires_at:
        if not game_state.timer_paused:
            remaining = int((game_question.expires_at - datetime.now()).total_seconds())
            await broadcast_to_game(game_id, "timer_update", {
                "question_number": game_question.question_number,
                "remaining_seconds": remaining
            })
        
        await asyncio.sleep(1)
    
    # Time's up
    if game_question.is_active:
        await show_question_results(game_id)

async def pause_timer(game_id: str):
    """Pause the question timer."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    if not game_state.timer_paused:
        game_state.timer_paused = True
        game_state.timer_pause_started = datetime.now()
        await broadcast_to_game(game_id, "timer_paused", {})
    return JSONResponse(content={"message": "Timer paused"})

async def resume_timer(game_id: str):
    """Resume the question timer."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    if game_state.timer_paused and game_state.timer_pause_started:
        pause_duration = datetime.now() - game_state.timer_pause_started
        game_question = game_state.questions[game_state.current_question_index]
        game_question.expires_at += pause_duration
        game_state.timer_paused = False
        game_state.timer_pause_started = None
        await broadcast_to_game(game_id, "timer_resumed", {})
    return JSONResponse(content={"message": "Timer resumed"})

async def show_question_results(game_id: str):
    """Show results for the current question."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    game_question = game_state.questions[game_state.current_question_index]
    game_question.is_active = False
    
    # Score answers
    correct_answer = game_question.question.answer
    for player_id, answer_data in game_question.answers.items():
        player = next((p for p in game_state.players if p.id == player_id), None)
        if player:
            is_correct = answer_data["answer"].strip().lower() == correct_answer.lower()
            answer_data["is_correct"] = is_correct
            player.is_correct = is_correct
            
            if is_correct:
                player.score += 100
            else:
                player.score -= 25
    
    # Broadcast results
    await broadcast_to_game(game_id, "question_results", {
        "question_number": game_question.question_number,
        "correct_answer": correct_answer,
        "explanation": game_question.question.explanation,
        "answers": {
            pid: {
                "player_name": next(p.name for p in game_state.players if p.id == pid),
                "answer": data["answer"],
                "is_correct": data["is_correct"]
            }
            for pid, data in game_question.answers.items()
        },
        "scores": {p.id: p.score for p in game_state.players}
    })

async def next_question(game_id: str):
    """Move to the next question."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    next_index = game_state.current_question_index + 1
    
    if next_index >= game_state.total_questions:
        # Game finished
        game_state.status = "finished"
        await broadcast_to_game(game_id, "game_finished", {
            "final_scores": {p.id: p.score for p in game_state.players},
            "winner": max(game_state.players, key=lambda p: p.score).name
        })
        return JSONResponse(content={"message": "Game finished"})
    
    # Start the next question (will be generated on-demand if needed)
    await start_question(game_id, next_index)
    return JSONResponse(content={"message": "Next question started"})

async def regenerate_question(game_id: str):
    """Regenerate the current question."""
    game_state = LIVE_QUIZ_GAMES[game_id]
    current_question = game_state.questions[game_state.current_question_index]
    
    try:
        # Generate new question
        new_question = await generate_live_quiz_question(
            game_state, 
            current_question.category, 
            current_question.question_number
        )
        
        # Update question
        current_question.question = new_question
        current_question.answers = {}
        
        # Reset player states (exclude host from answering requirement)
        players_only = [p for p in game_state.players if p.id != game_state.host_id]
        for player in players_only:
            player.has_answered = False
            player.last_answer = None
            player.is_correct = None
        
        await broadcast_to_game(game_id, "question_regenerated", {
            "question": new_question.question,
            "options": new_question.options
        })
        
        return JSONResponse(content={"message": "Question regenerated"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate question: {str(e)}")

# --- SSE ENDPOINT ---

async def sse_endpoint(request: Request):
    """Server-Sent Events endpoint for real-time communication."""
    game_id = request.query_params.get("game_id")
    player_id = request.query_params.get("player_id")
    connection_type = request.query_params.get("type", "player")  # host or player
    
    if not game_id or not player_id:
        raise HTTPException(status_code=400, detail="game_id and player_id are required")
    
    if game_id not in LIVE_QUIZ_GAMES:
        raise HTTPException(status_code=404, detail="Game not found")
    
    async def event_stream():
        # Create message queue for this connection
        message_queue = asyncio.Queue()
        
        # Add to active queues
        if game_id not in ACTIVE_SSE_QUEUES:
            ACTIVE_SSE_QUEUES[game_id] = []
        ACTIVE_SSE_QUEUES[game_id].append(message_queue)
        
        try:
            # Send initial connection event
            game_state = LIVE_QUIZ_GAMES[game_id]
            initial_data = {
                "connection_type": connection_type,
                "game_status": game_state.status,
                "current_question": game_state.current_question_index + 1 if game_state.status == "playing" else None,
                "player_count": len(game_state.players),
                "players": [{"id": p.id, "name": p.name, "score": p.score} for p in game_state.players]
            }
            
            yield f"data: {json.dumps({'type': 'connected', 'data': initial_data})}\n\n"
            
            # Send immediate player count update for host
            if connection_type == "host":
                yield f"data: {json.dumps({'type': 'players_update', 'data': {'player_count': len(game_state.players), 'players': initial_data['players']}})}\n\n"
            
            # Keep connection alive and check for messages
            last_ping = datetime.now()
            while True:
                current_time = datetime.now()
                
                # Send ping every 30 seconds
                if (current_time - last_ping).total_seconds() >= 30:
                    yield f"data: {json.dumps({'type': 'ping', 'data': {'timestamp': current_time.isoformat()}})}\n\n"
                    last_ping = current_time
                
                # Check for new messages to send
                try:
                    message = await asyncio.wait_for(message_queue.get(), timeout=1.0)
                    yield message
                except asyncio.TimeoutError:
                    pass
                
                # Check if this queue is still active
                if game_id in ACTIVE_SSE_QUEUES and message_queue not in ACTIVE_SSE_QUEUES[game_id]:
                    break
                
                # Brief pause to prevent tight loop
                await asyncio.sleep(0.1)
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"SSE connection error: {e}")
        finally:
            # Clean up queue
            if game_id in ACTIVE_SSE_QUEUES and message_queue in ACTIVE_SSE_QUEUES[game_id]:
                ACTIVE_SSE_QUEUES[game_id].remove(message_queue)
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )
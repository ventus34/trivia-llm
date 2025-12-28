"""
@file live_quiz_routes.py
Routes and handlers for the live quiz game system using SSE.
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List
from fastapi import Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from live_quiz_models import (
    LiveQuizGameState, Player,
    CreateRoomRequest, JoinRoomRequest, SubmitAnswerRequest, HostControlRequest,
    RoomStatus
)
from state import LIVE_QUIZ_GAMES, ROOM_CODES
from services.live_game_service import (
    broadcast_to_game, generate_room_code, generate_player_id, generate_game_id,
    start_question, show_question_results
)

# --- SSE CONNECTION MANAGEMENT ---
# Store active SSE connections with their queues
ACTIVE_SSE_QUEUES: Dict[str, List[asyncio.Queue]] = {}

# --- CLEANUP MANAGEMENT ---
# Background task for cleaning up stale games and connections
cleanup_task = None

async def cleanup_stale_games():
    """Background task to clean up stale games and connections."""
    while True:
        try:
            current_time = datetime.now()
            stale_games = []

            # Check for stale games (no activity for 24 hours)
            for game_id, game_state in list(LIVE_QUIZ_GAMES.items()):
                if game_state.last_activity:
                    inactivity_duration = current_time - game_state.last_activity
                    if inactivity_duration.total_seconds() > 86400:  # 24 hours
                        stale_games.append(game_id)

            # Clean up stale games
            for game_id in stale_games:
                if game_id in LIVE_QUIZ_GAMES:
                    game_state = LIVE_QUIZ_GAMES[game_id]
                    room_code = game_state.room_code

                    # Cancel any running timer tasks
                    if hasattr(game_state, 'current_timer_task') and game_state.current_timer_task:
                        try:
                            game_state.current_timer_task.cancel()
                        except Exception as e:
                            print(f"Error cancelling timer task for game {game_id}: {e}")

                    # Notify any remaining connected clients
                    try:
                        await broadcast_to_game(game_id, "game_expired", {
                            "message": "This game has been automatically closed due to inactivity.",
                            "reason": "inactive"
                        }, ACTIVE_SSE_QUEUES)
                    except Exception as e:
                        print(f"Error broadcasting game expiration for {game_id}: {e}")

                    # Remove from storage
                    del LIVE_QUIZ_GAMES[game_id]
                    if room_code in ROOM_CODES:
                        del ROOM_CODES[room_code]

                    # Clean up SSE queues
                    if game_id in ACTIVE_SSE_QUEUES:
                        del ACTIVE_SSE_QUEUES[game_id]

                    print(f"Cleaned up stale game: {game_id} (room: {room_code})")

            # Clean up empty SSE queue entries
            empty_queues = [game_id for game_id, queues in ACTIVE_SSE_QUEUES.items() if len(queues) == 0]
            for game_id in empty_queues:
                del ACTIVE_SSE_QUEUES[game_id]

        except Exception as e:
            print(f"Error during cleanup: {e}")

        # Run cleanup every 5 minutes
        await asyncio.sleep(300)

def start_cleanup_task():
    """Start the background cleanup task."""
    global cleanup_task
    if cleanup_task is None or cleanup_task.done():
        cleanup_task = asyncio.create_task(cleanup_stale_games())
        print("Started background cleanup task")

def stop_cleanup_task():
    """Stop the background cleanup task."""
    global cleanup_task
    if cleanup_task and not cleanup_task.done():
        cleanup_task.cancel()
        print("Stopped background cleanup task")

async def question_timer(game_id: str, question_index: int):
    """Handle question timer."""
    if game_id not in LIVE_QUIZ_GAMES:
        return
    game_state = LIVE_QUIZ_GAMES[game_id]
    if question_index >= len(game_state.questions):
        return
    game_question = game_state.questions[question_index]
    
    while game_question.is_active and datetime.now() < game_question.expires_at:
        if not game_state.timer_paused:
            remaining = int((game_question.expires_at - datetime.now()).total_seconds())
            await broadcast_to_game(game_id, "timer_update", {
                "question_number": game_question.question_number,
                "remaining_seconds": remaining
            }, ACTIVE_SSE_QUEUES)
        
        await asyncio.sleep(1)
    
    # Time's up
    if game_question.is_active:
        await show_question_results(game_id, ACTIVE_SSE_QUEUES)

# --- API ENDPOINTS ---

async def create_room(req: CreateRoomRequest):
    """Create a new live quiz room."""
    if len(req.categories) != 6:
        raise HTTPException(status_code=400, detail="Exactly 6 categories are required")

    while True:
        room_code = generate_room_code()
        if room_code not in ROOM_CODES:
            break

    game_id = generate_game_id()
    host_player = Player(
        id=f"host_{game_id}",
        name="Host",
        joined_at=datetime.now()
    )

    total_questions = len(req.categories) * req.questions_per_category
    game_state = LiveQuizGameState(
        game_id=game_id,
        room_code=room_code,
        host_id=host_player.id,
        categories=req.categories,
        players=[host_player],
        questions=[],
        status="waiting",
        created_at=datetime.now(),
        last_activity=datetime.now(),
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

    if game_state.status == "finished":
        raise HTTPException(status_code=400, detail="Game has already finished")

    # Reconnection logic
    existing_player = next((p for p in game_state.players if p.name == req.player_name and p.id != game_state.host_id), None)
    if existing_player:
        existing_player.connected = True
        existing_player.last_seen = datetime.now()
        existing_player.reconnect_count += 1
        
        await broadcast_to_game(game_id, "player_reconnected", {
            "player": {"id": existing_player.id, "name": existing_player.name, "score": existing_player.score},
            "player_count": len(game_state.players)
        }, ACTIVE_SSE_QUEUES)

        return JSONResponse(content={
            "game_id": game_id,
            "player_id": existing_player.id,
            "room_code": game_state.room_code,
            "host_id": game_state.host_id,
            "categories": game_state.categories,
            "game_status": game_state.status,
            "is_reconnection": True,
            "current_question": game_state.current_question_index + 1 if game_state.current_question_index is not None else None,
            "player_score": existing_player.score
        })

    if len(game_state.players) >= 12:
        raise HTTPException(status_code=400, detail="Room is full")

    player = Player(
        id=generate_player_id(),
        name=req.player_name,
        joined_at=datetime.now(),
        last_seen=datetime.now()
    )

    if game_state.status == "playing":
        player.has_answered = True
        player.last_answer = "late_join"
        player.is_correct = False

    game_state.players.append(player)

    await broadcast_to_game(game_id, "player_joined", {
        "player": {"id": player.id, "name": player.name, "score": player.score},
        "player_count": len(game_state.players)
    }, ACTIVE_SSE_QUEUES)

    return JSONResponse(content={
        "game_id": game_id,
        "player_id": player.id,
        "room_code": game_state.room_code,
        "host_id": game_state.host_id,
        "categories": game_state.categories,
        "game_status": game_state.status,
        "is_late_join": game_state.status == "playing",
        "current_question": game_state.current_question_index + 1 if game_state.current_question_index is not None else None
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
    ).model_dump())

async def submit_answer(req: SubmitAnswerRequest):
    """Submit an answer for the current question."""
    if req.game_id not in LIVE_QUIZ_GAMES:
        raise HTTPException(status_code=404, detail="Game not found")

    game_state = LIVE_QUIZ_GAMES[req.game_id]
    current_question = game_state.questions[game_state.current_question_index]

    player = next((p for p in game_state.players if p.id == req.player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    player.last_seen = datetime.now()
    current_question.answers[req.player_id] = {
        "answer": req.answer,
        "timestamp": datetime.now().isoformat(),
        "is_correct": None,
        "skipped": req.skipped
    }

    player.has_answered = True
    player.last_answer = req.answer

    players_only = [p for p in game_state.players if p.id != game_state.host_id]
    all_answered = all(p.has_answered for p in players_only)
    no_time_left = datetime.now() >= current_question.expires_at if current_question.expires_at else False

    await broadcast_to_game(req.game_id, "answer_submitted", {
        "player_id": req.player_id,
        "player_name": player.name,
        "has_answered": True,
        "total_players": len(players_only),
        "answered_count": len(current_question.answers)
    }, ACTIVE_SSE_QUEUES)

    if all_answered or no_time_left:
        await show_question_results(req.game_id, ACTIVE_SSE_QUEUES)

    return JSONResponse(content={"message": "Answer submitted"})

async def host_control(req: HostControlRequest):
    """Handle host control actions."""
    if req.game_id not in LIVE_QUIZ_GAMES:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = LIVE_QUIZ_GAMES[req.game_id]
    
    if req.action == "start_game":
        game_state.status = "playing"
        game_state.started_at = datetime.now()
        game_state.questions = []
        await start_question(req.game_id, 0, ACTIVE_SSE_QUEUES)
        await broadcast_to_game(req.game_id, "game_started", {
            "total_questions": game_state.total_questions,
            "categories": game_state.categories
        }, ACTIVE_SSE_QUEUES)
        return JSONResponse(content={"message": "Game started"})
    
    elif req.action == "next_question":
        next_index = game_state.current_question_index + 1
        if next_index >= game_state.total_questions:
            game_state.status = "finished"
            await broadcast_to_game(req.game_id, "game_finished", {
                "final_scores": {p.id: p.score for p in game_state.players},
                "winner": max(game_state.players, key=lambda p: p.score).name
            }, ACTIVE_SSE_QUEUES)
            return JSONResponse(content={"message": "Game finished"})
        await start_question(req.game_id, next_index, ACTIVE_SSE_QUEUES)
        return JSONResponse(content={"message": "Next question started"})
    
    elif req.action == "pause_timer":
        game_state.timer_paused = True
        game_state.timer_pause_started = datetime.now()
        await broadcast_to_game(req.game_id, "timer_paused", {}, ACTIVE_SSE_QUEUES)
        return JSONResponse(content={"message": "Timer paused"})
    
    elif req.action == "resume_timer":
        if game_state.timer_paused and game_state.timer_pause_started:
            pause_duration = datetime.now() - game_state.timer_pause_started
            game_question = game_state.questions[game_state.current_question_index]
            game_question.expires_at += pause_duration
            game_state.timer_paused = False
            game_state.timer_pause_started = None
            await broadcast_to_game(req.game_id, "timer_resumed", {}, ACTIVE_SSE_QUEUES)
        return JSONResponse(content={"message": "Timer resumed"})
    
    else:
        raise HTTPException(status_code=400, detail="Unknown action")

async def sse_endpoint(request: Request):
    """Server-Sent Events endpoint for real-time communication."""
    game_id = request.query_params.get("game_id")
    player_id = request.query_params.get("player_id")
    connection_type = request.query_params.get("type", "player")

    if not game_id or not player_id:
        raise HTTPException(status_code=400, detail="game_id and player_id are required")

    if game_id not in LIVE_QUIZ_GAMES:
        raise HTTPException(status_code=404, detail="Game not found")

    LIVE_QUIZ_GAMES[game_id].last_activity = datetime.now()

    async def event_stream():
        message_queue = asyncio.Queue(maxsize=100)
        if game_id not in ACTIVE_SSE_QUEUES:
            ACTIVE_SSE_QUEUES[game_id] = []
        ACTIVE_SSE_QUEUES[game_id].append(message_queue)

        try:
            game_state = LIVE_QUIZ_GAMES[game_id]
            initial_data = {
                "connection_type": connection_type,
                "game_status": game_state.status,
                "current_question": game_state.current_question_index + 1 if game_state.status == "playing" else None,
                "player_count": len(game_state.players),
                "players": [{"id": p.id, "name": p.name, "score": p.score} for p in game_state.players]
            }

            yield f"data: {json.dumps({'type': 'connected', 'data': initial_data})}\n\n"

            last_ping = datetime.now()
            while True:
                current_time = datetime.now()
                if (current_time - last_ping).total_seconds() >= 30:
                    try:
                        yield f"data: {json.dumps({'type': 'ping', 'data': {'timestamp': current_time.isoformat()}})}\n\n"
                        last_ping = current_time
                        if game_id in LIVE_QUIZ_GAMES:
                            LIVE_QUIZ_GAMES[game_id].last_activity = current_time
                    except Exception:
                        break

                try:
                    message = await asyncio.wait_for(message_queue.get(), timeout=1.0)
                    yield message
                except asyncio.TimeoutError:
                    pass

                if game_id in ACTIVE_SSE_QUEUES and message_queue not in ACTIVE_SSE_QUEUES[game_id]:
                    break
                await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            pass
        finally:
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

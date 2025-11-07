"""
@file live_quiz_models.py
Data models for the live quiz game system.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class Player(BaseModel):
    id: str
    name: str
    score: int = 0
    joined_at: datetime
    connected: bool = True
    has_answered: bool = False
    last_answer: Optional[str] = None
    is_correct: Optional[bool] = None

class Question(BaseModel):
    id: str
    question: str
    options: List[str]
    answer: str
    explanation: str
    category: str
    subcategory: Optional[str] = None
    key_entities: List[str] = []

class GameQuestion(BaseModel):
    question: Question
    category: str
    question_number: int  # 1-30
    time_limit: int = 60  # seconds
    is_active: bool = False
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    answers: Dict[str, Dict[str, Any]] = {}  # player_id -> {answer, timestamp, is_correct}

class LiveQuizGameState(BaseModel):
    game_id: str
    room_code: str
    host_id: str
    categories: List[str]
    players: List[Player]
    questions: List[GameQuestion]
    current_question_index: int = 0
    status: str = "waiting"  # waiting, playing, showing_results, finished
    created_at: datetime
    started_at: Optional[datetime] = None
    question_started_at: Optional[datetime] = None
    timer_paused: bool = False
    timer_pause_started: Optional[datetime] = None
    game_mode: str = "mcq"
    knowledge_level: str = "intermediate"
    language: str = "pl"
    theme: Optional[str] = None
    include_category_theme: bool = True
    selected_question_model: str = "random-pl"
    selected_explanation_model: str = "auto"
    selected_category_model: str = "auto"
    questions_per_category: int = 5  # Configurable: 2, 3, 5, etc.
    total_questions: int = 30

class CreateRoomRequest(BaseModel):
    host_name: str
    categories: List[str]
    game_mode: str = "mcq"
    knowledge_level: str = "intermediate"
    language: str = "pl"
    theme: Optional[str] = None
    include_category_theme: bool = True
    selected_question_model: str = "auto"
    selected_explanation_model: str = "auto"
    selected_category_model: str = "auto"
    questions_per_category: int = 5

class JoinRoomRequest(BaseModel):
    room_code: str
    player_name: str

class SubmitAnswerRequest(BaseModel):
    game_id: str
    player_id: str
    answer: str

class HostControlRequest(BaseModel):
    game_id: str
    action: str  # pause, resume, next_question, regenerate_question, start_game
    data: Optional[Dict[str, Any]] = None

class RoomStatus(BaseModel):
    game_id: str
    room_code: str
    host_name: str
    status: str
    player_count: int
    max_players: int = 12
    categories: List[str]
    current_question: Optional[int] = None
    total_questions: int = 30
    created_at: datetime

# SSE Event Types
class SSEEvent(BaseModel):
    type: str  # room_created, player_joined, question_started, timer_update, answer_submitted, results_shown, game_finished
    data: Dict[str, Any]
    timestamp: datetime

# For storing active games in memory
LIVE_QUIZ_GAMES: Dict[str, LiveQuizGameState] = {}
ROOM_CODES: Dict[str, str] = {}  # room_code -> game_id mapping
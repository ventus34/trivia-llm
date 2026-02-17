from pydantic import BaseModel
from typing import List, Optional

class BaseModelWithModel(BaseModel):
    model: str
    gameId: str

from pydantic import BaseModel, field_validator

def is_theme_valid(value: str) -> bool:
    if value is None:
        return True
    # Rule 1: Max 8 words
    words = value.split()
    if len(words) > 8:
        return False
    # Rule 2: Allow letters (unicode), numbers, basic punctuation and spaces
    for ch in value:
        if ch.isalnum() or ch.isspace() or ch in {'-', '.', ',', '<', '>'}:
            continue
        return False
    return True

class GenerateCategoriesRequest(BaseModel):
    model: str
    theme: str
    language: str
    gameId: Optional[str] = None

    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if not v:
            return v
        if not is_theme_valid(v):
            raise ValueError("Theme must be at most 8 words and contain only letters, numbers, spaces, and -.,<>")
        return v

class QuestionRequest(BaseModelWithModel):
    category: str
    gameMode: str
    knowledgeLevel: str
    language: str
    theme: Optional[str] = None
    includeCategoryTheme: bool

    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        if not is_theme_valid(v):
            raise ValueError("Theme must be at most 8 words and contain only letters, numbers, spaces, and -.,<>")
        return v

class ExplanationRequest(BaseModelWithModel):
    language: str
    question: str
    correct_answer: str
    player_answer: str

class MutationRequest(BaseModel):
    gameId: Optional[str] = None
    language: str
    old_category: str
    theme: Optional[str] = None
    existing_categories: List[str]

    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        if not is_theme_valid(v):
            raise ValueError("Theme must be at most 8 words and contain only letters, numbers, spaces, and -.,<>")
        return v

class PreloadRequest(BaseModelWithModel):
    category: str
    gameMode: str
    knowledgeLevel: str
    language: str
    theme: Optional[str] = None
    includeCategoryTheme: bool

    @field_validator('theme')
    @classmethod
    def validate_theme(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        if not is_theme_valid(v):
            raise ValueError("Theme must be at most 8 words and contain only letters, numbers, spaces, and -.,<>")
        return v
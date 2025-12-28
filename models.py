from pydantic import BaseModel
from typing import List, Optional

class BaseModelWithModel(BaseModel):
    model: str
    gameId: str

from pydantic import BaseModel, field_validator
import re

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
        # Rule 1: Max 8 words
        words = v.split()
        if len(words) > 8:
            raise ValueError("Theme must be at most 8 words")
        # Rule 2: Allow only letters, numbers, and basic characters: -, ., ,, <>, and spaces
        if not re.match(r'^[a-zA-Z0-9\-\.\,\<\>\s]*$', v):
            raise ValueError("Theme contains invalid characters")
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
        words = v.split()
        if len(words) > 8:
            raise ValueError("Theme must be at most 8 words")
        if not re.match(r'^[a-zA-Z0-9\-\.\,\<\>\s]*$', v):
            raise ValueError("Theme contains invalid characters")
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
        words = v.split()
        if len(words) > 8:
            raise ValueError("Theme must be at most 8 words")
        if not re.match(r'^[a-zA-Z0-9\-\.\,\<\>\s]*$', v):
            raise ValueError("Theme contains invalid characters")
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
        words = v.split()
        if len(words) > 8:
            raise ValueError("Theme must be at most 8 words")
        if not re.match(r'^[a-zA-Z0-9\-\.\,\<\>\s]*$', v):
            raise ValueError("Theme contains invalid characters")
        return v
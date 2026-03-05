from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ExerciseCategory(str, Enum):
    ADDITION = "addition"
    SUBTRACTION = "subtraction"
    MULTIPLICATION = "multiplication"
    DIVISION = "division"
    PERCENTAGE = "percentage"
    FRACTION = "fraction"
    MIXED = "mixed"
    SEQUENCE = "sequence"


class DifficultyLevel(int, Enum):
    BEGINNER = 1
    EASY = 2
    MEDIUM = 3
    HARD = 4
    EXPERT = 5


class ExerciseRequest(BaseModel):
    category: Optional[ExerciseCategory] = None  # None = adaptive selection
    count: int = 10
    time_limit_seconds: int = 30  # per question


class Exercise(BaseModel):
    id: str
    category: ExerciseCategory
    difficulty: DifficultyLevel
    question: str
    correct_answer: float
    time_limit_seconds: int
    hint: Optional[str] = None


class AnswerSubmission(BaseModel):
    exercise_id: str
    user_answer: float
    time_taken_seconds: float


class AnswerResult(BaseModel):
    exercise_id: str
    correct: bool
    correct_answer: float
    user_answer: float
    time_taken_seconds: float
    points: int
    tip: Optional[str] = None


class SessionResult(BaseModel):
    session_id: str
    total_questions: int
    correct_count: int
    accuracy: float
    avg_time_seconds: float
    points_earned: int
    level_change: int  # -1, 0, +1
    new_level: DifficultyLevel
    weaknesses: list[str]
    tips: list[str]

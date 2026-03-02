from pydantic import BaseModel
from typing import Optional


class UserProfile(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    target_exam: Optional[str] = None  # "pilot", "consulting", "finance", "other"
    current_level: int = 1
    total_points: int = 0
    streak_days: int = 0
    exercises_completed: int = 0


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    target_exam: Optional[str] = None


class UserStats(BaseModel):
    total_sessions: int
    total_exercises: int
    overall_accuracy: float
    avg_response_time: float
    current_level: int
    total_points: int
    streak_days: int
    strengths: list[str]
    weaknesses: list[str]
    category_breakdown: dict[str, dict]  # category -> {accuracy, avg_time, count}


class DiagnosticRequest(BaseModel):
    """Initial placement test to determine starting level."""
    pass


class DiagnosticResult(BaseModel):
    assigned_level: int
    category_scores: dict[str, float]
    recommendations: list[str]

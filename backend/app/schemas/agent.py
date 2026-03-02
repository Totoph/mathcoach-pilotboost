from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from uuid import UUID


class AgentState(BaseModel):
    """État interne de l'agent IA"""
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    focus_areas: List[str] = Field(default_factory=list)
    last_difficulty: int = 1
    session_count: int = 0
    total_exercises: int = 0


class AgentInstance(BaseModel):
    """Instance d'agent IA pour un utilisateur"""
    id: UUID
    user_id: UUID
    current_level: int
    diagnostic_completed: bool
    state: AgentState
    created_at: datetime
    updated_at: datetime


class ConversationMessage(BaseModel):
    """Message dans la conversation agent ↔ utilisateur"""
    id: UUID
    agent_instance_id: UUID
    role: Literal["user", "agent"]
    message: str
    metadata: dict = Field(default_factory=dict)
    created_at: datetime


class ExercisePerformance(BaseModel):
    """Performance sur un exercice individuel"""
    id: UUID
    agent_instance_id: UUID
    exercise_type: str
    question: str
    correct_answer: str
    user_answer: Optional[str]
    is_correct: bool
    time_taken_ms: Optional[int]
    difficulty: int
    tip_shown: Optional[str]
    created_at: datetime


# Request/Response schemas

class ChatRequest(BaseModel):
    """Message utilisateur vers l'agent"""
    message: str


class ChatResponse(BaseModel):
    """Réponse de l'agent"""
    agent_message: str
    metadata: dict = Field(default_factory=dict)


class NextExerciseRequest(BaseModel):
    """Demande de prochain exercice"""
    pass  # L'agent décide tout


class NextExerciseResponse(BaseModel):
    """Prochain exercice généré par l'agent"""
    exercise_id: str  # Return as string for JSON serialization
    question: str
    exercise_type: str
    difficulty: int
    tip: Optional[str] = None
    time_limit_ms: Optional[int] = None
    agent_intro: Optional[str] = None  # Message d'intro de l'agent


class SubmitAnswerRequest(BaseModel):
    """Soumission de réponse"""
    exercise_id: str  # Accept as string, convert to UUID in service
    user_answer: str
    time_taken_ms: Optional[int] = None


class SubmitAnswerResponse(BaseModel):
    """Feedback après réponse"""
    is_correct: bool
    correct_answer: str
    agent_feedback: str  # Message de l'agent
    points_earned: int
    state_updated: bool


class AgentStateResponse(BaseModel):
    """État actuel de l'agent"""
    instance: AgentInstance
    recent_performance: dict
    next_recommendation: Optional[str] = None


class ConversationHistoryResponse(BaseModel):
    """Historique de conversation"""
    messages: List[ConversationMessage]
    total: int

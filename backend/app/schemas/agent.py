"""
MathCoach Agent Schemas V2
==========================
Pydantic models for the skill-based agent system.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Literal
from datetime import datetime
from uuid import UUID


# ────────────────────────── Skill Models ──────────────────────────

class SkillScore(BaseModel):
    """Individual skill score for API responses."""
    name: str
    label: str
    score: float = 0.0
    accuracy: float = 0.5
    speed_avg_ms: float = 10000.0
    attempts: int = 0
    streak: int = 0
    difficulty_mastered: int = 1
    is_automated: bool = False
    is_plateau: bool = False


class SkillVectorResponse(BaseModel):
    """Full skill vector for dashboard display."""
    global_level: float = 0.0
    skills: List[SkillScore] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    focus_areas: List[str] = Field(default_factory=list)


class SkillSnapshotResponse(BaseModel):
    """Daily snapshot for graphing."""
    date: str
    global_level: float
    skill_scores: Dict[str, float]


# ────────────────────────── Agent State ──────────────────────────

class AgentState(BaseModel):
    """État interne de l'agent IA — V2 with full cognitive profile."""
    # Legacy compatibility
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    focus_areas: List[str] = Field(default_factory=list)
    last_difficulty: int = 1
    session_count: int = 0
    total_exercises: int = 0
    # V2 fields
    skill_vector: Dict = Field(default_factory=dict)
    global_level: float = 0.0
    total_correct: int = 0
    error_counts: Dict[str, int] = Field(default_factory=lambda: {
        "table_error": 0,
        "carry_error": 0,
        "inattention": 0,
        "procedure_error": 0,
        "timeout": 0,
        "slow": 0,
    })
    training_mode: Optional[str] = None
    last_session_date: Optional[str] = None
    pending_exercise: Optional[Dict] = None


class AgentInstance(BaseModel):
    """Instance d'agent IA pour un utilisateur."""
    id: UUID
    user_id: UUID
    current_level: int
    diagnostic_completed: bool
    state: AgentState
    created_at: datetime
    updated_at: datetime


# ────────────────────────── Conversations ──────────────────────────

class ConversationMessage(BaseModel):
    """Message dans la conversation agent ↔ utilisateur."""
    id: UUID
    agent_instance_id: UUID
    role: Literal["user", "agent"]
    message: str
    metadata: dict = Field(default_factory=dict)
    created_at: datetime


class ExercisePerformance(BaseModel):
    """Performance sur un exercice individuel."""
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
    error_type: Optional[str] = None
    sub_skill: Optional[str] = None
    created_at: datetime


# ────────────────────────── Request / Response ──────────────────────────

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    agent_message: str
    tips: List[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class NextExerciseRequest(BaseModel):
    training_mode: Optional[str] = None  # "tables", "free", or None (agent decides)
    operation_filter: Optional[List[str]] = None  # ["addition", "subtraction", "multiplication", "division", "advanced"]


class NextExerciseResponse(BaseModel):
    exercise_id: str
    question: str
    exercise_type: str
    sub_skill: Optional[str] = None
    difficulty: int
    tip: Optional[str] = None
    time_limit_ms: Optional[int] = None
    agent_intro: Optional[str] = None
    correct_answer: Optional[str] = None


class CustomSeriesRequest(BaseModel):
    example: str  # e.g. "34-54+67-23-65"
    count: int = 10


class CustomSeriesResponse(BaseModel):
    exercises: List[NextExerciseResponse]


class SkillSeriesRequest(BaseModel):
    skill: str  # e.g. "squares_1_30", "addition"
    difficulty: int = 2
    count: int = 10


class SmartSeriesRequest(BaseModel):
    message: str  # natural language, e.g. "donne moi des carrés"
    count: int = 10


class SmartSeriesResponse(BaseModel):
    is_exercise_request: bool
    exercises: List[NextExerciseResponse] = Field(default_factory=list)
    chat_response: Optional[str] = None  # if it was a chat message, not an exercise request
    description: Optional[str] = None  # what was understood
    example_used: Optional[str] = None  # example expression if applicable


class SubmitAnswerRequest(BaseModel):
    exercise_id: str
    user_answer: str
    time_taken_ms: Optional[int] = None


class SubmitAnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    agent_feedback: str
    points_earned: int
    error_type: Optional[str] = None
    technique_tip: Optional[str] = None
    state_updated: bool
    # V2: skill level updates
    skill_name: Optional[str] = None
    skill_score: Optional[float] = None
    global_level: Optional[float] = None


class AgentStateResponse(BaseModel):
    """État actuel de l'agent."""
    instance: AgentInstance
    recent_performance: dict
    skill_vector: Optional[SkillVectorResponse] = None
    next_recommendation: Optional[str] = None


class ConversationHistoryResponse(BaseModel):
    messages: List[ConversationMessage]
    total: int


# ────────────────────────── Dashboard ──────────────────────────

class DashboardResponse(BaseModel):
    """Complete dashboard data in a single call."""
    global_level: float = 0.0
    total_exercises: int = 0
    total_correct: int = 0
    accuracy: float = 0.0
    skills: List[SkillScore] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    focus_areas: List[str] = Field(default_factory=list)
    error_breakdown: Dict[str, int] = Field(default_factory=dict)
    history: List[SkillSnapshotResponse] = Field(default_factory=list)
    agent_message: Optional[str] = None
    diagnostic_completed: bool = False


class SetTrainingModeRequest(BaseModel):
    mode: str = "free"  # "tables", "free", "speed", "diagnostic"

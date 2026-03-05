"""
Routes API pour l'agent IA V2
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from typing import List

from app.core.auth import get_current_user
from app.services.agent_service import get_agent_service, AgentService
from app.schemas.agent import (
    ChatRequest, ChatResponse,
    NextExerciseRequest, NextExerciseResponse,
    SubmitAnswerRequest, SubmitAnswerResponse,
    AgentStateResponse, ConversationHistoryResponse,
    ConversationMessage, DashboardResponse,
    SetTrainingModeRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/init", response_model=AgentStateResponse)
async def initialize_agent(
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Initialise ou récupère l'instance agent de l'utilisateur."""
    user_id = UUID(current_user["id"])
    instance = await agent_service.get_or_create_instance(user_id)

    recent_perf = await agent_service._get_recent_performance(instance.id, limit=20)
    total = len(recent_perf)
    correct = sum(1 for p in recent_perf if p["is_correct"])
    accuracy = (correct / total * 100) if total > 0 else 0

    recent_performance = {
        "total_exercises": instance.state.total_exercises,
        "recent_accuracy": round(accuracy, 1),
        "strengths": instance.state.strengths,
        "weaknesses": instance.state.weaknesses,
    }

    return AgentStateResponse(
        instance=instance,
        recent_performance=recent_performance,
        next_recommendation="Prêt·e à commencer !" if instance.state.total_exercises == 0 else None,
    )


@router.get("/state", response_model=AgentStateResponse)
async def get_agent_state(
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Récupère l'état actuel de l'agent."""
    user_id = UUID(current_user["id"])
    instance = await agent_service.get_or_create_instance(user_id)

    recent_perf = await agent_service._get_recent_performance(instance.id, limit=20)
    total = len(recent_perf)
    correct = sum(1 for p in recent_perf if p["is_correct"])
    accuracy = (correct / total * 100) if total > 0 else 0

    recent_performance = {
        "total_exercises": instance.state.total_exercises,
        "recent_accuracy": round(accuracy, 1),
        "strengths": instance.state.strengths,
        "weaknesses": instance.state.weaknesses,
    }

    return AgentStateResponse(
        instance=instance,
        recent_performance=recent_performance,
    )


@router.post("/next-exercise", response_model=NextExerciseResponse)
async def get_next_exercise(
    request: NextExerciseRequest,
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """L'agent génère le prochain exercice adapté au profil."""
    user_id = UUID(current_user["id"])
    exercise = await agent_service.generate_next_exercise(
        user_id, training_mode=request.training_mode
    )
    return exercise


@router.post("/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    request: SubmitAnswerRequest,
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Soumet une réponse et met à jour le profil cognitif."""
    user_id = UUID(current_user["id"])
    try:
        result = await agent_service.submit_answer(
            user_id=user_id,
            exercise_id=UUID(request.exercise_id),
            user_answer=request.user_answer,
            time_taken_ms=request.time_taken_ms,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return result


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Conversation libre avec l'agent — tips et techniques."""
    user_id = UUID(current_user["id"])
    response = await agent_service.chat(user_id, request.message)
    return ChatResponse(
        agent_message=response["agent_message"],
        tips=response.get("tips", []),
        metadata={},
    )


@router.get("/history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Récupère l'historique de conversation."""
    user_id = UUID(current_user["id"])
    messages = await agent_service.get_conversation_history(user_id, limit)
    return ConversationHistoryResponse(messages=messages, total=len(messages))


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Données complètes du dashboard en un seul appel."""
    user_id = UUID(current_user["id"])
    return await agent_service.get_dashboard(user_id)


@router.post("/set-mode")
async def set_training_mode(
    request: SetTrainingModeRequest,
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Définit le mode d'entraînement (tables, free, speed)."""
    user_id = UUID(current_user["id"])
    instance = await agent_service.get_or_create_instance(user_id)
    profile = agent_service._load_profile(instance.state)
    profile.training_mode = request.mode

    state_dict = agent_service._save_profile(profile)
    agent_service.supabase.table("agent_instances")\
        .update({"state": state_dict}).eq("id", str(instance.id)).execute()

    return {"status": "ok", "mode": request.mode}

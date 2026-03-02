"""
Routes API pour l'agent IA
"""
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
    ConversationMessage
)

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/init", response_model=AgentStateResponse)
async def initialize_agent(
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    Initialise ou récupère l'instance agent de l'utilisateur.
    Appelé au premier login ou à chaque ouverture de l'app.
    """
    user_id = UUID(current_user["id"])
    instance = await agent_service.get_or_create_instance(user_id)
    
    # Récupérer stats récentes
    recent_perf = await agent_service._get_recent_performance(instance.id, limit=20)
    
    total = len(recent_perf)
    correct = sum(1 for p in recent_perf if p["is_correct"])
    accuracy = (correct / total * 100) if total > 0 else 0
    
    recent_performance = {
        "total_exercises": instance.state.total_exercises,
        "recent_accuracy": round(accuracy, 1),
        "strengths": instance.state.strengths,
        "weaknesses": instance.state.weaknesses
    }
    
    return AgentStateResponse(
        instance=instance,
        recent_performance=recent_performance,
        next_recommendation="Prêt·e à commencer !" if instance.state.total_exercises == 0 else None
    )


@router.get("/state", response_model=AgentStateResponse)
async def get_agent_state(
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Récupère l'état actuel de l'agent"""
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
        "weaknesses": instance.state.weaknesses
    }
    
    return AgentStateResponse(
        instance=instance,
        recent_performance=recent_performance
    )


@router.post("/next-exercise", response_model=NextExerciseResponse)
async def get_next_exercise(
    request: NextExerciseRequest,
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    L'agent génère le prochain exercice adapté.
    Pas de choix utilisateur — l'agent décide de tout.
    """
    user_id = UUID(current_user["id"])
    exercise = await agent_service.generate_next_exercise(user_id)
    
    return exercise


@router.post("/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    request: SubmitAnswerRequest,
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    Soumet une réponse et récupère le feedback de l'agent.
    L'agent met à jour son état et adapte la progression.
    """
    user_id = UUID(current_user["id"])
    
    # NOTE: Pour MVP, les données de l'exercice viennent du frontend
    # TODO: Améliorer avec un cache serveur (Redis) en prod
    
    result = await agent_service.submit_answer(
        user_id=user_id,
        exercise_id=UUID(request.exercise_id),
        user_answer=request.user_answer,
        question=request.question,
        correct_answer=request.correct_answer,
        exercise_type=request.exercise_type,
        difficulty=request.difficulty,
        time_taken_ms=request.time_taken_ms,
        tip_shown=request.tip
    )
    
    return result


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """
    Conversation libre avec l'agent.
    L'utilisateur peut poser des questions, demander des conseils, etc.
    """
    user_id = UUID(current_user["id"])
    response = await agent_service.chat(user_id, request.message)
    
    return ChatResponse(
        agent_message=response,
        metadata={}
    )


@router.get("/history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    agent_service: AgentService = Depends(get_agent_service)
):
    """Récupère l'historique de conversation avec l'agent"""
    user_id = UUID(current_user["id"])
    messages = await agent_service.get_conversation_history(user_id, limit)
    
    return ConversationHistoryResponse(
        messages=messages,
        total=len(messages)
    )

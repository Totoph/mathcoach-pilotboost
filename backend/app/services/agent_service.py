"""
Service Agent IA - Gestion de la progression adaptative et conversation
"""
import random
from uuid import UUID, uuid4
from typing import Optional, Dict, List, Tuple
from datetime import datetime, timedelta
from app.core.supabase import get_supabase_client
from app.core.gemini import generate_agent_response, generate_feedback, generate_tip
from app.schemas.agent import (
    AgentInstance, AgentState, ConversationMessage,
    ExercisePerformance, NextExerciseResponse, SubmitAnswerResponse
)


class AgentService:
    """Service de gestion de l'agent IA personnel"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def get_or_create_instance(self, user_id: UUID) -> AgentInstance:
        """Récupère ou crée l'instance agent pour un utilisateur"""
        result = self.supabase.table("agent_instances")\
            .select("*")\
            .eq("user_id", str(user_id))\
            .execute()
        
        if result.data:
            data = result.data[0]
            return AgentInstance(
                id=UUID(data["id"]),
                user_id=UUID(data["user_id"]),
                current_level=data["current_level"],
                diagnostic_completed=data["diagnostic_completed"],
                state=AgentState(**data["state"]),
                created_at=data["created_at"],
                updated_at=data["updated_at"]
            )
        
        # Créer nouvelle instance (normalement fait par trigger, mais fallback)
        new_data = {
            "user_id": str(user_id),
            "current_level": 0,
            "diagnostic_completed": False,
            "state": AgentState().dict()
        }
        result = self.supabase.table("agent_instances").insert(new_data).execute()
        data = result.data[0]
        
        # Message de bienvenue
        await self._add_conversation(
            UUID(data["id"]),
            "agent",
            "👋 Salut ! Je suis ton coach en calcul mental. On va commencer par un diagnostic rapide pour adapter l'entraînement à ton niveau. Prêt·e ?"
        )
        
        return AgentInstance(
            id=UUID(data["id"]),
            user_id=UUID(data["user_id"]),
            current_level=0,
            diagnostic_completed=False,
            state=AgentState(**data["state"]),
            created_at=data["created_at"],
            updated_at=data["updated_at"]
        )
    
    async def generate_next_exercise(self, user_id: UUID) -> NextExerciseResponse:
        """Génère le prochain exercice adapté"""
        instance = await self.get_or_create_instance(user_id)
        
        # Analyser les performances récentes
        recent_perf = await self._get_recent_performance(instance.id, limit=10)
        
        # Choisir type et difficulté
        exercise_type, difficulty = self._select_exercise_params(
            instance, recent_perf
        )
        
        # Générer la question
        question, correct_answer = self._generate_question(exercise_type, difficulty)
        
        # Générer un tip avec Gemini (async)
        tip = None
        if difficulty >= 2:
            try:
                tip = await generate_tip(exercise_type, difficulty)
            except:
                tip = None  # Fallback si Gemini échoue
        
        # Message d'intro de l'agent (contextualisé)
        agent_intro = self._get_intro_message(instance, exercise_type)
        
        # Créer l'exercice ID (sera utilisé pour submit)
        exercise_id = uuid4()
        
        return NextExerciseResponse(
            exercise_id=exercise_id,
            question=question,
            exercise_type=exercise_type,
            difficulty=difficulty,
            tip=tip,
            time_limit_ms=30000,  # 30s par défaut
            agent_intro=agent_intro
        )
    
    async def submit_answer(
        self,
        user_id: UUID,
        exercise_id: UUID,
        user_answer: str,
        question: str,
        correct_answer: str,
        exercise_type: str,
        difficulty: int,
        time_taken_ms: Optional[int],
        tip_shown: Optional[str]
    ) -> SubmitAnswerResponse:
        """Soumet une réponse et retourne le feedback de l'agent"""
        instance = await self.get_or_create_instance(user_id)
        
        # Vérifier la réponse
        is_correct = self._check_answer(user_answer, correct_answer)
        
        # Enregistrer la performance
        perf_data = {
            "agent_instance_id": str(instance.id),
            "exercise_type": exercise_type,
            "question": question,
            "correct_answer": correct_answer,
            "user_answer": user_answer,
            "is_correct": is_correct,
            "time_taken_ms": time_taken_ms,
            "difficulty": difficulty,
            "tip_shown": tip_shown
        }
        self.supabase.table("exercise_performances").insert(perf_data).execute()
        
        # Mettre à jour l'état de l'agent
        await self._update_agent_state(instance, is_correct, exercise_type, difficulty)
        
        # Générer feedback personnalisé avec Gemini
        try:
            agent_feedback = await generate_feedback(
                is_correct, exercise_type, difficulty, time_taken_ms
            )
        except:
            # Fallback si Gemini échoue
            agent_feedback = "Bravo ! 🎉" if is_correct else "Presque ! Continue comme ça. 💪"
        
        # Ajouter à la conversation
        await self._add_conversation(instance.id, "agent", agent_feedback)
        
        points_earned = difficulty * 10 if is_correct else 0
        
        return SubmitAnswerResponse(
            is_correct=is_correct,
            correct_answer=correct_answer,
            agent_feedback=agent_feedback,
            points_earned=points_earned,
            state_updated=True
        )
    
    async def chat(self, user_id: UUID, message: str) -> str:
        """Conversation libre avec l'agent"""
        instance = await self.get_or_create_instance(user_id)
        
        # Enregistrer message utilisateur
        await self._add_conversation(instance.id, "user", message)
        
        # Construire contexte pour Gemini
        context = f"""État de l'utilisateur :
- Niveau : {instance.current_level}
- Exercices faits : {instance.state.total_exercises}
- Points forts : {', '.join(instance.state.strengths) if instance.state.strengths else 'En cours d\'évaluation'}
- À travailler : {', '.join(instance.state.weaknesses) if instance.state.weaknesses else 'Rien pour l\'instant'}"""
        
        # Générer réponse avec Gemini
        try:
            response = await generate_agent_response(message, context)
        except:
            # Fallback si Gemini échoue
            response = self._generate_chat_response(instance, message)
        
        # Enregistrer réponse agent
        await self._add_conversation(instance.id, "agent", response)
        
        return response
    
    async def get_conversation_history(
        self, user_id: UUID, limit: int = 50
    ) -> List[ConversationMessage]:
        """Récupère l'historique de conversation"""
        instance = await self.get_or_create_instance(user_id)
        
        result = self.supabase.table("agent_conversations")\
            .select("*")\
            .eq("agent_instance_id", str(instance.id))\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        messages = [
            ConversationMessage(
                id=UUID(m["id"]),
                agent_instance_id=UUID(m["agent_instance_id"]),
                role=m["role"],
                message=m["message"],
                metadata=m["metadata"],
                created_at=m["created_at"]
            )
            for m in reversed(result.data)
        ]
        
        return messages
    
    # ============ Méthodes internes ============
    
    async def _add_conversation(
        self, agent_instance_id: UUID, role: str, message: str, metadata: dict = None
    ):
        """Ajoute un message à la conversation"""
        data = {
            "agent_instance_id": str(agent_instance_id),
            "role": role,
            "message": message,
            "metadata": metadata or {}
        }
        self.supabase.table("agent_conversations").insert(data).execute()
    
    async def _get_recent_performance(
        self, agent_instance_id: UUID, limit: int = 10
    ) -> List[dict]:
        """Récupère les performances récentes"""
        result = self.supabase.table("exercise_performances")\
            .select("*")\
            .eq("agent_instance_id", str(agent_instance_id))\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return result.data
    
    async def _update_agent_state(
        self, instance: AgentInstance, is_correct: bool,
        exercise_type: str, difficulty: int
    ):
        """Met à jour l'état de l'agent après un exercice"""
        state = instance.state
        state.total_exercises += 1
        state.last_difficulty = difficulty
        
        # Analyser forces/faiblesses
        if is_correct and difficulty >= 3:
            if exercise_type not in state.strengths:
                state.strengths.append(exercise_type)
            if exercise_type in state.weaknesses:
                state.weaknesses.remove(exercise_type)
        elif not is_correct:
            if exercise_type not in state.weaknesses:
                state.weaknesses.append(exercise_type)
        
        # Mise à jour DB
        self.supabase.table("agent_instances")\
            .update({"state": state.dict()})\
            .eq("id", str(instance.id))\
            .execute()
    
    def _select_exercise_params(
        self, instance: AgentInstance, recent_perf: List[dict]
    ) -> Tuple[str, int]:
        """Sélectionne le type d'exercice et la difficulté"""
        # Types disponibles
        exercise_types = ["addition", "multiplication", "soustraction", "division"]
        
        # Si diagnostic pas fini, varier
        if not instance.diagnostic_completed:
            return random.choice(exercise_types), random.randint(1, 3)
        
        # Sinon, focus sur faiblesses
        if instance.state.weaknesses:
            return random.choice(instance.state.weaknesses), 2
        
        # Ou progression normale
        difficulty = min(instance.state.last_difficulty + 1, 5)
        return random.choice(exercise_types), difficulty
    
    def _generate_question(self, exercise_type: str, difficulty: int) -> Tuple[str, str]:
        """Génère une question et sa réponse"""
        if exercise_type == "addition":
            a = random.randint(10 * difficulty, 50 * difficulty)
            b = random.randint(10 * difficulty, 50 * difficulty)
            return f"{a} + {b} = ?", str(a + b)
        
        elif exercise_type == "multiplication":
            a = random.randint(2, 12 + difficulty)
            b = random.randint(2, 12 + difficulty)
            return f"{a} × {b} = ?", str(a * b)
        
        elif exercise_type == "soustraction":
            a = random.randint(20 * difficulty, 100 * difficulty)
            b = random.randint(10 * difficulty, a)
            return f"{a} − {b} = ?", str(a - b)
        
        elif exercise_type == "division":
            b = random.randint(2, 12)
            result = random.randint(2, 20 * difficulty)
            a = b * result
            return f"{a} ÷ {b} = ?", str(result)
        
        return "1 + 1 = ?", "2"
    
    # Note: Tips sont maintenant générés par Gemini dans generate_next_exercise()
    
    def _get_intro_message(self, instance: AgentInstance, exercise_type: str) -> Optional[str]:
        """Message d'intro contextualisé de l'agent"""
        if instance.state.total_exercises == 0:
            return "Première question ! Prends ton temps. 🎯"
        
        if instance.state.total_exercises % 5 == 0:
            return f"Question {instance.state.total_exercises + 1}. Tu assures ! 🚀"
        
        return None
    
    def _check_answer(self, user_answer: str, correct_answer: str) -> bool:
        """Vérifie si la réponse est correcte"""
        try:
            return float(user_answer.strip()) == float(correct_answer.strip())
        except:
            return False
    
    # Note: Feedback est maintenant généré par Gemini dans submit_answer()
    
    def _generate_chat_response(self, instance: AgentInstance, message: str) -> str:
        """Génère une réponse conversationnelle (simple pour MVP)"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["aide", "help", "comment"]):
            return "Je suis là pour t'aider ! Continue les exercices et je m'adapterai à ton niveau. Tu peux me poser des questions entre deux exercices. 💪"
        
        if any(word in message_lower for word in ["niveau", "stats", "progression"]):
            return f"Tu as fait {instance.state.total_exercises} exercices. Continue comme ça ! 📊"
        
        if any(word in message_lower for word in ["merci", "thanks"]):
            return "De rien ! Prêt·e pour la suite ? 🚀"
        
        return "Je suis là pour t'accompagner ! Lance un exercice quand tu veux. 🎯"


# Singleton
_agent_service = None

def get_agent_service() -> AgentService:
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service

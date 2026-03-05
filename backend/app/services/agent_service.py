"""
MathCoach Agent Service V2
===========================
Full adaptive agent with:
- 12-dimension skill tracking
- Error classification
- Spaced repetition
- Plateau/automatization detection
- Smart exercise selection
- Personalized tips & feedback via Gemini
"""
import random
import logging
from uuid import UUID, uuid4
from typing import Optional, List, Tuple
from datetime import datetime, timezone, timedelta

from app.core.supabase import get_supabase_admin
from app.core.gemini import generate_agent_response, generate_tip
from app.services.skill_engine import (
    SKILL_DEFINITIONS,
    SkillVector,
    SkillData,
    UserCognitiveProfile,
    update_skill_score,
    compute_global_level,
    identify_strengths_weaknesses,
    select_focus_areas,
    classify_error,
    detect_plateau,
    detect_automatization,
    select_next_skill,
    select_next_difficulty,
    get_plateau_remedy,
    compute_sr_quality,
    SRItem,
    EXPECTED_TIME_MS,
)
from app.services.exercise_engine_v2 import (
    generate_exercise,
    get_technique_tips,
    TECHNIQUE_TIPS,
)
from app.schemas.agent import (
    AgentInstance, AgentState, ConversationMessage,
    NextExerciseResponse, SubmitAnswerResponse,
    SkillScore, SkillVectorResponse, DashboardResponse,
    SkillSnapshotResponse,
)

logger = logging.getLogger(__name__)

# In-memory exercise cache (MVP — use Redis in prod for multi-process)
_exercise_cache: dict[str, dict] = {}


class AgentService:
    """Service de gestion de l'agent IA personnel V2."""

    def __init__(self):
        self.supabase = get_supabase_admin()

    # ══════════════════════════════════════════
    #           INSTANCE MANAGEMENT
    # ══════════════════════════════════════════

    async def get_or_create_instance(self, user_id: UUID) -> AgentInstance:
        result = self.supabase.table("agent_instances")\
            .select("*").eq("user_id", str(user_id)).execute()

        if result.data:
            data = result.data[0]
            state_data = data.get("state", {})
            return AgentInstance(
                id=UUID(data["id"]), user_id=UUID(data["user_id"]),
                current_level=data["current_level"],
                diagnostic_completed=data["diagnostic_completed"],
                state=AgentState(**{k: v for k, v in state_data.items()
                                    if k in AgentState.model_fields}),
                created_at=data["created_at"], updated_at=data["updated_at"],
            )

        # Create new instance with V2 profile
        profile = UserCognitiveProfile()
        new_data = {
            "user_id": str(user_id), "current_level": 0,
            "diagnostic_completed": False,
            "state": profile.to_dict(),
        }
        result = self.supabase.table("agent_instances").insert(new_data).execute()
        data = result.data[0]

        state_data = data.get("state", {})
        return AgentInstance(
            id=UUID(data["id"]), user_id=UUID(data["user_id"]),
            current_level=0, diagnostic_completed=False,
            state=AgentState(**{k: v for k, v in state_data.items()
                                if k in AgentState.model_fields}),
            created_at=data["created_at"], updated_at=data["updated_at"],
        )

    def _load_profile(self, state: AgentState) -> UserCognitiveProfile:
        """Load UserCognitiveProfile from AgentState."""
        state_dict = state.model_dump()
        return UserCognitiveProfile.from_dict(state_dict)

    def _save_profile(self, profile: UserCognitiveProfile) -> dict:
        """Serialize profile for DB storage."""
        return profile.to_dict()

    # ══════════════════════════════════════════
    #           EXERCISE GENERATION
    # ══════════════════════════════════════════

    async def generate_next_exercise(
        self,
        user_id: UUID,
        training_mode: Optional[str] = None,
        operation_filter: Optional[list] = None,
    ) -> NextExerciseResponse:
        instance = await self.get_or_create_instance(user_id)
        profile = self._load_profile(instance.state)

        # Override training mode if specified
        if training_mode:
            profile.training_mode = training_mode

        # ── Diagnostic mode: cycle through skills to assess broadly ──
        if not profile.diagnostic_completed and profile.total_exercises < 20 and not training_mode and not operation_filter:
            all_skills = list(SKILL_DEFINITIONS.keys())
            # Cycle through skills: exercise 0→skill 0, 1→skill 1, etc. then repeat
            skill_idx = profile.total_exercises % len(all_skills)
            skill_name = all_skills[skill_idx]
            sub_skill = None
            # Start at difficulty 2 to give a moderate challenge
            difficulty = 2
        else:
            # Select skill and difficulty
            skill_name, sub_skill = select_next_skill(profile, profile.training_mode, operation_filter)
            skill_data = profile.skill_vector.get_skill(skill_name)
            difficulty = select_next_difficulty(skill_data)

        # Check for spaced repetition items due (skip if operation filter is active)
        sr_exercise = None
        if not operation_filter:
            sr_exercise = await self._check_spaced_repetition(
                UUID(str(instance.user_id)), skill_name
            )
        if sr_exercise:
            exercise_obj = sr_exercise
        else:
            exercise_obj = generate_exercise(skill_name, difficulty, sub_skill)

        # Get agent intro message
        agent_intro = self._get_intro_message(profile, skill_name, difficulty)

        # Cache the exercise (in-memory + DB for persistence)
        exercise_dict = exercise_obj.to_dict()
        _exercise_cache[exercise_obj.exercise_id] = exercise_dict

        # Also persist in agent state so it survives server restarts
        state_dict = self._save_profile(profile)
        state_dict["pending_exercise"] = exercise_dict
        self.supabase.table("agent_instances")\
            .update({"state": state_dict}).eq("id", str(instance.id)).execute()

        return NextExerciseResponse(
            exercise_id=exercise_obj.exercise_id,
            question=exercise_obj.question,
            exercise_type=exercise_obj.skill,
            sub_skill=exercise_obj.sub_skill,
            difficulty=exercise_obj.difficulty,
            tip=exercise_obj.tip,
            time_limit_ms=exercise_obj.time_limit_ms,
            agent_intro=agent_intro,
            correct_answer=exercise_obj.correct_answer,
        )

    async def _check_spaced_repetition(
        self, user_id: UUID, preferred_skill: str
    ) -> Optional[object]:
        """Check if there are spaced repetition items due for review."""
        try:
            now = datetime.now(timezone.utc).isoformat()
            result = self.supabase.table("spaced_repetition_queue")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .lte("next_review", now)\
                .order("next_review")\
                .limit(1)\
                .execute()

            if result.data:
                item = result.data[0]
                from app.services.exercise_engine_v2 import GeneratedExercise
                return GeneratedExercise(
                    exercise_id=str(uuid4()),
                    skill=item["skill"],
                    sub_skill=item.get("sub_skill", ""),
                    question=item["question"],
                    correct_answer=item["correct_answer"],
                    difficulty=item["difficulty"],
                    time_limit_ms=EXPECTED_TIME_MS.get(item["difficulty"], 15000),
                    tip="Révision espacée — tu as déjà vu cet exercice !",
                )
        except Exception as e:
            logger.warning(f"SR queue check failed: {e}")

        return None

    # ══════════════════════════════════════════
    #           ANSWER SUBMISSION
    # ══════════════════════════════════════════

    async def submit_answer(
        self,
        user_id: UUID,
        exercise_id: UUID,
        user_answer: str,
        time_taken_ms: Optional[int],
    ) -> SubmitAnswerResponse:
        instance = await self.get_or_create_instance(user_id)
        profile = self._load_profile(instance.state)

        # Get cached exercise (in-memory first, then fall back to DB)
        cached = _exercise_cache.get(str(exercise_id))
        if not cached:
            # Try to recover from DB state
            state_data = instance.state.model_dump()
            pending = state_data.get("pending_exercise")
            if pending and pending.get("exercise_id") == str(exercise_id):
                cached = pending
                _exercise_cache[str(exercise_id)] = cached  # re-populate cache
        if not cached:
            raise ValueError(f"Exercise {exercise_id} not found (expired or invalid)")

        question = cached["question"]
        correct_answer = cached["correct_answer"]
        skill_name = cached["skill"]
        sub_skill = cached.get("sub_skill")
        difficulty = cached["difficulty"]
        tip_shown = cached.get("tip")

        # Check answer
        is_correct = self._check_answer(user_answer, correct_answer, skill_name)

        # Classify error if incorrect
        error_type = None
        if not is_correct:
            error_type = classify_error(
                correct_answer, user_answer, skill_name, sub_skill,
                time_taken_ms, difficulty
            )
            # Track error
            profile.error_counts[error_type] = profile.error_counts.get(error_type, 0) + 1
            # Store error pattern
            await self._store_error_pattern(
                user_id, skill_name, error_type, question,
                correct_answer, user_answer, time_taken_ms
            )

        # Update skill score
        skill_data = profile.skill_vector.get_skill(skill_name)
        skill_data = update_skill_score(
            skill_data, is_correct, time_taken_ms, difficulty, skill_name
        )
        profile.skill_vector.set_skill(skill_name, skill_data)

        # Update global stats
        profile.total_exercises += 1
        if is_correct:
            profile.total_correct += 1
            _exercise_cache.pop(str(exercise_id), None)

        # Compute new global level
        profile.global_level = compute_global_level(profile.skill_vector)
        profile.last_difficulty = difficulty

        # Update strengths/weaknesses
        strengths, weaknesses = identify_strengths_weaknesses(profile.skill_vector)
        profile.strengths = strengths
        profile.weaknesses = weaknesses
        profile.focus_areas = select_focus_areas(profile.skill_vector, weaknesses)

        # Check diagnostic completion (20 questions)
        if not profile.diagnostic_completed and profile.total_exercises >= 20:
            profile.diagnostic_completed = True

        # Update spaced repetition
        await self._update_spaced_repetition(
            user_id, skill_name, sub_skill, question,
            correct_answer, difficulty, is_correct, time_taken_ms
        )

        # Check for plateau
        plateau_message = None
        if detect_plateau(skill_data.score_history):
            remedy = get_plateau_remedy(skill_name, skill_data)
            plateau_message = remedy["message"]

        # Save performance to DB
        perf_data = {
            "agent_instance_id": str(instance.id),
            "exercise_type": skill_name,
            "sub_skill": sub_skill,
            "question": question,
            "correct_answer": correct_answer,
            "user_answer": user_answer,
            "is_correct": is_correct,
            "time_taken_ms": time_taken_ms,
            "difficulty": difficulty,
            "tip_shown": tip_shown,
            "error_type": error_type,
        }
        self.supabase.table("exercise_performances").insert(perf_data).execute()

        # Save updated profile to agent_instances
        state_dict = self._save_profile(profile)
        updates = {
            "state": state_dict,
            "current_level": max(1, int(profile.global_level / 20)),  # Map 0-100 to 0-5
        }
        if profile.diagnostic_completed and not instance.diagnostic_completed:
            updates["diagnostic_completed"] = True
        self.supabase.table("agent_instances")\
            .update(updates).eq("id", str(instance.id)).execute()

        # Save daily snapshot
        await self._save_daily_snapshot(user_id, profile)

        # Generate feedback
        technique_tip = None
        if not is_correct:
            tips = get_technique_tips(skill_name, 1)
            technique_tip = tips[0] if tips else None

        agent_feedback = self._get_feedback(
            is_correct, skill_name, difficulty, error_type, plateau_message
        )
        points_earned = self._calculate_points(is_correct, difficulty, time_taken_ms)

        return SubmitAnswerResponse(
            is_correct=is_correct,
            correct_answer=correct_answer,
            agent_feedback=agent_feedback,
            points_earned=points_earned,
            error_type=error_type,
            technique_tip=technique_tip,
            state_updated=True,
            skill_name=skill_name,
            skill_score=round(skill_data.score, 1),
            global_level=round(profile.global_level, 1),
        )

    # ══════════════════════════════════════════
    #                  CHAT
    # ══════════════════════════════════════════

    async def chat(self, user_id: UUID, message: str) -> dict:
        """Chat with the agent — provides tips and techniques."""
        instance = await self.get_or_create_instance(user_id)
        profile = self._load_profile(instance.state)
        await self._add_conversation(instance.id, "user", message)

        # Build rich context for Gemini
        scores = profile.skill_vector.get_scores()
        context = f"""Profil élève : niveau {round(profile.global_level)}/100, {profile.total_exercises} exercices, {round(profile.total_correct / max(1, profile.total_exercises) * 100)}% réussite.
Forces : {', '.join(profile.strengths) if profile.strengths else 'en évaluation'}.
Faiblesses : {', '.join(profile.weaknesses) if profile.weaknesses else 'aucune'}."""

        try:
            response = await generate_agent_response(message, context)
        except Exception:
            response = self._generate_chat_response(profile, message)

        await self._add_conversation(instance.id, "agent", response)

        # Get relevant tips
        tips = []
        msg_lower = message.lower()
        for skill_name, skill_tips in TECHNIQUE_TIPS.items():
            label = SKILL_DEFINITIONS[skill_name]["label"].lower()
            if label in msg_lower or skill_name in msg_lower:
                tips.extend(get_technique_tips(skill_name, 2))
                break

        return {"agent_message": response, "tips": tips}

    async def get_conversation_history(
        self, user_id: UUID, limit: int = 50
    ) -> List[ConversationMessage]:
        instance = await self.get_or_create_instance(user_id)
        result = self.supabase.table("agent_conversations")\
            .select("*").eq("agent_instance_id", str(instance.id))\
            .order("created_at", desc=True).limit(limit).execute()

        return [
            ConversationMessage(
                id=UUID(m["id"]), agent_instance_id=UUID(m["agent_instance_id"]),
                role=m["role"], message=m["message"],
                metadata=m.get("metadata", {}), created_at=m["created_at"],
            )
            for m in reversed(result.data)
        ]

    # ══════════════════════════════════════════
    #              DASHBOARD DATA
    # ══════════════════════════════════════════

    async def get_dashboard(self, user_id: UUID) -> DashboardResponse:
        """Get complete dashboard data in one call."""
        instance = await self.get_or_create_instance(user_id)
        profile = self._load_profile(instance.state)

        # Build skill scores
        skills = []
        for skill_name, defn in SKILL_DEFINITIONS.items():
            sd = profile.skill_vector.get_skill(skill_name)
            skills.append(SkillScore(
                name=skill_name,
                label=defn["label"],
                score=round(sd.score, 1),
                accuracy=round(sd.accuracy_ema, 3),
                speed_avg_ms=round(sd.speed_avg_ms, 0),
                attempts=sd.attempts,
                streak=sd.streak,
                difficulty_mastered=sd.difficulty_mastered,
                is_automated=detect_automatization(sd),
                is_plateau=detect_plateau(sd.score_history),
            ))

        # Sort by defined order
        skills.sort(key=lambda s: SKILL_DEFINITIONS.get(s.name, {}).get("order", 99))

        # Get history for graph
        history = await self._get_skill_history(user_id)

        # Generate agent message
        agent_msg = self._generate_dashboard_message(profile)

        accuracy = (profile.total_correct / max(1, profile.total_exercises)) * 100

        return DashboardResponse(
            global_level=round(profile.global_level, 1),
            total_exercises=profile.total_exercises,
            total_correct=profile.total_correct,
            accuracy=round(accuracy, 1),
            skills=skills,
            strengths=profile.strengths,
            weaknesses=profile.weaknesses,
            focus_areas=profile.focus_areas,
            error_breakdown=profile.error_counts,
            history=history,
            agent_message=agent_msg,
            diagnostic_completed=profile.diagnostic_completed,
        )

    async def _get_skill_history(self, user_id: UUID) -> List[SkillSnapshotResponse]:
        """Get last 30 days of skill snapshots."""
        try:
            thirty_days_ago = (
                datetime.now(timezone.utc) - timedelta(days=30)
            ).strftime("%Y-%m-%d")

            result = self.supabase.table("skill_snapshots")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .gte("snapshot_date", thirty_days_ago)\
                .order("snapshot_date")\
                .execute()

            return [
                SkillSnapshotResponse(
                    date=s["snapshot_date"],
                    global_level=s["global_level"],
                    skill_scores=s.get("skill_vector", {}),
                )
                for s in result.data
            ]
        except Exception as e:
            logger.warning(f"Failed to get skill history: {e}")
            return []

    # ══════════════════════════════════════════
    #            INTERNAL METHODS
    # ══════════════════════════════════════════

    async def _add_conversation(
        self, agent_instance_id: UUID, role: str, message: str, metadata: dict = None
    ):
        data = {
            "agent_instance_id": str(agent_instance_id),
            "role": role, "message": message, "metadata": metadata or {},
        }
        self.supabase.table("agent_conversations").insert(data).execute()

    async def _get_recent_performance(
        self, agent_instance_id: UUID, limit: int = 10
    ) -> List[dict]:
        result = self.supabase.table("exercise_performances")\
            .select("*").eq("agent_instance_id", str(agent_instance_id))\
            .order("created_at", desc=True).limit(limit).execute()
        return result.data

    async def _store_error_pattern(
        self, user_id: UUID, skill: str, error_type: str,
        question: str, correct_answer: str, user_answer: str,
        time_taken_ms: Optional[int],
    ):
        try:
            self.supabase.table("error_patterns").insert({
                "user_id": str(user_id),
                "skill": skill,
                "error_type": error_type,
                "question": question,
                "correct_answer": correct_answer,
                "user_answer": user_answer,
                "time_taken_ms": time_taken_ms,
            }).execute()
        except Exception as e:
            logger.warning(f"Failed to store error pattern: {e}")

    async def _update_spaced_repetition(
        self, user_id: UUID, skill: str, sub_skill: Optional[str],
        question: str, correct_answer: str, difficulty: int,
        is_correct: bool, time_taken_ms: Optional[int],
    ):
        """Update or create spaced repetition item."""
        try:
            expected_ms = EXPECTED_TIME_MS.get(difficulty, 10000)
            quality = compute_sr_quality(is_correct, time_taken_ms, expected_ms)

            # Check if item exists
            result = self.supabase.table("spaced_repetition_queue")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .eq("question", question)\
                .limit(1)\
                .execute()

            if result.data:
                item_data = result.data[0]
                sr = SRItem(
                    repetitions=item_data["repetitions"],
                    ease_factor=item_data["ease_factor"],
                    interval_days=item_data["interval_days"],
                )
                sr.update(quality)

                self.supabase.table("spaced_repetition_queue")\
                    .update({
                        "repetitions": sr.repetitions,
                        "ease_factor": sr.ease_factor,
                        "interval_days": sr.interval_days,
                        "next_review": sr.next_review.isoformat() if sr.next_review else None,
                        "last_reviewed": datetime.now(timezone.utc).isoformat(),
                        "total_attempts": item_data["total_attempts"] + 1,
                        "total_correct": item_data["total_correct"] + (1 if is_correct else 0),
                        "avg_time_ms": time_taken_ms,
                    })\
                    .eq("id", item_data["id"])\
                    .execute()
            elif not is_correct:
                # Only add to SR queue on mistakes
                sr = SRItem()
                sr.update(quality)
                self.supabase.table("spaced_repetition_queue").insert({
                    "user_id": str(user_id),
                    "skill": skill,
                    "sub_skill": sub_skill,
                    "question": question,
                    "correct_answer": correct_answer,
                    "difficulty": difficulty,
                    "repetitions": sr.repetitions,
                    "ease_factor": sr.ease_factor,
                    "interval_days": sr.interval_days,
                    "next_review": sr.next_review.isoformat() if sr.next_review else None,
                    "total_attempts": 1,
                    "total_correct": 0,
                }).execute()
        except Exception as e:
            logger.warning(f"SR update failed: {e}")

    async def _save_daily_snapshot(self, user_id: UUID, profile: UserCognitiveProfile):
        """Save or update daily skill snapshot for graphs."""
        try:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            scores = profile.skill_vector.get_scores()

            self.supabase.table("skill_snapshots").upsert({
                "user_id": str(user_id),
                "snapshot_date": today,
                "global_level": round(profile.global_level),
                "skill_vector": scores,
                "total_exercises": profile.total_exercises,
            }, on_conflict="user_id,snapshot_date").execute()
        except Exception as e:
            logger.warning(f"Snapshot save failed: {e}")

    def _check_answer(
        self, user_answer: str, correct_answer: str, skill: str
    ) -> bool:
        """Check if answer is correct, with tolerance for estimation."""
        try:
            user_val = float(user_answer.strip().replace(",", "."))
            correct_val = float(correct_answer.strip().replace(",", "."))

            # Exact match for most skills
            if skill != "estimation":
                return user_val == correct_val

            # 10% tolerance for estimation
            tolerance = max(abs(correct_val) * 0.10, 1)
            return abs(user_val - correct_val) <= tolerance
        except (ValueError, TypeError):
            return False

    def _calculate_points(
        self, is_correct: bool, difficulty: int, time_ms: Optional[int]
    ) -> int:
        if not is_correct:
            return 0
        base = difficulty * 10
        if time_ms and time_ms < 3000:
            return int(base * 2.0)
        elif time_ms and time_ms < 5000:
            return int(base * 1.5)
        return base

    def _get_intro_message(
        self, profile: UserCognitiveProfile, skill_name: str, difficulty: int
    ) -> Optional[str]:
        label = SKILL_DEFINITIONS[skill_name]["label"]

        if profile.total_exercises == 0:
            return f"Première question ! On commence avec {label}. Prends ton temps. 🎯"
        if profile.total_exercises % 10 == 0:
            return f"Exercice {profile.total_exercises + 1}. Tu assures ! 🚀"
        if skill_name in profile.weaknesses:
            return f"On travaille {label} — c'est un point à améliorer. 💪"

        # Plateau message
        sd = profile.skill_vector.get_skill(skill_name)
        if detect_plateau(sd.score_history):
            return f"Changement de rythme sur {label} pour relancer ta progression ! ⚡"

        return None

    def _get_feedback(
        self, is_correct: bool, skill: str, difficulty: int,
        error_type: Optional[str], plateau_msg: Optional[str],
    ) -> str:
        label = SKILL_DEFINITIONS.get(skill, {}).get("label", skill)

        if is_correct:
            if difficulty >= 4:
                return f"Excellent ! {label} de niveau expert ! 🚀"
            elif difficulty >= 3:
                return "Très bien, continue ! ✅"
            return "Correct ✅"

        error_hints = {
            "table_error": "Revois cette table — la pratique régulière aide à l'automatiser.",
            "carry_error": "Attention aux retenues ! Vérifie chaque étape.",
            "inattention": "Presque ! Prends une seconde de plus pour vérifier.",
            "procedure_error": "Essaie de décomposer le calcul en étapes plus simples.",
            "timeout": "Pas de réponse ? Commence par estimer l'ordre de grandeur.",
        }
        hint = error_hints.get(error_type, "")
        base = f"Incorrect. {hint}" if hint else "Incorrect, on continue ! 💪"

        if plateau_msg:
            base += f"\n{plateau_msg}"

        return base

    def _generate_dashboard_message(self, profile: UserCognitiveProfile) -> str:
        if profile.total_exercises == 0:
            return "Bienvenue ! Lance ton premier exercice pour commencer le diagnostic. 🎯"

        if not profile.diagnostic_completed:
            remaining = max(0, 10 - profile.total_exercises)
            return f"Diagnostic en cours... encore {remaining} exercice{'s' if remaining > 1 else ''} ! 📊"

        if profile.weaknesses:
            weak_labels = [
                SKILL_DEFINITIONS.get(w, {}).get("label", w)
                for w in profile.weaknesses[:2]
            ]
            return (
                f"Niveau {round(profile.global_level)}/100. "
                f"On va travailler ensemble sur : {', '.join(weak_labels)}. 💪"
            )

        if profile.global_level >= 80:
            return f"Niveau {round(profile.global_level)}/100. Tu es en mode expert ! 🏆"
        elif profile.global_level >= 50:
            return f"Niveau {round(profile.global_level)}/100. Belle progression, continue ! 📈"
        else:
            return f"Niveau {round(profile.global_level)}/100. Chaque exercice te fait progresser ! 🚀"

    def _generate_chat_response(
        self, profile: UserCognitiveProfile, message: str,
    ) -> str:
        """Fallback chat when Gemini is unavailable."""
        msg = message.lower()
        if any(w in msg for w in ["aide", "help", "comment", "technique", "astuce"]):
            return (
                "Je suis là pour t'aider ! "
                "Pose-moi une question sur un calcul spécifique "
                "et je te donnerai toutes les techniques. 💡"
            )
        if any(w in msg for w in ["niveau", "stats", "score", "progression"]):
            scores = profile.skill_vector.get_scores()
            top_3 = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
            return (
                f"Ton niveau global est {round(profile.global_level)}/100. "
                f"Tes meilleurs scores : "
                + ", ".join(f'{SKILL_DEFINITIONS[k]["label"]}: {v}' for k, v in top_3)
                + ". 📊"
            )
        if any(w in msg for w in ["table", "multiplication"]):
            tips = get_technique_tips("tables_1_20", 3)
            return "Voici des astuces pour les tables :\n" + "\n".join(tips)
        if any(w in msg for w in ["merci", "thanks"]):
            return "De rien ! Prêt·e pour la suite ? 🚀"
        return (
            "Je suis ton coach ! Pose-moi des questions sur le calcul mental "
            "ou lance un exercice. 🎯"
        )


# ══════════════════════════════════════════
#              SINGLETON
# ══════════════════════════════════════════

_agent_service = None


def get_agent_service() -> AgentService:
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service

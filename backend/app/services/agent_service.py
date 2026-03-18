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
import asyncio
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
    get_slow_threshold,
    is_slow,
    AUTOMATICITY_MS,
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
    SkillSnapshotResponse, DailyTimeEntry,
)

logger = logging.getLogger(__name__)

# In-memory exercise cache (MVP — use Redis in prod for multi-process)
_exercise_cache: dict[str, dict] = {}

# Per-user count of slow queue exercises served in the current session.
# Reset when analyze_session is called (= session end / start of next session tracking).
_slow_served_session: dict[str, int] = {}

SLOW_QUEUE_MAX_PER_SESSION = 10


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

        # ── Diagnostic mode: pick random skills to assess broadly ──
        if not profile.diagnostic_completed and profile.total_exercises < 20 and not training_mode and not operation_filter:
            all_skills = list(SKILL_DEFINITIONS.keys())
            # Pick randomly so the first exercise is never the same
            skill_name = random.choice(all_skills)
            sub_skill = None
            difficulty = 2
        else:
            # Select skill and difficulty
            skill_name, sub_skill = select_next_skill(profile, profile.training_mode, operation_filter)
            skill_data = profile.skill_vector.get_skill(skill_name)
            difficulty = select_next_difficulty(skill_data)
            # Cap multiplication difficulty at 4 (large 2-digit × 2-digit) unless the
            # user explicitly chose the "advanced" operation filter or has an exceptional
            # global level (>= 80). This keeps 782×89-style problems out of normal flow.
            if skill_name == "multiplication" and difficulty >= 5:
                if not (operation_filter and "advanced" in operation_filter) and profile.global_level < 80:
                    difficulty = 4

        # ── Force difficulty 5 (21×21 → 99×99) for multiplication filter mode ──
        is_mult_filter = operation_filter == ["multiplication"] or operation_filter == ("multiplication",)
        if is_mult_filter:
            difficulty = 5

        # 1. Check slow queue
        #    - Tables mode → source_mode="tables"
        #    - Multiplication filter → source_mode="multiplication"
        #    - Adaptive/free → any source_mode (no filter)
        slow_exercise = None
        if training_mode == "tables":
            slow_exercise = await self._get_slow_queue_exercise(
                UUID(str(instance.user_id)), source_mode="tables"
            )
        elif is_mult_filter:
            slow_exercise = await self._get_slow_queue_exercise(
                UUID(str(instance.user_id)), source_mode="multiplication"
            )
        elif not operation_filter:
            slow_exercise = await self._get_slow_queue_exercise(UUID(str(instance.user_id)))

        # 2. Fall back to spaced repetition queue (adaptive mode only)
        sr_exercise = None
        if not slow_exercise and not operation_filter and training_mode not in ("tables",):
            sr_exercise = await self._check_spaced_repetition(
                UUID(str(instance.user_id)), skill_name
            )

        if slow_exercise:
            exercise_obj = slow_exercise
        elif sr_exercise:
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
                from app.services.exercise_engine_v2 import GeneratedExercise, get_technique_tips
                # Use a real technique tip instead of the spaced repetition label
                tips = get_technique_tips(item["skill"], 1)
                tip = tips[0] if tips else None

                # Recompute answer for chain/mixed exercises to fix stale entries
                # that were stored with the old left-to-right evaluation algorithm.
                correct_answer = item["correct_answer"]
                if item["skill"] in ("chain", "mixed") and item.get("question"):
                    try:
                        eval_expr = (
                            item["question"]
                            .replace("×", "*")
                            .replace("÷", "/")
                            .replace("−", "-")
                        )
                        recomputed = int(eval(eval_expr))
                        correct_answer = str(recomputed)
                    except Exception:
                        pass

                # Lease lock: push next_review 1 hour forward so the background
                # prefetch cannot return this same item before the user submits.
                lease_time = (
                    datetime.now(timezone.utc) + timedelta(hours=1)
                ).isoformat()
                self.supabase.table("spaced_repetition_queue")\
                    .update({"next_review": lease_time})\
                    .eq("id", item["id"])\
                    .execute()

                return GeneratedExercise(
                    exercise_id=str(uuid4()),
                    skill=item["skill"],
                    sub_skill=item.get("sub_skill", ""),
                    question=item["question"],
                    correct_answer=correct_answer,
                    difficulty=item["difficulty"],
                    time_limit_ms=EXPECTED_TIME_MS.get(item["difficulty"], 15000),
                    tip=tip,
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
            state_data = instance.state.model_dump()
            pending = state_data.get("pending_exercise")
            if pending and pending.get("exercise_id") == str(exercise_id):
                cached = pending
                _exercise_cache[str(exercise_id)] = cached
        if not cached:
            raise ValueError(f"Exercise {exercise_id} not found (expired or invalid)")

        question = cached["question"]
        correct_answer = cached["correct_answer"]
        skill_name = cached["skill"]
        sub_skill = cached.get("sub_skill")
        difficulty = cached["difficulty"]
        tip_shown = cached.get("tip")

        # ── All computation in memory (no I/O) ──────────────────────────
        is_correct = self._check_answer(user_answer, correct_answer, skill_name)

        error_type = None
        if not is_correct:
            error_type = classify_error(
                correct_answer, user_answer, skill_name, sub_skill,
                time_taken_ms, difficulty
            )
            profile.error_counts[error_type] = profile.error_counts.get(error_type, 0) + 1

        skill_data = profile.skill_vector.get_skill(skill_name)
        skill_data = update_skill_score(
            skill_data, is_correct, time_taken_ms, difficulty, skill_name
        )
        profile.skill_vector.set_skill(skill_name, skill_data)

        profile.total_exercises += 1
        if is_correct:
            profile.total_correct += 1
            _exercise_cache.pop(str(exercise_id), None)

        profile.global_level = compute_global_level(profile.skill_vector)
        profile.last_difficulty = difficulty

        strengths, weaknesses = identify_strengths_weaknesses(profile.skill_vector)
        profile.strengths = strengths
        profile.weaknesses = weaknesses
        profile.focus_areas = select_focus_areas(profile.skill_vector, weaknesses)

        if not profile.diagnostic_completed and profile.total_exercises >= 20:
            profile.diagnostic_completed = True

        plateau_message = None
        if detect_plateau(skill_data.score_history):
            remedy = get_plateau_remedy(skill_name, skill_data)
            plateau_message = remedy["message"]

        # ── Build response immediately (pure memory) ─────────────────────
        technique_tip = None
        if not is_correct:
            tips = get_technique_tips(skill_name, 1)
            technique_tip = tips[0] if tips else None

        agent_feedback = self._get_feedback(
            is_correct, skill_name, difficulty, error_type, plateau_message
        )
        points_earned = self._calculate_points(is_correct, difficulty, time_taken_ms)

        response = SubmitAnswerResponse(
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

        # ── Fire all DB writes in background (non-blocking) ──────────────
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
        asyncio.create_task(self._persist_submission(
            user_id=user_id,
            instance=instance,
            profile=profile,
            perf_data=perf_data,
            skill_name=skill_name,
            sub_skill=sub_skill,
            question=question,
            correct_answer=correct_answer,
            user_answer=user_answer,
            difficulty=difficulty,
            is_correct=is_correct,
            time_taken_ms=time_taken_ms,
            error_type=error_type,
        ))

        # Update SM-2 interval for slow queue exercises (non-blocking)
        if str(exercise_id) in _exercise_cache and _exercise_cache[str(exercise_id)].get("slow_queue_id"):
            asyncio.create_task(self._update_slow_queue_sm2(str(exercise_id), time_taken_ms))

        return response

    async def _persist_submission(
        self,
        user_id: UUID,
        instance,
        profile,
        perf_data: dict,
        skill_name: str,
        sub_skill: Optional[str],
        question: str,
        correct_answer: str,
        user_answer: str,
        difficulty: int,
        is_correct: bool,
        time_taken_ms: Optional[int],
        error_type: Optional[str],
    ):
        """Persist all submission data to DB in parallel (background task)."""
        async def save_performance():
            try:
                await asyncio.to_thread(
                    lambda: self.supabase.table("exercise_performances").insert(perf_data).execute()
                )
            except Exception as e:
                logger.warning(f"Failed to save performance: {e}")

        async def save_profile():
            try:
                state_dict = self._save_profile(profile)
                updates = {
                    "state": state_dict,
                    "current_level": max(1, int(profile.global_level / 20)),
                }
                if profile.diagnostic_completed and not instance.diagnostic_completed:
                    updates["diagnostic_completed"] = True
                await asyncio.to_thread(
                    lambda: self.supabase.table("agent_instances")
                        .update(updates).eq("id", str(instance.id)).execute()
                )
            except Exception as e:
                logger.warning(f"Failed to save profile: {e}")

        tasks = [
            save_performance(),
            save_profile(),
            self._save_daily_snapshot(user_id, profile),
            self._update_spaced_repetition(
                user_id, skill_name, sub_skill, question,
                correct_answer, difficulty, is_correct, time_taken_ms
            ),
        ]
        if error_type:
            tasks.append(self._store_error_pattern(
                user_id, skill_name, error_type, question,
                correct_answer, user_answer, time_taken_ms
            ))

        await asyncio.gather(*tasks, return_exceptions=True)

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

        # Get daily time data
        daily_time_data, total_time_ms, avg_time_ms = await self._get_daily_time_data(
            instance.id, days=90
        )

        # Generate agent message
        agent_msg = self._generate_dashboard_message(profile)

        accuracy = (profile.total_correct / max(1, profile.total_exercises)) * 100

        return DashboardResponse(
            global_level=round(profile.global_level, 1),
            total_exercises=profile.total_exercises,
            total_correct=profile.total_correct,
            accuracy=round(accuracy, 1),
            avg_time_ms=round(avg_time_ms, 0),
            total_time_ms=total_time_ms,
            daily_time_data=daily_time_data,
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
        """Get all skill snapshots (up to 365 days) for the progress graphs."""
        try:
            one_year_ago = (
                datetime.now(timezone.utc) - timedelta(days=365)
            ).strftime("%Y-%m-%d")

            result = self.supabase.table("skill_snapshots")\
                .select("*")\
                .eq("user_id", str(user_id))\
                .gte("snapshot_date", one_year_ago)\
                .order("snapshot_date")\
                .execute()

            return [
                SkillSnapshotResponse(
                    date=s["snapshot_date"],
                    global_level=s["global_level"],
                    skill_scores=s.get("skill_vector", {}),
                    total_exercises=s.get("total_exercises", 0),
                )
                for s in result.data
            ]
        except Exception as e:
            logger.warning(f"Failed to get skill history: {e}")
            return []

    async def _get_daily_time_data(
        self, agent_instance_id: UUID, days: int = 90
    ) -> Tuple[List[DailyTimeEntry], int, float]:
        """Get daily aggregated time from exercise_performances.

        Returns (daily_entries, total_time_ms, avg_time_ms).
        """
        try:
            cutoff = (
                datetime.now(timezone.utc) - timedelta(days=days)
            ).isoformat()

            result = self.supabase.table("exercise_performances")\
                .select("time_taken_ms, created_at")\
                .eq("agent_instance_id", str(agent_instance_id))\
                .gte("created_at", cutoff)\
                .order("created_at")\
                .execute()

            from collections import defaultdict
            daily: dict[str, dict] = defaultdict(lambda: {"time_ms": 0, "exercises": 0})
            total_time = 0
            count = 0

            for row in result.data:
                t = row.get("time_taken_ms") or 0
                # created_at may be ISO string with T separator
                date_str = (row.get("created_at", "") or "")[:10]
                if not date_str:
                    continue
                daily[date_str]["time_ms"] += t
                daily[date_str]["exercises"] += 1
                total_time += t
                count += 1

            entries = [
                DailyTimeEntry(date=d, time_ms=v["time_ms"], exercises=v["exercises"])
                for d, v in sorted(daily.items())
            ]
            avg_time = total_time / count if count > 0 else 0
            return entries, total_time, avg_time
        except Exception as e:
            logger.warning(f"Failed to get daily time data: {e}")
            return [], 0, 0.0

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
            data = {
                "user_id": str(user_id),
                "skill": skill,
                "error_type": error_type,
                "question": question,
                "correct_answer": correct_answer,
                "user_answer": user_answer,
                "time_taken_ms": time_taken_ms,
            }
            await asyncio.to_thread(
                lambda: self.supabase.table("error_patterns").insert(data).execute()
            )
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

            result = await asyncio.to_thread(
                lambda: self.supabase.table("spaced_repetition_queue")
                    .select("*")
                    .eq("user_id", str(user_id))
                    .eq("question", question)
                    .limit(1)
                    .execute()
            )

            if result.data:
                item_data = result.data[0]
                sr = SRItem(
                    repetitions=item_data["repetitions"],
                    ease_factor=item_data["ease_factor"],
                    interval_days=item_data["interval_days"],
                )
                sr.update(quality)
                update_payload = {
                    "repetitions": sr.repetitions,
                    "ease_factor": sr.ease_factor,
                    "interval_days": sr.interval_days,
                    "next_review": sr.next_review.isoformat() if sr.next_review else None,
                    "last_reviewed": datetime.now(timezone.utc).isoformat(),
                    "total_attempts": item_data["total_attempts"] + 1,
                    "total_correct": item_data["total_correct"] + (1 if is_correct else 0),
                    "avg_time_ms": time_taken_ms,
                }
                item_id = item_data["id"]
                await asyncio.to_thread(
                    lambda: self.supabase.table("spaced_repetition_queue")
                        .update(update_payload).eq("id", item_id).execute()
                )
            elif not is_correct:
                sr = SRItem()
                sr.update(quality)
                insert_payload = {
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
                }
                await asyncio.to_thread(
                    lambda: self.supabase.table("spaced_repetition_queue").insert(insert_payload).execute()
                )
        except Exception as e:
            logger.warning(f"SR update failed: {e}")

    async def _save_daily_snapshot(self, user_id: UUID, profile: UserCognitiveProfile):
        """Save or update daily skill snapshot for graphs."""
        try:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            scores = profile.skill_vector.get_scores()
            payload = {
                "user_id": str(user_id),
                "snapshot_date": today,
                "global_level": round(profile.global_level),
                "skill_vector": scores,
                "total_exercises": profile.total_exercises,
            }
            await asyncio.to_thread(
                lambda: self.supabase.table("skill_snapshots")
                    .upsert(payload, on_conflict="user_id,snapshot_date").execute()
            )
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

    # ══════════════════════════════════════════
    #          SESSION ANALYSIS (end-of-series)
    # ══════════════════════════════════════════

    async def analyze_session(
        self,
        user_id: UUID,
        results: list[dict],
    ) -> dict:
        """
        Called at the end of each 20-exercise session.
        - Flags slow exercises (tables_1_20 and multiplication skill only)
        - Top 10 slowest → next_review_at = now (serve next session)
        - Items 11+ → next_review_at = now + 2 days (future sessions)
        - Non-multiplication slow skills → boost in adaptive mode
        - Resets per-session slow-served counter for next session
        """
        TABLES_SKILLS = {"tables_1_20"}
        MULT_SKILLS = {"multiplication"}
        QUEUE_SKILLS = TABLES_SKILLS | MULT_SKILLS

        # Reset session counter — new session starts
        _slow_served_session[str(user_id)] = 0

        slow_items: list[dict] = []

        for r in results:
            skill = r.get("skill_name") or r.get("exercise_type", "")
            difficulty = int(r.get("difficulty", 1))
            time_ms = int(r.get("time_ms", 0))
            question = r.get("question", "")
            correct_answer = r.get("correct_answer", "")

            if not question or not skill or time_ms <= 0:
                continue

            threshold = get_slow_threshold(skill, difficulty)
            if is_slow(skill, difficulty, time_ms):
                slow_items.append({
                    "skill": skill,
                    "sub_skill": r.get("sub_skill"),
                    "question": question,
                    "correct_answer": correct_answer,
                    "difficulty": difficulty,
                    "time_ms": time_ms,
                    "threshold_ms": threshold,
                    "source_mode": "tables" if skill in TABLES_SKILLS else "multiplication",
                    "in_queue": skill in QUEUE_SKILLS,
                })

        # Sort all slow items by time desc — slowest first
        slow_items.sort(key=lambda x: x["time_ms"], reverse=True)

        # Queue only tables_1_20 and multiplication for exact re-serving
        queue_items = [item for item in slow_items if item["in_queue"]]
        if queue_items:
            # Top 10 → next session (next_review_at = now)
            # Items 11+ → 2 sessions from now (approx 2 days)
            asyncio.create_task(self._persist_slow_queue(user_id, queue_items))

        # Non-queue slow skills → boost in adaptive mode next session
        non_queue_slow_skills = list({
            item["skill"] for item in slow_items if not item["in_queue"]
        })
        if non_queue_slow_skills:
            asyncio.create_task(self._save_slow_skills(user_id, non_queue_slow_skills))

        # Top 3 slowest across ALL results for summary display
        top3_slowest = sorted(
            [r for r in results if r.get("time_ms", 0) > 0],
            key=lambda r: r.get("time_ms", 0),
            reverse=True,
        )[:3]

        return {
            "slow_count": len(slow_items),
            "top3_slowest": [
                {
                    "question": r.get("question"),
                    "time_ms": r.get("time_ms"),
                    "threshold_ms": get_slow_threshold(
                        r.get("skill_name") or r.get("exercise_type", ""),
                        int(r.get("difficulty", 1)),
                    ),
                    "skill": r.get("skill_name") or r.get("exercise_type", ""),
                }
                for r in top3_slowest
            ],
        }

    @staticmethod
    def _commute_table_question(question: str, correct_answer: str) -> Optional[dict]:
        """
        For a tables question like '7 × 8 = ?' return {'question': '8 × 7 = ?'}.
        Returns None if the question is already commuted or can't be parsed.
        """
        import re
        m = re.match(r"(\d+)\s*[×x\*]\s*(\d+)", question)
        if not m:
            return None
        a, b = int(m.group(1)), int(m.group(2))
        if a == b:
            return None  # same question when commuted
        commuted_q = f"{b} × {a}"
        if commuted_q == question.replace(" × ", " × "):
            return None
        return {"question": commuted_q, "correct_answer": correct_answer}

    async def _persist_slow_queue(self, user_id: UUID, slow_items: list[dict]):
        """
        Upsert slow exercises into session_slow_queue with SM-2 scheduling.
        - slow_items must be sorted by time desc (slowest first).
        - Top 10 → next_review_at = now (serve next session).
        - Items 11+ → next_review_at = now + 2 days (deferred).
        - Tables: also insert/update the commuted question (8×7 when 7×8 is slow).
        """
        try:
            now = datetime.now(timezone.utc)

            async def _upsert_one(item: dict, rank: int):
                # Top 10 scheduled for next session; rest deferred 2 days
                review_at = now if rank < SLOW_QUEUE_MAX_PER_SESSION else now + timedelta(days=2)
                try:
                    existing = await asyncio.to_thread(
                        lambda q=item["question"]: self.supabase
                            .table("session_slow_queue")
                            .select("id, consecutive_slow_sessions, review_interval")
                            .eq("user_id", str(user_id))
                            .eq("question", q)
                            .limit(1)
                            .execute()
                    )
                    if existing.data:
                        row = existing.data[0]
                        await asyncio.to_thread(
                            lambda rid=row["id"]: self.supabase.table("session_slow_queue")
                                .update({
                                    "consecutive_slow_sessions": row["consecutive_slow_sessions"] + 1,
                                    "consecutive_fast_sessions": 0,
                                    "review_interval": 1,  # reset interval — was slow again
                                    "next_review_at": review_at.isoformat(),
                                    "time_taken_ms": item["time_ms"],
                                    "last_seen_at": now.isoformat(),
                                })
                                .eq("id", rid)
                                .execute()
                        )
                    else:
                        await asyncio.to_thread(
                            lambda: self.supabase.table("session_slow_queue").insert({
                                "user_id": str(user_id),
                                "skill": item["skill"],
                                "sub_skill": item.get("sub_skill"),
                                "question": item["question"],
                                "correct_answer": item["correct_answer"],
                                "difficulty": item["difficulty"],
                                "time_taken_ms": item["time_ms"],
                                "threshold_ms": item["threshold_ms"],
                                "source_mode": item["source_mode"],
                                "next_review_at": review_at.isoformat(),
                                "review_interval": 1,
                                "consecutive_slow_sessions": 1,
                                "consecutive_fast_sessions": 0,
                            }).execute()
                        )
                except Exception as e:
                    logger.warning(f"Failed to upsert slow queue item '{item['question']}': {e}")

            for rank, item in enumerate(slow_items):
                await _upsert_one(item, rank)

                # For tables_1_20: also queue commuted version (7×8 ↔ 8×7)
                if item["source_mode"] == "tables":
                    commuted = _commute_table_question(item["question"], item["correct_answer"])
                    if commuted:
                        commuted_item = {**item, "question": commuted["question"]}
                        await _upsert_one(commuted_item, rank)

        except Exception as e:
            logger.warning(f"Failed to persist slow queue: {e}")

    async def _save_slow_skills(self, user_id: UUID, slow_skills: list[str]):
        """Persist slow non-multiplication skill names into agent state for boosted selection next session."""
        try:
            instance = await self.get_or_create_instance(user_id)
            profile = self._load_profile(instance.state)
            # Replace (fresh per session end — not cumulative)
            profile.slow_skills = slow_skills
            state_dict = self._save_profile(profile)
            await asyncio.to_thread(
                lambda: self.supabase.table("agent_instances")
                    .update({"state": state_dict})
                    .eq("id", str(instance.id))
                    .execute()
            )
        except Exception as e:
            logger.warning(f"Failed to save slow skills: {e}")

    async def _get_slow_queue_exercise(
        self, user_id: UUID, source_mode: Optional[str] = None
    ) -> Optional[object]:
        """
        Pull one due slow exercise from session_slow_queue (next_review_at <= now).
        - source_mode: filter to "tables" or "multiplication" if specified.
        - Capped at SLOW_QUEUE_MAX_PER_SESSION per session.
        - Does NOT delete — pushes next_review_at forward (SM-2 interval).
        - Stores slow_queue_id in exercise cache for SM-2 update on submit.
        """
        uid = str(user_id)
        if _slow_served_session.get(uid, 0) >= SLOW_QUEUE_MAX_PER_SESSION:
            return None

        try:
            now = datetime.now(timezone.utc)
            query = (
                self.supabase.table("session_slow_queue")
                    .select("*")
                    .eq("user_id", uid)
                    .lte("next_review_at", now.isoformat())
                    .order("next_review_at")
                    .limit(1)
            )
            if source_mode:
                query = query.eq("source_mode", source_mode)

            result = await asyncio.to_thread(lambda: query.execute())
            if not result.data:
                return None

            item = result.data[0]

            # Push next_review_at forward so this item isn't served again this session
            # (review_interval days from now — SM-2 base interval)
            interval_days = max(1, item.get("review_interval", 1))
            next_review = now + timedelta(days=interval_days)
            await asyncio.to_thread(
                lambda: self.supabase.table("session_slow_queue")
                    .update({"next_review_at": next_review.isoformat(), "last_seen_at": now.isoformat()})
                    .eq("id", item["id"])
                    .execute()
            )

            _slow_served_session[uid] = _slow_served_session.get(uid, 0) + 1

            from app.services.exercise_engine_v2 import GeneratedExercise, get_technique_tips
            tips = get_technique_tips(item["skill"], 1)
            tip = tips[0] if tips else None

            exercise_id = str(uuid4())
            # Store slow_queue_id in cache so submit_answer can update SM-2 on response
            _exercise_cache[exercise_id] = {
                "slow_queue_id": item["id"],
                "slow_queue_threshold_ms": item.get("threshold_ms", 5000),
                "slow_queue_review_interval": interval_days,
                "slow_queue_consecutive_fast": item.get("consecutive_fast_sessions", 0),
            }

            return GeneratedExercise(
                exercise_id=exercise_id,
                skill=item["skill"],
                sub_skill=item.get("sub_skill") or "",
                question=item["question"],
                correct_answer=item["correct_answer"],
                difficulty=item["difficulty"],
                time_limit_ms=EXPECTED_TIME_MS.get(item["difficulty"], 15000),
                tip=tip,
            )
        except Exception as e:
            logger.warning(f"Slow queue fetch failed: {e}")
            return None

    async def _update_slow_queue_sm2(self, exercise_id: str, time_taken_ms: Optional[int]):
        """
        After submitting an answer for a slow queue exercise:
        - Fast (< threshold): double review_interval, increment consecutive_fast.
          After 3 consecutive fast sessions → delete (mastered).
        - Slow again: reset interval to 1, reset consecutive_fast to 0.
        """
        cache = _exercise_cache.get(exercise_id, {})
        item_id = cache.get("slow_queue_id")
        if not item_id:
            return
        try:
            threshold_ms = cache.get("slow_queue_threshold_ms", 5000)
            current_interval = cache.get("slow_queue_review_interval", 1)
            consecutive_fast = cache.get("slow_queue_consecutive_fast", 0)
            is_fast = time_taken_ms is not None and time_taken_ms < threshold_ms

            if is_fast:
                new_consecutive_fast = consecutive_fast + 1
                if new_consecutive_fast >= 3:
                    # Mastered — remove from queue
                    await asyncio.to_thread(
                        lambda: self.supabase.table("session_slow_queue")
                            .delete().eq("id", item_id).execute()
                    )
                    return
                new_interval = min(current_interval * 2, 30)  # cap at 30 days
                await asyncio.to_thread(
                    lambda: self.supabase.table("session_slow_queue")
                        .update({
                            "review_interval": new_interval,
                            "consecutive_fast_sessions": new_consecutive_fast,
                        })
                        .eq("id", item_id).execute()
                )
            else:
                # Still slow — reset
                await asyncio.to_thread(
                    lambda: self.supabase.table("session_slow_queue")
                        .update({
                            "review_interval": 1,
                            "consecutive_fast_sessions": 0,
                            "consecutive_slow_sessions": cache.get("slow_queue_consecutive_fast", 0) + 1,
                        })
                        .eq("id", item_id).execute()
                )
        except Exception as e:
            logger.warning(f"SM-2 slow queue update failed: {e}")

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

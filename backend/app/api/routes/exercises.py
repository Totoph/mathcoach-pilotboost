"""Exercise routes — generate, submit answers, get results."""

import uuid
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_admin
from app.schemas.exercise import (
    ExerciseRequest,
    AnswerSubmission,
    AnswerResult,
    SessionResult,
    ExerciseCategory,
    DifficultyLevel,
)
from app.services.exercise_generator import generate_session, generate_exercise
from app.services.adaptive import evaluate_session, calculate_points

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.post("/session")
async def create_exercise_session(
    req: ExerciseRequest,
    user: dict = Depends(get_current_user),
):
    """Generate a new exercise session adapted to user's level."""
    supabase = get_supabase_admin()

    # Get user profile
    profile = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user["id"])
        .single()
        .execute()
    )
    current_level = profile.data.get("current_level", 1)
    if current_level == 0:
        current_level = 1  # Default for users who skipped diagnostic

    # Determine categories based on weaknesses (adaptive)
    categories = None
    if req.category:
        categories = [req.category]

    exercises = generate_session(categories, current_level, req.count)

    # Store session in DB
    session_id = str(uuid.uuid4())
    supabase.table("exercise_sessions").insert({
        "id": session_id,
        "user_id": user["id"],
        "difficulty": current_level,
        "exercise_count": len(exercises),
        "exercises": [e.model_dump() for e in exercises],
    }).execute()

    return {
        "session_id": session_id,
        "exercises": [
            {
                "id": e.id,
                "category": e.category,
                "question": e.question,
                "time_limit_seconds": e.time_limit_seconds,
                "difficulty": e.difficulty,
            }
            for e in exercises
        ],
    }


@router.post("/submit")
async def submit_answer(
    session_id: str,
    submission: AnswerSubmission,
    user: dict = Depends(get_current_user),
):
    """Submit an answer for a single exercise."""
    supabase = get_supabase_admin()

    # Get session
    session = (
        supabase.table("exercise_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    # Find the exercise
    exercise_data = None
    for ex in session.data["exercises"]:
        if ex["id"] == submission.exercise_id:
            exercise_data = ex
            break

    if not exercise_data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Exercise not found in session")

    correct = abs(submission.user_answer - exercise_data["correct_answer"]) < 0.01
    points = calculate_points(
        correct,
        submission.time_taken_seconds,
        exercise_data["time_limit_seconds"],
        exercise_data["difficulty"],
    )

    # Store answer
    supabase.table("exercise_answers").insert({
        "session_id": session_id,
        "exercise_id": submission.exercise_id,
        "user_id": user["id"],
        "category": exercise_data["category"],
        "difficulty": exercise_data["difficulty"],
        "correct_answer": exercise_data["correct_answer"],
        "user_answer": submission.user_answer,
        "correct": correct,
        "time_taken": submission.time_taken_seconds,
        "time_limit": exercise_data["time_limit_seconds"],
        "points": points,
    }).execute()

    tip = None
    if not correct and exercise_data.get("hint"):
        tip = exercise_data["hint"]

    return AnswerResult(
        exercise_id=submission.exercise_id,
        correct=correct,
        correct_answer=exercise_data["correct_answer"],
        user_answer=submission.user_answer,
        time_taken_seconds=submission.time_taken_seconds,
        points=points,
        tip=tip,
    )


@router.post("/session/{session_id}/complete")
async def complete_session(
    session_id: str,
    user: dict = Depends(get_current_user),
):
    """Complete a session and get results + adaptive feedback."""
    supabase = get_supabase_admin()

    # Get all answers for this session
    answers = (
        supabase.table("exercise_answers")
        .select("*")
        .eq("session_id", session_id)
        .eq("user_id", user["id"])
        .execute()
    )

    # Get current profile
    profile = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user["id"])
        .single()
        .execute()
    )

    results = [
        {
            "category": a["category"],
            "correct": a["correct"],
            "time_taken": a["time_taken"],
            "time_limit": a["time_limit"],
        }
        for a in answers.data
    ]

    current_level = profile.data.get("current_level", 1)
    evaluation = evaluate_session(results, current_level)

    total_points = sum(a["points"] for a in answers.data)

    # Update profile
    supabase.table("profiles").update({
        "current_level": evaluation["new_level"],
        "total_points": profile.data.get("total_points", 0) + total_points,
        "exercises_completed": profile.data.get("exercises_completed", 0) + len(results),
    }).eq("id", user["id"]).execute()

    # Update session
    supabase.table("exercise_sessions").update({
        "completed": True,
        "accuracy": evaluation["accuracy"],
        "avg_time": evaluation["avg_time"],
        "points_earned": total_points,
    }).eq("id", session_id).execute()

    return SessionResult(
        session_id=session_id,
        total_questions=len(results),
        correct_count=sum(1 for r in results if r["correct"]),
        accuracy=evaluation["accuracy"],
        avg_time_seconds=evaluation["avg_time"],
        points_earned=total_points,
        level_change=evaluation["level_change"],
        new_level=DifficultyLevel(evaluation["new_level"]),
        weaknesses=evaluation["weaknesses"],
        tips=evaluation["tips"],
    )


@router.post("/diagnostic")
async def run_diagnostic(user: dict = Depends(get_current_user)):
    """
    Initial placement test: 20 questions across categories and difficulties.
    Returns assigned level.
    """
    supabase = get_supabase_admin()
    categories = [
        ExerciseCategory.ADDITION,
        ExerciseCategory.SUBTRACTION,
        ExerciseCategory.MULTIPLICATION,
        ExerciseCategory.DIVISION,
        ExerciseCategory.PERCENTAGE,
    ]

    exercises = []
    # 4 questions per category, spread across difficulties 1-4
    for cat in categories:
        for diff in range(1, 5):
            exercises.append(generate_exercise(cat, diff))

    session_id = str(uuid.uuid4())
    supabase.table("exercise_sessions").insert({
        "id": session_id,
        "user_id": user["id"],
        "difficulty": 0,  # diagnostic
        "exercise_count": len(exercises),
        "exercises": [e.model_dump() for e in exercises],
        "is_diagnostic": True,
    }).execute()

    return {
        "session_id": session_id,
        "type": "diagnostic",
        "total_questions": len(exercises),
        "exercises": [
            {
                "id": e.id,
                "category": e.category,
                "question": e.question,
                "time_limit_seconds": e.time_limit_seconds,
                "difficulty": e.difficulty,
            }
            for e in exercises
        ],
    }

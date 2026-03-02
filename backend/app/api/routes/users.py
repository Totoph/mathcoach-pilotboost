"""User profile and stats routes."""

from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.core.supabase import get_supabase_admin
from app.schemas.user import UserProfile, UserProfileUpdate, UserStats
from app.schemas.exercise import ExerciseCategory

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_profile(user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()
    profile = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user["id"])
        .single()
        .execute()
    )
    return UserProfile(**profile.data)


@router.patch("/me")
async def update_profile(
    update: UserProfileUpdate,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase_admin()
    data = update.model_dump(exclude_none=True)
    if data:
        supabase.table("profiles").update(data).eq("id", user["id"]).execute()
    return {"message": "Profile updated"}


@router.get("/me/stats", response_model=UserStats)
async def get_stats(user: dict = Depends(get_current_user)):
    supabase = get_supabase_admin()

    # Get profile
    profile = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user["id"])
        .single()
        .execute()
    )

    # Get all answers
    answers = (
        supabase.table("exercise_answers")
        .select("*")
        .eq("user_id", user["id"])
        .execute()
    )

    # Get sessions count
    sessions = (
        supabase.table("exercise_sessions")
        .select("id")
        .eq("user_id", user["id"])
        .eq("completed", True)
        .execute()
    )

    all_answers = answers.data
    total = len(all_answers)

    if total == 0:
        return UserStats(
            total_sessions=0,
            total_exercises=0,
            overall_accuracy=0,
            avg_response_time=0,
            current_level=profile.data.get("current_level", 1),
            total_points=profile.data.get("total_points", 0),
            streak_days=profile.data.get("streak_days", 0),
            strengths=[],
            weaknesses=[],
            category_breakdown={},
        )

    correct = sum(1 for a in all_answers if a["correct"])
    avg_time = sum(a["time_taken"] for a in all_answers) / total

    # Category breakdown
    cat_stats = {}
    for a in all_answers:
        cat = a["category"]
        if cat not in cat_stats:
            cat_stats[cat] = {"correct": 0, "total": 0, "total_time": 0}
        cat_stats[cat]["total"] += 1
        cat_stats[cat]["total_time"] += a["time_taken"]
        if a["correct"]:
            cat_stats[cat]["correct"] += 1

    category_breakdown = {}
    strengths = []
    weaknesses = []

    for cat, stats in cat_stats.items():
        acc = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
        avg_t = stats["total_time"] / stats["total"] if stats["total"] > 0 else 0
        category_breakdown[cat] = {
            "accuracy": round(acc, 3),
            "avg_time": round(avg_t, 2),
            "count": stats["total"],
        }
        if acc >= 0.80:
            strengths.append(cat)
        elif acc < 0.60:
            weaknesses.append(cat)

    return UserStats(
        total_sessions=len(sessions.data),
        total_exercises=total,
        overall_accuracy=round(correct / total, 3),
        avg_response_time=round(avg_time, 2),
        current_level=profile.data.get("current_level", 1),
        total_points=profile.data.get("total_points", 0),
        streak_days=profile.data.get("streak_days", 0),
        strengths=strengths,
        weaknesses=weaknesses,
        category_breakdown=category_breakdown,
    )


@router.get("/me/history")
async def get_history(
    limit: int = 20,
    user: dict = Depends(get_current_user),
):
    """Get recent session history."""
    supabase = get_supabase_admin()
    sessions = (
        supabase.table("exercise_sessions")
        .select("*")
        .eq("user_id", user["id"])
        .eq("completed", True)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"sessions": sessions.data}

"""
Adaptive difficulty engine.
Adjusts user level based on performance, detects weaknesses, and provides tips.
"""

from app.schemas.exercise import ExerciseCategory


# Thresholds for level adjustment
LEVEL_UP_ACCURACY = 0.85  # 85%+ accuracy → level up
LEVEL_UP_MIN_SPEED = 0.7  # Must also answer 70% within time limit
LEVEL_DOWN_ACCURACY = 0.50  # Below 50% → level down
WEAKNESS_THRESHOLD = 0.60  # Below 60% in a category = weakness


def evaluate_session(results: list[dict], current_level: int) -> dict:
    """
    Evaluate a session and determine level change + weaknesses.

    results: list of {category, correct, time_taken, time_limit}
    """
    if not results:
        return {
            "level_change": 0,
            "new_level": current_level,
            "weaknesses": [],
            "tips": [],
            "accuracy": 0,
            "avg_time": 0,
        }

    total = len(results)
    correct = sum(1 for r in results if r["correct"])
    accuracy = correct / total

    avg_time = sum(r["time_taken"] for r in results) / total
    fast_answers = sum(
        1 for r in results if r["correct"] and r["time_taken"] <= r["time_limit"]
    )
    speed_ratio = fast_answers / total

    # Level adjustment
    level_change = 0
    if accuracy >= LEVEL_UP_ACCURACY and speed_ratio >= LEVEL_UP_MIN_SPEED:
        level_change = 1
    elif accuracy < LEVEL_DOWN_ACCURACY:
        level_change = -1

    new_level = max(1, min(5, current_level + level_change))

    # Category breakdown
    category_stats = {}
    for r in results:
        cat = r["category"]
        if cat not in category_stats:
            category_stats[cat] = {"correct": 0, "total": 0, "total_time": 0}
        category_stats[cat]["total"] += 1
        category_stats[cat]["total_time"] += r["time_taken"]
        if r["correct"]:
            category_stats[cat]["correct"] += 1

    # Detect weaknesses
    weaknesses = []
    for cat, stats in category_stats.items():
        cat_accuracy = stats["correct"] / stats["total"]
        if cat_accuracy < WEAKNESS_THRESHOLD:
            weaknesses.append(cat)

    # Generate tips
    tips = _generate_tips(weaknesses, category_stats, accuracy, avg_time)

    return {
        "level_change": level_change,
        "new_level": new_level,
        "weaknesses": weaknesses,
        "tips": tips,
        "accuracy": round(accuracy, 3),
        "avg_time": round(avg_time, 2),
        "category_stats": category_stats,
    }


def calculate_points(correct: bool, time_taken: float, time_limit: float, difficulty: int) -> int:
    """Calculate points for a single answer."""
    if not correct:
        return 0
    base_points = difficulty * 10
    # Speed bonus: up to 2x for very fast answers
    if time_taken <= time_limit * 0.5:
        speed_bonus = 2.0
    elif time_taken <= time_limit:
        speed_bonus = 1.5
    else:
        speed_bonus = 1.0
    return int(base_points * speed_bonus)


# --- Technique tips per category ---

CATEGORY_TIPS = {
    ExerciseCategory.ADDITION: [
        "🧮 Break numbers into tens and units: 47 + 36 = 47 + 30 + 6 = 83",
        "🎯 Look for complements to 10: 7 + 3, 8 + 2, etc.",
        "⚡ Add from left to right (hundreds, tens, then units) for speed",
        "🔄 Round up, add, then subtract: 48 + 29 → 48 + 30 - 1 = 77",
    ],
    ExerciseCategory.SUBTRACTION: [
        "🔄 Round the subtrahend up: 83 - 47 → 83 - 50 + 3 = 36",
        "➕ Think addition: 47 + ? = 83 → count up from 47",
        "📐 Equal additions: add same number to both to make it easier",
    ],
    ExerciseCategory.MULTIPLICATION: [
        "✂️ Break it down: 23 × 7 = 20 × 7 + 3 × 7 = 140 + 21",
        "🔟 × 5 trick: divide by 2, multiply by 10 → 48 × 5 = 24 × 10 = 240",
        "💯 × 25 trick: divide by 4, multiply by 100 → 48 × 25 = 12 × 100",
        "🔢 × 11 trick: for 2-digit × 11, split digits and insert sum → 72 × 11 = 7_(7+2)_2 = 792",
        "⚖️ Factoring: 36 × 15 = 36 × 5 × 3 = 180 × 3 = 540",
    ],
    ExerciseCategory.DIVISION: [
        "🔄 Think multiplication: for 144 ÷ 12, ask 12 × ? = 144",
        "✂️ Break the dividend: 936 ÷ 4 = 900 ÷ 4 + 36 ÷ 4 = 225 + 9",
        "📏 Halving trick: to ÷ 4, halve twice; to ÷ 8, halve three times",
    ],
    ExerciseCategory.PERCENTAGE: [
        "🔟 Always find 10% first (÷ 10), then build from there",
        "📊 25% = ÷ 4, 50% = ÷ 2, 75% = 50% + 25%",
        "🔄 Flip trick: 8% of 50 = 50% of 8 = 4 (choose the easier direction!)",
        "📐 For 15%: find 10% + 5% (half of 10%)",
    ],
    ExerciseCategory.FRACTION: [
        "📊 Know key fraction-decimal pairs: 1/4 = 0.25, 1/3 ≈ 0.333, 1/8 = 0.125",
        "🔗 Find common denominators or convert to decimals for speed",
    ],
    ExerciseCategory.ESTIMATION: [
        "🎯 Round to the nearest convenient number, then adjust",
        "📏 For multiplication, round one up and one down to compensate",
    ],
    ExerciseCategory.SEQUENCE: [
        "📈 Check differences between terms first (arithmetic?)",
        "📊 If differences aren't constant, check ratios (geometric?)",
        "🔍 Check second differences for quadratic patterns",
    ],
}


def _generate_tips(
    weaknesses: list[str],
    category_stats: dict,
    overall_accuracy: float,
    avg_time: float,
) -> list[str]:
    """Generate personalized tips based on performance."""
    tips = []

    # Category-specific tips for weaknesses
    for weakness in weaknesses:
        try:
            cat = ExerciseCategory(weakness)
            if cat in CATEGORY_TIPS:
                import random
                tip = random.choice(CATEGORY_TIPS[cat])
                tips.append(tip)
        except ValueError:
            pass

    # General performance tips
    if overall_accuracy < 0.5:
        tips.append("💪 Focus on accuracy first, speed will come. Take your time!")
    elif overall_accuracy >= 0.85 and avg_time > 15:
        tips.append("⏱️ Great accuracy! Now work on speed — try to beat the timer.")

    if not tips:
        tips.append("🌟 Solid performance! Keep practicing to maintain your edge.")

    return tips

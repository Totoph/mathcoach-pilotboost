"""
Mental math exercise generator with adaptive difficulty.
Generates exercises typical of pilot, consulting, and finance entrance exams.
"""

import random
import uuid
from app.schemas.exercise import (
    Exercise,
    ExerciseCategory,
    DifficultyLevel,
)


# Difficulty ranges: (min_operand, max_operand, decimal_places)
DIFFICULTY_CONFIG = {
    1: {"range": (2, 20), "decimals": 0, "time": 30},
    2: {"range": (10, 100), "decimals": 0, "time": 25},
    3: {"range": (10, 500), "decimals": 1, "time": 20},
    4: {"range": (50, 1000), "decimals": 1, "time": 15},
    5: {"range": (100, 9999), "decimals": 2, "time": 10},
}


def generate_exercise(
    category: ExerciseCategory,
    difficulty: int,
) -> Exercise:
    """Generate a single mental math exercise."""
    config = DIFFICULTY_CONFIG[difficulty]
    low, high = config["range"]

    if category == ExerciseCategory.ADDITION:
        a, b = random.randint(low, high), random.randint(low, high)
        question = f"{a} + {b}"
        answer = a + b
        hint = _addition_hint(a, b)

    elif category == ExerciseCategory.SUBTRACTION:
        a = random.randint(low, high)
        b = random.randint(low, min(a, high))
        question = f"{a} - {b}"
        answer = a - b
        hint = _subtraction_hint(a, b)

    elif category == ExerciseCategory.MULTIPLICATION:
        if difficulty <= 2:
            a, b = random.randint(2, 12), random.randint(low, high)
        elif difficulty <= 4:
            a, b = random.randint(2, 30), random.randint(2, 50)
        else:
            a, b = random.randint(10, 99), random.randint(10, 99)
        question = f"{a} × {b}"
        answer = a * b
        hint = _multiplication_hint(a, b)

    elif category == ExerciseCategory.DIVISION:
        if difficulty <= 2:
            b = random.randint(2, 12)
            answer_val = random.randint(low, high)
        else:
            b = random.randint(2, 25)
            answer_val = random.randint(low // 2, high // 2)
        a = b * answer_val
        question = f"{a} ÷ {b}"
        answer = answer_val
        hint = f"Think: {b} × ? = {a}"

    elif category == ExerciseCategory.PERCENTAGE:
        percents = [5, 10, 15, 20, 25, 30, 50, 75]
        if difficulty >= 3:
            percents += [12.5, 33, 37.5, 62.5, 17.5]
        if difficulty >= 4:
            percents += [7.5, 22.5, 42, 68]
        pct = random.choice(percents)
        base = random.randint(low, high)
        # Round base to make it cleaner
        if difficulty <= 2:
            base = round(base / 10) * 10
        question = f"{pct}% of {base}"
        answer = round(pct / 100 * base, 2)
        hint = _percentage_hint(pct, base)

    elif category == ExerciseCategory.FRACTION:
        denoms = [2, 3, 4, 5, 8, 10]
        if difficulty >= 3:
            denoms += [6, 7, 9, 12, 15, 16, 20]
        d1 = random.choice(denoms)
        n1 = random.randint(1, d1 - 1)
        d2 = random.choice(denoms)
        n2 = random.randint(1, d2 - 1)
        op = random.choice(["+", "-", "×"])
        if op == "+":
            question = f"{n1}/{d1} + {n2}/{d2}"
            answer = round(n1 / d1 + n2 / d2, 4)
        elif op == "-":
            if n1 / d1 < n2 / d2:
                n1, d1, n2, d2 = n2, d2, n1, d1
            question = f"{n1}/{d1} - {n2}/{d2}"
            answer = round(n1 / d1 - n2 / d2, 4)
        else:
            question = f"{n1}/{d1} × {n2}/{d2}"
            answer = round((n1 * n2) / (d1 * d2), 4)
        hint = "Convert to common denominator or decimals"

    elif category == ExerciseCategory.SEQUENCE:
        # Number sequences
        start = random.randint(1, 20)
        if difficulty <= 2:
            step = random.randint(2, 10)
            seq = [start + step * i for i in range(5)]
        elif difficulty <= 4:
            ratio = random.choice([2, 3, 4, 5])
            seq = [start * (ratio ** i) for i in range(5)]
        else:
            a_coef, b_coef = random.randint(1, 5), random.randint(-3, 3)
            seq = [a_coef * (i ** 2) + b_coef * i + start for i in range(5)]
        display = ", ".join(str(s) for s in seq[:4])
        question = f"Next in sequence: {display}, ?"
        answer = seq[4]
        hint = "Look for the pattern in differences"

    else:
        return generate_exercise(ExerciseCategory.ADDITION, difficulty)

    return Exercise(
        id=str(uuid.uuid4()),
        category=category,
        difficulty=DifficultyLevel(difficulty),
        question=question,
        correct_answer=float(answer),
        time_limit_seconds=config["time"],
        hint=hint,
    )


def generate_session(
    categories: list[ExerciseCategory] | None,
    difficulty: int,
    count: int = 10,
) -> list[Exercise]:
    """Generate a full exercise session."""
    if not categories:
        categories = list(ExerciseCategory)

    exercises = []
    for _ in range(count):
        cat = random.choice(categories)
        exercises.append(generate_exercise(cat, difficulty))
    return exercises


# --- Hint generators ---

def _addition_hint(a: int, b: int) -> str:
    if b % 10 == 0:
        return f"Add {b} directly"
    complement = 10 - (b % 10)
    rounded = b + complement
    return f"Round {b} to {rounded}, add, then subtract {complement}"


def _subtraction_hint(a: int, b: int) -> str:
    if b % 10 == 0:
        return f"Subtract {b} directly"
    complement = 10 - (b % 10)
    rounded = b + complement
    return f"Round {b} up to {rounded}, subtract, then add {complement}"


def _multiplication_hint(a: int, b: int) -> str:
    if a == 11:
        return f"11 trick: duplicate and insert sum of digits"
    if b % 10 == 0 or a % 10 == 0:
        return "Factor out the 10s"
    if a == 5 or b == 5:
        val = b if a == 5 else a
        return f"Divide {val} by 2, then multiply by 10"
    if a == 25 or b == 25:
        val = b if a == 25 else a
        return f"Divide {val} by 4, then multiply by 100"
    return f"Break it down: {a} × {b} = {a} × {b // 10 * 10} + {a} × {b % 10}"


def _percentage_hint(pct: float, base: int) -> str:
    if pct == 10:
        return f"Move decimal: {base} ÷ 10 = {base / 10}"
    if pct == 5:
        return f"Half of 10%: {base / 10} ÷ 2"
    if pct == 25:
        return f"Divide by 4: {base} ÷ 4"
    if pct == 50:
        return f"Divide by 2: {base} ÷ 2"
    if pct == 75:
        return f"75% = 50% + 25%: {base / 2} + {base / 4}"
    if pct == 20:
        return f"Divide by 5: {base} ÷ 5"
    return f"Start with 10% = {base / 10}, then adjust"

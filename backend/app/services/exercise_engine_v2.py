"""
MathCoach Exercise Engine V2
=============================
Comprehensive exercise generator for 12 skill categories.
Each skill has difficulty levels 1-5 with progressive complexity.
Includes mental math tips for every exercise type.
"""

from __future__ import annotations
import random
import math
from uuid import uuid4
from typing import Optional
from dataclasses import dataclass


@dataclass
class GeneratedExercise:
    """A generated exercise with metadata."""
    exercise_id: str
    skill: str
    sub_skill: str
    question: str
    correct_answer: str
    difficulty: int
    time_limit_ms: int
    tip: Optional[str] = None
    hint: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "exercise_id": self.exercise_id,
            "skill": self.skill,
            "sub_skill": self.sub_skill,
            "question": self.question,
            "correct_answer": self.correct_answer,
            "difficulty": self.difficulty,
            "time_limit_ms": self.time_limit_ms,
            "tip": self.tip,
            "hint": self.hint,
        }


# Time limits per difficulty (ms)
TIME_LIMITS = {1: 30000, 2: 20000, 3: 15000, 4: 10000, 5: 7000}


def generate_exercise(
    skill: str,
    difficulty: int = 1,
    sub_skill: Optional[str] = None,
) -> GeneratedExercise:
    """Generate a single exercise for the given skill and difficulty."""
    difficulty = max(1, min(5, difficulty))
    generator = GENERATORS.get(skill)
    if not generator:
        generator = _gen_addition  # fallback

    return generator(difficulty, sub_skill)


# ════════════════════════════════════════════════════════════
#                    GENERATOR FUNCTIONS
# ════════════════════════════════════════════════════════════


def _gen_addition(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    """Addition exercises with progressive complexity."""
    if difficulty == 1:
        a, b = random.randint(1, 20), random.randint(1, 20)
        sub = "simple_add"
    elif difficulty == 2:
        a, b = random.randint(10, 99), random.randint(10, 99)
        sub = "medium_add"
    elif difficulty == 3:
        a, b = random.randint(100, 999), random.randint(100, 999)
        sub = "large_add"
    elif difficulty == 4:
        a, b = random.randint(100, 9999), random.randint(100, 9999)
        sub = "large_add"
    else:
        a = random.randint(1000, 99999)
        b = random.randint(1000, 99999)
        sub = "large_add"

    # Sometimes do complement exercises
    if sub_skill == "complement_10" or (sub_skill is None and random.random() < 0.15):
        target = random.choice([10, 20, 50, 100])
        a = random.randint(1, target - 1)
        question = f"{a} + ? = {target}"
        answer = str(target - a)
        sub = "complement_10" if target <= 20 else "complement_100"
        tip = f"Complément: pense à combien il manque pour arriver à {target}."
    else:
        question = f"{a} + {b}"
        answer = str(a + b)
        tip = _get_addition_tip(a, b)

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="addition", sub_skill=sub_skill or sub,
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty], tip=tip,
    )


def _gen_subtraction(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    if difficulty == 1:
        a = random.randint(5, 20)
        b = random.randint(1, a)
        sub = "simple_sub"
    elif difficulty == 2:
        a = random.randint(20, 100)
        b = random.randint(10, a)
        sub = "medium_sub"
    elif difficulty == 3:
        a = random.randint(100, 999)
        b = random.randint(50, a)
        sub = "large_sub"
    elif difficulty == 4:
        a = random.randint(500, 9999)
        b = random.randint(100, a)
        sub = "large_sub"
    else:
        a = random.randint(1000, 99999)
        b = random.randint(500, a)
        sub = "large_sub"

    question = f"{a} − {b}"
    answer = str(a - b)
    tip = _get_subtraction_tip(a, b)

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="subtraction", sub_skill=sub_skill or sub,
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty], tip=tip,
    )


def _gen_multiplication(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    if difficulty == 1:
        a, b = random.randint(2, 10), random.randint(2, 10)
        sub = "tables_basic"
    elif difficulty == 2:
        a, b = random.randint(2, 12), random.randint(2, 12)
        sub = "tables_basic"
    elif difficulty == 3:
        a = random.randint(10, 30)
        b = random.randint(2, 12)
        sub = "mult_2digit"
    elif difficulty == 4:
        a = random.randint(10, 99)
        b = random.randint(10, 99)
        sub = "mult_2digit"
    else:
        a = random.randint(100, 999)
        b = random.randint(10, 99)
        sub = "mult_3digit"

    question = f"{a} × {b}"
    answer = str(a * b)
    tip = _get_multiplication_tip(a, b)

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="multiplication", sub_skill=sub_skill or sub,
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty], tip=tip,
    )


def _gen_division(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    if difficulty == 1:
        b = random.randint(2, 10)
        result = random.randint(1, 10)
        sub = "simple_div"
    elif difficulty == 2:
        b = random.randint(2, 12)
        result = random.randint(2, 20)
        sub = "simple_div"
    elif difficulty == 3:
        b = random.randint(2, 12)
        result = random.randint(10, 50)
        sub = "medium_div"
    elif difficulty == 4:
        b = random.randint(5, 25)
        result = random.randint(10, 100)
        sub = "medium_div"
    else:
        b = random.randint(10, 50)
        result = random.randint(20, 200)
        sub = "long_div"

    a = b * result
    question = f"{a} ÷ {b}"
    answer = str(result)
    tip = _get_division_tip(a, b)

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="division", sub_skill=sub_skill or sub,
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty], tip=tip,
    )


def _gen_tables_1_20(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    """Dedicated tables 1-20 training."""
    # Determine which table to practice
    if sub_skill and sub_skill.startswith("table_"):
        try:
            table_num = int(sub_skill.split("_")[1])
        except (ValueError, IndexError):
            table_num = random.randint(1, 20)
    else:
        if difficulty <= 2:
            table_num = random.randint(1, 10)
        elif difficulty <= 3:
            table_num = random.randint(1, 15)
        else:
            table_num = random.randint(1, 20)

    multiplier = random.randint(1, 20)
    
    # Tables mode = multiplications only
    question = f"{table_num} × {multiplier}"
    answer = str(table_num * multiplier)

    tip = _get_table_tip(table_num, multiplier)

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="tables_1_20",
        sub_skill=sub_skill or f"table_{table_num}",
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=max(5000, TIME_LIMITS.get(difficulty, 15000) - 5000),
        tip=tip,
    )


def _gen_squares(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    """Squares 1-30."""
    if difficulty <= 2:
        n = random.randint(1, 10)
        sub = "squares_1_10"
    elif difficulty <= 3:
        n = random.randint(1, 20)
        sub = "squares_11_20" if n > 10 else "squares_1_10"
    else:
        n = random.randint(1, 30)
        sub = "squares_21_30" if n > 20 else ("squares_11_20" if n > 10 else "squares_1_10")

    fmt = random.choice(["square", "root"]) if difficulty >= 2 else "square"
    if fmt == "square":
        question = f"{n}²"
        answer = str(n * n)
        tip = _get_square_tip(n)
    else:
        square = n * n
        question = f"√{square}"
        answer = str(n)
        tip = f"Pense: quel nombre multiplié par lui-même donne {square} ?"

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="squares_1_30", sub_skill=sub_skill or sub,
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty], tip=tip,
    )


def _gen_decomposition(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    """Number decomposition exercises."""
    if difficulty <= 2:
        # Simple: break into tens and units
        n = random.randint(20, 99)
        tens = (n // 10) * 10
        units = n % 10
        mult_a = random.randint(2, 9)
        question = f"{mult_a} × {n}"
        answer = str(mult_a * n)
        tip = f"Décompose: {mult_a} × {n} = {mult_a} × {tens} + {mult_a} × {units} = {mult_a * tens} + {mult_a * units}"
        sub = "factor_simple"
    else:
        # Complex: find factors or use distribution
        a = random.randint(10, 50)
        b = random.randint(10, 50)
        question = f"{a} × {b}"
        answer = str(a * b)
        # Find a good decomposition
        tip = _get_decomposition_tip(a, b)
        sub = "factor_complex"

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="decomposition", sub_skill=sub_skill or sub,
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty] + 5000, tip=tip,
    )


def _gen_fast_multiplication(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    """Fast multiplication tricks (×5, ×9, ×11, ×25, ×50, ×99)."""
    tricks = {
        "mult_x5": (5, lambda n: n, "÷2 puis ×10"),
        "mult_x9": (9, lambda n: random.randint(2, 50 * difficulty), "×10 − le nombre"),
        "mult_x11": (11, lambda n: random.randint(10, 30 * difficulty), "Écarte les chiffres et insère la somme"),
        "mult_x25": (25, lambda n: random.randint(4, 20 * difficulty), "÷4 puis ×100"),
        "mult_x50": (50, lambda n: random.randint(2, 20 * difficulty), "÷2 puis ×100"),
        "mult_x99": (99, lambda n: random.randint(2, 20 * difficulty), "×100 − le nombre"),
    }

    if sub_skill and sub_skill in tricks:
        trick_key = sub_skill
    else:
        available = list(tricks.keys())
        if difficulty <= 2:
            available = ["mult_x5", "mult_x9", "mult_x11"]
        trick_key = random.choice(available)

    multiplier, num_gen, trick_desc = tricks[trick_key]
    n = num_gen(difficulty) if callable(num_gen) else random.randint(2, 30 * difficulty)
    
    # For ×5
    if trick_key == "mult_x5":
        n = random.randint(2, 50 * difficulty)

    question = f"{n} × {multiplier}"
    answer = str(n * multiplier)

    # Detailed tip
    tips = {
        "mult_x5": f"Astuce ×5 : {n} ÷ 2 = {n / 2}, puis × 10 = {int(n * 5)}" if n % 2 == 0
                   else f"Astuce ×5 : ({n}-1)÷2 = {(n-1)//2}, ×10 = {(n-1)//2*10}, +5 = {n*5}",
        "mult_x9": f"Astuce ×9 : {n} × 10 = {n * 10}, − {n} = {n * 9}",
        "mult_x11": _get_x11_tip(n),
        "mult_x25": f"Astuce ×25 : {n} ÷ 4 = {n / 4}, × 100 = {int(n * 25)}" if n % 4 == 0
                    else f"Astuce ×25 : {n} × 100 = {n * 100}, ÷ 4 = {n * 25}",
        "mult_x50": f"Astuce ×50 : {n} ÷ 2 = {n / 2}, × 100 = {int(n * 50)}" if n % 2 == 0
                    else f"Astuce ×50 : {n} × 100 = {n * 100}, ÷ 2 = {n * 50}",
        "mult_x99": f"Astuce ×99 : {n} × 100 = {n * 100}, − {n} = {n * 99}",
    }

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="fast_multiplication",
        sub_skill=sub_skill or trick_key,
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty], tip=tips.get(trick_key),
    )


def _gen_estimation(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    """Estimation exercises — round and compute."""
    if difficulty <= 2:
        a = random.randint(10, 99)
        b = random.randint(10, 99)
        op = random.choice(["+", "−", "×"])
    else:
        a = random.randint(100, 999)
        b = random.randint(100, 999)
        op = random.choice(["+", "−", "×"])

    if op == "+":
        exact = a + b
    elif op == "−":
        if a < b: a, b = b, a
        exact = a - b
    else:
        exact = a * b

    # Accept answers within 10% of exact
    question = f"≈ {a} {op} {b}"
    answer = str(round(exact, -1) if exact >= 100 else exact)  # Rounded to nearest 10
    
    tip = f"Arrondi: {a} ≈ {round(a, -1)}, {b} ≈ {round(b, -1)}"

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="estimation",
        sub_skill=sub_skill or "round_estimate",
        question=question, correct_answer=str(exact), difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty], tip=tip,
        hint=f"Réponse exacte acceptée, ±10% toléré",
    )


def _gen_mixed(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    """Mixed operations — combine 2 operations."""
    ops = ["+", "−", "×", "÷"]
    
    if difficulty <= 2:
        a = random.randint(2, 20)
        b = random.randint(2, 20)
        c = random.randint(2, 10)
        op1, op2 = random.sample(["+", "−"], 2)
        sub = "add_sub_mix"
    elif difficulty <= 3:
        a = random.randint(2, 15)
        b = random.randint(2, 12)
        c = random.randint(2, 10)
        op1 = random.choice(["×", "÷"])
        op2 = random.choice(["+", "−"])
        sub = "mult_div_mix"
    else:
        a = random.randint(5, 30)
        b = random.randint(2, 12)
        c = random.randint(2, 20)
        op1, op2 = random.sample(ops, 2)
        sub = "all_ops_mix"

    # Ensure division is clean
    if op1 == "÷":
        result = random.randint(2, 15)
        a = b * result
    if op2 == "÷":
        result2 = random.randint(2, 10)
        # Adjust c
        middle = _eval_binary(a, op1, b)
        c = result2
        if middle % c != 0 and op2 == "÷":
            c = random.choice([d for d in range(2, 11) if middle % d == 0] or [1])

    question = f"{a} {op1} {b} {op2} {c}"
    
    # Respect order of operations
    try:
        answer = str(int(eval(question.replace("×", "*").replace("÷", "/").replace("−", "-"))))
    except:
        answer = str(a + b + c)

    tip = "Respecte l'ordre des opérations : × et ÷ avant + et −"

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="mixed", sub_skill=sub_skill or sub,
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty] + 5000, tip=tip,
    )


def _gen_chain(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    """Chain calculations — sequential operations."""
    if difficulty <= 2:
        steps = 2
        sub = "chain_2"
    elif difficulty <= 3:
        steps = 3
        sub = "chain_3"
    else:
        steps = random.randint(3, 5)
        sub = "chain_4plus"

    # Build chain
    result = random.randint(2, 20)
    parts = [str(result)]
    
    for _ in range(steps):
        op = random.choice(["+", "−", "×"])
        if op == "×":
            n = random.randint(2, 5)
            result = result * n
        elif op == "+":
            n = random.randint(1, 30)
            result = result + n
        else:
            n = random.randint(1, min(result - 1, 20)) if result > 1 else 1
            result = result - n
        parts.append(f"{op} {n}")

    question = " ".join(parts)
    answer = str(result)
    tip = "Calcule étape par étape, de gauche à droite."

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="chain", sub_skill=sub_skill or sub,
        question=question, correct_answer=answer, difficulty=difficulty,
        time_limit_ms=TIME_LIMITS[difficulty] + 5000 * (steps - 1), tip=tip,
    )


def _gen_advanced(difficulty: int, sub_skill: Optional[str] = None) -> GeneratedExercise:
    """Advanced mental math techniques."""
    techniques = ["vedic_squares", "cross_multiplication", "anchor_method"]
    technique = sub_skill if sub_skill in techniques else random.choice(techniques)

    if technique == "vedic_squares":
        # Numbers close to base (10, 100)
        if difficulty <= 3:
            base = 10
            n = random.randint(11, 19)
        else:
            base = 100
            n = random.randint(91, 109)
        question = f"{n}²"
        answer = str(n * n)
        diff_from_base = n - base
        tip = (f"Méthode védique: {n}² = ({n} + {diff_from_base}) × {base} + {diff_from_base}² = "
               f"{(n + diff_from_base) * base} + {diff_from_base ** 2} = {n * n}")
        sub = "vedic_squares"

    elif technique == "cross_multiplication":
        # Two 2-digit numbers
        a = random.randint(11, 30 + difficulty * 10)
        b = random.randint(11, 30 + difficulty * 10)
        question = f"{a} × {b}"
        answer = str(a * b)
        # Cross multiplication explanation
        a1, a0 = a // 10, a % 10
        b1, b0 = b // 10, b % 10
        tip = (f"Multiplication croisée: ({a1}×{b1})×100 + ({a1}×{b0}+{a0}×{b1})×10 + {a0}×{b0} = "
               f"{a1*b1*100} + {(a1*b0+a0*b1)*10} + {a0*b0}")
        sub = "cross_multiplication"

    else:  # anchor_method
        # Anchor to nearby round number
        base = random.choice([25, 50, 75, 100])
        offset = random.randint(1, 5)
        n = base + random.choice([-1, 1]) * offset
        m = random.randint(2, 12)
        question = f"{n} × {m}"
        answer = str(n * m)
        tip = (f"Méthode de l'ancre: {n} = {base} {'+ ' if n > base else '− '}{abs(n - base)}, "
               f"donc {n}×{m} = {base}×{m} {'+ ' if n > base else '− '}{abs(n - base)}×{m} = "
               f"{base * m} {'+ ' if n > base else '− '}{abs(n - base) * m} = {n * m}")
        sub = "anchor_method"

    return GeneratedExercise(
        exercise_id=str(uuid4()), skill="advanced", sub_skill=sub_skill or sub,
        question=question, correct_answer=answer, difficulty=max(3, difficulty),
        time_limit_ms=TIME_LIMITS[difficulty] + 5000, tip=tip,
    )


# ════════════════════════════════════════
#           GENERATOR REGISTRY
# ════════════════════════════════════════

GENERATORS = {
    "addition": _gen_addition,
    "subtraction": _gen_subtraction,
    "multiplication": _gen_multiplication,
    "division": _gen_division,
    "tables_1_20": _gen_tables_1_20,
    "squares_1_30": _gen_squares,
    "decomposition": _gen_decomposition,
    "fast_multiplication": _gen_fast_multiplication,
    "estimation": _gen_estimation,
    "mixed": _gen_mixed,
    "chain": _gen_chain,
    "advanced": _gen_advanced,
}


# ════════════════════════════════════════
#              TIP GENERATORS
# ════════════════════════════════════════

def _get_addition_tip(a: int, b: int) -> str:
    """Context-aware addition tip."""
    tips = []
    # Complement strategy
    if b % 10 != 0:
        complement = 10 - (b % 10)
        rounded = b + complement
        tips.append(f"Arrondi: {a} + {rounded} = {a + rounded}, puis − {complement} = {a + b}")
    # Left-to-right
    if a >= 100 or b >= 100:
        tips.append(f"Gauche→Droite: additionne centaines, puis dizaines, puis unités")
    # Double near
    if abs(a - b) <= 3:
        double = min(a, b)
        diff = abs(a - b)
        tips.append(f"Doubles: {double} × 2 = {double * 2}, {'+ ' + str(diff) if a > b else '+ ' + str(diff)} = {a + b}")
    
    return random.choice(tips) if tips else f"Décompose: {a} + {b}"


def _get_subtraction_tip(a: int, b: int) -> str:
    if b % 10 != 0:
        rounded = ((b // 10) + 1) * 10
        diff = rounded - b
        return f"Arrondi: {a} − {rounded} = {a - rounded}, puis + {diff} = {a - b}"
    return f"Compte en avant: {b} + ? = {a}"


def _get_multiplication_tip(a: int, b: int) -> str:
    tips = []
    if b == 5 or a == 5:
        val = a if b == 5 else b
        tips.append(f"×5: {val} ÷ 2 = {val / 2}, × 10 = {val * 5}")
    if b == 11 or a == 11:
        val = a if b == 11 else b
        tips.append(f"×11: écarte les chiffres de {val} et insère leur somme au milieu")
    if b == 9 or a == 9:
        val = a if b == 9 else b
        tips.append(f"×9: {val} × 10 − {val} = {val * 10} − {val} = {val * 9}")
    # Distribution
    if a >= 10 and b >= 10:
        b_tens = (b // 10) * 10
        b_units = b % 10
        if b_units > 0:
            tips.append(f"Distribution: {a}×{b_tens} + {a}×{b_units} = {a * b_tens} + {a * b_units}")
    
    return random.choice(tips) if tips else f"Décompose: {a} × {b}"


def _get_division_tip(a: int, b: int) -> str:
    result = a // b
    tips = [
        f"Pense multiplication: {b} × ? = {a}",
    ]
    if b == 4:
        tips.append(f"÷4 = divise par 2, deux fois: {a}÷2 = {a // 2}, ÷2 = {a // 4}")
    if b == 8:
        tips.append(f"÷8 = divise par 2, trois fois")
    if b == 5:
        tips.append(f"÷5 = ×2 puis ÷10: {a}×2 = {a * 2}, ÷10 = {a * 2 // 10}")
    return random.choice(tips)


def _get_table_tip(table: int, multiplier: int) -> str:
    """Get a tip specific to this table fact."""
    product = table * multiplier
    
    # Specific known tricks
    if table == 9 or multiplier == 9:
        n = multiplier if table == 9 else table
        digit1 = n - 1
        digit2 = 9 - digit1
        if n <= 10:
            return f"Astuce ×9: premier chiffre = {n}−1 = {digit1}, deuxième = 9−{digit1} = {digit2} → {digit1}{digit2}"
    
    if table == 11 or multiplier == 11:
        n = multiplier if table == 11 else table
        if 10 <= n <= 99:
            d1, d2 = n // 10, n % 10
            s = d1 + d2
            if s < 10:
                return f"×11: écarte {d1} et {d2}, insère {s} → {d1}{s}{d2}"
    
    if table == 5 or multiplier == 5:
        n = multiplier if table == 5 else table
        return f"×5: {n}÷2 = {n/2}, ×10 = {int(n * 5)}" if n % 2 == 0 else f"×5: termine toujours par 0 ou 5"
    
    return f"{table} × {multiplier} = {product} (mémorise cette table !)"


def _get_square_tip(n: int) -> str:
    """Get a tip for calculating n²."""
    if n <= 10:
        return f"Table de base: {n} × {n} = {n * n}"
    if n <= 20:
        base = 10
        diff = n - base
        return f"Astuce: {n}² = ({n}+{diff})×{base} + {diff}² = {(n + diff) * base} + {diff * diff} = {n * n}"
    if n % 5 == 0:
        return f"Nombres en 5: {n}² = {(n // 10) * ((n // 10) + 1)}×100 + 25 = {n * n}"
    
    # Near a known square
    nearest = round(n / 5) * 5
    diff = n - nearest
    return f"Ancre: {nearest}² = {nearest * nearest}, ajuste ±{abs(diff)}×{nearest + n} = {n * n}"


def _get_x11_tip(n: int) -> str:
    if 10 <= n <= 99:
        d1, d2 = n // 10, n % 10
        s = d1 + d2
        if s < 10:
            return f"×11: {d1}|{d1}+{d2}|{d2} = {d1}{s}{d2} = {n * 11}"
        else:
            return f"×11: {d1}|{s}|{d2}, retenue! = {n * 11}"
    return f"×11: {n} × 10 + {n} = {n * 10} + {n} = {n * 11}"


def _get_decomposition_tip(a: int, b: int) -> str:
    # Try to find a nice decomposition
    if b % 10 == 0:
        return f"{a} × {b} = {a} × {b // 10} × 10"
    if a % 10 == 0:
        return f"{a} × {b} = {a // 10} × {b} × 10"
    
    b_tens = (b // 10) * 10
    b_units = b % 10
    return f"Décompose: {a} × {b} = {a} × {b_tens} + {a} × {b_units} = {a * b_tens} + {a * b_units} = {a * b}"


def _eval_binary(a: int, op: str, b: int) -> int:
    """Evaluate a binary operation."""
    if op == "+": return a + b
    if op == "−" or op == "-": return a - b
    if op == "×" or op == "*": return a * b
    if op == "÷" or op == "/": return a // b if b != 0 else 0
    return 0


# ════════════════════════════════════════
#        MENTAL MATH TECHNIQUE TIPS
# ════════════════════════════════════════

TECHNIQUE_TIPS = {
    "addition": [
        "🧮 Décompose en dizaines et unités : 47 + 36 = 47 + 30 + 6 = 83",
        "🎯 Cherche les compléments à 10 : 7+3, 8+2, 6+4",
        "⚡ Additionne de gauche à droite (centaines → dizaines → unités)",
        "🔄 Arrondi : 48 + 29 → 48 + 30 − 1 = 77",
        "🔢 Doubles : si les nombres sont proches, double le plus petit et ajuste",
    ],
    "subtraction": [
        "🔄 Arrondi : 83 − 47 → 83 − 50 + 3 = 36",
        "➕ Pense addition : 47 + ? = 83 → compte en avant",
        "📐 Additions égales : ajoute le même nombre aux deux",
        "🎯 Complément : pour soustraire 9, soustrais 10 puis ajoute 1",
    ],
    "multiplication": [
        "✂️ Distribution : 23 × 7 = 20×7 + 3×7 = 140 + 21 = 161",
        "🔟 ×5 : divise par 2, multiplie par 10 → 48×5 = 24×10 = 240",
        "💯 ×25 : divise par 4, multiplie par 100 → 48×25 = 12×100 = 1200",
        "🔢 ×11 : écarte les chiffres et insère la somme → 72×11 = 7(7+2)2 = 792",
        "⚖️ Factorisation : 36×15 = 36×5×3 = 180×3 = 540",
        "🔄 ×9 : multiplie par 10, soustrais le nombre → 7×9 = 70−7 = 63",
    ],
    "division": [
        "🔄 Pense multiplication : 144÷12 → 12 × ? = 144",
        "✂️ Décompose : 936÷4 = 900÷4 + 36÷4 = 225 + 9 = 234",
        "📏 Divise par 2 plusieurs fois : ÷4 = ÷2÷2, ÷8 = ÷2÷2÷2",
        "🎯 ÷5 = ×2 puis ÷10",
    ],
    "tables_1_20": [
        "📚 Les tables se mémorisent par la pratique régulière",
        "🔢 ×9 : le premier chiffre = multiplicateur−1, les deux chiffres font 9",
        "📐 Symétrie : 7×8 = 8×7, tu n'as besoin de mémoriser que la moitié",
        "🎯 Tables difficiles (7, 8, 12-20) : décompose en tables connues",
    ],
    "squares_1_30": [
        "📐 n² = (n-a)(n+a) + a² (différence de carrés)",
        "🔢 Nombres en 5 : 25² = 2×3 centaines + 25 = 625",
        "🎯 Utilise le carré voisin : 21² = 20² + 20 + 21 = 400 + 41 = 441",
        "⚡ Mémorise les carrés jusqu'à 20, c'est une base essentielle",
    ],
    "decomposition": [
        "✂️ Trouve les facteurs pratiques : 36 = 4×9 = 6×6",
        "🔟 Cherche les multiples de 10, 5, 2",
        "📐 Distribution : a×(b+c) = a×b + a×c",
    ],
    "fast_multiplication": [
        "⚡ ×5 : ÷2 puis ×10 (ou ×10 puis ÷2)",
        "🔢 ×9 : ×10 − le nombre",
        "📐 ×11 : écarte et insère",
        "💯 ×25 : ÷4 puis ×100",
        "🎯 ×50 : ÷2 puis ×100",
        "🔄 ×99 : ×100 − le nombre",
    ],
    "estimation": [
        "🎯 Arrondi au nombre pratique le plus proche",
        "📏 Pour la multiplication, arrondi un vers le haut et l'autre vers le bas",
        "⚡ L'ordre de grandeur suffit souvent",
    ],
    "mixed": [
        "📐 Priorité des opérations : × et ÷ avant + et −",
        "🎯 Cherche les simplifications avant de calculer",
        "⚡ Regroupe les termes qui se simplifient bien",
    ],
    "chain": [
        "📝 Calcule étape par étape, garde le résultat intermédiaire en tête",
        "🎯 Cherche si des étapes se simplifient entre elles",
        "⚡ Vérifie avec l'estimation à chaque étape",
    ],
    "advanced": [
        "📐 Mathématiques védiques : travaille avec les écarts par rapport à la base",
        "✂️ Multiplication croisée : divise en parties et combine",
        "🔢 Méthode de l'ancre : utilise un nombre rond proche comme référence",
    ],
}


def get_technique_tips(skill: str, count: int = 3) -> list[str]:
    """Get technique tips for a skill."""
    tips = TECHNIQUE_TIPS.get(skill, [])
    if len(tips) <= count:
        return tips
    return random.sample(tips, count)

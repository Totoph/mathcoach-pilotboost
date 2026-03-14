"""
MathCoach Skill Engine V2
=========================
Mathematical model for adaptive learning with:
- 12-dimension skill vector (0-100 each)
- Modified ELO/Glicko scoring per skill
- Error classification (table, carry, inattention, procedure)
- Spaced repetition (SM-2)
- Plateau detection via linear regression
- Automatization detection
- Global level computation (weighted 0-100)
"""

from __future__ import annotations
import math
from dataclasses import dataclass, field, asdict
from typing import Optional
from datetime import datetime, timedelta, timezone

# ────────────────────────── Skill Definitions ──────────────────────────

SKILL_DEFINITIONS = {
    "multiplication": {
        "label": "Multiplication",
        "weight": 0.14,
        "order": 1,
        "sub_skills": [
            "tables_basic",       # 1-10
            "tables_extended",    # 11-20
            "mult_2digit",        # 2 chiffres
            "mult_3digit",        # 3 chiffres
        ],
    },
    "addition": {
        "label": "Addition",
        "weight": 0.12,
        "order": 2,
        "sub_skills": [
            "simple_add",
            "medium_add",
            "large_add",
            "complement_10",
            "complement_100",
        ],
    },
    "subtraction": {
        "label": "Soustraction",
        "weight": 0.12,
        "order": 3,
        "sub_skills": [
            "simple_sub",
            "medium_sub",
            "large_sub",
            "borrow_sub",
        ],
    },
    "division": {
        "label": "Division",
        "weight": 0.12,
        "order": 4,
        "sub_skills": [
            "simple_div",
            "medium_div",
            "long_div",
        ],
    },
    "tables_1_20": {
        "label": "Tables 1-20",
        "weight": 0.12,
        "order": 5,
        "sub_skills": [f"table_{i}" for i in range(1, 21)],
    },
    "squares_1_30": {
        "label": "Carrés 1-30",
        "weight": 0.06,
        "order": 6,
        "sub_skills": [
            "squares_1_10",
            "squares_11_20",
            "squares_21_30",
        ],
    },
    "decomposition": {
        "label": "Décompositions",
        "weight": 0.05,
        "order": 7,
        "sub_skills": [
            "factor_simple",
            "factor_complex",
        ],
    },
    "fast_multiplication": {
        "label": "Multiplications rapides",
        "weight": 0.06,
        "order": 8,
        "sub_skills": [
            "mult_x5",
            "mult_x9",
            "mult_x11",
            "mult_x25",
            "mult_x50",
            "mult_x99",
        ],
    },
    "mixed": {
        "label": "Calculs mixtes",
        "weight": 0.05,
        "order": 10,
        "sub_skills": [
            "add_sub_mix",
            "mult_div_mix",
            "all_ops_mix",
        ],
    },
    "chain": {
        "label": "Chaînes de calcul",
        "weight": 0.05,
        "order": 11,
        "sub_skills": [
            "chain_2",
            "chain_3",
            "chain_4plus",
        ],
    },
    "advanced": {
        "label": "Avancé",
        "weight": 0.06,
        "order": 12,
        "sub_skills": [
            "vedic_squares",
            "cross_multiplication",
            "anchor_method",
        ],
    },
}

SKILL_WEIGHTS = {k: v["weight"] for k, v in SKILL_DEFINITIONS.items()}

# Expected time per difficulty level (ms)
EXPECTED_TIME_MS = {
    1: 15000,
    2: 12000,
    3: 10000,
    4: 8000,
    5: 6000,
}


# ────────────────────────── Data Classes ──────────────────────────

@dataclass
class SkillData:
    """Per-skill tracking data."""
    score: float = 0.0
    accuracy_ema: float = 0.5       # Exponential moving average of accuracy
    speed_avg_ms: float = 10000.0   # EMA of response time
    attempts: int = 0
    correct: int = 0
    streak: int = 0
    max_streak: int = 0
    difficulty_mastered: int = 1    # Highest difficulty consistently passed (1-5)
    last_practiced: Optional[str] = None
    # History for plateau detection (last 30 scores)
    score_history: list[float] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "SkillData":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


@dataclass
class SkillVector:
    """Full 12-dimension skill vector for a user."""
    multiplication: SkillData = field(default_factory=SkillData)
    addition: SkillData = field(default_factory=SkillData)
    subtraction: SkillData = field(default_factory=SkillData)
    division: SkillData = field(default_factory=SkillData)
    tables_1_20: SkillData = field(default_factory=SkillData)
    squares_1_30: SkillData = field(default_factory=SkillData)
    decomposition: SkillData = field(default_factory=SkillData)
    fast_multiplication: SkillData = field(default_factory=SkillData)
    mixed: SkillData = field(default_factory=SkillData)
    chain: SkillData = field(default_factory=SkillData)
    advanced: SkillData = field(default_factory=SkillData)

    def get_skill(self, name: str) -> SkillData:
        return getattr(self, name, SkillData())

    def set_skill(self, name: str, data: SkillData):
        if hasattr(self, name):
            setattr(self, name, data)

    def to_dict(self) -> dict:
        return {k: getattr(self, k).to_dict() for k in SKILL_DEFINITIONS}

    @classmethod
    def from_dict(cls, d: dict) -> "SkillVector":
        sv = cls()
        for k in SKILL_DEFINITIONS:
            if k in d and isinstance(d[k], dict):
                sv.set_skill(k, SkillData.from_dict(d[k]))
        return sv

    def get_scores(self) -> dict[str, float]:
        """Return {skill_name: score} for all 12 skills."""
        return {k: round(self.get_skill(k).score, 1) for k in SKILL_DEFINITIONS}


@dataclass
class UserCognitiveProfile:
    """Full cognitive profile stored in agent_instances.state."""
    skill_vector: SkillVector = field(default_factory=SkillVector)
    global_level: float = 0.0
    total_exercises: int = 0
    total_correct: int = 0
    session_count: int = 0
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    focus_areas: list[str] = field(default_factory=list)
    error_counts: dict[str, int] = field(default_factory=lambda: {
        "table_error": 0,
        "carry_error": 0,
        "inattention": 0,
        "procedure_error": 0,
        "timeout": 0,
        "slow": 0,
    })
    last_difficulty: int = 1
    training_mode: Optional[str] = None  # "tables", "free", etc.
    diagnostic_completed: bool = False
    last_session_date: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        d["skill_vector"] = self.skill_vector.to_dict()
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "UserCognitiveProfile":
        profile = cls()
        if "skill_vector" in d and isinstance(d["skill_vector"], dict):
            profile.skill_vector = SkillVector.from_dict(d["skill_vector"])
        for field_name in [
            "global_level", "total_exercises", "total_correct",
            "session_count", "strengths", "weaknesses", "focus_areas",
            "error_counts", "last_difficulty", "training_mode",
            "diagnostic_completed", "last_session_date",
        ]:
            if field_name in d:
                setattr(profile, field_name, d[field_name])
        return profile


# ────────────────────────── Scoring Algorithm ──────────────────────────

# EMA smoothing factor (lower = more smoothing, higher = more reactive)
# Kept low to avoid large swings between sessions (a bad session shouldn't
# wipe out progress from many good ones).
ACCURACY_ALPHA = 0.05
SPEED_ALPHA = 0.07

# Difficulty mastery: need X consecutive correct at difficulty D
MASTERY_STREAK_REQUIRED = 5


def update_skill_score(
    skill: SkillData,
    is_correct: bool,
    time_ms: Optional[int],
    difficulty: int,
    skill_name: str,
) -> SkillData:
    """
    Update a single skill's score after an exercise attempt.
    
    Score components (0-100):
      - Accuracy component:  0-55 pts (EMA of correct/incorrect)
      - Speed component:     0-20 pts (relative to expected time)
      - Difficulty component: 0-20 pts (based on highest difficulty mastered)
      - Consistency bonus:    0-5 pts  (current streak)
    """
    skill.attempts += 1
    now_str = datetime.now(timezone.utc).isoformat()
    skill.last_practiced = now_str

    # Update accuracy EMA
    accuracy_signal = 1.0 if is_correct else 0.0
    skill.accuracy_ema = ACCURACY_ALPHA * accuracy_signal + (1 - ACCURACY_ALPHA) * skill.accuracy_ema

    # Update speed EMA (only on correct answers)
    if is_correct and time_ms and time_ms > 0:
        skill.speed_avg_ms = SPEED_ALPHA * time_ms + (1 - SPEED_ALPHA) * skill.speed_avg_ms
        skill.correct += 1

    # Update streak
    if is_correct:
        skill.streak += 1
        skill.max_streak = max(skill.max_streak, skill.streak)
    else:
        skill.streak = 0

    # Update difficulty mastered
    if is_correct and skill.streak >= MASTERY_STREAK_REQUIRED:
        skill.difficulty_mastered = max(skill.difficulty_mastered, difficulty)

    # ── Component 1: Accuracy (0-55) ──
    accuracy_score = skill.accuracy_ema * 55.0

    # ── Component 2: Speed (0-20) ──
    speed_score = 0.0
    if skill.correct > 0 and skill.speed_avg_ms > 0:
        expected_ms = EXPECTED_TIME_MS.get(difficulty, 10000)
        speed_ratio = expected_ms / max(skill.speed_avg_ms, 500)
        speed_score = min(20.0, max(0.0, speed_ratio * 10.0))

    # ── Component 3: Difficulty (0-20) ──
    difficulty_score = (skill.difficulty_mastered / 5.0) * 20.0

    # ── Component 4: Consistency bonus (0-5) ──
    consistency_score = min(5.0, skill.streak * 0.5)

    new_score = accuracy_score + speed_score + difficulty_score + consistency_score
    new_score = max(0.0, min(100.0, new_score))

    # Smooth the score transition (avoid jumps between sessions)
    if skill.attempts <= 3:
        skill.score = new_score
    else:
        skill.score = 0.08 * new_score + 0.92 * skill.score

    # Track history for plateau detection (keep last 30)
    skill.score_history.append(round(skill.score, 2))
    if len(skill.score_history) > 30:
        skill.score_history = skill.score_history[-30:]

    return skill


def compute_global_level(skill_vector: SkillVector) -> float:
    """
    Weighted average of all skill scores → global level 0-100.
    """
    total_weight = 0.0
    weighted_sum = 0.0

    for skill_name, weight in SKILL_WEIGHTS.items():
        skill = skill_vector.get_skill(skill_name)
        weighted_sum += skill.score * weight
        total_weight += weight

    if total_weight == 0:
        return 0.0

    return round(weighted_sum / total_weight, 1)


def identify_strengths_weaknesses(
    skill_vector: SkillVector,
    strength_threshold: float = 60.0,
    weakness_threshold: float = 35.0,
    min_attempts: int = 5,
) -> tuple[list[str], list[str]]:
    """Identify strengths and weaknesses from skill vector."""
    strengths = []
    weaknesses = []

    for skill_name in SKILL_DEFINITIONS:
        skill = skill_vector.get_skill(skill_name)
        if skill.attempts < min_attempts:
            continue
        if skill.score >= strength_threshold:
            strengths.append(skill_name)
        elif skill.score < weakness_threshold:
            weaknesses.append(skill_name)

    return strengths, weaknesses


def select_focus_areas(
    skill_vector: SkillVector,
    weaknesses: list[str],
    max_areas: int = 3,
) -> list[str]:
    """Select top focus areas based on weakest skills with enough attempts."""
    skill_scores = []
    for name in SKILL_DEFINITIONS:
        skill = skill_vector.get_skill(name)
        # Prioritize skills with low score and some attempts (not brand new)
        priority = skill.score if skill.attempts >= 3 else 50.0
        skill_scores.append((name, priority, skill.attempts))

    # Sort by score ascending (weakest first), then by attempts descending
    skill_scores.sort(key=lambda x: (x[1], -x[2]))
    return [s[0] for s in skill_scores[:max_areas]]


# ────────────────────────── Error Classification ──────────────────────────

def classify_error(
    correct_answer: str,
    user_answer: str,
    skill: str,
    sub_skill: Optional[str],
    time_ms: Optional[int],
    difficulty: int,
) -> str:
    """
    Classify the type of error made.
    
    Returns one of:
      - "table_error": wrong multiplication table fact
      - "carry_error": off by 10, 100, etc. (retenue)
      - "inattention": off by 1-2 or digit transposition
      - "procedure_error": completely wrong answer
      - "timeout": no answer given
      - "slow": correct but too slow (detected separately)
    """
    if not user_answer or user_answer.strip() == "":
        return "timeout"

    try:
        correct = float(correct_answer)
        given = float(user_answer)
    except (ValueError, TypeError):
        return "procedure_error"

    diff = abs(correct - given)
    correct_int = int(correct) if correct == int(correct) else None
    given_int = int(given) if given == int(given) else None

    # ── Carry error: off by power of 10 ──
    if diff in (10, 20, 100, 200, 1000):
        return "carry_error"

    # ── Inattention: off by 1-2, or digit swap ──
    if diff <= 2:
        return "inattention"
    
    if correct_int is not None and given_int is not None:
        # Digit transposition
        if sorted(str(abs(correct_int))) == sorted(str(abs(given_int))):
            return "inattention"

    # ── Table error: for multiplication/tables, check if answer is from wrong table ──
    if skill in ("multiplication", "tables_1_20", "fast_multiplication"):
        # Check if the given answer is a valid product from nearby tables
        for a in range(1, 21):
            for b in range(1, 21):
                if a * b == given_int and a * b != correct_int:
                    return "table_error"

    # ── Default: procedure error ──
    return "procedure_error"


# ────────────────────────── Spaced Repetition (SM-2) ──────────────────────────

@dataclass
class SRItem:
    """Spaced repetition item."""
    repetitions: int = 0
    ease_factor: float = 2.5
    interval_days: float = 0.5
    next_review: Optional[datetime] = None

    def update(self, quality: int) -> "SRItem":
        """
        Update SM-2 parameters based on response quality (0-5).
          5 - perfect, instant
          4 - correct, slight hesitation
          3 - correct, with effort
          2 - incorrect but close
          1 - incorrect, partially remembered
          0 - complete blackout
        """
        if quality >= 3:
            if self.repetitions == 0:
                self.interval_days = 1
            elif self.repetitions == 1:
                self.interval_days = 3
            else:
                self.interval_days = self.interval_days * self.ease_factor
            self.repetitions += 1
            self.ease_factor = max(
                1.3,
                self.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
            )
        else:
            self.repetitions = 0
            self.interval_days = 0.5  # Review in 12 hours

        self.next_review = datetime.now(timezone.utc) + timedelta(days=self.interval_days)
        return self


def compute_sr_quality(is_correct: bool, time_ms: Optional[int], expected_ms: int) -> int:
    """Convert exercise result to SM-2 quality score (0-5)."""
    if not is_correct:
        return 1  # Incorrect

    if time_ms is None:
        return 3  # Correct, unknown speed

    ratio = time_ms / expected_ms
    if ratio <= 0.5:
        return 5  # Perfect, very fast
    elif ratio <= 0.8:
        return 4  # Correct, good speed
    elif ratio <= 1.2:
        return 3  # Correct, average speed
    else:
        return 3  # Correct but slow


# ────────────────────────── Plateau Detection ──────────────────────────

def detect_plateau(score_history: list[float], min_points: int = 15) -> bool:
    """
    Detect if a skill score has plateaued using linear regression slope.
    Returns True if slope < 0.15 over last min_points scores.
    """
    if len(score_history) < min_points:
        return False

    recent = score_history[-min_points:]
    n = len(recent)
    x_mean = (n - 1) / 2.0
    y_mean = sum(recent) / n

    numerator = sum((i - x_mean) * (y - y_mean) for i, y in enumerate(recent))
    denominator = sum((i - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return True

    slope = numerator / denominator
    return slope < 0.15


def detect_automatization(skill: SkillData, min_attempts: int = 20) -> bool:
    """
    Detect if a skill is automated (mastered and fast).
    Criteria: accuracy > 95% AND speed < 3s for last 20+ attempts.
    """
    if skill.attempts < min_attempts:
        return False
    return skill.accuracy_ema > 0.95 and skill.speed_avg_ms < 3000


# ────────────────────────── Adaptive Difficulty ──────────────────────────

def select_next_difficulty(skill: SkillData) -> int:
    """
    Select appropriate difficulty for next exercise.
    Based on current accuracy and mastered level.
    """
    if skill.attempts < 3:
        return 1

    if skill.accuracy_ema > 0.85 and skill.streak >= 3:
        # Ready for harder
        return min(5, skill.difficulty_mastered + 1)
    elif skill.accuracy_ema < 0.5:
        # Too hard, go back
        return max(1, skill.difficulty_mastered - 1)
    else:
        # Stay at current
        return skill.difficulty_mastered


def select_next_skill(
    profile: UserCognitiveProfile,
    training_mode: Optional[str] = None,
    operation_filter: Optional[list] = None,
) -> tuple[str, Optional[str]]:
    """
    Select which skill to practice next using smart selection.
    
    Algorithm:
    1. If operation_filter is set → pick randomly from those skills
    2. If training_mode = "tables" → always tables_1_20
    3. 30% chance: pick from spaced repetition (weakest due items)
    4. 40% chance: pick weakest skill
    5. 20% chance: pick a focus area
    6. 10% chance: random (exploration)
    
    Returns: (skill_name, sub_skill_name or None)
    """
    import random

    # Operation filter: pick randomly from selected skills
    if operation_filter:
        valid = [op for op in operation_filter if op in SKILL_DEFINITIONS]
        if valid:
            return random.choice(valid), None

    # Table training mode
    if training_mode == "tables":
        return "tables_1_20", _pick_weakest_table(profile.skill_vector)

    sv = profile.skill_vector
    roll = random.random()

    if roll < 0.30 and profile.weaknesses:
        # Pick weakest
        skill_name = min(
            profile.weaknesses,
            key=lambda s: sv.get_skill(s).score
        )
    elif roll < 0.70:
        # Pick from focus areas or weakest overall
        candidates = profile.focus_areas or profile.weaknesses
        if candidates:
            skill_name = random.choice(candidates)
        else:
            # Pick least practiced
            all_skills = list(SKILL_DEFINITIONS.keys())
            skill_name = min(all_skills, key=lambda s: sv.get_skill(s).attempts)
    elif roll < 0.90:
        # Pick a skill that needs variety
        all_skills = list(SKILL_DEFINITIONS.keys())
        # Weighted by inverse of attempts (practice less-practiced skills)
        weights = [1.0 / max(1, sv.get_skill(s).attempts) for s in all_skills]
        total = sum(weights)
        weights = [w / total for w in weights]
        skill_name = random.choices(all_skills, weights=weights, k=1)[0]
    else:
        # Random exploration
        skill_name = random.choice(list(SKILL_DEFINITIONS.keys()))

    return skill_name, None


def _pick_weakest_table(sv: SkillVector) -> Optional[str]:
    """Pick the weakest table sub-skill for focused table training."""
    import random
    skill = sv.get_skill("tables_1_20")
    if skill.attempts < 5:
        # Start with easier tables
        return random.choice([f"table_{i}" for i in range(1, 11)])
    # Random weighted towards harder tables 
    tables = list(range(1, 21))
    # Weight harder tables more
    weights = [1 + (t / 10) for t in tables]
    # But also weight by inverse of mastery (if we have sub-skill data)
    table = random.choices(tables, weights=weights, k=1)[0]
    return f"table_{table}"


# ────────────────────────── Progress Restart (anti-plateau) ──────────────────────────

def get_plateau_remedy(skill_name: str, skill: SkillData) -> dict:
    """
    When a plateau is detected, suggest a remedy.
    """
    remedies = {
        "increase_variety": "Switch to related sub-skills",
        "challenge_mode": "Try harder difficulty briefly",
        "review_basics": "Review fundamental concepts",
        "speed_drill": "Focus on speed with easy problems",
        "mixed_practice": "Mix with other skills",
    }

    if skill.accuracy_ema > 0.8:
        # High accuracy plateau → speed drill or increase difficulty
        return {
            "type": "challenge_mode",
            "message": f"Tu maîtrises bien {SKILL_DEFINITIONS[skill_name]['label']} ! "
                       f"On va augmenter la difficulté pour continuer à progresser. 🚀",
            "action": "increase_difficulty",
        }
    elif skill.accuracy_ema > 0.6:
        # Medium accuracy plateau → variety
        return {
            "type": "increase_variety",
            "message": f"On va varier les exercices de {SKILL_DEFINITIONS[skill_name]['label']} "
                       f"pour débloquer la progression. 🎯",
            "action": "vary_sub_skills",
        }
    else:
        # Low accuracy plateau → review basics
        return {
            "type": "review_basics",
            "message": f"Revoyons les bases de {SKILL_DEFINITIONS[skill_name]['label']} "
                       f"pour construire des fondations solides. 💪",
            "action": "decrease_difficulty",
        }

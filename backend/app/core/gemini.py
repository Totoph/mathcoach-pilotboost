"""
Gemini AI client wrapper — V2 with mental math expertise
"""
import google.generativeai as genai

import os

_configured = False


def _ensure_configured() -> None:
    """Configure Gemini lazily so app boot doesn't fail without keys."""
    global _configured
    if _configured:
        return
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is required")
    genai.configure(api_key=api_key)
    _configured = True

# Configuration du modèle
generation_config = {
    "temperature": 0.4,
    "top_p": 0.9,
    "top_k": 40,
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=generation_config,
    safety_settings=safety_settings,
)

SYSTEM_PROMPT = """Tu es un coach de calcul mental pour MathCoach. Parle en français, tutoie.

RÈGLE ABSOLUE : Réponds en 3 à 5 lignes MAXIMUM. Jamais plus.
- Donne uniquement LA technique la plus rapide et efficace. Pas d'alternative.
- Montre-la sur UN seul exemple chiffré, étape par étape.
- Pas de titres, pas de markdown, pas de listes à puces.
- Ton direct et encourageant, 1-2 émojis max.
- Si l'élève demande "comment calculer X", montre le raisonnement étape par étape sur cet exemple précis."""


async def generate_agent_response(
    prompt: str,
    context: str = "",
) -> str:
    """
    Génère une réponse de l'agent avec Gemini.
    """
    try:
        _ensure_configured()
        full_prompt = f"""{SYSTEM_PROMPT}

{context if context else ""}

Message utilisateur : {prompt}

Réponds :"""

        response = model.generate_content(full_prompt)

        if response.text:
            return response.text.strip()
        return "Continue comme ça ! 💪"

    except Exception as e:
        print(f"Gemini error: {e}")
        return "Je suis là pour t'accompagner ! 🚀"


async def generate_feedback(
    is_correct: bool,
    exercise_type: str,
    difficulty: int,
    time_taken_ms: int = None
) -> str:
    """Génère un feedback personnalisé après un exercice."""
    speed_info = ""
    if time_taken_ms:
        if time_taken_ms < 5000:
            speed_info = "Réponse ultra rapide !"
        elif time_taken_ms < 10000:
            speed_info = "Bon rythme !"
        elif time_taken_ms > 30000:
            speed_info = "Prends le temps qu'il faut."

    context = f"""Exercice : {exercise_type}, difficulté {difficulty}/5
Résultat : {"Correct" if is_correct else "Incorrect"}
{speed_info}"""

    if is_correct:
        prompt = "L'utilisateur a réussi. Félicite-le brièvement (1 phrase)."
    else:
        prompt = "L'utilisateur s'est trompé. Encourage-le positivement (1 phrase)."

    return await generate_agent_response(prompt, context)


async def generate_tip(exercise_type: str, difficulty: int) -> str:
    """Génère un tip contextuel pour un type d'exercice."""
    prompt = f"Donne UN tip court et pratique de calcul mental pour : {exercise_type} (niveau {difficulty}/5). Maximum 15 mots."
    return await generate_agent_response(prompt)


async def generate_technique_explanation(question: str, correct_answer: str, skill: str) -> str:
    """Génère une explication détaillée de la technique pour résoudre un exercice."""
    prompt = f"""L'élève a raté ce calcul : {question} = {correct_answer}
Catégorie : {skill}

Explique-lui LA MEILLEURE technique de calcul mental pour résoudre ce calcul.
Sois concis (3-4 phrases max) avec un exemple pas-à-pas."""

    return await generate_agent_response(prompt)


async def parse_exercise_intent(user_message: str) -> dict:
    """Use Gemini to understand if a user message is requesting exercises.
    
    Returns a JSON dict with:
      - is_exercise_request: bool
      - skill: str | null (one of: addition, subtraction, multiplication, division,
        tables_1_20, squares_1_30, decomposition, fast_multiplication,
        mixed, chain, advanced)
      - difficulty: int | null (1-5)
      - example: str | null (if user gave a concrete example expression)
      - description: str | null (short description of what was requested)
    """
    import json
    
    prompt = f"""{SYSTEM_PROMPT}

Tu dois analyser le message suivant et déterminer si l'utilisateur demande des exercices de calcul mental.

COMPÉTENCES DISPONIBLES (utilise exactement ces noms) :
- addition : additions
- subtraction : soustractions
- multiplication : multiplications
- division : divisions
- tables_1_20 : tables de multiplication (1 à 20)
- squares_1_30 : carrés de nombres
- decomposition : décompositions
- fast_multiplication : multiplications rapides (×5, ×9, ×11, ×25, ×99)
- mixed : opérations mixtes (2 opérations différentes)
- chain : chaînes de calcul (plusieurs opérations)
- advanced : techniques avancées (carrés védiques, multiplication croisée)

DIFFICULTÉ : 1 (facile) à 5 (expert). Déduis du contexte, défaut = 2.

Réponds UNIQUEMENT en JSON valide, rien d'autre :
{{"is_exercise_request": true/false, "skill": "nom_skill" ou null, "difficulty": 1-5 ou null, "example": "expression" ou null, "description": "ce que veut l'élève" ou null}}

Exemples :
- "donne moi des carrés" → {{"is_exercise_request": true, "skill": "squares_1_30", "difficulty": 2, "example": null, "description": "Série de carrés"}}
- "je veux des multiplications difficiles" → {{"is_exercise_request": true, "skill": "multiplication", "difficulty": 4, "example": null, "description": "Multiplications difficiles"}}
- "tables de 7" → {{"is_exercise_request": true, "skill": "tables_1_20", "difficulty": 2, "example": null, "description": "Tables de 7"}}
- "34-54+67-23" → {{"is_exercise_request": true, "skill": null, "difficulty": null, "example": "34-54+67-23", "description": "Chaîne d'additions/soustractions"}}
- "comment calculer 23×17 ?" → {{"is_exercise_request": false, "skill": null, "difficulty": null, "example": null, "description": null}}
- "c'est quoi la technique des doubles ?" → {{"is_exercise_request": false, "skill": null, "difficulty": null, "example": null, "description": null}}

Message utilisateur : {user_message}

JSON :"""

    try:
        _ensure_configured()
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean up: remove markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        result = json.loads(text)
        return result
    except Exception as e:
        print(f"Gemini parse_exercise_intent error: {e}")
        return {"is_exercise_request": False, "skill": None, "difficulty": None, "example": None, "description": None}

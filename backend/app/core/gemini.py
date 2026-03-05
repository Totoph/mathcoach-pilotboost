"""
Gemini AI client wrapper — V2 with mental math expertise
"""
import google.generativeai as genai
from app.core.config import get_settings

settings = get_settings()
genai.configure(api_key=settings.gemini_api_key)

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

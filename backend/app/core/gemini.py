"""
Gemini AI client wrapper
"""
import google.generativeai as genai
from app.core.config import get_settings

settings = get_settings()
genai.configure(api_key=settings.gemini_api_key)

# Configuration du modèle
generation_config = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1024,
}

safety_settings = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_NONE"
    },
]

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=generation_config,
    safety_settings=safety_settings,
)


async def generate_agent_response(
    prompt: str,
    context: str = "",
    max_tokens: int = 256
) -> str:
    """
    Génère une réponse de l'agent avec Gemini.
    
    Args:
        prompt: Le message utilisateur
        context: Contexte additionnel (historique, état agent, etc.)
        max_tokens: Limite de tokens pour la réponse
    
    Returns:
        La réponse de l'agent
    """
    try:
        # Construction du prompt système
        system_prompt = f"""Tu es un coach IA en calcul mental pour MathCoach by PilotBoost.

Ton rôle :
- Encourager et motiver les utilisateurs
- Donner des tips et astuces de calcul mental
- Être bref et direct (max 2-3 phrases)
- Adapter ton ton selon les performances (encourageant si difficultés, félicitations si réussite)
- Parler en français, tutoyer l'utilisateur

{context if context else ""}

Message utilisateur : {prompt}

Réponds de manière brève et encourageante :"""

        # Génération
        response = model.generate_content(system_prompt)
        
        if response.text:
            return response.text.strip()
        else:
            return "Continue comme ça ! 💪"
            
    except Exception as e:
        print(f"Gemini error: {e}")
        # Fallback en cas d'erreur
        return "Je suis là pour t'accompagner ! 🚀"


async def generate_feedback(
    is_correct: bool,
    exercise_type: str,
    difficulty: int,
    time_taken_ms: int = None
) -> str:
    """
    Génère un feedback personnalisé après un exercice.
    """
    speed_info = ""
    if time_taken_ms:
        if time_taken_ms < 10000:
            speed_info = "Et rapide en plus !"
        elif time_taken_ms > 30000:
            speed_info = "Prends le temps qu'il faut, la précision compte plus que la vitesse."
    
    context = f"""Exercice : {exercise_type}, difficulté {difficulty}/5
Résultat : {"Correct" if is_correct else "Incorrect"}
{speed_info}"""

    if is_correct:
        prompt = "L'utilisateur a réussi cet exercice. Félicite-le brièvement."
    else:
        prompt = "L'utilisateur s'est trompé. Encourage-le de manière positive."
    
    return await generate_agent_response(prompt, context, max_tokens=128)


async def generate_tip(exercise_type: str, difficulty: int) -> str:
    """
    Génère un tip contextuel pour un type d'exercice.
    """
    prompt = f"Donne UN tip court et pratique de calcul mental pour : {exercise_type} (niveau {difficulty}/5). Maximum 15 mots."
    
    return await generate_agent_response(prompt, max_tokens=64)

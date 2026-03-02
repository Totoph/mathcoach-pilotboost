from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_key: str

    # Gemini (for agent conversations and tips)
    gemini_api_key: str

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"

    # App
    env: str = "development"
    frontend_url: str = "https://mathcoach.pilotboost.fr"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

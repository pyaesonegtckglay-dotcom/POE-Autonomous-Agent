from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "POE Autonomous Agent"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database (Supabase PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./poe_agent.db")
    DATABASE_URL_SYNC: str = os.getenv("DATABASE_URL_SYNC", "sqlite:///./poe_agent.db")

    # Redis (Upstash)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # AI Keys
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # HuggingFace
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    HF_SPACE_NAME: str = os.getenv("HF_SPACE_NAME", "pyaesonegtckglay/poe-autonomous-agent-backend")

    # Vercel
    VERCEL_TOKEN: str = os.getenv("VERCEL_TOKEN", "")

    # Sandbox
    SANDBOX_BASE_PATH: str = "/tmp/poe_sandbox"
    SANDBOX_TIMEOUT: int = 300
    MAX_REPAIR_RETRIES: int = 3

    # CORS
    ALLOWED_ORIGINS: list = ["*"]

    # Frontend
    NEXT_PUBLIC_BACKEND_URL: str = os.getenv(
        "NEXT_PUBLIC_BACKEND_URL",
        "https://pyaesonegtckglay-poe-autonomous-agent-backend.hf.space"
    )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

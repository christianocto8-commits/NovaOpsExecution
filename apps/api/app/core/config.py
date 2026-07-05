import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = API_ROOT / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=True)


class Settings(BaseSettings):
    app_name: str = "NovaOps Enterprise API"
    app_version: str = "0.7.0"
    environment: str = "local"

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=os.environ["DATABASE_URL"],
        jwt_secret_key=os.environ.get(
            "JWT_SECRET_KEY",
            os.environ.get("SECRET_KEY", "novaops-development-secret-key"),
        ),
        jwt_algorithm=os.environ.get(
            "JWT_ALGORITHM",
            os.environ.get("ALGORITHM", "HS256"),
        ),
        access_token_expire_minutes=int(
            os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
        ),
    )

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = API_ROOT / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=True)


def _sanitize_env_value(value: str) -> str:
    cleaned = value.strip()

    if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in {'"', "'"}:
        cleaned = cleaned[1:-1].strip()

    return cleaned


def _parse_cors_origins(raw_value: str | None) -> list[str]:
    if not raw_value:
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]

    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


class Settings(BaseSettings):
    app_name: str = "NovaOps Enterprise API"
    app_version: str = "0.7.0"
    environment: str = "local"

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins_raw: str = "http://localhost:3000,http://127.0.0.1:3000"
    bootstrap_admin_enabled: bool = False
    bootstrap_admin_email: str | None = None
    bootstrap_admin_username: str | None = None
    bootstrap_admin_password: str | None = None

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return _parse_cors_origins(self.cors_origins_raw)


@lru_cache
def get_settings() -> Settings:
    database_url = _sanitize_env_value(os.environ["DATABASE_URL"])

    return Settings(
        database_url=database_url,
        jwt_secret_key=_sanitize_env_value(
            os.environ.get(
                "JWT_SECRET_KEY",
                os.environ.get("SECRET_KEY", "novaops-development-secret-key"),
            )
        ),
        jwt_algorithm=os.environ.get(
            "JWT_ALGORITHM",
            os.environ.get("ALGORITHM", "HS256"),
        ),
        access_token_expire_minutes=int(
            os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
        ),
        cors_origins_raw=_sanitize_env_value(
            os.environ.get(
                "CORS_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000",
            )
        ),
        bootstrap_admin_enabled=os.environ.get(
            "BOOTSTRAP_ADMIN_ENABLED",
            "false",
        ).lower()
        in {"1", "true", "yes", "on"},
        bootstrap_admin_email=_sanitize_env_value(os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "") or "")
        or None,
        bootstrap_admin_username=_sanitize_env_value(
            os.environ.get("BOOTSTRAP_ADMIN_USERNAME", "") or ""
        )
        or None,
        bootstrap_admin_password=os.environ.get("BOOTSTRAP_ADMIN_PASSWORD"),
    )


class LegacySettingsAdapter:
    @property
    def DATABASE_URL(self) -> str:
        return get_settings().database_url

    @property
    def SECRET_KEY(self) -> str:
        return get_settings().jwt_secret_key

    @property
    def ALGORITHM(self) -> str:
        return get_settings().jwt_algorithm

    @property
    def ACCESS_TOKEN_EXPIRE_MINUTES(self) -> int:
        return get_settings().access_token_expire_minutes


settings = LegacySettingsAdapter()

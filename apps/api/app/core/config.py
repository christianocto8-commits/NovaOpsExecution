import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = API_ROOT / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=True)


def _sanitize_env_value(value: str) -> str:
    cleaned = value.strip().strip("\ufeff")

    quote_pairs = {'"', "'", "“", "”", "‘", "’"}
    while len(cleaned) >= 2 and cleaned[0] in quote_pairs and cleaned[-1] in quote_pairs:
        cleaned = cleaned[1:-1].strip()

    return cleaned


def _normalize_database_url(value: str) -> str:
    cleaned = _sanitize_env_value(value)

    if not cleaned:
        raise ValueError("DATABASE_URL is empty. Set a valid PostgreSQL connection string.")

    parsed = urlparse(cleaned)
    scheme = parsed.scheme.lower()

    if scheme not in {"postgresql", "postgres", "postgresql+psycopg2", "postgresql+psycopg"}:
        raise ValueError(
            "DATABASE_URL must start with postgresql:// or postgres://. "
            "Remove surrounding quotes and paste only the connection string."
        )

    query = [
        (key, val)
        for key, val in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() != "channel_binding"
    ]
    normalized = urlunparse(parsed._replace(query=urlencode(query)))

    if normalized.startswith("postgresql://"):
        return normalized.replace("postgresql://", "postgresql+psycopg2://", 1)

    if normalized.startswith("postgres://"):
        return normalized.replace("postgres://", "postgresql+psycopg2://", 1)

    return normalized


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
    access_token_expire_minutes: int = 30
    cors_origins_raw: str = "http://localhost:3000,http://127.0.0.1:3000"
    bootstrap_admin_enabled: bool = False
    bootstrap_admin_email: str | None = None
    bootstrap_admin_username: str | None = None
    bootstrap_admin_password: str | None = None
    vapid_public_key: str | None = None
    vapid_private_key: str | None = None
    vapid_subject: str = "mailto:admin@novaops.com"

    s3_endpoint: str | None = None
    s3_bucket: str | None = None
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str | None = None

    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str | None = None
    google_frontend_success_url: str | None = None

    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_number: str | None = None

    oidc_issuer_url: str | None = None
    oidc_client_id: str | None = None
    oidc_client_secret: str | None = None
    oidc_redirect_uri: str | None = None
    oidc_frontend_success_url: str | None = None

    saml_sp_entity_id: str | None = None
    saml_sp_acs_url: str | None = None
    saml_idp_entity_id: str | None = None
    saml_idp_sso_url: str | None = None
    saml_idp_metadata_url: str | None = None
    saml_idp_x509_cert: str | None = None
    saml_frontend_success_url: str | None = None
    saml_role_attribute: str = "role"
    saml_role_mapping_json: str | None = None
    saml_sync_role_on_login: bool = False

    firebase_credentials_path: str | None = None
    firebase_credentials_json: str | None = None
    iot_ingest_api_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        origins = _parse_cors_origins(self.cors_origins_raw)
        # Always allow the native Android (Capacitor) webview origins so the
        # outlet-only APK can authenticate against the production API.
        for extra in ("http://localhost", "capacitor://localhost", "https://nova-ops.cloud"):
            if extra not in origins:
                origins.append(extra)
        return origins


@lru_cache
def get_settings() -> Settings:
    raw_db_url = os.environ.get("DATABASE_URL")
    if not raw_db_url:
        raise ValueError("DATABASE_URL environment variable is missing. Please configure it in your .env file or environment.")
    database_url = _normalize_database_url(raw_db_url)
    environment = _sanitize_env_value(os.environ.get("ENVIRONMENT", "local") or "local").lower()
    jwt_secret_key = _sanitize_env_value(
        os.environ.get(
            "JWT_SECRET_KEY",
            os.environ.get("SECRET_KEY", "novaops-development-secret-key"),
        )
    )

    if environment == "production" and (
        not jwt_secret_key
        or jwt_secret_key == "novaops-development-secret-key"
        or len(jwt_secret_key) < 32
    ):
        raise ValueError("JWT_SECRET_KEY must be set to a strong value in production.")

    return Settings(
        environment=environment,
        database_url=database_url,
        jwt_secret_key=jwt_secret_key,
        jwt_algorithm=os.environ.get(
            "JWT_ALGORITHM",
            os.environ.get("ALGORITHM", "HS256"),
        ),
        access_token_expire_minutes=int(
            os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
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
        vapid_public_key=_sanitize_env_value(os.environ.get("VAPID_PUBLIC_KEY", "") or "") or None,
        vapid_private_key=_sanitize_env_value(os.environ.get("VAPID_PRIVATE_KEY", "") or "") or None,
        vapid_subject=_sanitize_env_value(
            os.environ.get("VAPID_SUBJECT", "mailto:admin@novaops.com") or "mailto:admin@novaops.com"
        ),
        s3_endpoint=_sanitize_env_value(os.environ.get("S3_ENDPOINT", "") or "") or None,
        s3_bucket=_sanitize_env_value(os.environ.get("S3_BUCKET", "") or "") or None,
        s3_access_key=_sanitize_env_value(os.environ.get("S3_ACCESS_KEY", "") or "") or None,
        s3_secret_key=os.environ.get("S3_SECRET_KEY") or None,
        s3_region=_sanitize_env_value(os.environ.get("S3_REGION", "") or "") or None,
        google_client_id=_sanitize_env_value(os.environ.get("GOOGLE_CLIENT_ID", "") or "") or None,
        google_client_secret=os.environ.get("GOOGLE_CLIENT_SECRET") or None,
        google_redirect_uri=_sanitize_env_value(os.environ.get("GOOGLE_REDIRECT_URI", "") or "") or None,
        google_frontend_success_url=_sanitize_env_value(
            os.environ.get("GOOGLE_FRONTEND_SUCCESS_URL", "") or ""
        )
        or None,
        twilio_account_sid=_sanitize_env_value(os.environ.get("TWILIO_ACCOUNT_SID", "") or "") or None,
        twilio_auth_token=os.environ.get("TWILIO_AUTH_TOKEN") or None,
        twilio_from_number=_sanitize_env_value(os.environ.get("TWILIO_FROM_NUMBER", "") or "") or None,
        oidc_issuer_url=_sanitize_env_value(os.environ.get("OIDC_ISSUER_URL", "") or "") or None,
        oidc_client_id=_sanitize_env_value(os.environ.get("OIDC_CLIENT_ID", "") or "") or None,
        oidc_client_secret=os.environ.get("OIDC_CLIENT_SECRET") or None,
        oidc_redirect_uri=_sanitize_env_value(os.environ.get("OIDC_REDIRECT_URI", "") or "") or None,
        oidc_frontend_success_url=_sanitize_env_value(
            os.environ.get("OIDC_FRONTEND_SUCCESS_URL", "") or ""
        )
        or None,
        saml_sp_entity_id=_sanitize_env_value(os.environ.get("SAML_SP_ENTITY_ID", "") or "") or None,
        saml_sp_acs_url=_sanitize_env_value(os.environ.get("SAML_SP_ACS_URL", "") or "") or None,
        saml_idp_entity_id=_sanitize_env_value(os.environ.get("SAML_IDP_ENTITY_ID", "") or "") or None,
        saml_idp_sso_url=_sanitize_env_value(os.environ.get("SAML_IDP_SSO_URL", "") or "") or None,
        saml_idp_metadata_url=_sanitize_env_value(
            os.environ.get("SAML_IDP_METADATA_URL", "") or ""
        )
        or None,
        saml_idp_x509_cert=os.environ.get("SAML_IDP_X509_CERT") or None,
        saml_frontend_success_url=_sanitize_env_value(
            os.environ.get("SAML_FRONTEND_SUCCESS_URL", "") or ""
        )
        or None,
        saml_role_attribute=_sanitize_env_value(
            os.environ.get("SAML_ROLE_ATTRIBUTE", "role") or "role"
        ),
        saml_role_mapping_json=os.environ.get("SAML_ROLE_MAPPING_JSON") or None,
        saml_sync_role_on_login=os.environ.get(
            "SAML_SYNC_ROLE_ON_LOGIN",
            "false",
        ).lower()
        in {"1", "true", "yes", "on"},
        firebase_credentials_path=_sanitize_env_value(
            os.environ.get("FIREBASE_CREDENTIALS_PATH", "") or ""
        )
        or None,
        firebase_credentials_json=os.environ.get("FIREBASE_CREDENTIALS_JSON") or None,
        iot_ingest_api_key=os.environ.get("IOT_INGEST_API_KEY") or None,
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

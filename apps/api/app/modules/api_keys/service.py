import secrets
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.api_keys.models import ApiKey
from app.modules.api_keys.repository import ApiKeyRepository
from app.modules.api_keys.schemas import API_KEY_SCOPES, ApiKeyCreate
from app.modules.identity.security import hash_token


class ApiKeyService:
    KEY_PREFIX = "nova_"

    def __init__(self, db: Session):
        self.db = db
        self.repository = ApiKeyRepository(db)

    def list_keys(self) -> list[ApiKey]:
        return self.repository.list_all()

    def get_key(self, api_key_id) -> ApiKey:
        api_key = self.repository.find_by_id(api_key_id)
        if not api_key:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
        return api_key

    def _validate_scopes(self, scopes: list[str]) -> None:
        invalid = [scope for scope in scopes if scope not in API_KEY_SCOPES]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported scopes: {', '.join(invalid)}",
            )

    def create_key(self, payload: ApiKeyCreate, created_by_id) -> tuple[ApiKey, str]:
        self._validate_scopes(payload.scopes)

        raw_key = f"{self.KEY_PREFIX}{secrets.token_urlsafe(32)}"
        api_key = ApiKey(
            name=payload.name.strip(),
            key_prefix=raw_key[:12],
            key_hash=hash_token(raw_key),
            scopes=payload.scopes,
            created_by_id=created_by_id,
        )
        saved = self.repository.create(api_key)
        return saved, raw_key

    def revoke_key(self, api_key_id) -> None:
        api_key = self.get_key(api_key_id)
        self.repository.delete(api_key)

    def authenticate(self, raw_key: str, required_scope: str | None = None) -> ApiKey | None:
        if not raw_key.startswith(self.KEY_PREFIX):
            return None

        key_hash = hash_token(raw_key)
        api_key = self.repository.find_by_hash(key_hash)

        if not api_key or not api_key.is_active:
            return None

        if api_key.expires_at and api_key.expires_at <= datetime.now(UTC):
            return None

        if required_scope and required_scope not in set(api_key.scopes or []):
            return None

        self.repository.touch_last_used(api_key)
        return api_key

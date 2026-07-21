from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.api_keys.models import ApiKey


class ApiKeyRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> list[ApiKey]:
        return self.db.query(ApiKey).order_by(ApiKey.created_at.desc()).all()

    def find_by_id(self, api_key_id: UUID) -> ApiKey | None:
        return self.db.query(ApiKey).filter(ApiKey.id == api_key_id).first()

    def find_by_hash(self, key_hash: str) -> ApiKey | None:
        return self.db.query(ApiKey).filter(ApiKey.key_hash == key_hash).first()

    def create(self, api_key: ApiKey) -> ApiKey:
        self.db.add(api_key)
        self.db.commit()
        self.db.refresh(api_key)
        return api_key

    def save(self, api_key: ApiKey) -> ApiKey:
        self.db.commit()
        self.db.refresh(api_key)
        return api_key

    def delete(self, api_key: ApiKey) -> None:
        self.db.delete(api_key)
        self.db.commit()

    def touch_last_used(self, api_key: ApiKey) -> None:
        api_key.last_used_at = datetime.now(UTC)
        self.db.commit()

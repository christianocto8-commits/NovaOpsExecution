from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.notifications.models import DevicePushToken


class DevicePushTokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_token(self, token: str) -> DevicePushToken | None:
        statement = select(DevicePushToken).where(DevicePushToken.token == token)
        return self.db.scalar(statement)

    def list_for_user(self, user_id: UUID) -> list[DevicePushToken]:
        statement = (
            select(DevicePushToken)
            .where(DevicePushToken.user_id == user_id)
            .order_by(DevicePushToken.created_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def upsert(
        self,
        *,
        user_id: UUID,
        token: str,
        platform: str,
        outlet_id: UUID | None = None,
        user_agent: str | None = None,
    ) -> DevicePushToken:
        existing = self.find_by_token(token)

        if existing:
            existing.user_id = user_id
            existing.platform = platform
            existing.outlet_id = outlet_id
            existing.user_agent = user_agent
            self.db.commit()
            self.db.refresh(existing)
            return existing

        record = DevicePushToken(
            user_id=user_id,
            token=token,
            platform=platform,
            outlet_id=outlet_id,
            user_agent=user_agent,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def delete_by_token(self, token: str, user_id: UUID) -> bool:
        record = self.find_by_token(token)

        if not record or record.user_id != user_id:
            return False

        self.db.delete(record)
        self.db.commit()
        return True

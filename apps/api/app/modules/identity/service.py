from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.identity.models import User
from app.modules.identity.repository import RefreshTokenRepository, UserRepository
from app.modules.identity.schemas import TokenResponse
from app.modules.identity.security import (
    create_access_token,
    create_raw_refresh_token,
    hash_token,
    verify_password,
)


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)
        self.settings = get_settings()

    def authenticate(self, *, identifier: str, password: str) -> User:
        user = self.users.find_by_identifier(identifier)

        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        return user

    def build_access_claims(self, user: User) -> dict:
        permissions = [permission.code for permission in user.role.permissions]

        return {
            "role": user.role.slug,
            "outlet_id": str(user.outlet_id) if user.outlet_id else None,
            "permissions": permissions,
            "token_version": 1,
        }

    def login(
        self,
        *,
        identifier: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        user = self.authenticate(identifier=identifier, password=password)

        access_token = create_access_token(
            subject=user.id,
            extra_claims=self.build_access_claims(user),
        )

        raw_refresh_token = create_raw_refresh_token()
        refresh_expires_at = datetime.now(UTC) + timedelta(days=30)

        self.refresh_tokens.create(
            user_id=user.id,
            token_hash=hash_token(raw_refresh_token),
            expires_at=refresh_expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.users.update_last_login(user)
        self.db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            expires_in_minutes=self.settings.access_token_expire_minutes,
        )

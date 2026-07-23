import re
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.identity.models import User
from app.modules.identity.repository import (
    OutletRepository,
    RefreshTokenRepository,
    RoleRepository,
    UserRepository,
)
from app.modules.identity.schemas import TokenResponse
from app.modules.identity.security import (
    create_access_token,
    create_raw_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)
        self.roles = RoleRepository(db)
        self.outlets = OutletRepository(db)
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

    def issue_tokens_for_user(
        self,
        user: User,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

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

    def login(
        self,
        *,
        identifier: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        user = self.authenticate(identifier=identifier, password=password)
        return self.issue_tokens_for_user(
            user,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def _build_unique_username(self, *, email: str, full_name: str) -> str:
        local_part = email.split("@", 1)[0]
        slug = re.sub(r"[^a-z0-9._-]+", "", local_part.lower()) or "user"
        slug = slug[:40]

        candidate = slug
        suffix = 1

        while self.users.find_by_identifier(candidate):
            candidate = f"{slug[:35]}{suffix}"
            suffix += 1

        if not candidate:
            candidate = re.sub(r"[^a-z0-9]+", "", full_name.lower())[:40] or f"user{secrets.token_hex(3)}"

        return candidate

    def login_or_create_google_user(
        self,
        *,
        email: str,
        full_name: str,
        role_slug: str | None = None,
        sync_role_on_login: bool = False,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        user = self.users.find_by_email(email)

        if not user:
            selected_role = self.roles.find_by_slug(role_slug or "outlet")
            if not selected_role:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Default SSO role '{role_slug or 'outlet'}' is not configured",
                )

            default_outlet = self.outlets.list()[0] if self.outlets.list() else None
            should_assign_default_outlet = selected_role.slug == "outlet"
            username = self._build_unique_username(email=email, full_name=full_name)

            user = User(
                email=email,
                username=username,
                full_name=full_name or username,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                role_id=selected_role.id,
                outlet_id=default_outlet.id if should_assign_default_outlet and default_outlet else None,
                is_active=True,
            )
            user = self.users.create(user)

            if should_assign_default_outlet and default_outlet:
                from app.modules.tasks.identity_bridge import get_or_create_legacy_outlet

                get_or_create_legacy_outlet(self.db, default_outlet)

            self.db.commit()
            user = self.users.find_by_email(email)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create Google user",
                )

        elif role_slug and sync_role_on_login:
            next_role = self.roles.find_by_slug(role_slug)
            if next_role and next_role.id != user.role_id:
                user.role_id = next_role.id
                if next_role.slug != "outlet":
                    user.outlet_id = None
                    user.assigned_outlets.clear()
                self.db.add(user)
                self.db.commit()
                user = self.users.find_by_email(email) or user

        return self.issue_tokens_for_user(
            user,
            ip_address=ip_address,
            user_agent=user_agent,
        )

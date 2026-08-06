import re
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.identity.audit import record_identity_audit_event
from app.modules.identity.models import LoginOtpChallenge, User
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
from app.services.email_service import EmailService
from app.services.webhook_dispatcher import dispatch_webhook_event
from app.services.workspace_settings import get_workspace_settings


def build_device_label(user_agent: str | None) -> str:
    if not user_agent:
        return "Unknown device"

    ua = user_agent.lower()
    if "edg/" in ua:
        browser = "Edge"
    elif "chrome/" in ua or "crios/" in ua:
        browser = "Chrome"
    elif "firefox/" in ua or "fxios/" in ua:
        browser = "Firefox"
    elif "safari/" in ua:
        browser = "Safari"
    else:
        browser = "Browser"

    if "android" in ua:
        platform = "Android"
    elif "iphone" in ua or "ipad" in ua:
        platform = "iOS"
    elif "windows" in ua:
        platform = "Windows"
    elif "mac os" in ua or "macintosh" in ua:
        platform = "macOS"
    elif "linux" in ua:
        platform = "Linux"
    else:
        platform = "Device"

    return f"{browser} on {platform}"


def is_owner_admin_user(user: User) -> bool:
    return bool(user.role and user.role.slug in {"owner", "admin"})


def validate_password_policy(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password minimal 8 karakter")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password wajib punya huruf besar")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password wajib punya huruf kecil")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password wajib punya angka")


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
            record_identity_audit_event(
                self.db,
                action="login_failed",
                resource_type="auth_session",
                actor_user_id=user.id if user else None,
                resource_id=str(user.id) if user else None,
                metadata={
                    "identifier": identifier.strip().lower(),
                    "reason": "invalid_credentials",
                },
            )
            try:
                dispatch_webhook_event(
                    self.db,
                    event_type="security.login_failed",
                    payload={
                        "identifier": identifier.strip().lower(),
                        "reason": "invalid_credentials",
                        "user_id": str(user.id) if user else None,
                    },
                )
            except Exception:
                pass
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password",
            )

        if not user.is_active:
            record_identity_audit_event(
                self.db,
                action="login_failed",
                resource_type="auth_session",
                actor_user_id=user.id,
                resource_id=str(user.id),
                metadata={
                    "identifier": identifier.strip().lower(),
                    "reason": "inactive_account",
                },
            )
            self.db.commit()
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

        raw_refresh_token = create_raw_refresh_token()
        refresh_expires_at = datetime.now(UTC) + timedelta(days=30)

        refresh_token = self.refresh_tokens.create(
            user_id=user.id,
            token_hash=hash_token(raw_refresh_token),
            expires_at=refresh_expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
            device_label=build_device_label(user_agent),
        )

        access_token = create_access_token(
            subject=user.id,
            extra_claims={
                **self.build_access_claims(user),
                "sid": str(refresh_token.id),
            },
        )

        self.users.update_last_login(user)
        record_identity_audit_event(
            self.db,
            action="login_success",
            resource_type="auth_session",
            actor_user_id=user.id,
            organization_id=user.outlet.organization_id if user.outlet else None,
            outlet_id=user.outlet_id,
            resource_id=str(refresh_token.id),
            metadata={
                "device_label": refresh_token.device_label,
                "ip_address": ip_address,
                "user_agent": user_agent,
            },
        )
        self.db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            expires_in_minutes=self.settings.access_token_expire_minutes,
        )

    def refresh_tokens(
        self,
        *,
        raw_refresh_token: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        token_hash = hash_token(raw_refresh_token)
        existing = self.refresh_tokens.find_active_by_hash(token_hash)
        if existing is None:
            # Reuse of a revoked/rotated token invalidates the whole family for that user
            # when we can still resolve the user from any matching hash row.
            reused = self.refresh_tokens.find_by_hash_including_revoked(token_hash)
            if reused is not None:
                self.refresh_tokens.revoke_all_for_user(reused.user_id)
                self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        user = self.users.find_by_id(existing.user_id)
        if user is None or not user.is_active:
            self.refresh_tokens.revoke(existing)
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive",
            )

        self.refresh_tokens.revoke(existing)
        record_identity_audit_event(
            self.db,
            action="refresh_token_rotated",
            resource_type="auth_session",
            actor_user_id=user.id,
            organization_id=user.outlet.organization_id if user.outlet else None,
            outlet_id=user.outlet_id,
            resource_id=str(existing.id),
            metadata={"ip_address": ip_address, "user_agent": user_agent},
        )

        return self.issue_tokens_for_user(
            user,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    def create_otp_challenge(
        self,
        user: User,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        code = f"{secrets.randbelow(1_000_000):06d}"
        challenge = LoginOtpChallenge(
            user_id=user.id,
            code_hash=hash_token(code),
            expires_at=datetime.now(UTC) + timedelta(minutes=10),
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(challenge)
        self.db.flush()

        sent = EmailService().send(
            user.email,
            "NovaOps login verification code",
            (
                "Kode verifikasi login NovaOps Anda:\n\n"
                f"{code}\n\n"
                "Kode berlaku 10 menit. Abaikan email ini jika Anda tidak mencoba login."
            ),
        )
        if not sent:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OTP email is required but SMTP is not configured or failed to send",
            )

        record_identity_audit_event(
            self.db,
            action="otp_challenge_created",
            resource_type="auth_session",
            actor_user_id=user.id,
            resource_id=str(challenge.id),
            metadata={"ip_address": ip_address, "user_agent": user_agent},
        )
        self.db.commit()

        return TokenResponse(
            requires_otp=True,
            otp_challenge_id=challenge.id,
            message="OTP sent to registered email",
        )

    def verify_otp_challenge(
        self,
        *,
        challenge_id: UUID,
        code: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        challenge = (
            self.db.query(LoginOtpChallenge)
            .filter(LoginOtpChallenge.id == challenge_id)
            .first()
        )
        now = datetime.now(UTC)
        if (
            not challenge
            or challenge.consumed_at is not None
            or challenge.expires_at <= now
            or challenge.code_hash != hash_token(code)
        ):
            record_identity_audit_event(
                self.db,
                action="otp_failed",
                resource_type="auth_session",
                resource_id=str(challenge_id),
                metadata={"ip_address": ip_address, "user_agent": user_agent},
            )
            self.db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP code")

        challenge.consumed_at = now
        self.db.add(challenge)
        self.db.flush()

        record_identity_audit_event(
            self.db,
            action="otp_verified",
            resource_type="auth_session",
            actor_user_id=challenge.user_id,
            resource_id=str(challenge.id),
            metadata={"ip_address": ip_address, "user_agent": user_agent},
        )

        user = self.users.find_by_id(challenge.user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        return self.issue_tokens_for_user(user, ip_address=ip_address, user_agent=user_agent)

    def login(
        self,
        *,
        identifier: str,
        password: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> TokenResponse:
        user = self.authenticate(identifier=identifier, password=password)
        workspace_settings = get_workspace_settings(self.db)
        if workspace_settings.two_factor_required and is_owner_admin_user(user):
            return self.create_otp_challenge(
                user,
                ip_address=ip_address,
                user_agent=user_agent,
            )

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

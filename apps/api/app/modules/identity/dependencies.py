from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.models import User
from app.modules.identity.repository import UserRepository
from app.modules.identity.security import decode_access_token

bearer_scheme = HTTPBearer(
    scheme_name="Bearer JWT",
    description="Paste access token from /api/v1/auth/login.",
    auto_error=False,
)


@dataclass(frozen=True)
class AuthContext:
    user: User
    role: str
    permissions: set[str]
    outlet_id: str | None
    token_version: int


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(payload["sub"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc

    user = UserRepository(db).find_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return current_user


def get_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    current_user: User = Depends(get_current_active_user),
) -> AuthContext:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        ) from exc

    return AuthContext(
        user=current_user,
        role=str(payload.get("role", current_user.role.slug)),
        permissions=set(payload.get("permissions", [])),
        outlet_id=payload.get("outlet_id"),
        token_version=int(payload.get("token_version", 1)),
    )


def has_permission(auth_context: AuthContext, permission_code: str) -> bool:
    if permission_code in auth_context.permissions:
        return True

    permission_prefix = permission_code.split(".")[0]
    wildcard = f"{permission_prefix}.*"

    return wildcard in auth_context.permissions


def require_permission(permission_code: str):
    def dependency(
        auth_context: AuthContext = Depends(get_auth_context),
    ) -> User:
        if not has_permission(auth_context, permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission_code}",
            )

        return auth_context.user

    return dependency


def require_role(*role_slugs: str):
    def dependency(
        auth_context: AuthContext = Depends(get_auth_context),
    ) -> User:
        if auth_context.role not in role_slugs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role access",
            )

        return auth_context.user

    return dependency

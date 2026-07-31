from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.modules.api_keys.models import ApiKey
from app.modules.api_keys.service import ApiKeyService
from app.modules.identity.models import User as IdentityUser
from app.modules.identity.repository import RefreshTokenRepository
from app.modules.tasks.identity_bridge import (
    get_default_identity_outlet,
    get_or_create_legacy_outlet,
    sync_legacy_user,
)

# Standard Enterprise Bearer Authentication
bearer_scheme = HTTPBearer(auto_error=True)
optional_bearer_scheme = HTTPBearer(auto_error=False)


def _resolve_legacy_user(db: Session, subject: str, payload: dict | None = None) -> User | None:
    try:
        identity_user_id = UUID(subject)
    except (TypeError, ValueError):
        return None

    identity_user = db.query(IdentityUser).filter(IdentityUser.id == identity_user_id).first()

    if not identity_user or not identity_user.is_active:
        return None

    session_id = (payload or {}).get("sid")
    if not session_id:
        return None

    try:
        active_session = RefreshTokenRepository(db).find_active_by_id_for_user(
            session_id=UUID(str(session_id)),
            user_id=identity_user.id,
        )
    except (TypeError, ValueError):
        return None

    if not active_session:
        return None

    identity_outlet = get_default_identity_outlet(identity_user)
    legacy_outlet = get_or_create_legacy_outlet(db, identity_outlet) if identity_outlet else None
    legacy_user = sync_legacy_user(db, identity_user, legacy_outlet)
    db.commit()
    return legacy_user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Get authenticated legacy task-engine user from JWT Bearer Token.
    The current login system issues UUID identity tokens; task APIs still use
    integer legacy users, so this safely bridges by matching email.
    """

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        user = _resolve_legacy_user(db, str(user_id), payload)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Matching task user not found for current identity",
            )

        return user

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


def get_optional_api_key(
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
    db: Session = Depends(get_db),
) -> ApiKey | None:
    if not x_api_key:
        return None

    return ApiKeyService(db).authenticate(x_api_key)


def require_jwt_or_api_key(required_scope: str):
    def dependency(
        credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
        x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
        db: Session = Depends(get_db),
    ) -> User | ApiKey:
        if x_api_key:
            api_key = ApiKeyService(db).authenticate(x_api_key, required_scope=required_scope)
            if api_key:
                return api_key

        if credentials is not None:
            return get_current_user(credentials, db)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid JWT or X-API-Key required",
        )

    return dependency

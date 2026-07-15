from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.modules.identity.models import User as IdentityUser
from app.modules.tasks.identity_bridge import (
    get_default_identity_outlet,
    get_or_create_legacy_outlet,
    sync_legacy_user,
)

# Standard Enterprise Bearer Authentication
bearer_scheme = HTTPBearer(auto_error=True)


def _resolve_legacy_user(db: Session, subject: str) -> User | None:
    try:
        return db.query(User).filter(User.id == int(subject)).first()
    except (TypeError, ValueError):
        pass

    try:
        identity_user_id = UUID(subject)
    except (TypeError, ValueError):
        return None

    identity_user = db.query(IdentityUser).filter(IdentityUser.id == identity_user_id).first()

    if not identity_user:
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

        user = _resolve_legacy_user(db, str(user_id))

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

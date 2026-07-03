from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.permissions import get_permissions_for_role
from app.core.security import create_access_token, verify_password
from app.models import User
from app.schemas.auth import AuthUserResponse, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    token = create_access_token(subject=user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=AuthUserResponse)
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role_name = user.role.name if user.role else ""

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_active": user.is_active,
        "role": user.role,
        "permissions": get_permissions_for_role(role_name),
    }
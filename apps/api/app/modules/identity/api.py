from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import get_current_active_user
from app.modules.identity.models import User
from app.modules.identity.schemas import LoginRequest, TokenResponse
from app.modules.identity.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    return AuthService(db).login(
        identifier=payload.identifier,
        password=payload.password,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


@router.get("/me")
def me(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "last_login": current_user.last_login,
        "role": {
            "id": str(current_user.role.id),
            "name": current_user.role.name,
            "slug": current_user.role.slug,
            "permissions": [
                {
                    "code": permission.code,
                    "name": permission.name,
                }
                for permission in current_user.role.permissions
            ],
        },
        "outlet": (
            {
                "id": str(current_user.outlet.id),
                "code": current_user.outlet.code,
                "name": current_user.outlet.name,
                "status": current_user.outlet.status,
            }
            if current_user.outlet
            else None
        ),
    }

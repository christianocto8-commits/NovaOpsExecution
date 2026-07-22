from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.identity.dependencies import get_current_active_user
from app.modules.identity.google_oauth import (
    build_frontend_success_redirect,
    build_google_authorize_url,
    create_oauth_state,
    exchange_code_for_profile,
    is_google_oauth_configured,
    verify_oauth_state,
)
from app.modules.identity.oidc_oauth import (
    build_oidc_authorize_url,
    build_oidc_frontend_success_redirect,
    create_oidc_state,
    exchange_oidc_code_for_profile,
    is_oidc_configured,
    verify_oidc_state,
)
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


@router.get("/google/login")
def google_login() -> RedirectResponse:
    if not is_google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )

    state = create_oauth_state()
    return RedirectResponse(url=build_google_authorize_url(state=state), status_code=status.HTTP_302_FOUND)


@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if not is_google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google OAuth error: {error}",
        )

    if not code or not state or not verify_oauth_state(state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google OAuth callback",
        )

    try:
        profile = exchange_code_for_profile(code=code)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    token_response = AuthService(db).login_or_create_google_user(
        email=profile["email"],
        full_name=profile["full_name"],
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    redirect_url = build_frontend_success_redirect(
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
        expires_in_minutes=token_response.expires_in_minutes,
    )

    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.get("/oidc/login")
def oidc_login() -> RedirectResponse:
    if not is_oidc_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OIDC SSO is not configured",
        )

    state = create_oidc_state()
    return RedirectResponse(url=build_oidc_authorize_url(state=state), status_code=status.HTTP_302_FOUND)


@router.get("/oidc/callback")
def oidc_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if not is_oidc_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OIDC SSO is not configured",
        )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OIDC error: {error}",
        )

    if not code or not state or not verify_oidc_state(state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OIDC callback",
        )

    try:
        profile = exchange_oidc_code_for_profile(code=code)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    token_response = AuthService(db).login_or_create_google_user(
        email=profile["email"],
        full_name=profile["full_name"],
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    redirect_url = build_oidc_frontend_success_redirect(
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
        expires_in_minutes=token_response.expires_in_minutes,
    )

    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


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

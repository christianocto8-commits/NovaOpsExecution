from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse, Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.modules.identity.audit import record_identity_audit_event
from app.modules.identity.dependencies import bearer_scheme, get_current_active_user, require_permission
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
from app.modules.identity.saml_sso import (
    build_saml_frontend_success_redirect,
    build_saml_login_redirect,
    build_sp_metadata_xml,
    create_saml_state,
    is_saml_configured,
    process_saml_acs,
    verify_saml_state,
)
from app.modules.identity.models import User
from app.modules.identity.repository import RefreshTokenRepository
from app.modules.identity.schemas import LoginDeviceSessionResponse, LoginRequest, OtpVerifyRequest, TokenResponse
from app.modules.identity.security import decode_access_token
from app.modules.identity.service import AuthService
from app.services.webhook_dispatcher import dispatch_webhook_event

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_current_session_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UUID | None:
    if credentials is None:
        return None

    try:
        payload = decode_access_token(credentials.credentials)
        session_id = payload.get("sid")
        return UUID(str(session_id)) if session_id else None
    except Exception:
        return None


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


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(
    payload: OtpVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    return AuthService(db).verify_otp_challenge(
        challenge_id=payload.challenge_id,
        code=payload.code,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )


@router.delete("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    current_user: User = Depends(get_current_active_user),
    current_session_id: UUID | None = Depends(get_current_session_id),
    db: Session = Depends(get_db),
) -> Response:
    if current_session_id:
        refresh_token = RefreshTokenRepository(db).find_active_by_id_for_user(
            session_id=current_session_id,
            user_id=current_user.id,
        )
        if refresh_token:
            RefreshTokenRepository(db).revoke(refresh_token)
            db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@router.get("/saml/metadata")
def saml_metadata() -> Response:
    if not is_saml_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SAML SSO is not configured",
        )

    return Response(content=build_sp_metadata_xml(), media_type="application/samlmetadata+xml")


@router.get("/saml/login")
def saml_login() -> RedirectResponse:
    if not is_saml_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SAML SSO is not configured",
        )

    relay_state = create_saml_state()
    return RedirectResponse(
        url=build_saml_login_redirect(relay_state=relay_state),
        status_code=status.HTTP_302_FOUND,
    )


@router.post("/saml/acs")
async def saml_acs(
    request: Request,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if not is_saml_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SAML SSO is not configured",
        )

    form = await request.form()
    relay_state = str(form.get("RelayState") or "")
    if not relay_state or not verify_saml_state(relay_state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid SAML RelayState",
        )

    try:
        profile = process_saml_acs(
            http_host=request.headers.get("host", "localhost"),
            script_name="/api/v1/auth/saml/acs",
            post_data={key: str(value) for key, value in form.items()},
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    token_response = AuthService(db).login_or_create_google_user(
        email=profile["email"],
        full_name=profile["full_name"],
        role_slug=profile.get("role_slug") or None,
        sync_role_on_login=get_settings().saml_sync_role_on_login,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    redirect_url = build_saml_frontend_success_redirect(
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
        expires_in_minutes=token_response.expires_in_minutes,
    )

    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.get("/devices", response_model=list[LoginDeviceSessionResponse])
def list_login_devices(
    current_user: User = Depends(get_current_active_user),
    current_session_id: UUID | None = Depends(get_current_session_id),
    db: Session = Depends(get_db),
) -> list[LoginDeviceSessionResponse]:
    sessions = RefreshTokenRepository(db).list_active_for_user(current_user.id)

    return [
        LoginDeviceSessionResponse(
            id=session.id,
            user_id=session.user_id,
            user_email=current_user.email,
            user_full_name=current_user.full_name,
            user_role=current_user.role.slug if current_user.role else None,
            device_label=session.device_label or "Unknown device",
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            created_at=session.created_at,
            last_seen_at=session.last_seen_at,
            expires_at=session.expires_at,
            is_current=current_session_id == session.id,
        )
        for session in sessions
    ]


@router.get("/devices/all", response_model=list[LoginDeviceSessionResponse])
def list_all_login_devices(
    current_user: User = Depends(require_permission("user.read")),
    current_session_id: UUID | None = Depends(get_current_session_id),
    db: Session = Depends(get_db),
) -> list[LoginDeviceSessionResponse]:
    sessions = RefreshTokenRepository(db).list_all_active()

    return [
        LoginDeviceSessionResponse(
            id=session.id,
            user_id=session.user_id,
            user_email=session.user.email if session.user else None,
            user_full_name=session.user.full_name if session.user else None,
            user_role=session.user.role.slug if session.user and session.user.role else None,
            device_label=session.device_label or "Unknown device",
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            created_at=session.created_at,
            last_seen_at=session.last_seen_at,
            expires_at=session.expires_at,
            is_current=current_session_id == session.id,
        )
        for session in sessions
    ]


@router.delete("/devices/all/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_any_login_device(
    session_id: UUID,
    current_user: User = Depends(require_permission("user.edit")),
    current_session_id: UUID | None = Depends(get_current_session_id),
    db: Session = Depends(get_db),
) -> Response:
    if current_session_id == session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current device cannot be revoked from this action",
        )

    refresh_token = RefreshTokenRepository(db).find_active_by_id(session_id)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Login device not found")

    RefreshTokenRepository(db).revoke(refresh_token)
    record_identity_audit_event(
        db,
        action="admin_device_revoked",
        resource_type="auth_session",
        actor_user_id=current_user.id,
        organization_id=current_user.outlet.organization_id if current_user.outlet else None,
        outlet_id=current_user.outlet_id,
        resource_id=str(refresh_token.id),
        metadata={
            "device_label": refresh_token.device_label,
            "ip_address": refresh_token.ip_address,
            "revoked_user_id": str(refresh_token.user_id),
            "revoked_user_email": refresh_token.user.email if refresh_token.user else None,
        },
    )
    try:
        dispatch_webhook_event(
            db,
            event_type="security.admin_device_revoked",
            payload={
                "session_id": str(refresh_token.id),
                "revoked_user_id": str(refresh_token.user_id),
                "revoked_user_email": refresh_token.user.email if refresh_token.user else None,
                "device_label": refresh_token.device_label,
                "ip_address": refresh_token.ip_address,
            },
        )
    except Exception:
        pass
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/devices/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_login_device(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    current_session_id: UUID | None = Depends(get_current_session_id),
    db: Session = Depends(get_db),
) -> Response:
    if current_session_id == session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current device cannot be revoked from this action",
        )

    refresh_token = RefreshTokenRepository(db).find_active_by_id_for_user(
        session_id=session_id,
        user_id=current_user.id,
    )
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Login device not found")

    RefreshTokenRepository(db).revoke(refresh_token)
    record_identity_audit_event(
        db,
        action="device_revoked",
        resource_type="auth_session",
        actor_user_id=current_user.id,
        organization_id=current_user.outlet.organization_id if current_user.outlet else None,
        outlet_id=current_user.outlet_id,
        resource_id=str(refresh_token.id),
        metadata={
            "device_label": refresh_token.device_label,
            "ip_address": refresh_token.ip_address,
            "revoked_user_id": str(refresh_token.user_id),
        },
    )
    try:
        dispatch_webhook_event(
            db,
            event_type="security.device_revoked",
            payload={
                "session_id": str(refresh_token.id),
                "revoked_user_id": str(refresh_token.user_id),
                "device_label": refresh_token.device_label,
                "ip_address": refresh_token.ip_address,
            },
        )
    except Exception:
        pass
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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

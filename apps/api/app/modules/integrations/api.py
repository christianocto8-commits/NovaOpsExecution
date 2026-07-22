from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.modules.identity.dependencies import require_role
from app.modules.identity.google_oauth import is_google_oauth_configured
from app.modules.identity.models import User as IdentityUser
from app.modules.identity.oidc_oauth import is_oidc_configured
from app.modules.identity.saml_sso import is_saml_configured
from app.modules.integrations.fcm import is_fcm_configured
from app.services.sms_service import is_sms_configured
from app.services.workspace_settings import get_workspace_settings
from app.core.database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("/status")
def integrations_status(
    db: Session = Depends(get_db),
    current_user: IdentityUser = Depends(require_role("owner", "admin")),
):
    del current_user
    settings = get_settings()
    workspace = get_workspace_settings(db)

    return {
        "google_oauth": {
            "configured": is_google_oauth_configured(),
            "enabled_on_login": True,
        },
        "oidc_sso": {
            "configured": is_oidc_configured(),
            "issuer": settings.oidc_issuer_url or None,
        },
        "saml_sso": {
            "configured": is_saml_configured(),
            "entity_id": settings.saml_sp_entity_id or None,
        },
        "sms_twilio": {
            "configured": is_sms_configured(),
            "enabled": workspace.sms_notifications,
        },
        "web_push_vapid": {
            "configured": bool(settings.vapid_public_key and settings.vapid_private_key),
        },
        "webhooks": {
            "enabled": workspace.webhook_enabled,
        },
        "native_push": {
            "capacitor_android": True,
            "fcm_configured": is_fcm_configured(),
        },
        "video_evidence": {
            "enabled": True,
            "formats": ["video/mp4", "video/webm", "video/quicktime"],
        },
    }

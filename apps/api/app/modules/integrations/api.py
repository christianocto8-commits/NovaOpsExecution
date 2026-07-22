from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.core.database import get_db
from app.modules.identity.dependencies import require_role
from app.modules.identity.google_oauth import is_google_oauth_configured
from app.modules.identity.models import User as IdentityUser
from app.modules.identity.oidc_oauth import is_oidc_configured
from app.modules.identity.saml_sso import get_saml_setup_steps, is_saml_configured, is_saml_live_ready
from app.modules.integrations.fcm import (
    get_fcm_setup_steps,
    is_fcm_client_configured,
    is_fcm_send_ready,
)
from app.modules.integrations.setup_helpers import (
    get_google_oauth_setup_steps,
    get_oidc_setup_steps,
    get_twilio_setup_steps,
    get_vapid_setup_steps,
)
from app.services.sms_service import is_sms_configured
from app.services.workspace_settings import get_workspace_settings
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

    oidc_configured = is_oidc_configured()
    saml_configured = is_saml_configured()
    sms_configured = is_sms_configured()
    vapid_configured = bool(settings.vapid_public_key and settings.vapid_private_key)

    return {
        "google_oauth": {
            "configured": is_google_oauth_configured(),
            "enabled_on_login": True,
            "live_ready": is_google_oauth_configured(),
            "setup_steps": get_google_oauth_setup_steps(),
        },
        "oidc_sso": {
            "configured": oidc_configured,
            "issuer": settings.oidc_issuer_url or None,
            "live_ready": oidc_configured,
            "setup_steps": get_oidc_setup_steps(),
        },
        "saml_sso": {
            "configured": saml_configured,
            "entity_id": settings.saml_sp_entity_id or None,
            "live_ready": is_saml_live_ready(),
            "setup_steps": get_saml_setup_steps() if not is_saml_live_ready() else [],
        },
        "sms_twilio": {
            "configured": sms_configured,
            "enabled": workspace.sms_notifications,
            "live_ready": sms_configured and workspace.sms_notifications,
            "setup_steps": get_twilio_setup_steps(sms_enabled=workspace.sms_notifications)
            if not (sms_configured and workspace.sms_notifications)
            else [],
        },
        "web_push_vapid": {
            "configured": vapid_configured,
            "live_ready": vapid_configured,
            "setup_steps": get_vapid_setup_steps(),
        },
        "webhooks": {
            "enabled": workspace.webhook_enabled,
            "live_ready": workspace.webhook_enabled,
            "setup_steps": [] if workspace.webhook_enabled else ["Enable webhook delivery in Settings"],
        },
        "native_push": {
            "capacitor_android": True,
            "fcm_configured": is_fcm_client_configured(),
            "fcm_send_ready": is_fcm_send_ready(),
            "setup_steps": get_fcm_setup_steps() if not is_fcm_send_ready() else [],
        },
        "video_evidence": {
            "enabled": True,
            "formats": ["video/mp4", "video/webm", "video/quicktime"],
            "live_ready": True,
            "setup_steps": [],
        },
        "iot_sensors": {
            "enabled": False,
            "live_ready": False,
            "setup_steps": ["See docs/IOT_LMS_ROADMAP.md — not yet implemented"],
        },
        "lms_training": {
            "enabled": False,
            "live_ready": False,
            "setup_steps": ["See docs/IOT_LMS_ROADMAP.md — not yet implemented"],
        },
    }

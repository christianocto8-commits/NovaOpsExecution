from __future__ import annotations

from app.core.config import get_settings
from app.modules.identity.google_oauth import is_google_oauth_configured
from app.modules.identity.oidc_oauth import is_oidc_configured
from app.modules.identity.saml_sso import get_saml_setup_steps, is_saml_configured, is_saml_live_ready
from app.modules.integrations.fcm import (
    get_fcm_setup_steps,
    is_fcm_client_configured,
    is_fcm_send_configured,
    is_fcm_send_ready,
)
from app.services.sms_service import is_sms_configured


def get_oidc_setup_steps() -> list[str]:
    steps: list[str] = []
    if not is_oidc_configured():
        steps.extend(
            [
                "Set OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI",
                "Set NEXT_PUBLIC_OIDC_SSO_ENABLED=true in web env",
            ]
        )
    return steps


def get_twilio_setup_steps(*, sms_enabled: bool) -> list[str]:
    steps: list[str] = []
    if not is_sms_configured():
        steps.append("Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER")
    if not sms_enabled:
        steps.append("Enable SMS notifications toggle in Settings")
    steps.append("Ensure user phone numbers are filled in identity profile")
    return steps


def get_vapid_setup_steps() -> list[str]:
    settings = get_settings()
    steps: list[str] = []
    if not settings.vapid_public_key or not settings.vapid_private_key:
        steps.append("Generate VAPID keys and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY")
        steps.append("Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in web env")
    return steps


def get_google_oauth_setup_steps() -> list[str]:
    if is_google_oauth_configured():
        return []
    return [
        "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI",
        "Set NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true in web env",
    ]

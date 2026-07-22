from __future__ import annotations

import secrets
from datetime import timedelta
from functools import lru_cache
from typing import Any
from urllib.parse import urlencode

from app.core.config import get_settings
from app.modules.identity.security import create_access_token, decode_access_token


def is_saml_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.saml_sp_entity_id
        and settings.saml_sp_acs_url
        and settings.saml_idp_entity_id
        and settings.saml_idp_sso_url
    )


def create_saml_state() -> str:
    return create_access_token(
        subject="saml-sso",
        expires_delta=timedelta(minutes=10),
        extra_claims={"purpose": "saml_sso", "nonce": secrets.token_urlsafe(8)},
    )


def verify_saml_state(state: str) -> bool:
    try:
        payload = decode_access_token(state)
    except ValueError:
        return False

    return payload.get("purpose") == "saml_sso"


def build_sp_metadata_xml() -> str:
    settings = get_settings()
    if not is_saml_configured():
        raise RuntimeError("SAML is not configured")

    entity_id = settings.saml_sp_entity_id
    acs_url = settings.saml_sp_acs_url

    return f"""<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="{entity_id}">
  <SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="{acs_url}"
      index="1" />
  </SPSSODescriptor>
</EntityDescriptor>"""


def build_saml_login_redirect(*, relay_state: str) -> str:
    settings = get_settings()
    if not is_saml_configured():
        raise RuntimeError("SAML is not configured")

    params = {"RelayState": relay_state}
    separator = "&" if "?" in settings.saml_idp_sso_url else "?"
    return f"{settings.saml_idp_sso_url}{separator}{urlencode(params)}"


def build_saml_frontend_success_redirect(
    *,
    access_token: str,
    refresh_token: str,
    expires_in_minutes: int,
) -> str:
    settings = get_settings()
    frontend_success_url = settings.saml_frontend_success_url
    if not frontend_success_url:
        frontend_success_url = f"{settings.cors_origins[0]}/login/oauth-callback"

    params = urlencode(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in_minutes": str(expires_in_minutes),
        }
    )
    return f"{frontend_success_url.rstrip('/')}?{params}"


@lru_cache(maxsize=1)
def _saml_settings_dict() -> dict[str, Any]:
    settings = get_settings()
    return {
        "strict": True,
        "debug": settings.environment in {"local", "development", "dev"},
        "sp": {
            "entityId": settings.saml_sp_entity_id,
            "assertionConsumerService": {
                "url": settings.saml_sp_acs_url,
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
            },
        },
        "idp": {
            "entityId": settings.saml_idp_entity_id,
            "singleSignOnService": {
                "url": settings.saml_idp_sso_url,
                "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
            },
        },
        "security": {
            "wantAssertionsSigned": True,
            "wantMessagesSigned": False,
        },
    }


def _prepare_flask_request(http_host: str, script_name: str, post_data: dict, get_data: dict) -> dict:
    return {
        "https": "off",
        "http_host": http_host,
        "script_name": script_name,
        "get_data": get_data,
        "post_data": post_data,
    }


def process_saml_acs(*, http_host: str, script_name: str, post_data: dict) -> dict[str, str]:
    if not is_saml_configured():
        raise RuntimeError("SAML is not configured")

    try:
        from onelogin.saml2.auth import OneLogin_Saml2_Auth
    except ImportError as exc:
        raise RuntimeError(
            "python3-saml is required for SAML ACS. Install with: pip install python3-saml"
        ) from exc

    request_data = _prepare_flask_request(http_host, script_name, post_data, {})
    auth = OneLogin_Saml2_Auth(request_data, _saml_settings_dict())
    auth.process_response()

    if not auth.is_authenticated():
        errors = auth.get_errors()
        raise RuntimeError(f"SAML authentication failed: {', '.join(errors) or 'unknown error'}")

    attributes = auth.get_attributes()
    email = (
        (attributes.get("email") or attributes.get("mail") or [None])[0]
        or auth.get_nameid()
        or ""
    ).strip().lower()

    if not email:
        raise RuntimeError("SAML assertion missing email attribute")

    full_name = (
        (attributes.get("displayName") or attributes.get("name") or [None])[0]
        or email.split("@", 1)[0]
    ).strip()

    return {"email": email, "full_name": full_name}


__all__ = [
    "build_saml_frontend_success_redirect",
    "build_saml_login_redirect",
    "build_sp_metadata_xml",
    "is_saml_configured",
]

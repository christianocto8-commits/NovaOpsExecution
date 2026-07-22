from __future__ import annotations

import json
import secrets
import shutil
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import timedelta
from functools import lru_cache
from typing import Any
from urllib.parse import urlencode

from app.core.config import get_settings
from app.modules.identity.security import create_access_token, decode_access_token

SAML_NS = {"md": "urn:oasis:names:tc:SAML:2.0:metadata", "ds": "http://www.w3.org/2000/09/xmldsig#"}


def is_saml_configured() -> bool:
    settings = get_settings()
    return bool(
        settings.saml_sp_entity_id
        and settings.saml_sp_acs_url
        and settings.saml_idp_entity_id
        and settings.saml_idp_sso_url
    )


def is_xmlsec_available() -> bool:
    return shutil.which("xmlsec1") is not None


def is_python3_saml_available() -> bool:
    try:
        import onelogin.saml2.auth  # noqa: F401

        return True
    except ImportError:
        return False


def resolve_idp_x509_cert() -> str | None:
    settings = get_settings()
    if settings.saml_idp_x509_cert:
        return settings.saml_idp_x509_cert.replace("\\n", "\n").strip()

    metadata = _load_idp_metadata()
    return metadata.get("x509_cert") if metadata else None


def is_saml_live_ready() -> bool:
    return (
        is_saml_configured()
        and bool(resolve_idp_x509_cert())
        and is_python3_saml_available()
        and is_xmlsec_available()
    )


@lru_cache(maxsize=4)
def _fetch_metadata_xml(metadata_url: str) -> str:
    request = urllib.request.Request(metadata_url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"SAML IdP metadata fetch failed: {detail}") from exc


def _parse_idp_metadata(xml_text: str) -> dict[str, str]:
    root = ET.fromstring(xml_text)
    entity_id = root.attrib.get("entityID", "")

    sso_url = ""
    for descriptor in root.findall("md:IDPSSODescriptor", SAML_NS):
        for sso in descriptor.findall("md:SingleSignOnService", SAML_NS):
            if "HTTP-Redirect" in sso.attrib.get("Binding", ""):
                sso_url = sso.attrib.get("Location", "")
                break
        if sso_url:
            break

    x509_cert = ""
    cert_node = root.find(".//md:IDPSSODescriptor/md:KeyDescriptor[@use='signing']/ds:KeyInfo/ds:X509Data/ds:X509Certificate", SAML_NS)
    if cert_node is None:
        cert_node = root.find(".//ds:X509Certificate", SAML_NS)
    if cert_node is not None and cert_node.text:
        x509_cert = (
            "-----BEGIN CERTIFICATE-----\n"
            + cert_node.text.strip()
            + "\n-----END CERTIFICATE-----"
        )

    return {
        "entity_id": entity_id,
        "sso_url": sso_url,
        "x509_cert": x509_cert,
    }


def _load_idp_metadata() -> dict[str, str] | None:
    settings = get_settings()
    if not settings.saml_idp_metadata_url:
        return None

    try:
        return _parse_idp_metadata(_fetch_metadata_xml(settings.saml_idp_metadata_url))
    except (RuntimeError, ET.ParseError):
        return None


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

    sso_url = settings.saml_idp_sso_url or ""
    metadata = _load_idp_metadata()
    if metadata and metadata.get("sso_url"):
        sso_url = metadata["sso_url"]

    params = {"RelayState": relay_state}
    separator = "&" if "?" in sso_url else "?"
    return f"{sso_url}{separator}{urlencode(params)}"


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


def _saml_settings_dict() -> dict[str, Any]:
    settings = get_settings()
    idp_cert = resolve_idp_x509_cert()

    idp_config: dict[str, Any] = {
        "entityId": settings.saml_idp_entity_id,
        "singleSignOnService": {
            "url": settings.saml_idp_sso_url,
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
        },
    }

    if idp_cert:
        idp_config["x509cert"] = idp_cert

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
        "idp": idp_config,
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

    if not resolve_idp_x509_cert():
        raise RuntimeError(
            "SAML IdP x509 certificate missing. Set SAML_IDP_X509_CERT or SAML_IDP_METADATA_URL."
        )

    try:
        from onelogin.saml2.auth import OneLogin_Saml2_Auth
    except ImportError as exc:
        raise RuntimeError(
            "python3-saml is required for SAML ACS. Install with: pip install python3-saml"
        ) from exc

    if not is_xmlsec_available():
        raise RuntimeError(
            "xmlsec1 is required for SAML ACS. Install on Linux: apt-get install xmlsec1"
        )

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


def get_saml_setup_steps() -> list[str]:
    steps: list[str] = []
    if not is_saml_configured():
        steps.append("Set SAML_SP_ENTITY_ID, SAML_SP_ACS_URL, SAML_IDP_ENTITY_ID, SAML_IDP_SSO_URL")
    if not resolve_idp_x509_cert():
        steps.append("Set SAML_IDP_METADATA_URL or SAML_IDP_X509_CERT")
    if not is_python3_saml_available():
        steps.append("pip install python3-saml")
    if not is_xmlsec_available():
        steps.append("Install xmlsec1 on server (apt-get install xmlsec1)")
    steps.append("Set NEXT_PUBLIC_SAML_SSO_ENABLED=true in web env")
    return steps


__all__ = [
    "build_saml_frontend_success_redirect",
    "build_saml_login_redirect",
    "build_sp_metadata_xml",
    "get_saml_setup_steps",
    "is_saml_configured",
    "is_saml_live_ready",
    "resolve_idp_x509_cert",
]

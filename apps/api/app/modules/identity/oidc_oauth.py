from __future__ import annotations

import json
import secrets
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from functools import lru_cache

from app.core.config import get_settings
from app.modules.identity.security import create_access_token, decode_access_token


@dataclass(frozen=True)
class OidcSettings:
    issuer_url: str
    client_id: str
    client_secret: str
    redirect_uri: str
    frontend_success_url: str
    authorization_endpoint: str
    token_endpoint: str
    userinfo_endpoint: str


def is_oidc_configured() -> bool:
    try:
        return get_oidc_settings() is not None
    except RuntimeError:
        return False


@lru_cache(maxsize=4)
def _fetch_oidc_discovery(issuer_url: str) -> dict:
    normalized = issuer_url.rstrip("/")
    discovery_url = f"{normalized}/.well-known/openid-configuration"

    request = urllib.request.Request(discovery_url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OIDC discovery failed: {detail}") from exc


def get_oidc_settings() -> OidcSettings | None:
    settings = get_settings()

    if not all(
        [
            settings.oidc_issuer_url,
            settings.oidc_client_id,
            settings.oidc_client_secret,
            settings.oidc_redirect_uri,
        ]
    ):
        return None

    discovery = _fetch_oidc_discovery(settings.oidc_issuer_url)
    authorization_endpoint = discovery.get("authorization_endpoint")
    token_endpoint = discovery.get("token_endpoint")
    userinfo_endpoint = discovery.get("userinfo_endpoint")

    if not authorization_endpoint or not token_endpoint:
        raise RuntimeError("OIDC discovery missing authorization or token endpoint")

    frontend_success_url = settings.oidc_frontend_success_url
    if not frontend_success_url:
        frontend_success_url = f"{settings.cors_origins[0]}/login/oauth-callback"

    return OidcSettings(
        issuer_url=settings.oidc_issuer_url.rstrip("/"),
        client_id=settings.oidc_client_id,
        client_secret=settings.oidc_client_secret,
        redirect_uri=settings.oidc_redirect_uri.rstrip("/"),
        frontend_success_url=frontend_success_url.rstrip("/"),
        authorization_endpoint=authorization_endpoint,
        token_endpoint=token_endpoint,
        userinfo_endpoint=userinfo_endpoint or "",
    )


def create_oidc_state() -> str:
    return create_access_token(
        subject="oidc-oauth",
        expires_delta=timedelta(minutes=10),
        extra_claims={"purpose": "oidc_oauth", "nonce": secrets.token_urlsafe(8)},
    )


def verify_oidc_state(state: str) -> bool:
    try:
        payload = decode_access_token(state)
    except ValueError:
        return False

    return payload.get("purpose") == "oidc_oauth"


def build_oidc_authorize_url(*, state: str) -> str:
    oidc = get_oidc_settings()
    if not oidc:
        raise RuntimeError("OIDC is not configured")

    params = {
        "client_id": oidc.client_id,
        "redirect_uri": oidc.redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
    }

    return f"{oidc.authorization_endpoint}?{urllib.parse.urlencode(params)}"


def _post_form(url: str, data: dict[str, str]) -> dict:
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OIDC token exchange failed: {detail}") from exc


def _get_json(url: str, *, access_token: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OIDC userinfo failed: {detail}") from exc


def _decode_id_token_email(id_token: str) -> dict[str, str]:
    parts = id_token.split(".")
    if len(parts) < 2:
        return {}

    payload_segment = parts[1]
    padding = "=" * ((4 - len(payload_segment) % 4) % 4)
    decoded = json.loads(
        __import__("base64").urlsafe_b64decode(payload_segment + padding).decode("utf-8")
    )

    email = (decoded.get("email") or "").strip().lower()
    name = (decoded.get("name") or decoded.get("preferred_username") or email.split("@", 1)[0]).strip()

    return {
        "email": email,
        "full_name": name,
        "picture": decoded.get("picture") or "",
        "oidc_sub": decoded.get("sub") or "",
        "fetched_at": datetime.now(UTC).isoformat(),
    }


def exchange_oidc_code_for_profile(*, code: str) -> dict[str, str]:
    oidc = get_oidc_settings()
    if not oidc:
        raise RuntimeError("OIDC is not configured")

    token_payload = _post_form(
        oidc.token_endpoint,
        {
            "code": code,
            "client_id": oidc.client_id,
            "client_secret": oidc.client_secret,
            "redirect_uri": oidc.redirect_uri,
            "grant_type": "authorization_code",
        },
    )

    access_token = token_payload.get("access_token")
    id_token = token_payload.get("id_token")

    profile: dict[str, str] = {}
    if id_token:
        profile = _decode_id_token_email(id_token)

    if not profile.get("email") and access_token and oidc.userinfo_endpoint:
        userinfo = _get_json(oidc.userinfo_endpoint, access_token=access_token)
        email = (userinfo.get("email") or "").strip().lower()
        profile = {
            "email": email,
            "full_name": (userinfo.get("name") or email.split("@", 1)[0]).strip(),
            "picture": userinfo.get("picture") or "",
            "oidc_sub": userinfo.get("sub") or "",
            "fetched_at": datetime.now(UTC).isoformat(),
        }

    if not profile.get("email"):
        raise RuntimeError("OIDC profile missing email")

    return profile


def build_oidc_frontend_success_redirect(
    *,
    access_token: str,
    refresh_token: str,
    expires_in_minutes: int,
) -> str:
    oidc = get_oidc_settings()
    if not oidc:
        raise RuntimeError("OIDC is not configured")

    params = urllib.parse.urlencode(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in_minutes": str(expires_in_minutes),
        }
    )

    return f"{oidc.frontend_success_url}?{params}"


__all__ = [
    "build_oidc_frontend_success_redirect",
    "is_oidc_configured",
]

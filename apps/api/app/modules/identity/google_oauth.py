from __future__ import annotations

import json
import secrets
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from app.core.config import get_settings
from app.modules.identity.security import create_access_token, decode_access_token


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_OAUTH_SCOPES = "openid email profile"


@dataclass(frozen=True)
class GoogleOAuthSettings:
    client_id: str
    client_secret: str
    redirect_uri: str
    frontend_success_url: str


def is_google_oauth_configured() -> bool:
    return get_google_oauth_settings() is not None


def get_google_oauth_settings() -> GoogleOAuthSettings | None:
    settings = get_settings()

    if not all(
        [
            settings.google_client_id,
            settings.google_client_secret,
            settings.google_redirect_uri,
        ]
    ):
        return None

    frontend_success_url = settings.google_frontend_success_url
    if not frontend_success_url:
        frontend_success_url = f"{settings.cors_origins[0]}/login/oauth-callback"

    return GoogleOAuthSettings(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        redirect_uri=settings.google_redirect_uri.rstrip("/"),
        frontend_success_url=frontend_success_url.rstrip("/"),
    )


def create_oauth_state() -> str:
    return create_access_token(
        subject="google-oauth",
        expires_delta=timedelta(minutes=10),
        extra_claims={"purpose": "google_oauth", "nonce": secrets.token_urlsafe(8)},
    )


def verify_oauth_state(state: str) -> bool:
    try:
        payload = decode_access_token(state)
    except ValueError:
        return False

    return payload.get("purpose") == "google_oauth"


def build_google_authorize_url(*, state: str) -> str:
    oauth = get_google_oauth_settings()
    if not oauth:
        raise RuntimeError("Google OAuth is not configured")

    params = {
        "client_id": oauth.client_id,
        "redirect_uri": oauth.redirect_uri,
        "response_type": "code",
        "scope": GOOGLE_OAUTH_SCOPES,
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }

    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


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
        raise RuntimeError(f"Google token exchange failed: {detail}") from exc


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
        raise RuntimeError(f"Google userinfo failed: {detail}") from exc


def exchange_code_for_profile(*, code: str) -> dict[str, str]:
    oauth = get_google_oauth_settings()
    if not oauth:
        raise RuntimeError("Google OAuth is not configured")

    token_payload = _post_form(
        GOOGLE_TOKEN_URL,
        {
            "code": code,
            "client_id": oauth.client_id,
            "client_secret": oauth.client_secret,
            "redirect_uri": oauth.redirect_uri,
            "grant_type": "authorization_code",
        },
    )

    access_token = token_payload.get("access_token")
    if not access_token:
        raise RuntimeError("Google token response missing access_token")

    profile = _get_json(GOOGLE_USERINFO_URL, access_token=access_token)
    email = (profile.get("email") or "").strip().lower()

    if not email:
        raise RuntimeError("Google profile missing email")

    if profile.get("email_verified") is False:
        raise RuntimeError("Google email is not verified")

    return {
        "email": email,
        "full_name": (profile.get("name") or email.split("@", 1)[0]).strip(),
        "picture": profile.get("picture") or "",
        "google_sub": profile.get("sub") or "",
        "fetched_at": datetime.now(UTC).isoformat(),
    }


def build_frontend_success_redirect(
    *,
    access_token: str,
    refresh_token: str,
    expires_in_minutes: int,
) -> str:
    oauth = get_google_oauth_settings()
    if not oauth:
        raise RuntimeError("Google OAuth is not configured")

    params = urllib.parse.urlencode(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in_minutes": str(expires_in_minutes),
        }
    )

    return f"{oauth.frontend_success_url}?{params}"

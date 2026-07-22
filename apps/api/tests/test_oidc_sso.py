"""Tests for enterprise OIDC SSO configuration."""

from app.modules.identity.oidc_oauth import (
    create_oidc_state,
    is_oidc_configured,
    verify_oidc_state,
)


def test_oidc_not_configured_by_default(monkeypatch):
    monkeypatch.delenv("OIDC_ISSUER_URL", raising=False)
    monkeypatch.delenv("OIDC_CLIENT_ID", raising=False)
    monkeypatch.delenv("OIDC_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("OIDC_REDIRECT_URI", raising=False)

    from app.core.config import get_settings

    get_settings.cache_clear()
    assert is_oidc_configured() is False
    get_settings.cache_clear()


def test_oidc_state_token_roundtrip():
    state = create_oidc_state()
    assert verify_oidc_state(state) is True
    assert verify_oidc_state("invalid-token") is False

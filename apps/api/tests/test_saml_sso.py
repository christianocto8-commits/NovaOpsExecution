"""Tests for enterprise SAML SSO configuration."""

from app.modules.identity.saml_sso import (
    build_sp_metadata_xml,
    create_saml_state,
    is_saml_configured,
    resolve_saml_role_slug,
    verify_saml_state,
)


def test_saml_not_configured_by_default(monkeypatch):
    monkeypatch.delenv("SAML_SP_ENTITY_ID", raising=False)
    monkeypatch.delenv("SAML_SP_ACS_URL", raising=False)
    monkeypatch.delenv("SAML_IDP_ENTITY_ID", raising=False)
    monkeypatch.delenv("SAML_IDP_SSO_URL", raising=False)

    from app.core.config import get_settings

    get_settings.cache_clear()
    assert is_saml_configured() is False
    get_settings.cache_clear()


def test_saml_state_token_roundtrip():
    state = create_saml_state()
    assert verify_saml_state(state) is True
    assert verify_saml_state("invalid-token") is False


def test_saml_metadata_xml_when_configured(monkeypatch):
    monkeypatch.setenv("SAML_SP_ENTITY_ID", "https://api.test/saml/metadata")
    monkeypatch.setenv("SAML_SP_ACS_URL", "https://api.test/saml/acs")
    monkeypatch.setenv("SAML_IDP_ENTITY_ID", "https://idp.test")
    monkeypatch.setenv("SAML_IDP_SSO_URL", "https://idp.test/sso")

    from app.core.config import get_settings

    get_settings.cache_clear()
    xml = build_sp_metadata_xml()
    assert "https://api.test/saml/metadata" in xml
    assert "https://api.test/saml/acs" in xml
    get_settings.cache_clear()


def test_saml_metadata_endpoint_requires_config(client):
    response = client.get("/api/v1/auth/saml/metadata")
    assert response.status_code == 503


def test_saml_default_role_mapping_from_groups(monkeypatch):
    monkeypatch.delenv("SAML_ROLE_ATTRIBUTE", raising=False)
    monkeypatch.delenv("SAML_ROLE_MAPPING_JSON", raising=False)

    from app.core.config import get_settings

    get_settings.cache_clear()
    role_slug = resolve_saml_role_slug({"groups": ["Area Manager"]})
    assert role_slug == "area_manager"
    get_settings.cache_clear()


def test_saml_custom_role_mapping_json(monkeypatch):
    monkeypatch.setenv("SAML_ROLE_ATTRIBUTE", "department")
    monkeypatch.setenv(
        "SAML_ROLE_MAPPING_JSON",
        '{"Field Ops Admin":"admin","District Lead":"area_manager","Store Crew":"outlet"}',
    )

    from app.core.config import get_settings

    get_settings.cache_clear()
    role_slug = resolve_saml_role_slug({"department": ["District Lead"]})
    assert role_slug == "area_manager"
    get_settings.cache_clear()

"""FCM send path and SAML metadata parsing."""

from app.modules.identity.saml_sso import _parse_idp_metadata, resolve_idp_x509_cert
from app.modules.integrations.fcm import is_fcm_send_configured, send_fcm_to_tokens


SAMPLE_IDP_METADATA = """<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
  entityID="https://idp.example.com">
  <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIICertDataHere</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>
    <SingleSignOnService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="https://idp.example.com/sso" />
  </IDPSSODescriptor>
</EntityDescriptor>"""


def test_parse_idp_metadata_extracts_sso_and_cert():
    parsed = _parse_idp_metadata(SAMPLE_IDP_METADATA)
    assert parsed["entity_id"] == "https://idp.example.com"
    assert parsed["sso_url"] == "https://idp.example.com/sso"
    assert "BEGIN CERTIFICATE" in parsed["x509_cert"]


def test_fcm_send_not_configured_by_default():
    assert is_fcm_send_configured() is False


def test_fcm_send_without_firebase_admin(monkeypatch):
    monkeypatch.setenv("FIREBASE_CREDENTIALS_JSON", '{"type":"service_account","project_id":"demo"}')

    from app.core.config import get_settings

    get_settings.cache_clear()
    assert is_fcm_send_configured() is True

    result = send_fcm_to_tokens(["token-a"], title="Test", body="Body")
    assert result["attempted"] == 1
    get_settings.cache_clear()


def test_resolve_idp_cert_from_env(monkeypatch):
    monkeypatch.setenv("SAML_IDP_X509_CERT", "-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----")

    from app.core.config import get_settings

    get_settings.cache_clear()
    cert = resolve_idp_x509_cert()
    assert cert is not None
    assert "BEGIN CERTIFICATE" in cert
    get_settings.cache_clear()


def test_iot_ingest_key_loaded_from_env(monkeypatch):
    monkeypatch.setenv("IOT_INGEST_API_KEY", "iot-secret")

    from app.core.config import get_settings

    get_settings.cache_clear()
    assert get_settings().iot_ingest_api_key == "iot-secret"
    get_settings.cache_clear()

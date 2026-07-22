# SAML Enterprise SSO — Setup Guide

## Prerequisites

- `python3-saml` installed (`pip install python3-saml`)
- **xmlsec1** on the server (required for signature validation)

### Install xmlsec

**Ubuntu/Debian (VPS):**
```bash
sudo apt-get update && sudo apt-get install -y xmlsec1 libxmlsec1-openssl
```

**Windows (local dev):**
SAML ACS validation is limited on Windows. Use OIDC for local testing; deploy SAML ACS on Linux VPS.

## Environment

**API** (`apps/api/.env`):

```env
SAML_SP_ENTITY_ID=https://api.yourdomain.com/api/v1/auth/saml/metadata
SAML_SP_ACS_URL=https://api.yourdomain.com/api/v1/auth/saml/acs
SAML_IDP_ENTITY_ID=https://sts.windows.net/<tenant-id>/
SAML_IDP_SSO_URL=https://login.microsoftonline.com/<tenant-id>/saml2
SAML_IDP_METADATA_URL=https://login.microsoftonline.com/<tenant-id>/federationmetadata/2007-06/federationmetadata.xml
SAML_FRONTEND_SUCCESS_URL=https://yourdomain.com/login/oauth-callback
```

**Web** (`apps/web/.env.local`):

```env
NEXT_PUBLIC_SAML_SSO_ENABLED=true
```

## IdP configuration

1. Fetch SP metadata: `GET /api/v1/auth/saml/metadata`
2. Register in Okta / Azure AD / OneLogin
3. Map attributes: `email`, `displayName`
4. ACS URL must match `SAML_SP_ACS_URL`

## Verify

Settings → Integration Readiness → SAML SSO, or `GET /api/v1/integrations/status`.

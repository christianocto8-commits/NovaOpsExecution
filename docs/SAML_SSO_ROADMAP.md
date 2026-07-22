# SAML Enterprise SSO — Implementation Status

**Status:** SP metadata + login/ACS scaffold implemented (Jul 2026). Full IdP certificate validation requires `python3-saml` + xmlsec on the server.

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/auth/saml/metadata` | SP metadata XML for IdP configuration |
| `GET /api/v1/auth/saml/login` | SP-initiated login redirect |
| `POST /api/v1/auth/saml/acs` | Assertion Consumer Service |

## Environment

**API** (`apps/api/.env`):

```env
SAML_SP_ENTITY_ID=http://localhost:8000/api/v1/auth/saml/metadata
SAML_SP_ACS_URL=http://localhost:8000/api/v1/auth/saml/acs
SAML_IDP_ENTITY_ID=https://idp.example.com
SAML_IDP_SSO_URL=https://idp.example.com/sso
SAML_FRONTEND_SUCCESS_URL=http://localhost:3000/login/oauth-callback
```

**Web** (`apps/web/.env.local`):

```env
NEXT_PUBLIC_SAML_SSO_ENABLED=true
```

## Remaining work

1. IdP metadata import for certificate rotation
2. Signed AuthnRequest support
3. Single Logout (SLO)
4. Role mapping from SAML attributes

## Alternative

Use **OIDC** for Okta / Azure AD / Keycloak — see [OIDC_SSO_SETUP.md](./OIDC_SSO_SETUP.md).

## Tests

```powershell
python -m pytest tests/test_saml_sso.py -v
```

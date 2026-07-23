# SAML Enterprise SSO — Implementation Status

**Status:** SP metadata + login/ACS scaffold + IdP metadata certificate import + role mapping implemented (Jul 2026). Full ACS validation requires `python3-saml` + xmlsec on the server.

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
SAML_ROLE_ATTRIBUTE=role
SAML_ROLE_MAPPING_JSON={"Owner Admin":"owner","Area Manager":"area_manager","Outlet Crew":"outlet"}
SAML_SYNC_ROLE_ON_LOGIN=false
```

**Web** (`apps/web/.env.local`):

```env
NEXT_PUBLIC_SAML_SSO_ENABLED=true
```

## Remaining work

1. Signed AuthnRequest support
2. Single Logout (SLO)
3. IdP-specific UAT with Azure AD / Okta

## Alternative

Use **OIDC** for Okta / Azure AD / Keycloak — see [OIDC_SSO_SETUP.md](./OIDC_SSO_SETUP.md).

## Tests

```powershell
python -m pytest tests/test_saml_sso.py -v
```

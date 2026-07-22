# OIDC Enterprise SSO (Okta / Azure AD / Keycloak)

NovaOps supports generic **OpenID Connect** providers — compatible with Okta, Azure AD, Auth0, and Keycloak.

## 1. Register application at IdP

**Redirect URI (callback):**

```
http://localhost:8000/api/v1/auth/oidc/callback
```

Production: `https://<your-api-host>/api/v1/auth/oidc/callback`

**Scopes:** `openid email profile`

## 2. API environment (`apps/api/.env`)

```env
OIDC_ISSUER_URL=https://dev-xxxxx.okta.com/oauth2/default
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>
OIDC_REDIRECT_URI=http://localhost:8000/api/v1/auth/oidc/callback
OIDC_FRONTEND_SUCCESS_URL=http://localhost:3000/login/oauth-callback
```

### Azure AD example

```env
OIDC_ISSUER_URL=https://login.microsoftonline.com/<tenant-id>/v2.0
```

### Okta example

```env
OIDC_ISSUER_URL=https://dev-xxxxx.okta.com/oauth2/default
```

## 3. Web environment (`apps/web/.env.local`)

```env
NEXT_PUBLIC_OIDC_SSO_ENABLED=true
NEXT_PUBLIC_OIDC_SSO_LABEL=Sign in with Company SSO
```

## 4. Restart stack

```powershell
.\novaops.ps1 stop
.\novaops.ps1 dev
```

## 5. Verify

- Login page shows SSO button
- `GET /api/v1/integrations/status` → `oidc_sso.configured: true`

```powershell
cd apps\api
python -m pytest tests/test_oidc_sso.py -v
```

New SSO users are provisioned with **outlet** role (same as Google OAuth).

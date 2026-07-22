# Integrations Activation Checklist

Restart stack after env changes: `.\novaops.ps1 stop` → `.\novaops.ps1 dev`

## OIDC SSO
Fill `OIDC_*` in `apps/api/.env`, set `NEXT_PUBLIC_OIDC_SSO_ENABLED=true`. See [OIDC_SSO_SETUP.md](./OIDC_SSO_SETUP.md).

## SAML SSO
Fill `SAML_*` env, install xmlsec on VPS, set `NEXT_PUBLIC_SAML_SSO_ENABLED=true`. See [SAML_SSO_SETUP.md](./SAML_SSO_SETUP.md).

## Twilio SMS
Fill `TWILIO_*`, enable SMS in Settings. See [TWILIO_SMS_SETUP.md](./TWILIO_SMS_SETUP.md).

## Web Push
Generate VAPID keys, set in API + web env. Test via `POST /api/v1/notifications/push/test`.

## Native FCM
Add `google-services.json` + `FIREBASE_CREDENTIALS_PATH`. See [apps/mobile/README.md](../apps/mobile/README.md).

## Status
`GET /api/v1/integrations/status` returns `configured`, `live_ready`, and `setup_steps` per channel.

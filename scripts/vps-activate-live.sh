#!/usr/bin/env bash
# Run on VPS after deploy — install deps + merge integration env keys.
set -euo pipefail

ENV_FILE="${NOVAOPS_ENV_FILE:-/opt/NovaOpsExecution/apps/api/.env}"
API_DIR="/opt/NovaOpsExecution/apps/api"

echo "==> Install system deps (xmlsec for SAML ACS)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq xmlsec1 libxmlsec1-openssl 2>/dev/null || apt-get install -y -qq xmlsec1

echo "==> Python deps"
cd "$API_DIR"
source .venv/bin/activate
pip install -q -r requirements.txt

echo "==> Alembic migrations"
alembic upgrade head

merge_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

if [[ -n "${VAPID_PUBLIC_KEY:-}" ]]; then
  merge_env "VAPID_PUBLIC_KEY" "$VAPID_PUBLIC_KEY"
  merge_env "VAPID_PRIVATE_KEY" "${VAPID_PRIVATE_KEY:-}"
  merge_env "VAPID_SUBJECT" "${VAPID_SUBJECT:-mailto:admin@novaops.com}"
  echo "VAPID keys applied"
fi

if [[ -n "${OIDC_ISSUER_URL:-}" ]]; then
  merge_env "OIDC_ISSUER_URL" "$OIDC_ISSUER_URL"
  merge_env "OIDC_CLIENT_ID" "${OIDC_CLIENT_ID:-}"
  merge_env "OIDC_CLIENT_SECRET" "${OIDC_CLIENT_SECRET:-}"
  merge_env "OIDC_REDIRECT_URI" "${OIDC_REDIRECT_URI:-https://nova-ops.cloud/api/v1/auth/oidc/callback}"
  merge_env "OIDC_FRONTEND_SUCCESS_URL" "${OIDC_FRONTEND_SUCCESS_URL:-https://nova-ops.cloud/login/oauth-callback}"
  echo "OIDC env applied"
fi

if [[ -n "${TWILIO_ACCOUNT_SID:-}" ]]; then
  merge_env "TWILIO_ACCOUNT_SID" "$TWILIO_ACCOUNT_SID"
  merge_env "TWILIO_AUTH_TOKEN" "${TWILIO_AUTH_TOKEN:-}"
  merge_env "TWILIO_FROM_NUMBER" "${TWILIO_FROM_NUMBER:-}"
  echo "Twilio env applied"
fi

if [[ -n "${SAML_IDP_SSO_URL:-}" ]]; then
  merge_env "SAML_SP_ENTITY_ID" "${SAML_SP_ENTITY_ID:-https://nova-ops.cloud/api/v1/auth/saml/metadata}"
  merge_env "SAML_SP_ACS_URL" "${SAML_SP_ACS_URL:-https://nova-ops.cloud/api/v1/auth/saml/acs}"
  merge_env "SAML_IDP_ENTITY_ID" "${SAML_IDP_ENTITY_ID:-}"
  merge_env "SAML_IDP_SSO_URL" "$SAML_IDP_SSO_URL"
  merge_env "SAML_IDP_METADATA_URL" "${SAML_IDP_METADATA_URL:-}"
  merge_env "SAML_FRONTEND_SUCCESS_URL" "${SAML_FRONTEND_SUCCESS_URL:-https://nova-ops.cloud/login/oauth-callback}"
  echo "SAML env applied"
fi

if [[ -n "${FIREBASE_CREDENTIALS_PATH:-}" && -f "${FIREBASE_CREDENTIALS_PATH}" ]]; then
  merge_env "FIREBASE_CREDENTIALS_PATH" "$FIREBASE_CREDENTIALS_PATH"
  echo "Firebase credentials path applied"
fi

merge_env "ENVIRONMENT" "production"

echo "==> Restart services"
systemctl restart novaops-api
systemctl restart novaops-web
systemctl restart nginx || true

sleep 3
echo "==> Health"
curl -sf http://127.0.0.1:8000/api/v1/health
echo ""
curl -sf http://127.0.0.1:3000/api/keep-alive
echo ""
echo "Activate-live complete."

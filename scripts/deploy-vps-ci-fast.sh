#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT/apps/web"
API_DIR="$ROOT/apps/api"
REMOTE_ROOT="${NOVAOPS_REMOTE_ROOT:-/opt/NovaOpsExecution}"
VPS_HOST="${NOVAOPS_VPS_HOST:-root@103.247.10.145}"
SSH_KEY="${NOVAOPS_VPS_SSH_KEY:-${HOME}/.ssh/novaops_vps_ed25519}"
SSH_ARGS=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
STAMP="$(date +%Y%m%d%H%M%S)"
TMP_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/novaops-fast-deploy-${STAMP}"

mkdir -p "$TMP_DIR"
trap 'rm -rf "$TMP_DIR"' EXIT

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-20}"
  local sleep_seconds="${4:-3}"
  local response=""

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if response="$(curl -fsS "$url" 2>/dev/null)"; then
      echo "$response"
      return 0
    fi
    echo "$label not ready ($attempt/$attempts), retrying in ${sleep_seconds}s..." >&2
    sleep "$sleep_seconds"
  done

  echo "FAILED: $label did not become ready at $url" >&2
  return 1
}

require_file "$SSH_KEY"

echo
echo "NovaOps VPS Fast Deploy"
echo "Target: $VPS_HOST"
echo

ssh "${SSH_ARGS[@]}" -o BatchMode=yes -o ConnectTimeout=10 "$VPS_HOST" "echo ok" >/dev/null

echo "[1/6] Build frontend..."
pushd "$WEB_DIR" >/dev/null
export NEXT_PUBLIC_USE_RELATIVE_API=true
npm run build
cp -a public .next/standalone/public
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -a .next/static .next/standalone/.next/static
popd >/dev/null

echo "[2/6] Package backend + infra..."
BACKEND_STAGE="$TMP_DIR/backend-payload"
mkdir -p "$BACKEND_STAGE/apps/api" "$BACKEND_STAGE/scripts"
cp -a "$API_DIR/app" "$BACKEND_STAGE/apps/api/app"
cp -a "$API_DIR/alembic" "$BACKEND_STAGE/apps/api/alembic"
cp "$API_DIR/requirements.txt" "$BACKEND_STAGE/apps/api/requirements.txt"
cp "$API_DIR/alembic.ini" "$BACKEND_STAGE/apps/api/alembic.ini"
cp -a "$ROOT/deploy" "$BACKEND_STAGE/deploy"
cp \
  "$ROOT/scripts/vps-activate-live.sh" \
  "$ROOT/scripts/vps-sync-production.sh" \
  "$ROOT/scripts/vps-harden-production.sh" \
  "$ROOT/scripts/backup-novaops-vps.sh" \
  "$ROOT/scripts/vps-wipe-reports.py" \
  "$BACKEND_STAGE/scripts/"
BACKEND_ARCHIVE="$TMP_DIR/novaops-codepayload-${STAMP}.tar.gz"
tar -C "$BACKEND_STAGE" -czf "$BACKEND_ARCHIVE" apps deploy scripts

echo "[3/6] Package frontend standalone..."
FRONTEND_ARCHIVE="$TMP_DIR/novaops-standalone-${STAMP}.tar.gz"
tar -C "$WEB_DIR/.next" -czf "$FRONTEND_ARCHIVE" standalone

echo "[4/6] Upload archives + atomic swap..."
REMOTE_BACKEND_ARCHIVE="$REMOTE_ROOT/.deploy-tmp/$(basename "$BACKEND_ARCHIVE")"
REMOTE_FRONTEND_ARCHIVE="$REMOTE_ROOT/apps/web/.next/$(basename "$FRONTEND_ARCHIVE")"
ssh "${SSH_ARGS[@]}" "$VPS_HOST" "mkdir -p '$REMOTE_ROOT/.deploy-tmp' '$REMOTE_ROOT/apps/web/.next' '$REMOTE_ROOT/apps/api' '$REMOTE_ROOT/scripts'"
scp "${SSH_ARGS[@]}" "$BACKEND_ARCHIVE" "$VPS_HOST:$REMOTE_BACKEND_ARCHIVE"
scp "${SSH_ARGS[@]}" "$FRONTEND_ARCHIVE" "$VPS_HOST:$REMOTE_FRONTEND_ARCHIVE"

REMOTE_DEPLOY_SCRIPT="$TMP_DIR/remote-fast-deploy-${STAMP}.sh"
cat >"$REMOTE_DEPLOY_SCRIPT" <<EOF
set -euo pipefail
ROOT="$REMOTE_ROOT"
BACKEND_ARCHIVE="$REMOTE_BACKEND_ARCHIVE"
FRONTEND_ARCHIVE="$REMOTE_FRONTEND_ARCHIVE"
STAMP="$STAMP"
BACKEND_TMP="\$ROOT/.deploy-tmp/backend-\$STAMP"
FRONTEND_TMP="\$ROOT/apps/web/.next/standalone-new-\$STAMP"

rm -rf "\$BACKEND_TMP" "\$FRONTEND_TMP"
mkdir -p "\$BACKEND_TMP" "\$FRONTEND_TMP"

tar -xzf "\$BACKEND_ARCHIVE" -C "\$BACKEND_TMP"
mkdir -p "\$ROOT/apps/api" "\$ROOT/scripts"
rm -rf "\$ROOT/apps/api/app" "\$ROOT/apps/api/alembic" "\$ROOT/deploy"
cp -a "\$BACKEND_TMP/apps/api/app" "\$ROOT/apps/api/app"
cp -a "\$BACKEND_TMP/apps/api/alembic" "\$ROOT/apps/api/alembic"
cp -f "\$BACKEND_TMP/apps/api/requirements.txt" "\$ROOT/apps/api/requirements.txt"
cp -f "\$BACKEND_TMP/apps/api/alembic.ini" "\$ROOT/apps/api/alembic.ini"
cp -a "\$BACKEND_TMP/deploy" "\$ROOT/deploy"
cp -f "\$BACKEND_TMP/scripts/"* "\$ROOT/scripts/"
chmod +x "\$ROOT/scripts/"*.sh 2>/dev/null || true
chmod +x "\$ROOT/deploy/scripts/"*.sh 2>/dev/null || true
rm -rf "\$BACKEND_TMP"
rm -f "\$BACKEND_ARCHIVE"

tar -xzf "\$FRONTEND_ARCHIVE" -C "\$FRONTEND_TMP"
test -f "\$FRONTEND_TMP/standalone/server.js"
systemctl stop novaops-web 2>/dev/null || true
rm -rf "\$ROOT/apps/web/.next/standalone.previous"
if [[ -d "\$ROOT/apps/web/.next/standalone" ]]; then
  mv "\$ROOT/apps/web/.next/standalone" "\$ROOT/apps/web/.next/standalone.previous"
fi
mv "\$FRONTEND_TMP/standalone" "\$ROOT/apps/web/.next/standalone"
rm -rf "\$FRONTEND_TMP"
rm -f "\$FRONTEND_ARCHIVE"
systemctl restart novaops-web
echo "Remote payload swap complete."
EOF

scp "${SSH_ARGS[@]}" "$REMOTE_DEPLOY_SCRIPT" "$VPS_HOST:/tmp/novaops-fast-deploy-${STAMP}.sh"
ssh "${SSH_ARGS[@]}" "$VPS_HOST" "bash /tmp/novaops-fast-deploy-${STAMP}.sh; ec=\$?; rm -f /tmp/novaops-fast-deploy-${STAMP}.sh; exit \$ec"

echo "[5/6] Activate + production sync..."
ssh "${SSH_ARGS[@]}" "$VPS_HOST" "bash '$REMOTE_ROOT/scripts/vps-activate-live.sh'"
ssh "${SSH_ARGS[@]}" "$VPS_HOST" "bash '$REMOTE_ROOT/scripts/vps-sync-production.sh'"

echo "[6/6] Public health..."
READY_RESPONSE="$(ssh "${SSH_ARGS[@]}" "$VPS_HOST" "curl -fsS http://127.0.0.1:8000/api/v1/ready")"
echo "  $READY_RESPONSE"
PUBLIC_HEALTH="$(wait_for_http "https://nova-ops.cloud/api/v1/health" "public API health" 12 5)"
echo "  $PUBLIC_HEALTH"
curl -fsS -X DELETE "https://nova-ops.cloud/api/v1/auth/browser-session" >/dev/null
RELOGIN_STATUS="$(
  curl -sS -o /tmp/novaops-fast-relogin.txt -w "%{http_code}" \
    -H "Origin: https://nova-ops.cloud" \
    -H "Cookie: novaops_access=stale-session-probe" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "https://nova-ops.cloud/api/v1/auth/login" || true
)"
if [[ "$RELOGIN_STATUS" != "422" ]]; then
  echo "FAILED: stale-cookie relogin guard expected 422, got $RELOGIN_STATUS" >&2
  cat /tmp/novaops-fast-relogin.txt >&2 || true
  exit 1
fi
rm -f /tmp/novaops-fast-relogin.txt

echo
echo "[DONE] https://nova-ops.cloud"

#!/usr/bin/env bash
# Template — DO NOT RUN until VPS changes are verified locally.
# Usage (later): ssh user@103.247.10.145 'bash -s' < scripts/backup-novaops-vps.sh

set -euo pipefail

TIMESTAMP="$(date -u +"%Y%m%d-%H%M%S")"
BACKUP_ROOT="${NOVAOPS_BACKUP_ROOT:-/var/backups/novaops}/vps-$TIMESTAMP"
DB_DIR="$BACKUP_ROOT/db"
EVIDENCE_DIR="$BACKUP_ROOT/evidence"
ENV_FILE="${NOVAOPS_ENV_FILE:-/opt/NovaOpsExecution/apps/api/.env}"
RETENTION_COUNT="${NOVAOPS_BACKUP_RETENTION:-14}"

mkdir -p "$DB_DIR" "$EVIDENCE_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

DATABASE_URL="${DATABASE_URL:-}"
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL missing in $ENV_FILE" >&2
  exit 1
fi

if [[ "$DATABASE_URL" =~ postgres(ql)?(\+[^:/]+)?://([^:@/]+):([^@/]+)@([^:/]+):([0-9]+)/([^?]+) ]]; then
  PG_USER="${BASH_REMATCH[3]}"
  PG_PASS="${BASH_REMATCH[4]}"
  PG_HOST="${BASH_REMATCH[5]}"
  PG_PORT="${BASH_REMATCH[6]}"
  PG_DB="${BASH_REMATCH[7]}"
else
  echo "DATABASE_URL format not recognized" >&2
  exit 1
fi

DUMP_FILE="$DB_DIR/novaops-$TIMESTAMP.sql.gz"
PGPASSWORD="$PG_PASS" pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -F p | gzip > "$DUMP_FILE"

EVIDENCE_SOURCE="${NOVAOPS_EVIDENCE_DIR:-/opt/NovaOpsExecution/apps/api/uploads/evidence}"
EVIDENCE_RETENTION_DAYS="${NOVAOPS_EVIDENCE_RETENTION_DAYS:-14}"

# Auto-purge local evidence files older than retention period (default: 14 days)
if [[ -d "$EVIDENCE_SOURCE" ]]; then
  echo "Auto-purging evidence older than $EVIDENCE_RETENTION_DAYS days in $EVIDENCE_SOURCE..."
  find "$EVIDENCE_SOURCE" -type f -mtime +"$EVIDENCE_RETENTION_DAYS" -delete || true
fi

# Clean systemd journal logs older than 7 days
journalctl --vacuum-time=7d >/dev/null 2>&1 || true

cat > "$BACKUP_ROOT/manifest.json" <<EOF
{
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "host": "$(hostname)",
  "database_url_host": "$PG_HOST",
  "database_url_port": "$PG_PORT",
  "database_url_name": "$PG_DB",
  "db_dump": "$(basename "$DUMP_FILE")",
  "evidence_source": "$EVIDENCE_SOURCE",
  "evidence_retention_days": $EVIDENCE_RETENTION_DAYS,
  "retention_count": $RETENTION_COUNT
}
EOF

# Optional Google Drive Upload via Rclone
GDRIVE_REMOTE="${NOVAOPS_GDRIVE_REMOTE:-}"
if [[ -n "$GDRIVE_REMOTE" ]] && command -v rclone >/dev/null 2>&1; then
  echo "Uploading backup to Google Drive ($GDRIVE_REMOTE)..."
  rclone copy "$BACKUP_ROOT" "$GDRIVE_REMOTE/vps-$TIMESTAMP" --fast-list --transfers 4 || true
  # Optionally purge Google Drive backups older than 30 days
  rclone delete "$GDRIVE_REMOTE" --min-age 30d 2>/dev/null || true
fi

BACKUP_PARENT="$(dirname "$BACKUP_ROOT")"
if [[ -d "$BACKUP_PARENT" ]]; then
  mapfile -t OLD_BACKUPS < <(find "$BACKUP_PARENT" -mindepth 1 -maxdepth 1 -type d -name 'vps-*' | sort)
  EXCESS=$(( ${#OLD_BACKUPS[@]} - RETENTION_COUNT ))
  if (( EXCESS > 0 )); then
    for (( i=0; i<EXCESS; i++ )); do
      rm -rf "${OLD_BACKUPS[$i]}"
      echo "Pruned old backup: ${OLD_BACKUPS[$i]}"
    done
  fi
fi

echo "VPS backup complete: $BACKUP_ROOT (retention=$RETENTION_COUNT, evidence_purge=${EVIDENCE_RETENTION_DAYS}d)"

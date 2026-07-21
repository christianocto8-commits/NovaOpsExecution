#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

info() { echo "[INFO] $*"; }
pass() { echo "[PASS] $*"; }
warn() { echo "[WARN] $*"; }

TIMESTAMP="$(date -u +"%Y%m%d-%H%M%S")"
BACKUP_ROOT="$ROOT/backups/local-$TIMESTAMP"
DB_DIR="$BACKUP_ROOT/db"
EVIDENCE_DIR="$BACKUP_ROOT/evidence"

mkdir -p "$DB_DIR" "$EVIDENCE_DIR"

DEFAULT_DATABASE_URL="postgresql://novaops_user:novaops_password@localhost:5433/novaops_db"
DATABASE_URL="$DEFAULT_DATABASE_URL"
ENV_FILE="$ROOT/apps/api/.env"

if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line; do
    if [[ "$line" =~ ^[[:space:]]*DATABASE_URL[[:space:]]*=[[:space:]]*(.+)[[:space:]]*$ ]]; then
      DATABASE_URL="${BASH_REMATCH[1]}"
      DATABASE_URL="${DATABASE_URL%\"}"
      DATABASE_URL="${DATABASE_URL#\"}"
      DATABASE_URL="${DATABASE_URL%\'}"
      DATABASE_URL="${DATABASE_URL#\'}"
      break
    fi
  done < "$ENV_FILE"
fi

info "Backup folder: $BACKUP_ROOT"

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

DUMP_FILE="$DB_DIR/novaops-$TIMESTAMP.sql"
DUMP_OK=0

if command -v pg_dump >/dev/null 2>&1; then
  info "Running pg_dump..."
  PGPASSWORD="$PG_PASS" pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -F p -f "$DUMP_FILE"
  DUMP_OK=1
  pass "PostgreSQL dump saved to $DUMP_FILE"
elif command -v docker >/dev/null 2>&1; then
  info "pg_dump unavailable; trying docker exec novaops_postgres..."
  docker exec -e PGPASSWORD="$PG_PASS" novaops_postgres pg_dump -U "$PG_USER" -d "$PG_DB" > "$DUMP_FILE"
  DUMP_OK=1
  pass "PostgreSQL dump via Docker saved to $DUMP_FILE"
else
  warn "Database dump skipped. Install pg_dump or Docker and start Postgres on port $PG_PORT."
fi

EVIDENCE_SOURCE="$ROOT/apps/api/uploads/evidence"
if [[ -d "$EVIDENCE_SOURCE" ]]; then
  info "Copying evidence uploads..."
  cp -a "$EVIDENCE_SOURCE/." "$EVIDENCE_DIR/" 2>/dev/null || true
  pass "Evidence copied to $EVIDENCE_DIR"
else
  warn "Evidence folder not found at $EVIDENCE_SOURCE (skipped)."
fi

cat > "$BACKUP_ROOT/manifest.json" <<EOF
{
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "database_url_host": "$PG_HOST",
  "database_url_port": "$PG_PORT",
  "database_url_name": "$PG_DB",
  "db_dump": $( [[ "$DUMP_OK" -eq 1 ]] && echo "\"$(basename "$DUMP_FILE")\"" || echo "null" ),
  "evidence_source": "$EVIDENCE_SOURCE"
}
EOF

pass "Local backup complete: $BACKUP_ROOT"

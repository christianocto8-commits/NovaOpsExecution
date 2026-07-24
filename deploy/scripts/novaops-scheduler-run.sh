#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${NOVAOPS_ENV_FILE:-/opt/NovaOpsExecution/apps/api/.env}"
API_BASE="${NOVAOPS_API_BASE:-http://127.0.0.1:8000/api/v1}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${TASK_SCHEDULER_SECRET:-}" ]]; then
  echo "TASK_SCHEDULER_SECRET is not set in $ENV_FILE" >&2
  exit 1
fi

AUTH_HEADER=(-H "X-Scheduler-Secret: ${TASK_SCHEDULER_SECRET}")

curl -fsS -X POST "${API_BASE}/jobs/process" "${AUTH_HEADER[@]}"
echo

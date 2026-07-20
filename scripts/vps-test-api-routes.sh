#!/bin/bash
set -euo pipefail
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@novaops.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

PAYLOAD='{"title":"Route test","form_type":"Checklist","is_active":false,"fields":[]}'

test_route() {
  local label="$1"
  local url="$2"
  echo "=== $label ==="
  curl -s -w "\nHTTP:%{http_code}\n" -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$PAYLOAD"
  echo ""
}

test_route "nginx /api/v1/form-templates (direct API)" "http://127.0.0.1/api/v1/form-templates"
test_route "nginx /api/backend/v1/form-templates (production web path)" "http://127.0.0.1/api/backend/v1/form-templates"
test_route "next.js :3000 /api/backend/v1/form-templates" "http://127.0.0.1:3000/api/backend/v1/form-templates"
test_route "next.js :3000 /api/v1/form-templates" "http://127.0.0.1:3000/api/v1/form-templates"

echo "=== GET routes check ==="
curl -s -w "\nHTTP:%{http_code}\n" "http://127.0.0.1/api/backend/v1/form-templates" -H "Authorization: Bearer $TOKEN"
echo ""
curl -s -w "\nHTTP:%{http_code}\n" "http://127.0.0.1:3000/api/backend/v1/form-templates" -H "Authorization: Bearer $TOKEN"

#!/bin/bash
set -euo pipefail
API="http://127.0.0.1:8000"
PUBLIC="http://103.247.10.145"

LOGIN=$(curl -s -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@novaops.com","password":"admin123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "=== /authorization/context ==="
curl -s -w "\nHTTP:%{http_code}\n" "$API/api/v1/authorization/context" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>/dev/null || true

echo ""
echo "=== public authorization/context via nginx ==="
curl -s -w "\nHTTP:%{http_code}\n" "$PUBLIC/api/v1/authorization/context" \
  -H "Authorization: Bearer $TOKEN" | head -c 2000

echo ""
echo ""
echo "=== 422 triggers ==="
echo "-- empty body --"
curl -s -w "\nHTTP:%{http_code}\n" -X POST "$API/api/v1/form-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'

echo "-- null body --"
curl -s -w "\nHTTP:%{http_code}\n" -X POST "$API/api/v1/form-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d 'null'

echo "-- invalid json --"
curl -s -w "\nHTTP:%{http_code}\n" -X POST "$API/api/v1/form-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{bad json'

echo "-- title too long --"
python3 - <<'PY'
import json
print(json.dumps({"title":"x"*200,"form_type":"Checklist","fields":[]}))
PY
LONG=$(python3 -c 'import json; print(json.dumps({"title":"x"*200,"form_type":"Checklist","fields":[]}))')
curl -s -w "\nHTTP:%{http_code}\n" -X POST "$API/api/v1/form-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$LONG"

echo ""
echo "=== check nginx api proxy ==="
curl -s -I "$PUBLIC/api/v1/health" | head -10

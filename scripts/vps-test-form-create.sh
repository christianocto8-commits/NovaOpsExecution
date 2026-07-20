#!/bin/bash
set -euo pipefail

API="http://127.0.0.1:8000"

echo "=== LOGIN ==="
LOGIN_RESP=$(curl -s -w "\n__HTTP__%{http_code}" -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@novaops.com","password":"admin123"}')
echo "$LOGIN_RESP"

BODY=$(echo "$LOGIN_RESP" | sed 's/__HTTP__.*//')
HTTP=$(echo "$LOGIN_RESP" | sed -n 's/.*__HTTP__//p')
echo "LOGIN HTTP: $HTTP"

TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)
echo "TOKEN_LEN=${#TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "Login failed"
  exit 1
fi

echo ""
echo "=== TOKEN PAYLOAD ==="
echo "$BODY" | python3 -c "
import sys, json, base64
d = json.load(sys.stdin)
print('keys:', list(d.keys()))
user = d.get('user') or {}
print('user.role:', user.get('role'))
print('user.permissions:', user.get('permissions'))
token = d.get('access_token','')
parts = token.split('.')
if len(parts) >= 2:
    payload = parts[1] + '=' * (-len(parts[1]) % 4)
    import json as j
    print('jwt:', j.dumps(j.loads(base64.urlsafe_b64decode(payload)), indent=2))
"

echo ""
echo "=== CREATE minimal valid payload ==="
RESP1=$(curl -s -w "\n__HTTP__%{http_code}" -X POST "$API/api/v1/form-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test Form","description":"test","form_type":"Checklist","outlet_id":null,"is_active":false,"fields":[{"label":"Field 1","field_type":"text","is_required":true,"sort_order":0}]}')
echo "$RESP1"

echo ""
echo "=== CREATE frontend-style payload ==="
RESP2=$(curl -s -w "\n__HTTP__%{http_code}" -X POST "$API/api/v1/form-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"New Form Template","category":"Daily","description":"test","status":"Draft","fields":[{"label":"Form field","type":"yes_no","required":true}]}')
echo "$RESP2"

echo ""
echo "=== CREATE via nginx (public) ==="
RESP3=$(curl -s -w "\n__HTTP__%{http_code}" -X POST "http://127.0.0.1/api/v1/form-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Public Test","form_type":"Checklist","is_active":false,"fields":[]}')
echo "$RESP3"

#!/bin/bash
set -euo pipefail
PUBLIC="http://103.247.10.145"

echo "=== Login via public nginx ==="
LOGIN=$(curl -s -w "\n__HTTP__%{http_code}" -X POST "$PUBLIC/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@novaops.com","password":"admin123"}')
echo "$LOGIN" | head -c 500
HTTP=$(echo "$LOGIN" | sed -n 's/.*__HTTP__//p')
echo ""
echo "LOGIN HTTP: $HTTP"
TOKEN=$(echo "$LOGIN" | sed 's/__HTTP__.*//' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo ""
echo "=== Auth context ==="
curl -s -w "\nHTTP:%{http_code}\n" "$PUBLIC/api/v1/authorization/context" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('permissions:', 'form.create' in d.get('permissions',[]))" 2>/dev/null || curl -s "$PUBLIC/api/v1/authorization/context" -H "Authorization: Bearer $TOKEN"

echo ""
echo "=== Create form (exact toBackendPayload from blank template) ==="
curl -s -w "\nHTTP:%{http_code}\n" -X POST "$PUBLIC/api/v1/form-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "New Form Template",
    "description": "Reusable form template for task execution.",
    "form_type": "draft",
    "outlet_id": null,
    "is_active": false,
    "fields": [
      {"label": "Nama pelaksana", "field_type": "responsible_person", "placeholder": null, "help_text": "Pelaksana Tugas", "is_required": true, "options_json": {"system": true}, "validation_json": null, "sort_order": 0},
      {"label": "Form field", "field_type": "yes_no", "placeholder": null, "help_text": null, "is_required": true, "options_json": null, "validation_json": null, "sort_order": 1},
      {"label": "Photo evidence", "field_type": "photo", "placeholder": null, "help_text": null, "is_required": false, "options_json": null, "validation_json": null, "sort_order": 2}
    ]
  }'

echo ""
echo "=== Create with wrong login field (email) ==="
curl -s -w "\nHTTP:%{http_code}\n" -X POST "$PUBLIC/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@novaops.com","password":"admin123"}'

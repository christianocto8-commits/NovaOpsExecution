#!/bin/bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"identifier":"admin@novaops.com","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Simulate pre-normalization API rejection: missing title and form_type
echo "=== missing title+form_type (no name/category either) ==="
curl -s -w "\nHTTP:%{http_code}\n" -X POST http://127.0.0.1:8000/api/v1/form-templates \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"description":"x","fields":[{"label":"A","field_type":"text","is_required":true,"sort_order":0}]}'

# Only frontend keys without name
echo "=== only status Draft, no name/title ==="
curl -s -w "\nHTTP:%{http_code}\n" -X POST http://127.0.0.1:8000/api/v1/form-templates \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"Draft","fields":[]}'

# Stringify entire frontend template including extra keys
echo "=== full frontend template ==="
curl -s -w "\nHTTP:%{http_code}\n" -X POST http://127.0.0.1:8000/api/v1/form-templates \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"id":"local-xyz","name":"","category":"Daily","description":"","status":"Draft","fields":[{"id":"f1","label":"","type":"yes_no","required":true}]}'

# Old broken payload: sent template directly without mapping (no title, no form_type, no name)
echo "=== broken old payload ==="
curl -s -w "\nHTTP:%{http_code}\n" -X POST http://127.0.0.1:8000/api/v1/form-templates \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"description":"test","is_active":false,"fields":[{"label":"X","field_type":"yes_no","is_required":true,"sort_order":0}]}'

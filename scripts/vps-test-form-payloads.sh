#!/bin/bash
set -euo pipefail
API="http://127.0.0.1:8000"
TOKEN=$(curl -s -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@novaops.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

test_payload() {
  local name="$1"
  local payload="$2"
  echo "=== $name ==="
  curl -s -w "\nHTTP:%{http_code}\n" -X POST "$API/api/v1/form-templates" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$payload"
  echo ""
}

# Old frontend: sends raw FormTemplate without toBackendPayload
test_payload "raw FormTemplate (old web)" '{
  "id": "local-abc-123",
  "name": "New Form Template",
  "category": "Daily",
  "description": "Reusable form template",
  "status": "Draft",
  "fields": [
    {"id": "local-field-1", "label": "Form field", "type": "yes_no", "required": true},
    {"id": "local-field-2", "label": "Nama pelaksana", "type": "responsible_person", "required": true, "options": {"system": true}}
  ]
}'

# Missing title AND name
test_payload "missing title and name" '{
  "description": "test",
  "status": "Draft",
  "fields": []
}'

# Empty name
test_payload "empty name" '{
  "name": "",
  "category": "Daily",
  "status": "Draft",
  "fields": [{"label": "Field", "type": "yes_no", "required": true}]
}'

# Backend payload from toBackendPayload
test_payload "toBackendPayload style" '{
  "title": "New Form Template",
  "description": "Reusable form template for task execution.",
  "form_type": "draft",
  "outlet_id": null,
  "is_active": false,
  "fields": [
    {"label": "Form field", "field_type": "yes_no", "placeholder": null, "help_text": null, "is_required": true, "options_json": null, "validation_json": null, "sort_order": 0},
    {"label": "Nama pelaksana", "field_type": "responsible_person", "placeholder": null, "help_text": "Pelaksana Tugas", "is_required": true, "options_json": {"system": true}, "validation_json": null, "sort_order": 1}
  ]
}'

# Completely wrong shape (pre-fix frontend sending template object keys only)
test_payload "only frontend keys no mapping" '{
  "name": "Test",
  "category": "Checklist",
  "status": "Active",
  "fields": [{"label": "X", "type": "text", "required": false}]
}'

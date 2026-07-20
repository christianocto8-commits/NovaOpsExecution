#!/bin/bash
set -euo pipefail
API="http://127.0.0.1:8000"
LOGIN=$(curl -s -X POST "$API/api/v1/auth/login" -H "Content-Type: application/json" -d '{"identifier":"admin@novaops.com","password":"admin123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['access_token'])")
echo "=== LIST BEFORE ==="
BEFORE=$(curl -s "$API/api/v1/form-templates" -H "Authorization: Bearer $TOKEN")
COUNT_BEFORE=$(echo "$BEFORE" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('items',d.get('data',[])); print(len(items))")
echo "count=$COUNT_BEFORE"
DELETE_ID=$(echo "$BEFORE" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('items',d.get('data',[])); pref=[22,21,20]; ids={x.get('id') for x in items};
import sys as s
for p in pref:
    if p in ids: print(p); s.exit(0)
print(items[-1]['id'] if items else '')")
echo "delete_target=$DELETE_ID"
HTTP=$(curl -s -o /tmp/del_body.txt -w "%{http_code}" -X DELETE "$API/api/v1/form-templates/$DELETE_ID" -H "Authorization: Bearer $TOKEN")
echo "DELETE HTTP=$HTTP"
cat /tmp/del_body.txt
echo ""
echo "=== LIST AFTER ==="
AFTER=$(curl -s "$API/api/v1/form-templates" -H "Authorization: Bearer $TOKEN")
COUNT_AFTER=$(echo "$AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('items',d.get('data',[])); print(len(items))")
echo "count=$COUNT_AFTER"
echo "SUMMARY before=$COUNT_BEFORE after=$COUNT_AFTER http=$HTTP id=$DELETE_ID"

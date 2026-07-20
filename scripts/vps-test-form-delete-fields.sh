#!/bin/bash
set -euo pipefail
API="http://127.0.0.1:8000"
LOGIN=$(curl -s -X POST "$API/api/v1/auth/login" -H "Content-Type: application/json" -d '{"identifier":"admin@novaops.com","password":"admin123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
BEFORE=$(curl -s "$API/api/v1/form-templates" -H "Authorization: Bearer $TOKEN")
DELETE_ID=$(echo "$BEFORE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d if isinstance(d,list) else d.get('items',d.get('data',[]))
with_fields=[x for x in items if x.get('fields') and len(x.get('fields',[]))>0]
if not with_fields:
    sys.exit(1)
t=with_fields[0]
print(t['id'])
print('field_count='+str(len(t['fields'])), file=sys.stderr)
")
COUNT_BEFORE=$(echo "$BEFORE" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('items',d.get('data',[])); print(len(items))")
echo "count_before=$COUNT_BEFORE delete_id=$DELETE_ID"
HTTP=$(curl -s -o /tmp/del2.txt -w "%{http_code}" -X DELETE "$API/api/v1/form-templates/$DELETE_ID" -H "Authorization: Bearer $TOKEN")
echo "DELETE HTTP=$HTTP"
AFTER=$(curl -s "$API/api/v1/form-templates" -H "Authorization: Bearer $TOKEN")
COUNT_AFTER=$(echo "$AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('items',d.get('data',[])); print(len(items))")
GONE=$(echo "$AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('items',d.get('data',[])); print('yes' if $DELETE_ID not in {x.get('id') for x in items} else 'no')")
echo "count_after=$COUNT_AFTER id_gone=$GONE"
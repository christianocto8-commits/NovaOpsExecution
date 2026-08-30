import sys
sys.path.insert(0, '/opt/NovaOpsExecution/apps/api')
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
print("=== ACTUAL TASKS IN DATABASE ===")
rows = db.execute(text("SELECT t.id, t.title, t.status, o.name FROM tasks t LEFT JOIN outlets o ON t.outlet_id = o.id ORDER BY t.created_at DESC LIMIT 10")).fetchall()
for r in rows:
    print(r)

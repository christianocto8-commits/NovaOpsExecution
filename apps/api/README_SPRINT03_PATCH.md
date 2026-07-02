# NovaOps Sprint 03 v2 Patch

This patch stabilizes the backend model layer using the existing INTEGER primary-key strategy.

## Apply

From `C:\Project\NovaOpsExecution\apps\api`:

```powershell
# stop uvicorn first if it is running
Copy-Item -Recurse -Force C:\PATH_TO_THIS_PATCH\app\* .\app\
Copy-Item -Force C:\PATH_TO_THIS_PATCH\repair_sprint03_db.py .\repair_sprint03_db.py
Copy-Item -Force C:\PATH_TO_THIS_PATCH\seed_admin.py .\seed_admin.py

Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force
python repair_sprint03_db.py
python seed_admin.py
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Test

1. Open `http://127.0.0.1:8000/docs`.
2. Login with:

```json
{
  "email": "admin@novaops.com",
  "password": "admin123"
}
```

3. Use the token as `Bearer <token>` in Swagger Authorize.
4. Test `GET /api/v1/outlets/me`.
5. Test `GET /api/v1/outlets/current` with header `X-Outlet-Id: 1` or the ID from `/outlets/me`.

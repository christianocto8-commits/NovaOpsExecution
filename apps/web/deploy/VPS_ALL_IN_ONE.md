# NovaOps — Deploy All-in-One di VPS (Frontend + Backend)

Satu server, satu IP, tanpa Vercel, tanpa mixed content.

```
Browser → http://103.247.10.145/
              ├── /        → Next.js (port 3000)
              └── /api/    → FastAPI (port 8000)
Database  → Neon Postgres (tetap cloud)
```

---

## Bagian A — Build frontend di PC Windows

```powershell
cd C:\Users\ASUS\Projects\NovaOpsExecution\apps\web
$env:NEXT_PUBLIC_USE_RELATIVE_API="true"
npm run build
```

Setelah build, siapkan folder standalone:

```powershell
cd C:\Users\ASUS\Projects\NovaOpsExecution\apps\web
Copy-Item -Recurse -Force public .next\standalone\public
Copy-Item -Recurse -Force .next\static .next\standalone\.next\static
```

Upload ke VPS:

```powershell
scp -r "C:\Users\ASUS\Projects\NovaOpsExecution\apps\web\.next\standalone" root@103.247.10.145:/opt/NovaOpsExecution/apps/web/
```

---

## Bagian B — Setup di VPS (SSH)

```bash
ssh root@103.247.10.145
```

### 1. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
```

### 2. Update CORS di API `.env`

```bash
nano /opt/NovaOpsExecution/apps/api/.env
```

Pastikan `CORS_ORIGINS` mencakup IP VPS:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://103.247.10.145
```

```bash
systemctl restart novaops-api
```

### 3. Systemd services

```bash
cp /opt/NovaOpsExecution/deploy/systemd/novaops-api.service /etc/systemd/system/
cp /opt/NovaOpsExecution/deploy/systemd/novaops-web.service /etc/systemd/system/

systemctl daemon-reload
systemctl enable novaops-api novaops-web
systemctl start novaops-api novaops-web
systemctl status novaops-api novaops-web
```

### 4. Nginx (frontend + API)

```bash
cp /opt/NovaOpsExecution/deploy/nginx/novaops-vps.conf /etc/nginx/sites-available/novaops
ln -sf /etc/nginx/sites-available/novaops /etc/nginx/sites-enabled/novaops
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### 5. Test

```bash
curl http://127.0.0.1/api/v1/health
curl -I http://127.0.0.1/
```

Browser: **http://103.247.10.145** → login → create task.

---

## Update kode nanti

Di PC:

```powershell
cd C:\Users\ASUS\Projects\NovaOpsExecution\apps\web
$env:NEXT_PUBLIC_USE_RELATIVE_API="true"
npm run build
Copy-Item -Recurse -Force public .next\standalone\public
Copy-Item -Recurse -Force .next\static .next\standalone\.next\static
scp -r ".next\standalone" root@103.247.10.145:/opt/NovaOpsExecution/apps/web/
```

Di VPS:

```bash
systemctl restart novaops-web
```

---

## Vercel

Tidak dipakai lagi untuk trial ini. Akses app lewat **http://103.247.10.145** saja.

Kalau nanti punya domain + SSL, ganti nginx `server_name` dan pasang certbot.

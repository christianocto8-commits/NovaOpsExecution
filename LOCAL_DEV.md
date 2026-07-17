# NovaOps — Develop Local

Anda **tidak perlu buka terminal**. Cukup minta ke AI:

| Perintah ke AI | Fungsi |
|----------------|--------|
| **"jalankan local"** | Start API + Web di localhost |
| **"stop local"** | Stop semua service local |
| **"status local"** | Cek apakah API/Web/DB jalan |
| **"deploy ke vps"** | Upload ke VPS setelah local OK |

## URL local

| Service | URL |
|---------|-----|
| Website | http://localhost:3000 |
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/api/v1/health |

## Login default (local = VPS)

Local memakai **Postgres + API yang sama** seperti VPS — tidak ada mock/dummy seed terpisah.

- Email: `admin@novaops.com`
- Password: `admin123`

Admin dibuat otomatis dari `BOOTSTRAP_*` di `apps/api/.env` (sama mekanisme dengan VPS).

Saat bootstrap aktif, sistem juga men-seed **template operasional Zenput-like**:
- Opening Checklist
- Food Safety & Temperature Log
- Cleaning & Sanitation
- Closing Checklist

Beserta **task schedule harian** otomatis per template.

## Database local

PostgreSQL via Docker port **5433** (terpisah dari VPS/Neon).

Jika DB lama masih berisi data dummy (`admin@novaops.local`, outlet KOV), reset:

```powershell
cd C:\Users\ASUS\Projects\NovaOpsExecution
.\novaops.ps1 reset-db
```

Ketik `RESET` saat diminta, lalu jalankan ulang stack:

```powershell
.\novaops.ps1 dev
```

## Manual (jika perlu)

```powershell
cd C:\Users\ASUS\Projects\NovaOpsExecution
.\novaops.ps1 bootstrap   # setup pertama kali (migrate + bootstrap admin)
.\novaops.ps1 dev         # jalankan stack
.\novaops.ps1 stop        # stop
```

## Push notification (local)

Generate VAPID keys once:

```powershell
npx web-push generate-vapid-keys
```

Tambahkan ke env:

`apps/api/.env`
```env
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:admin@novaops.com
```

`apps/web/.env.local`
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key yang sama>
```

Jalankan migrasi jika belum: `.\novaops.ps1 bootstrap` atau `alembic upgrade head` di `apps/api`.

Di browser (Chrome/Edge), buka `/dashboard/tasks` sebagai staff outlet → klik **Aktifkan** pada banner notifikasi.

Uji manual via API docs: `POST /api/v1/notifications/push/test` (hanya environment local).

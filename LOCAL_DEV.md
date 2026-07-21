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

## Backup local (Fase E)

Sebelum uji besar atau migrasi, backup DB + evidence:

```powershell
cd C:\Users\ASUS\Projects\NovaOpsExecution
.\scripts\backup-novaops-local.ps1
```

Output: `backups/local-YYYYMMDD-HHMMSS/` berisi dump PostgreSQL + salinan `apps/api/uploads/evidence`.

Template VPS (jangan jalankan dulu): `scripts/backup-novaops-vps.sh` — mendukung retention (`NOVAOPS_BACKUP_RETENTION`, default 14).

## Pilot UAT (1 outlet)

Checklist step-by-step admin / manager / crew: **[docs/PILOT_UAT_CHECKLIST.md](docs/PILOT_UAT_CHECKLIST.md)**

Jalankan di local 2–3 hari sebelum deploy VPS.

## S3 evidence (MinIO local)

Tanpa env S3, upload evidence tetap ke disk lokal (`apps/api/uploads/evidence`).

Uji S3 dengan MinIO:

```powershell
docker compose -f docker-compose.minio.yml up -d
```

Tambahkan ke `apps/api/.env`:

```env
S3_ENDPOINT=http://127.0.0.1:9000
S3_BUCKET=novaops-evidence
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1
```

Console MinIO: http://localhost:9001 (minioadmin / minioadmin). Restart API setelah mengubah env.

## Google SSO (MVP)

1. Buat OAuth Client di Google Cloud Console (Web application).
2. Authorized redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
3. Isi `apps/api/.env` dengan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan URL di atas.
4. Di `apps/web/.env.local`: `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`
5. Restart API + Web → tombol **Sign in with Google** muncul di `/login`.

User Google baru otomatis dibuat dengan role **outlet** (outlet pertama jika ada). Email/password login tetap berfungsi.

## Fase F — Offline mobile

Uji offline + mobile di localhost (Chrome DevTools):

1. Jalankan stack: `.\novaops.ps1 dev`
2. Login sebagai crew outlet → buka `/dashboard/operator` atau `/dashboard/tasks`
3. Buka **DevTools → Network → Offline** (centang Offline)
4. Atur viewport mobile (iPhone 14 / responsive 390px)
5. Kerjakan task: isi form, upload foto bukti, tap **Submit (Offline)**
6. Pastikan badge header menampilkan **Offline** + jumlah **pending**
7. Matikan Offline → badge auto-sync; task terkirim ke backend
8. Uji manual form di `/dashboard/forms` (outlet role) — submit offline ikut antre sync
9. Uji **Ganti crew** di operator home → login crew lain → kembali ke halaman semula
10. Uji banner **Install app** (Chrome desktop/Android) atau instruksi iOS Share → Add to Home Screen

IndexedDB queue: `novaops-offline` → store `mutation_queue`.

## Fase G — Form Intelligence

Uji di local setelah stack jalan (`.\novaops.ps1 dev`):

### G1 — Conditional fields

1. Login admin → `/dashboard/forms`
2. Buat/edit template: tambah field **Ya/Tidak** (mis. "Peralatan OK?")
3. Tambah field **Foto bukti** → atur **Visibilitas kondisional**: field trigger = "Peralatan OK?", operator = **sama dengan**, nilai = **No** → centang **Required**
4. **Save Template** (status Active)
5. Login crew outlet → kerjakan task dengan template tersebut, atau `/dashboard/forms`
6. Jawab **Yes** → field foto **tidak** muncul
7. Jawab **No** → field foto muncul dan wajib diisi sebelum submit
8. Coba submit tanpa foto saat No → frontend + API menolak

### G2 — Form Library / Isi Cepat

1. Login crew outlet → `/dashboard/operator`
2. Bagian **Form Library / Isi Cepat** menampilkan template aktif
3. Gunakan **Cari template** dan filter **kategori**
4. Tap template → diarahkan ke `/dashboard/forms?templateId=...`
5. Isi dan submit (online/offline tetap antre sync seperti Fase F)

### G3 — Section scoring

1. Template dengan beberapa **section** (field `Section name`) + item yes/no
2. Submit checklist via task execution
3. Di response/API, `_checklist.section_scores` berisi pass rate per section

### G4 — Duplicate template

1. Admin → `/dashboard/forms` → pilih template tersimpan
2. Klik **Duplicate Template** → salinan draft `(Copy)` muncul di sidebar

## Fase H — People & Visibility

Uji di local setelah stack jalan (`.\novaops.ps1 dev`):

### H1 — Activity feed

1. Login crew outlet → `/dashboard/operator` → bagian **Aktivitas Terbaru** tampil
2. Selesaikan task / submit checklist → aktivitas muncul di feed (refresh otomatis ~30 detik)
3. Buka `/dashboard/activity` untuk timeline lengkap dengan link ke task/history
4. Login admin/area manager → filter outlet via header workspace

### H2 — Employee announcements

1. Login admin → `/dashboard/announcements` atau `/dashboard/notifications`
2. **Buat Pengumuman** → isi judul/body → **Publish**
3. Login crew outlet → banner pengumuman di `/dashboard/operator`
4. Tap banner → **Saya mengerti** / **Tandai sudah dibaca**
5. Badge ungu (megaphone) di header menampilkan jumlah belum dibaca

### H3 — Auto-escalation lite

1. Submit checklist gagal → supervisor dapat notifikasi in-app + event `checklist_failed` di feed
2. Task overdue → event `task_overdue` muncul di activity feed
3. CAPA otomatis → event `capa_created` di feed

### Tes API Fase H

```powershell
cd C:\Users\ASUS\Projects\NovaOpsExecution\apps\api
.\.venv\Scripts\python.exe -m pytest tests/test_phase_h_activity_announcements.py -q
```

## Tes API kritis (local)

Pastikan Postgres + API jalan, lalu:

```powershell
cd C:\Users\ASUS\Projects\NovaOpsExecution\apps\api
.\.venv\Scripts\python.exe -m pytest tests/test_critical_auth_flow.py tests/test_api_security.py -q
```

## Fase I — i18n, offline shell, API keys

Uji di local setelah stack jalan (`.\novaops.ps1 dev`):

### I1 — Bahasa EN / ID

1. Login admin → `/dashboard/settings` → **Language** = Indonesia / English → **Simpan**
2. Atau login crew outlet → Settings → ganti bahasa
3. Cek halaman: `/login`, `/dashboard/operator`, header, sidebar, form library, activity feed, badge offline
4. ~80% label crew-facing sudah bilingual; admin builder/form editor masih sebagian EN

### I2 — Offline app shell (service worker)

1. Buka `/dashboard/operator` online → tunggu halaman load penuh
2. DevTools → **Application → Service Workers** → pastikan `sw.js` aktif
3. DevTools → **Network → Offline**
4. Refresh `/dashboard/operator` atau `/login` → halaman shell tetap tampil (cache)
5. Submit form/task offline → antre IndexedDB → online lagi → badge sync
6. Push notification logic tetap di `sw.js` (event `push` / `notificationclick`)

### I3 — API keys (machine integration)

1. Login admin → `/dashboard/settings` → bagian **API Keys**
2. **Buat API Key** → salin kunci (hanya muncul sekali)
3. Uji:

```powershell
curl http://localhost:8000/api/v1/health -H "X-API-Key: nova_..."
curl http://localhost:8000/api/v1/form-templates -H "X-API-Key: nova_..."
curl http://localhost:8000/api/v1/reports/summary -H "X-API-Key: nova_..."
```

4. **Cabut** key → request di atas harus 401

Migrasi: `cd apps\api && .\.venv\Scripts\alembic.exe upgrade head`

Tes API:

```powershell
cd C:\Users\ASUS\Projects\NovaOpsExecution\apps\api
.\.venv\Scripts\python.exe -m pytest tests/test_api_keys.py -q
```

## Production prep (scripts only — jangan jalankan di VPS dulu)

| Script | Fungsi |
|--------|--------|
| `scripts/backup-novaops-vps.sh` | Backup DB + evidence; retention default 14 (`NOVAOPS_BACKUP_RETENTION`) |
| `scripts/health-check-local.ps1` | Ping API + Web local |
| `deploy/systemd/novaops-backup.timer` | Contoh timer harian VPS |
| `deploy/systemd/novaops-backup.service` | Unit oneshot backup |

Health check local:

```powershell
.\scripts\health-check-local.ps1
```

## Capacitor scaffold (MVP)

Lihat `apps/mobile/README.md` — config di `apps/web/capacitor.config.ts`. Belum publish ke store.

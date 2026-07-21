# Pilot UAT Checklist — NovaOps (Local)

Checklist uji 1 outlet pilot sebelum deploy ke VPS.  
**Environment:** http://localhost:3000 · API http://localhost:8000

---

## 0. Persiapan (sekali)

- [ ] Stack jalan: `.\novaops.ps1 dev`
- [ ] Health OK: http://localhost:8000/api/v1/health
- [ ] Backup: `.\scripts\backup-novaops-local.ps1`
- [ ] Catat hasil di kolom **Pass/Fail** dan **Catatan** di bawah

**Login default admin:** `admin@novaops.com` / `admin123` (dari `apps/api/.env`)

---

## 1. Setup outlet & akun pilot

Login sebagai **Admin** → `/dashboard`

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 1.1 | Buka **Outlets** (`/dashboard/outlets`) → buat outlet `PILOT-01` (isi nama, region jika ada) | | |
| 1.2 | Buka **Users** (`/dashboard/users`) → buat **Area Manager** (role Area Manager, assign outlet PILOT-01) | | |
| 1.3 | Buat **Crew Outlet** (role Outlet, outlet PILOT-01) — catat username & password | | |
| 1.4 | Buka **Schedules** (`/dashboard/schedules`) → pastikan schedule harian aktif untuk template (Opening/Closing dll.) | | |
| 1.5 | Logout (menu profil / ganti akun) | | |

---

## 2. Admin — Forms & konfigurasi

Login: `admin@novaops.com`

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 2.1 | **Forms** (`/dashboard/forms`) → buka template (mis. Opening Checklist) → preview tampil benar | | |
| 2.2 | Edit 1 field (label atau required) → simpan → refresh → perubahan tersimpan | | |
| 2.3 | **Settings** (`/dashboard/settings`) → ubah branding (logo/nama) → simpan → tampil di UI | | |
| 2.4 | **Reports** (`/dashboard/reports`) → filter outlet PILOT-01 → data muncul | | |
| 2.5 | **Compliance** (`/dashboard/compliance`) → export PDF/Excel (jika tersedia) → file terunduh | | |
| 2.6 | **Audit** (`/dashboard/audit`) → riwayat aktivitas tampil setelah aksi di atas | | |
| 2.7 | Logout | | |

---

## 3. Area Manager — review & oversight

Login: akun Area Manager (1.2)

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 3.1 | Dashboard hanya menampilkan outlet yang di-assign (PILOT-01) | | |
| 3.2 | **Tasks** (`/dashboard/tasks`) → lihat task outlet pilot | | |
| 3.3 | **History** (`/dashboard/history`) → submission crew (setelah skenario 4) muncul | | |
| 3.4 | **Corrective Actions** (`/dashboard/corrective-actions`) → buat/tutup CAPA jika ada temuan fail | | |
| 3.5 | Logout | | |

---

## 4. Crew / Outlet — kerjakan checklist

Login: akun Crew (1.3)

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 4.1 | Redirect ke **Operator home** (`/dashboard/operator`) — task hari ini tampil | | |
| 4.2 | Buka 1 task → form checklist terbuka | | |
| 4.3 | Isi field teks, pilihan, dan **upload foto evidence** | | |
| 4.4 | Submit checklist → layar pass/fail atau konfirmasi sukses muncul | | |
| 4.5 | Task status berubah (Completed / In Progress sesuai aturan) | | |
| 4.6 | Klik foto evidence → **lightbox** preview berfungsi | | |
| 4.7 | (Opsional) **Push** — banner Aktifkan di `/dashboard/tasks` atau operator | | |
| 4.8 | Logout | | |

---

## 5. Geofencing (jika outlet punya koordinat)

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 5.1 | Admin set lat/lng + radius di profil outlet PILOT-01 | | |
| 5.2 | Crew submit **di luar radius** → sistem menolak atau warning (sesuai setting) | | |
| 5.3 | Crew submit **dalam radius** (atau geofence off) → submit berhasil | | |

---

## 6. Evidence & storage

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 6.1 | Tanpa S3: file ada di `apps/api/uploads/evidence/` | | |
| 6.2 | (Opsional) MinIO jalan + env `S3_*` → URL evidence dari MinIO (console :9001) | | |
| 6.3 | Backup ulang setelah upload: `.\scripts\backup-novaops-local.ps1` | | |

---

## 7. Auth & regression

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 7.1 | `/` redirect ke `/login` (bukan stuck loading) | | |
| 7.2 | Login email/password admin → dashboard OK | | |
| 7.3 | Buka `/dashboard` tanpa token → redirect ke login | | |
| 7.4 | (Opsional) **Sign in with Google** — hanya jika env OAuth diisi | | |
| 7.5 | Refresh halaman dashboard → session tetap (tidak logout sendiri) | | |

---

## 8. API smoke (opsional)

```powershell
cd apps\api
.\.venv\Scripts\python.exe -m pytest tests/test_critical_auth_flow.py tests/test_api_security.py -q
```

- [ ] Semua tes **passed**

---

## 9. Fase F — Offline & mobile (crew)

Chrome DevTools → Network → **Offline** + viewport mobile (390px).

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 9.1 | Badge header tampil **Offline** saat network dimatikan | | |
| 9.2 | Kerjakan task → **Submit (Offline)** → badge **N pending** | | |
| 9.3 | Nyalakan network → auto-sync, pending hilang, task masuk history | | |
| 9.4 | Manual form (`/dashboard/forms`) submit offline → ikut sync | | |
| 9.5 | **Ganti crew** → login crew lain → kembali ke halaman semula | | |
| 9.6 | Banner **Install app** muncul (atau instruksi iOS) | | |

---

## 10. Fase G — Form intelligence

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 10.1 | Admin: buat field Ya/Tidak + Foto dengan kondisi "Tampilkan jika = No" + Required | | |
| 10.2 | Crew: jawab **Yes** → field foto tersembunyi | | |
| 10.3 | Crew: jawab **No** → foto muncul & wajib diisi sebelum submit | | |
| 10.4 | Operator home: bagian **Isi Cepat / Form Library** tampil template aktif | | |
| 10.5 | Tap template dari library → buka form → submit berhasil | | |
| 10.6 | Admin: **Duplicate Template** → salinan draft `(Copy)` muncul | | |
| 10.7 | Submit checklist dengan section → section scores tersimpan (cek history/compliance) | | |

---

## 11. Fase H — People & Visibility

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 11.1 | Crew: operator home menampilkan **Aktivitas Terbaru** | | |
| 11.2 | Selesaikan task → event muncul di `/dashboard/activity` | | |
| 11.3 | Admin: buat & publish pengumuman di `/dashboard/announcements` | | |
| 11.4 | Crew: banner pengumuman + badge unread di header | | |
| 11.5 | Crew: **Saya mengerti** / mark read → badge hilang | | |
| 11.6 | Checklist gagal → event `checklist_failed` + notifikasi supervisor | | |
| 11.7 | Task overdue → event `task_overdue` di activity feed | | |

---

## 12. Fase I — i18n, offline shell, API keys

| # | Langkah | Pass/Fail | Catatan |
|---|---------|-----------|---------|
| 12.1 | Settings → ganti **Language** EN ↔ ID → label login/operator berubah | | |
| 12.2 | Buka `/dashboard/operator` online → DevTools Offline → refresh → shell masih tampil | | |
| 12.3 | Admin → Settings → **API Keys** → buat key → salin (tampil sekali) | | |
| 12.4 | `curl -H "X-API-Key: ..." http://localhost:8000/api/v1/form-templates` → 200 | | |
| 12.5 | Revoke API key → request dengan key lama → 401 | | |
| 12.6 | `.\scripts\health-check-local.ps1` → API + web OK | | |

---

## Ringkasan pilot

| Area | Total skenario | Pass | Fail | Blocker? |
|------|----------------|------|------|----------|
| Setup | 5 | | | |
| Admin | 7 | | | |
| Manager | 5 | | | |
| Crew | 8 | | | |
| Geofence | 3 | | | |
| Evidence | 3 | | | |
| Auth | 5 | | | |
| Offline/mobile (Fase F) | 6 | | | |
| Form intelligence (Fase G) | 7 | | | |
| People & visibility (Fase H) | 7 | | | |
| i18n & integrations (Fase I) | 6 | | | |

**Keputusan:**

- [ ] **Lulus** — siap commit + rencana deploy VPS
- [ ] **Perlu perbaikan** — catat bug di bawah, jangan deploy VPS dulu

### Bug / catatan

| ID | Peran | Langkah | Deskripsi | Severity |
|----|-------|---------|-----------|----------|
| | | | | |

---

## Setelah UAT lulus

1. Minta AI: **"commit perubahan Fase E–I"**
2. UAT singkat ulang post-commit
3. Baru: **"deploy ke vps"**

# NovaOps — Handoff untuk AI / Codex

Dokumen ini supaya **ChatGPT Codex** (atau AI lain) bisa melanjutkan proyek **tanpa chat history Cursor**. Baca file ini dulu sebelum coding.

**Repo:** https://github.com/christianocto8-commits/NovaOpsExecution  
**Production:** https://nova-ops.cloud  
**Branch utama:** `main`  
**Bahasa UI:** Indonesia + English (`apps/web/shared/i18n/translations.ts`)

---

## 1. Apa itu NovaOps?

Platform operasi multi-outlet (Zenput-like) untuk:

- Checklist / SOP harian (Opening, Closing, Food Safety, dll.)
- Task execution outlet (crew submit form + foto)
- Compliance dashboard, Reports, History, Evidence
- CAPA (Corrective Action) otomatis saat checklist gagal
- Schedules, Workflows, Announcements, Notifications
- Area manager + owner admin RBAC

**Target parity Zenput:** ~**96-97%** untuk Ops Execution core berbasis web (Jul 2026).

---

## 2. Struktur monorepo

```
NovaOpsExecution/
├── apps/
│   ├── api/          # FastAPI + SQLAlchemy + Alembic
│   ├── web/          # Next.js 16 + React + TanStack Query
│   └── mobile/       # Capacitor scaffold (belum store-ready)
├── deploy/           # nginx, systemd
├── docs/             # UAT, architecture, integrasi
├── scripts/          # deploy-vps-live.ps1, health-check, dll.
├── novaops.ps1       # CLI local dev (Windows)
└── LOCAL_DEV.md      # Panduan develop local
```

### Frontend (`apps/web`)

- **WAJIB baca** `apps/web/AGENTS.md` sebelum edit Next.js — versi Next.js punya breaking changes vs training data.
- Feature-first: `apps/web/features/<domain>/`
- Shared UI: `apps/web/shared/`
- Services API: `apps/web/services/`
- Navigation & RBAC: `apps/web/shared/navigation/`

### Backend (`apps/api`)

- Domain modules: `apps/api/app/modules/` (identity, tasks, notifications, workflows, lms, iot, …)
- Routers legacy: `apps/api/app/routers/`
- Bootstrap templates: `apps/api/app/bootstrap/ensure_operational_templates.py`
- Tests: `apps/api/tests/` — jalankan sebelum deploy besar

---

## 3. Jalankan local

```powershell
cd NovaOpsExecution
.\novaops.ps1 bootstrap   # pertama kali
.\novaops.ps1 dev         # API :8000 + Web :3000
.\novaops.ps1 stop
```

| URL | Service |
|-----|---------|
| http://localhost:3000 | Web |
| http://localhost:8000/docs | API Swagger |
| http://localhost:8000/api/v1/health | Liveness |
| http://localhost:8000/api/v1/ready | Database readiness |

**Login default:** `admin@novaops.com` / `admin123` (dari `BOOTSTRAP_*` di `apps/api/.env`).

PostgreSQL local: Docker port **5433**. Reset DB: `.\novaops.ps1 reset-db` (ketik `RESET`).

---

## 4. Deploy production (VPS)

```powershell
.\scripts\deploy-vps-live.ps1
```

- Target: `root@103.247.10.145` → `/opt/NovaOpsExecution`
- Build Next standalone, upload API, `alembic upgrade head`, restart systemd
- Health: `https://nova-ops.cloud/api/v1/health`
- Deploy menunggu `/api/v1/ready` agar database ikut tervalidasi
- Setelah deploy API restart ~5–10 detik bisa 502 — normal, tunggu lalu cek lagi

**Jangan commit:** `.env`, `apps/api/uploads/`, `**/novaops-vps.env` (secrets).

---

## 5. Git & commit rules

- Branch: `main`
- **Hanya commit/push jika user minta explicitly**
- Jangan commit: `.env`, uploads runtime, `video-frame-*.jpg`, `__pycache__`
- Push: `git push origin main`

Commit message style: kalimat lengkap, fokus **why** bukan daftar file.

---

## 6. Arsitektur fitur penting

### Task lifecycle (outlet)

| Status | Di mana |
|--------|---------|
| Task belum selesai | `/dashboard/tasks` |
| Task sudah dikerjakan / completed | `/dashboard/reports`, `/dashboard/history` |
| Draft execution | `/dashboard/drafts` |

Logic: `apps/web/features/tasks/utils/task-inbox.ts` (`isOpenTaskInInbox`, `isTaskWorkedOn`).

### Submit task (outlet)

- Drawer: `apps/web/features/tasks/components/outlet-task-execution-drawer.tsx`
- State: `apps/web/features/tasks/hooks/use-task-workspace.ts`
- **Optimistic submit (Jul 2026):** modal checklist muncul instant, API sync background
- Geofence: setting `geofence_enabled` — GPS hanya jika ON
- Hasil: `ChecklistSubmitResultModal` + scoring backend `apps/api/app/services/checklist_scoring.py`

### CAPA (Corrective Action)

- Auto-create saat checklist gagal jika `auto_corrective_action = true` (Settings)
- Toggle + sync UI: `apps/web/features/settings/utils/capa-settings.ts`
- Board: `/dashboard/corrective-actions`
- Backend: `source_type = "corrective_action"` di `apps/api/app/modules/tasks/service.py`

### Incident & Follow-Up

- Workspace: `/dashboard/incidents`
- Backend: `apps/api/app/modules/incidents/`
- Review Queue dapat membuat Follow-Up Action langsung dari exception
- Outlet menerima follow-up lewat Notifications dan dapat mulai/menyelesaikannya
- Incident baru serta assignment/completion membuat in-app dan push notification

### Notifications

- Unread count + mark read on open: `read_at` on `notification_deliveries`
- Migration: `20260723_0003_add_notification_delivery_read_at.py`

### Announcements

- Header megaphone + slide panel untuk outlet/AM
- `apps/web/features/announcements/`

### Form builder (Zenput parity)

- Kategori: `apps/web/features/forms/constants/form-categories.ts` (`ZENPUT_FORM_CATEGORIES`)
- **Jangan** pakai field `money_denomination` / `money_amount` di builder — pakai **Number** (Zenput style)
- Bootstrap templates pakai `number` untuk cash float

### Settings workspace

- Owner admin: `/dashboard/settings` → tab Organization / Operations / Integrations
- CAPA toggle: **Task & SOP Policy → Auto corrective action (CAPA)**

---

## 7. Role & navigasi

| Role | Workspace | Nav khusus |
|------|-----------|------------|
| OUTLET (crew) | outlet | Tasks, Forms, Reports, Operator home, bottom tabs |
| AREA_MANAGER | area | Compliance, tasks read-only scope |
| OWNER_ADMIN | enterprise | Full sidebar |

Permission engine: `apps/web/shared/navigation/permission-engine.ts`  
Outlet scope filter: `apps/web/shared/navigation/outlet-scope.ts`

---

## 8. Migrasi DB terbaru (Jul 2026)

```
20260731_0001_add_incident_followup_lifecycle.py
20260731_0002_add_training_assessments.py
```

Selalu jalankan `alembic upgrade head` saat deploy.

---

## 9. Tes otomatis

```powershell
# API parity + crew UAT
cd apps\api
python -m pytest tests/test_zenput_form_parity.py tests/test_parity_gates.py tests/test_crew_uat_smoke.py tests/test_iot_lms.py -q

# Web typecheck
cd apps\web
npm run typecheck

# E2E offline (optional)
npm run test:e2e:offline
```

Target: pytest parity **24+ pass**, `tsc --noEmit` clean.

---

## 10. Parity Zenput — skor & gap

| Area | ~% | Catatan |
|------|---:|---------|
| Platform overall (web) | **91** | Credible Zenput alternative |
| Crew outlet PWA | **93** | Submit optimistic, offline queue |
| Enterprise (SAML, native store) | **72–74** | Gap utama |

### Sudah setara (≥85%)

- Checklist + scoring + geofence
- Recurring schedules + assignee
- Form builder kategori Zenput
- CAPA auto + toggle Settings
- Compliance export PDF/Excel
- Webhooks + delivery log
- Workflow builder (differentiator NovaOps)

### Gap terbesar (prioritas roadmap)

1. **Native iOS/Android** store release — `docs/NATIVE_STORE_RELEASE.md`, `apps/mobile/`
2. **SAML SSO** — `docs/SAML_SSO_ROADMAP.md` (OIDC scaffold ada)
3. **Twilio SMS live** — `docs/TWILIO_SMS_SETUP.md` (kode ada, creds belum)
4. **IoT sensor depth** — `docs/IOT_LMS_ROADMAP.md`, modul `apps/api/app/modules/iot/`
5. **LMS training** depth — modul ada, gate default ON bisa block crew

---

## 11. Bug / pitfall yang pernah terjadi

| Issue | Fix / lokasi |
|-------|----------------|
| Drawer task flicker, tidak bisa close | `handledTaskIdRef` + clear URL `?taskId=` — `tasks-workspace.tsx` |
| Submit lambat 10–15 detik | Optimistic submit — `use-task-workspace.ts` |
| Badge notif tidak hilang | `read_at` + mark read on panel open |
| Foto duplikat di History | `shared/evidence/submission-evidence.ts` |
| Task completed masih di Tasks menu | `task-inbox.ts` filters |
| CAPA menu muncul saat OFF | `isCapaEnabled()` + nav filter |
| Next.js APIs salah | Baca `node_modules/next/dist/docs/` |

---

## 12. Env & integrasi

| Integrasi | Status | Doc |
|-----------|--------|-----|
| VAPID Web Push | Live di VPS | `LOCAL_DEV.md` |
| Twilio SMS | Code only | `docs/TWILIO_SMS_SETUP.md` |
| OIDC SSO | Env placeholders | `docs/OIDC_SSO_SETUP.md` |
| SAML | Roadmap | `docs/SAML_SSO_ROADMAP.md` |
| FCM native | Scaffold | `docs/NATIVE_STORE_RELEASE.md` |

Settings integrasi UI: `apps/web/features/settings/components/integrations-status-panel.tsx`

---

## 13. Prompt starter untuk Codex

Copy-paste ini ke Codex saat mulai session baru:

```
Saya melanjutkan NovaOpsExecution dari GitHub.
Baca docs/HANDOFF.md dan apps/web/AGENTS.md dulu.

Repo: christianocto8-commits/NovaOpsExecution, branch main.
Production: https://nova-ops.cloud

Aturan:
- Jangan commit .env atau uploads
- Hanya commit jika saya minta
- Deploy: scripts/deploy-vps-live.ps1
- Next.js 16 — cek node_modules/next/dist/docs sebelum pakai API Next

Tugas saya: [ISI DI SINI — contoh: "tambah SAML login" / "perbaik IoT page" / "native Android build"]
```

---

## 14. Dokumen terkait

| File | Isi |
|------|-----|
| `LOCAL_DEV.md` | Develop local, VAPID, reset DB |
| `docs/UAT_RESULTS_LOCAL_20260722.md` | UAT + parity matrix detail |
| `docs/PILOT_UAT_CHECKLIST.md` | Checklist UAT crew |
| `docs/architecture/overview.md` | Arsitektur high-level |
| `docs/IOT_LMS_ROADMAP.md` | Roadmap IoT + LMS |
| `deploy/README_VPS.md` | Catatan VPS |
| `apps/web/AGENTS.md` | Rules Next.js wajib |

---

## 15. Kontak / ownership

- GitHub: `christianocto8-commits/NovaOpsExecution`
- VPS: `103.247.10.145` (root, `/opt/NovaOpsExecution`)
- Bahasa komunikasi dengan owner: **Bahasa Indonesia**

---

*Terakhir diupdate: 23 Jul 2026 — optimistic submit mobile, CAPA toggle, Zenput form fields, parity ~91%.*

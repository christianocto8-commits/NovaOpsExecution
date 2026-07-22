# UAT Local — Hasil 22 Jul 2026

Environment: http://localhost:3000 · API http://localhost:8000  
Tester: automated + browser smoke (admin)  
**Commit/deploy: TIDAK** (sesuai instruksi)

---

## Ringkasan

| Area | Hasil | Catatan |
|------|-------|---------|
| Stack & health | **PASS** | API ok, web ok, `health-check-local.ps1` pass |
| Pytest regression | **PASS** | 19/19 (auth, security, template settings, submit execution) |
| Auth (7.x) | **PASS** | `/` → login, admin login OK, dashboard load, refresh OK |
| QW1 Assignee | **PASS** | Dropdown: Outlet Team / Area Manager / NovaOps Admin |
| QW2 Optional note | **PASS*** | Backend OK; UI bug diperbaiki (`ensureResponsiblePersonField`) |
| QW3 Geofence UI | **PASS** | Setting geofence tampil di Settings |
| QW4 Offline modal | **PARTIAL** | Logic ada + unit scoring; perlu uji DevTools Offline manual |
| Hydration | **FIXED** | AuthGuard + login page + QW2 field mapping |
| Multi-role pilot (1–4) | **MANUAL** | Butuh akun Area Manager + Crew (belum diuji otomatis) |
| **Crew UAT smoke (4–5, push)** | **PASS** | `test_crew_uat_smoke.py` — geofence, optional note, push endpoint |
| Fase F–I penuh | **MANUAL** | Offline sync, announcements — butuh skenario crew browser |

---

## Detail otomatis

### 0. Persiapan
- [x] Stack jalan
- [x] Health OK
- [ ] Backup — tidak dijalankan
- [x] Pytest 19 passed

### 7. Auth
- [x] 7.1 `/` redirect login
- [x] 7.2 Login admin → dashboard
- [x] 7.3 Tanpa token → client redirect (SSR 200 + AuthGuard)
- [x] 7.5 Refresh session tetap

### Quick Wins
- [x] **QW1** Create Task drawer → combobox Assignee dengan 3 opsi
- [x] **QW2** Template "Template settings optional note" → checkbox catatan **OFF** (setelah fix)
- [x] **QW3** Settings menampilkan konfigurasi geofence
- [ ] **QW4** Submit offline + modal pass/fail — uji manual

### 12.6 Health script
- [x] `scripts/health-check-local.ps1` — All checks passed

---

## Crew UAT — automated smoke (PILOT_UAT 4, 5, 4.7)

Referensi: [PILOT_UAT_CHECKLIST.md](./PILOT_UAT_CHECKLIST.md) §4 Crew, §5 Geofence, §4.7 Push.

| # | Skenario | Hasil | Catatan |
|---|----------|-------|---------|
| 4.x | Submit checklist + optional execution note | **PASS** | `test_crew_optional_execution_note_when_template_opted_out` |
| 5.2 | Submit di luar radius → ditolak | **PASS** | `test_crew_geofence_rejects_outside_radius` |
| 5.3 | Submit dalam radius → berhasil | **PASS** | `test_crew_geofence_accepts_within_radius` |
| 4.7 | Push notification endpoint | **PASS*** | `test_crew_push_test_endpoint_exists` — 503 jika VAPID belum diisi |
| 9.x | Offline sync + modal | **MANUAL** | DevTools Offline — belum diotomasi |

Jalankan:

```powershell
cd apps\api
python -m pytest tests/test_crew_uat_smoke.py -v
```

---

## Bug ditemukan & diperbaiki (session ini)

| ID | Severity | Deskripsi | Status |
|----|----------|-----------|--------|
| UAT-01 | Medium | Hydration mismatch AuthGuard (localStorage vs SSR) | Fixed |
| UAT-02 | Low | Hydration warning login page (remember username) | Fixed |
| UAT-03 | Medium | QW2: `ensureResponsiblePersonField` menimpa `require_execution_note` dari API | Fixed |

---

## Keputusan

- [ ] **Lulus penuh** — masih perlu UAT manual multi-role + offline (Fase F–I)
- [x] **Perlu UAT manual tambahan** — crew flow, geofence submit, offline modal

### Langkah berikutnya (setelah manual OK)
1. UAT crew: operator home → submit checklist → lightbox evidence
2. UAT offline: DevTools Offline → submit → sync
3. Minta commit quick wins + bugfix
4. Deploy VPS

---

## Integrations + Mobile/Offline batch (22 Jul — follow-up)

| Item | Hasil | Catatan |
|------|-------|---------|
| Migration `20260722_0005` (webhook_deliveries) | **PASS** | `alembic upgrade head` OK |
| VAPID keys local | **DONE** | `apps/api/.env` + `apps/web/.env.local` |
| Pytest crew + webhook + SMS | **PASS** | 10/10 |
| Health check | **PASS** | API + Web :8000 / :3000 |
| Service worker on boot | **PASS** | CDP: `sw.js` registered, scope `/` |
| Capacitor Android | **DONE** | `android/` + `@capacitor/network`, `cap sync` OK |
| Push live (browser) | **RESTART** | Restart API + Web agar VAPID env terbaca |
| Twilio SMS | **PENDING** | Credentials belum diisi — toggle ada di Settings |
| Offline modal QW4 | **PARTIAL** | Contract tests PASS; manual DevTools — lihat Fase F |
| Integrations batch pytest | **PASS** | 13/13 (crew, webhook log, SMS, offline contract) |

### UAT Offline (Langkah 1) — checklist manual

1. [ ] Restart stack: `.\novaops.ps1 stop` → `.\novaops.ps1 dev`
2. [ ] Login crew/admin → `/dashboard/tasks` — muat task saat **online**
3. [ ] DevTools → Network → **Offline**
4. [ ] Buka task → isi checklist → **Simpan draft** atau **Submit**
5. [ ] Badge header: **Offline** + jumlah pending
6. [ ] Matikan Offline → badge sync hilang, data terkirim

**Otomatis terverifikasi:** service worker boot, offline sync provider, keep-alive route (pytest contract).

### Capacitor dev (Android emulator)

```powershell
cd apps\web
npm run cap:android
```

`capacitor.config.ts` → `server.url: http://10.0.2.2:3000` (emulator → host). Untuk device fisik, ganti ke LAN IP PC.

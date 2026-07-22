# NovaOps Mobile (Capacitor)

Native shell for outlet crew — wraps the Next.js web app in Android/iOS WebView.

## Prerequisites

- Node.js 20+
- Android Studio (Android)
- Xcode (iOS, macOS only)
- Local stack: `.\novaops.ps1 dev`

## Setup

```powershell
cd apps\web
npm install
npx cap add android
```

`capacitor.config.ts` is in `apps/web/`.

## Dev workflow (recommended)

Capacitor loads the **live dev server** instead of static export:

1. Start stack: `.\novaops.ps1 dev`
2. Edit `apps/web/capacitor.config.ts` — uncomment `server.url`:
   - Emulator: `http://10.0.2.2:3000`
   - Physical device: `http://<LAN-IP>:3000`
3. Sync and open Android Studio:

```powershell
npm run cap:sync
npm run cap:android
```

## What works in WebView

| Feature | Status |
|---------|--------|
| IndexedDB offline queue | Yes |
| Service worker shell cache | Yes (registered on app boot) |
| Geofence + photo evidence | Yes (browser APIs) |
| Capacitor Network status | Yes (`@capacitor/network`) |
| Web Push (VAPID) | Limited in WebView |
| Native FCM/APNs | Not yet — deferred |

## Production build (future)

Static export to `out/` requires a dedicated Next.js export build. Current default is `standalone` for VPS deploy. For store release, add a separate `build:mobile` target.

## Notes

- Do **not** publish to Play Store / App Store until signing pipeline is configured.
- Push notifications on native require Firebase (Android) / APNs (iOS) — see roadmap.

# NovaOps Mobile (Capacitor)

Native shell for outlet crew — wraps the Next.js web app in Android/iOS WebView.

## Prerequisites

- Node.js 20+
- Android Studio (Android)
- Xcode 15+ (iOS — **macOS only**)
- Local stack: `.\novaops.ps1 dev`

## Setup

```powershell
cd apps\web
npm install
npx cap add android   # already scaffolded in repo
# iOS (macOS only):
# npx cap add ios
```

`capacitor.config.ts` is in `apps/web/`.

## Dev workflow (recommended)

Capacitor loads the **live dev server** instead of static export:

1. Start stack: `.\novaops.ps1 dev`
2. Edit `apps/web/capacitor.config.ts` — set `server.url`:
   - Android emulator: `http://10.0.2.2:3000`
   - iOS simulator: `http://localhost:3000`
   - Physical device: `http://<LAN-IP>:3000`
3. Sync and open IDE:

```powershell
npm run cap:sync
npm run cap:android   # Windows / Linux / macOS
npm run cap:ios       # macOS + Xcode only
```

## What works in WebView

| Feature | Status |
|---------|--------|
| IndexedDB offline queue | Yes |
| Service worker shell cache | Yes (registered on app boot) |
| Geofence + photo evidence | Yes (browser APIs) |
| Capacitor Network status | Yes (`@capacitor/network`) |
| Web Push (VAPID) | Limited in WebView |
| Native FCM/APNs | Scaffold (`@capacitor/push-notifications` + `NativePushBootstrap`) |

## Firebase Cloud Messaging (Android)

1. Create Firebase project → Android app `com.novaops.execution`
2. Download `google-services.json` → `apps/web/android/app/`
   - Copy from `google-services.json.example` as a template; **do not commit real keys**
3. Gradle auto-applies Google Services plugin when the file exists (see `android/app/build.gradle`)
4. `npm run cap:sync` → rebuild in Android Studio
5. Verify: Settings → Integration Readiness → **Native FCM** pill = Configured

### Push bridge (client)

`NativePushBootstrap` registers on native boot via `lib/capacitor/push-bridge.ts`:

- Requests permission → `PushNotifications.register()`
- Stores FCM token in `localStorage` key `novaops_native_push_token`
- Shows foreground notifications when permission granted

Backend token registration endpoint is a future item (web push VAPID covers browser today).

## Apple Push Notifications (iOS)

Requires macOS + Xcode:

1. `npx cap add ios` (generates `apps/web/ios/`)
2. Enable Push Notifications capability in Xcode
3. Upload APNs key to Firebase (if using FCM) or configure directly in Apple Developer
4. `npm run cap:sync` → run on simulator/device

iOS folder is **not committed** until generated on a Mac; follow the same `server.url` dev pattern as Android.

## Production build (future)

Static export to `out/` requires a dedicated Next.js export build. Current default is `standalone` for VPS deploy. For store release, add a separate `build:mobile` target.

## Notes

- Do **not** publish to Play Store / App Store until signing pipeline is configured.
- Real `google-services.json` and APNs certs stay **local only** — use `.example` files in repo.
- Enterprise SAML SSO: see [docs/SAML_SSO_ROADMAP.md](../../docs/SAML_SSO_ROADMAP.md) (OIDC available now).

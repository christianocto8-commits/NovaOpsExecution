# NovaOps Mobile (Capacitor scaffold)

Scaffold only — **do not publish** to Play Store / App Store yet.

## Prerequisites

- Node.js 20+
- Android Studio (for Android)
- Xcode (for iOS, macOS only)
- Local stack running: `.\novaops.ps1 dev`

## Setup (from repo root)

```powershell
cd apps\web
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init NovaOps com.novaops.execution --web-dir out
```

`capacitor.config.ts` is already present in `apps/web/`.

## Build web assets for native shell

Capacitor wraps the exported Next.js static output. For local dev/testing:

```powershell
cd apps\web
npm run build
npx cap add android
npx cap copy android
npx cap open android
```

## Point app to local API (dev)

In `capacitor.config.ts`, optionally set:

```ts
server: {
  url: "http://10.0.2.2:3000", // Android emulator → host machine
  cleartext: true,
}
```

Use your LAN IP for physical devices.

## Notes

- Offline queue (IndexedDB) and service worker continue to work inside WebView.
- Push notifications require native Firebase/APNs setup — not included in this scaffold.
- Store signing, provisioning profiles, and release pipelines are deferred.

# NovaOps Mobile (Capacitor)

Native shell for outlet operations. Production builds load `https://nova-ops.cloud`
over HTTPS; development builds use `CAPACITOR_DEV_URL`.

## Requirements

- Node.js 20+
- Android Studio and JDK 17 for Android
- Xcode 15+ on macOS for iOS
- A real signing keystore for store artifacts

## Development

```powershell
cd apps\web
npm install
$env:CAPACITOR_ENV="development"
$env:CAPACITOR_DEV_URL="http://10.0.2.2:3000"
npm run cap:sync
npm run cap:android
```

Use `http://localhost:3000` for the iOS simulator and a LAN URL for a physical device.

## Android Release

Keep the keystore and passwords outside the repository:

```powershell
$env:NOVAOPS_ANDROID_KEYSTORE="C:\secure\novaops-upload.keystore"
$env:NOVAOPS_ANDROID_STORE_PASSWORD="<secret>"
$env:NOVAOPS_ANDROID_KEY_ALIAS="novaops"
$env:NOVAOPS_ANDROID_KEY_PASSWORD="<secret>"
$env:NOVAOPS_VERSION_CODE="2"
$env:NOVAOPS_VERSION_NAME="1.0.1"
.\scripts\build-mobile.ps1 -Environment production -BuildType Release
```

The build script validates HTTPS production configuration, permissions, signing
variables, and keystore existence before producing APK/AAB artifacts in `dist/mobile`.

## Native Capabilities

- IndexedDB offline queue and conflict-aware sync
- Camera and location evidence
- Network status bridge
- FCM/APNs token registration through `/api/v1/notifications`
- Push notification bootstrap via `@capacitor/push-notifications`

Real `google-services.json`, APNs credentials, keystores, and passwords must never be
committed. iOS archive/signing still requires macOS, Xcode, and an Apple Developer team.

# Native Store Release Guide

## Android (Google Play)

```powershell
cd apps\web
npm run build:mobile
npm run cap:sync
cd android
.\gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Checklist: Play Developer account, release keystore (local only), privacy policy, screenshots.

## iOS (App Store)

Requires macOS: `npx cap sync ios` → Xcode → Archive → TestFlight.

## Versioning

Update `package.json` version and Android `versionCode` before each submission.

# NovaOps Android — Outlet Only

Aplikasi native Android (Capacitor) yang membungkus NovaOps untuk **role Outlet saja**,
terhubung langsung ke database production di https://nova-ops.cloud.

## Cara build ulang APK (dari Windows ini)

```powershell
cd apps/web
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME = "$env:USERPROFILE\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

# 1) Build web + sync ke Capacitor (mode production = wrapper ke live site)
$env:CAPACITOR_ENV = "production"
npm run release:android

# 2) Compile APK debug (bisa di-install langsung, tanpa keystore)
cd android
.\gradlew assembleDebug

# 3) (Opsional) Compile APK release — BUTUH keystore signing.
#    Generate keystore sekali:
#      keytool -genkey -v -keystore novaops-outlet.keystore -alias novaops -keyalg RSA -keysize 2048 -validity 10000
#    Lalu isi signing config di android/app/build.gradle, lalu:
#      .\gradlew assembleRelease
```

APK hasil:
- Debug: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `apps/web/web/android/app/build/outputs/apk/release/app-release.apk`

## Mode koneksi (penting)

APK dibuild dalam **wrapper mode**: aplikasi memuat https://nova-ops.cloud langsung
di dalam WebView native. Alhasil:
- Origin aplikasi == origin API → tidak ada masalah CORS, login & data connect 100%.
- Aplikasi otomatis mengikuti update web (deploy baru ke VPS langsung muncul di app).

## Gating "Outlet Only"

Logika pembatasan role ada di `apps/web/providers/AuthProvider.tsx`
(flag `NEXT_PUBLIC_OUTLET_ONLY` / helper `shouldDenyRole` di `shared/outlet-only.ts`).
Bila akun yang login bukan role `outlet`, app menampilkan layar **Akses Ditolak**
dan tidak membuka dashboard.

Karena app memuat live site, agar gating aktif di dalam APK, **deploy ulang web**
(setelah perubahan ini) ke VPS:

```powershell
cd NovaOpsExecution
.\scripts\deploy-vps-live.ps1
# (butuh SSH key C:\Users\ACER\.ssh\novaops_vps_ed25519)
```

## Catatan CORS API

`apps/api/app/core/config.py` sudah diubah agar selalu mengizinkan origin
`http://localhost`, `capacitor://localhost`, dan `https://nova-ops.cloud`.
Agar berlaku, deploy ulang API ke VPS (termasuk dalam `deploy-vps-live.ps1`).

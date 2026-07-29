# Panduan Rilis Mobile App Native (Google Play Store & Apple App Store)

Dokumen ini berisi panduan komprehensif untuk memproduksi dan merilis aplikasi mobile **NovaOps Enterprise** (`com.novaops.execution`) ke Google Play Store dan Apple App Store.

---

## 📱 1. Persiapan Build Artifact (Capacitor)

Jalankan skrip build otomatis dari root repository:

```powershell
.\scripts\build-mobile.ps1 -Environment production -BuildType Release
```

Skrip di atas akan:
1. Membangun static export Next.js (`apps/web/out`)
2. Menyingkronkan aset ke Capacitor (`npx cap sync android`)
3. Mengompilasi paket Android APK & AAB (`dist/mobile/`)

---

## 🤖 2. Rilis Google Play Store (Android)

### 2.1 Membuat Upload Keystore (Satu Kali Saja)

Jalankan command `keytool` untuk membuat Release Keystore:

```powershell
keytool -genkey -v -keystore novaops-release.keystore `
  -alias novaops-key-alias `
  -keyalg RSA -keysize 2048 -validity 10000
```

> **IMPORTANT**: Simpan file `novaops-release.keystore` dan password-nya di tempat yang aman. Keystore ini dibutuhkan untuk setiap update app di Google Play.

### 2.2 Menandatangani File AAB (Android App Bundle)

```powershell
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 `
  -keystore novaops-release.keystore `
  dist/mobile/app-release-unsigned.aab novaops-key-alias
```

### 2.3 Upload ke Google Play Console
1. Buka [Google Play Console](https://play.google.com/console).
2. Buat Aplikasi Baru dengan Package Name: `com.novaops.execution`.
3. Masuk ke **Testing > Production** → Klik **Create new release**.
4. Upload file `dist/mobile/app-release.aab`.
5. Isi Release Notes dan lengkapi Store Listing (Icon 512x512, Screenshot, Privacy Policy URL).
6. Klik **Save** → **Review release** → **Start rollout to Production**.

---

## 🍏 3. Rilis Apple App Store (iOS)

### 3.1 Prasyarat Build iOS
* Mac dengan macOS & Xcode 15+
* Akun Apple Developer Program ($99/tahun)

### 3.2 Buka Xcode Project dari Capacitor
```bash
cd apps/web
npx cap open ios
```

### 3.3 Konfigurasi Signing & Capabilities
1. Di Xcode, pilih project `App`.
2. Buka tab **Signing & Capabilities**.
3. Pilih **Team** (Apple Developer Account).
4. Tambahkan Capabilities:
   * **Push Notifications**
   * **Background Modes** (Remote notifications & Background fetch)

### 3.4 Archive & Upload ke App Store Connect
1. Pilih target device **Any iOS Device (arm64)**.
2. Pilih menu **Product > Archive**.
3. Setelah proses Archive selesai, jendela Organizer akan terbuka.
4. Klik **Distribute App** → Pilih **App Store Connect** → **Upload**.
5. Buka [App Store Connect](https://appstoreconnect.apple.com).
6. Pilih build yang telah di-upload di TestFlight / Production release.
7. Isi App Information, Screenshots, dan submit untuk **App Review**.

---

## 🔔 4. Konfigurasi Push Notification Native (FCM / APNs)

### Android (Firebase Cloud Messaging - FCM)
1. Buka [Firebase Console](https://console.firebase.google.com).
2. Tambahkan Android App dengan package `com.novaops.execution`.
3. Download `google-services.json` dan letakkan di `apps/web/android/app/google-services.json`.

### iOS (Apple Push Notification service - APNs)
1. Buat **APNs Authentication Key (.p8)** di Apple Developer Portal.
2. Upload Key `.p8` ke Firebase Console di bawah **Project Settings > Cloud Messaging > iOS app configuration**.

---

## 📑 Checklist Sebelum Submit Ke Store

- [ ] Version code & version name telah di-bump di `apps/web/android/app/build.gradle`
- [ ] URL API backend mengarah ke production (`https://nova-ops.cloud`)
- [ ] Geofencing GPS permission diizinkan di manifest (`ACCESS_FINE_LOCATION`)
- [ ] Push Notification VAPID/FCM credentials telah aktif
- [ ] Offline sync banner teruji dan berfungsi di kondisi tanpa jaringan

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const requiredPaths = [
  "capacitor.config.ts",
  "android/app/build.gradle",
  "android/gradlew",
  "android/app/src/main/AndroidManifest.xml",
];

const missing = requiredPaths.filter((path) => !existsSync(join(process.cwd(), path)));

if (missing.length > 0) {
  console.error("Mobile release check failed. Missing:");
  missing.forEach((path) => console.error(`- ${path}`));
  process.exit(1);
}

const capacitorConfig = readFileSync(join(process.cwd(), "capacitor.config.ts"), "utf8");
const manifest = readFileSync(
  join(process.cwd(), "android/app/src/main/AndroidManifest.xml"),
  "utf8",
);
const gradle = readFileSync(join(process.cwd(), "android/app/build.gradle"), "utf8");
const checks = [
  ["production URL", capacitorConfig.includes("CAPACITOR_PRODUCTION_URL")],
  ["HTTPS-only production shell", capacitorConfig.includes("cleartext: false")],
  ["camera permission", manifest.includes("android.permission.CAMERA")],
  ["location permission", manifest.includes("android.permission.ACCESS_FINE_LOCATION")],
  ["notification permission", manifest.includes("android.permission.POST_NOTIFICATIONS")],
  ["backup disabled", manifest.includes('android:allowBackup="false"')],
  ["release signing configuration", gradle.includes("NOVAOPS_ANDROID_KEYSTORE")],
  ["environment versioning", gradle.includes("NOVAOPS_VERSION_CODE")],
];
const failedChecks = checks.filter(([, passed]) => !passed);
if (failedChecks.length) {
  console.error("Mobile release check failed:");
  failedChecks.forEach(([name]) => console.error(`- ${name}`));
  process.exit(1);
}

const requireSigning = process.argv.includes("--require-signing");
if (requireSigning) {
  const requiredSigning = [
    "NOVAOPS_ANDROID_KEYSTORE",
    "NOVAOPS_ANDROID_STORE_PASSWORD",
    "NOVAOPS_ANDROID_KEY_ALIAS",
    "NOVAOPS_ANDROID_KEY_PASSWORD",
  ];
  const missingSigning = requiredSigning.filter((name) => !process.env[name]);
  if (missingSigning.length) {
    console.error(`Signing environment missing: ${missingSigning.join(", ")}`);
    process.exit(1);
  }
  if (!existsSync(process.env.NOVAOPS_ANDROID_KEYSTORE)) {
    console.error("NOVAOPS_ANDROID_KEYSTORE does not point to an existing file.");
    process.exit(1);
  }
}

console.log("Mobile release check passed. Android project is ready for store signing.");

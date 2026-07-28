import { existsSync } from "node:fs";
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

console.log("Mobile release check passed. Android project is ready for signed APK/AAB build.");

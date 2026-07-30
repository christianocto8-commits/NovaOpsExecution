#!/usr/bin/env node
/**
 * Release the offline (bundle-local) outlet-only Android app.
 *
 * Sets the required build env (production API URL + outlet-only flag +
 * Capacitor offline mode) then builds the static bundle and syncs Capacitor.
 *
 * Usage: node scripts/release-offline-android.mjs
 * Then: cd android && gradlew assembleDebug   (or assembleRelease)
 */
import { spawnSync } from "node:child_process";

const root = process.cwd();

process.env.NEXT_PUBLIC_API_URL = "https://nova-ops.cloud";
process.env.NEXT_PUBLIC_OUTLET_ONLY = "1";
process.env.CAPACITOR_ENV = "production";
process.env.CAPACITOR_OFFLINE = "1";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true, cwd: root });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("[1/2] Building offline outlet-only bundle...");
run("node", ["scripts/build-offline-capacitor.mjs"]);

console.log("[2/2] Syncing Capacitor Android (production / offline)...");
run("npx", ["cap", "sync", "android"]);

console.log("Done. Build the APK with: cd android && gradlew assembleDebug");

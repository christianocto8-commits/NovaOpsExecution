#!/usr/bin/env node
/**
 * Build the offline (static-export) Capacitor bundle for the outlet-only
 * Android app.
 *
 * Steps:
 *  1. Temporarily move app/api out of the tree (Next static export does not
 *     support API route handlers; the mobile build calls the production API
 *     by absolute URL, so the proxy is unused).
 *  2. Run `next build` with the export config (output: "export").
 *  3. Restore app/api.
 *  4. Copy public assets into out/ (Next export already emits HTML + _next).
 */
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const appDir = join(root, "app");
const apiDir = join(appDir, "api");
const apiBackup = join(root, ".api-backup-mobile");
const outDir = join(root, "out");
const publicDir = join(root, "public");

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true, cwd: root });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const mainConfig = join(root, "next.config.ts");
const mobileConfig = join(root, "next.config.mobile.ts");
const configBackup = join(root, ".next-config-backup.ts");

// 1. Move API routes aside so the static export build does not choke on them.
if (existsSync(apiDir)) {
  console.log("Moving app/api aside for static export...");
  renameSync(apiDir, apiBackup);
}

// 1b. Next 16 loads its config only from next.config.{js,mjs,ts,mts} in the
// project root; the `-c`/`--config` flag was removed. Swap the mobile export
// config into place for the build, then restore the original afterwards.
const swappedConfig = existsSync(mobileConfig) && existsSync(mainConfig);
if (swappedConfig) {
  console.log("Swapping next.config.ts with next.config.mobile.ts...");
  renameSync(mainConfig, configBackup);
  renameSync(mobileConfig, mainConfig);
}

// Note: do NOT call process.exit() before the finally block runs, otherwise
// app/api and next.config.ts would be left in the swapped-out state.
let buildStatus = 0;
try {
  console.log("Building static export (output: export)...");
  const result = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: true,
    cwd: root,
  });
  buildStatus = result.status ?? 1;
} finally {
  // 3. Always restore app/api.
  if (existsSync(apiDir)) {
    // Already present (e.g. restore ran successfully) — clean up backup.
    if (existsSync(apiBackup)) rmSync(apiBackup, { recursive: true, force: true });
  } else if (existsSync(apiBackup)) {
    console.log("Restoring app/api from backup...");
    renameSync(apiBackup, apiDir);
  } else {
    console.error("app/api missing and no backup — restoring from git...");
    spawnSync("git", ["checkout", "--", "app/api"], { stdio: "inherit", shell: true, cwd: root });
  }
  // 3b. Always restore the original next.config.ts.
  if (swappedConfig) {
    console.log("Restoring next.config.ts...");
    renameSync(mainConfig, mobileConfig);
    renameSync(configBackup, mainConfig);
  }
}
if (buildStatus !== 0) {
  process.exit(buildStatus);
}

// 4. Assemble the Capacitor webDir (out/) from the Next export output.
//    Next 16 writes HTML to .next/server/app and static assets to .next/static.
const exportHtmlDir = join(root, ".next", "server", "app");
const exportStaticDir = join(root, ".next", "static");

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

if (existsSync(exportHtmlDir)) {
  cpSync(exportHtmlDir, outDir, { recursive: true });
}
if (existsSync(exportStaticDir)) {
  mkdirSync(join(outDir, "_next"), { recursive: true });
  cpSync(exportStaticDir, join(outDir, "_next", "static"), { recursive: true });
}
if (existsSync(publicDir)) {
  cpSync(publicDir, outDir, { recursive: true, overwrite: true });
}

console.log("Capacitor offline webDir ready at out/");
console.log("Run: npx cap sync android");

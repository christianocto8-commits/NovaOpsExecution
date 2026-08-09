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

// 1. Move API routes aside so the static export build does not choke on them.
if (existsSync(apiDir)) {
  console.log("Moving app/api aside for static export...");
  renameSync(apiDir, apiBackup);
}

try {
  console.log("Building static export (output: export)...");
  const buildEnv = { ...process.env, NEXT_CONFIG_FILE: "next.config.mobile.ts" };
  const result = spawnSync("npx", ["next", "build", "-c", "next.config.mobile.ts"], {
    stdio: "inherit",
    shell: true,
    cwd: root,
    env: buildEnv,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
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

#!/usr/bin/env node
/**
 * Prepare Capacitor webDir for production sync.
 * 1. Runs `next build`
 * 2. Copies static assets into `out/` for `npx cap sync`
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outDir = join(root, "out");
const nextStatic = join(root, ".next", "static");
const publicDir = join(root, "public");

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true, cwd: root });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Building Next.js app...");
run("npm", ["run", "build"]);

if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

if (existsSync(publicDir)) {
  cpSync(publicDir, outDir, { recursive: true });
}

if (existsSync(nextStatic)) {
  const targetStatic = join(outDir, "_next", "static");
  mkdirSync(join(outDir, "_next"), { recursive: true });
  cpSync(nextStatic, targetStatic, { recursive: true });
}

writeFileSync(
  join(outDir, "index.html"),
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NovaOps</title>
  <link rel="manifest" href="/manifest.webmanifest" />
  <meta name="theme-color" content="#274733" />
  <style>
    body { font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#F7FAF8; color:#274733; }
  </style>
</head>
<body>
  <main>
    <h1>NovaOps Mobile Shell</h1>
    <p>Static bundle prepared for Capacitor. Point CAPACITOR_ENV=production and run <code>npx cap sync</code>.</p>
    <p>For live dev, set CAPACITOR_ENV=development in capacitor.config.ts server.url mode.</p>
  </main>
</body>
</html>`,
  "utf8",
);

console.log("Capacitor webDir ready at out/");
console.log("Run: npx cap sync");

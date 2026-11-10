#!/usr/bin/env node
// Fails when a shared package names an app.
//
// `@vvedantb/ui` and `@vvedantb/server` serve several apps. App-specific
// details are passed in by the app.
//
//   ui:     .ts, .tsx, .svg, .css under src, shell/src and app/src. Test files
//           are skipped. `src/brand/` is the one exception: it holds the family
//           marks and names the apps.
//   server: every file under src and docs, plus README.md, CHANGELOG.md and
//           package.json.
//
// Run `node scripts/check-no-app-names.mjs --self-test` to check the pattern.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

// The distinctive names match anywhere (`__VIBOT_SNAPSHOT__`, `vmemClient`).
// The short ones that are also English words match as whole words only.
export const APP_NAMES = /(?:vibot|vmem|vhub|velth)|\b(?:eva|verve)\b/i;
// The retired plan slug `vibot_pro` is a Clerk Billing key (ui) and history (server).
const LEGACY_PLAN_SLUG = /vibot_pro/gi;

export function hitsIn(text) {
  return text
    .split("\n")
    .flatMap((line, i) => (APP_NAMES.test(line.replace(LEGACY_PLAN_SLUG, "")) ? [`${i + 1}: ${line.trim()}`] : []));
}

function selfTest() {
  for (const hit of ["window.vibot.state", "__VIBOT_SNAPSHOT__", "vmemClient", "VHUB", "Eva app", "verve", "velthium"]) {
    if (hitsIn(hit).length === 0) throw new Error(`pattern misses: ${hit}`);
  }
  for (const miss of ["evaluate", "medieval", "Nevada", "reverve", "nerves", "vibot_pro"]) {
    if (hitsIn(miss).length !== 0) throw new Error(`pattern flags: ${miss}`);
  }
}

selfTest();
if (process.argv.includes("--self-test")) process.exit(0);

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name));
}

const ui = join(repo, "packages/ui");
const brandDir = join(ui, "src", "brand") + sep;
const uiFiles = ["src", "shell/src", "app/src"]
  .flatMap((d) => filesUnder(join(ui, d)))
  .filter((f) => /\.(?:ts|tsx|svg|css)$/.test(f) && !/\.test\.(?:ts|tsx|mjs)$/.test(f))
  .filter((f) => !f.startsWith(brandDir));

const server = join(repo, "packages/server");
const serverFiles = [
  ...filesUnder(join(server, "src")),
  ...filesUnder(join(server, "docs")),
  ...["README.md", "CHANGELOG.md", "package.json"].map((f) => join(server, f)),
];

// Guard against a path change that makes the scan empty.
if (uiFiles.length < 100) throw new Error(`ui scan found ${uiFiles.length} files, expected more than 100`);
if (serverFiles.length < 10) throw new Error(`server scan found ${serverFiles.length} files, expected more than 10`);

const failures = [];
for (const file of [...uiFiles, ...serverFiles]) {
  const hits = hitsIn(readFileSync(file, "utf8"));
  for (const hit of hits) failures.push(`${relative(repo, file)}:${hit}`);
}
if (failures.length) {
  console.error(`Shared packages must not name an app:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`no app names: ${uiFiles.length} ui files (outside src/brand), ${serverFiles.length} server files`);

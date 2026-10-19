// Shared by the plain Node tests: build dist once, and lay out a fixture
// outside the repo like an install, with the published files (package.json,
// dist) copied in and only the given peers linked beside them. Peers that are
// not linked are not installed, so a runtime import of one fails.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
export const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
export const tsc = createRequire(join(pkgDir, "package.json")).resolve("typescript/bin/tsc");

export function build() {
  const run = spawnSync(process.execPath, [tsc, "-p", "tsconfig.json"], { cwd: pkgDir, encoding: "utf8" });
  assert.equal(run.status, 0, `tsc failed:\n${run.stdout}${run.stderr}`);
}

/** `links` maps an installed name to a directory under this package's node_modules, for example `{ zod: "zod3" }`. */
export function installFixture(prefix, links = {}) {
  const dir = mkdtempSync(join(tmpdir(), `vvedantb-server-${prefix}-`));
  const installed = join(dir, "node_modules", pkg.name);
  mkdirSync(installed, { recursive: true });
  cpSync(join(pkgDir, "package.json"), join(installed, "package.json"));
  cpSync(join(pkgDir, "dist"), join(installed, "dist"), { recursive: true });
  for (const [name, source] of Object.entries(links)) {
    const link = join(dir, "node_modules", name);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(join(pkgDir, "node_modules", source), link, "dir");
  }
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
  return dir;
}

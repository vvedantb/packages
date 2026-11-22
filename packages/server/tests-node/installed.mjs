// Shared by the plain Node tests: build dist once, and lay out a fixture
// outside the repo like an install, with the published files (package.json,
// dist) copied in and only the given peers linked beside them. Peers that are
// not linked are not installed, so a runtime import of one fails.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
export const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
export const tsrs = join(depDir("tsrs"), "bin", "tsrs");

/**
 * Rebuilds dist. Every node test file calls it in `before`, so the package
 * test script runs the files one at a time (`--test-concurrency=1`): run side
 * by side, one file's build rewrites dist while the other copies it into a
 * fixture, and the bundle test then sees a half-written package (a release run
 * failed on 15 Nov 2026 with "one empty chunk per QuickJS package": 0 !== 2).
 */
export function build() {
  const run = spawnSync(process.execPath, [tsrs, "-p", "tsconfig.json"], { cwd: pkgDir, encoding: "utf8" });
  assert.equal(run.status, 0, `tsrs failed:\n${run.stdout}${run.stderr}`);
}

/**
 * Where a dependency of this package is installed. Walks up from the package
 * the way Node resolves: pnpm's isolated layout keeps a dependency in this
 * package's own node_modules, and the hoisted layout this repository uses
 * keeps it in the node_modules at the repository root.
 */
export function depDir(name) {
  for (let dir = pkgDir; ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    assert.notEqual(dirname(dir), dir, `${name} is not installed for ${pkg.name}`);
  }
}

/** `links` maps an installed name to a dependency of this package, for example `{ zod: "zod3" }`. */
export function installFixture(prefix, links = {}) {
  const dir = mkdtempSync(join(tmpdir(), `vvedantb-server-${prefix}-`));
  const installed = join(dir, "node_modules", pkg.name);
  mkdirSync(installed, { recursive: true });
  cpSync(join(pkgDir, "package.json"), join(installed, "package.json"));
  cpSync(join(pkgDir, "dist"), join(installed, "dist"), { recursive: true });
  for (const [name, source] of Object.entries(links)) {
    const link = join(dir, "node_modules", name);
    mkdirSync(dirname(link), { recursive: true });
    // A junction on Windows, where a directory symlink needs a privilege; other systems ignore the type.
    symlinkSync(depDir(source), link, "junction");
  }
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
  return dir;
}

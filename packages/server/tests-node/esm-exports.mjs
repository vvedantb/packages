// Plain Node ESM check of the published package. Not run by vitest, which
// aliases @vvedantb/server/* to src/*.ts and would hide missing extensions.
// Run with: node --test tests-node/esm-exports.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const tsc = createRequire(join(pkgDir, "package.json")).resolve("typescript/bin/tsc");

let fixtureDir;

before(() => {
  const build = spawnSync(process.execPath, [tsc, "-p", "tsconfig.json"], {
    cwd: pkgDir,
    encoding: "utf8",
  });
  assert.equal(build.status, 0, `tsc failed:\n${build.stdout}${build.stderr}`);

  // Fixture outside the repo so node resolves the package through node_modules and its exports map.
  fixtureDir = mkdtempSync(join(tmpdir(), "vvedantb-server-esm-"));
  mkdirSync(join(fixtureDir, "node_modules", "@vvedantb"), { recursive: true });
  symlinkSync(pkgDir, join(fixtureDir, "node_modules", "@vvedantb", "server"), "dir");
  writeFileSync(join(fixtureDir, "package.json"), JSON.stringify({ type: "module" }));
});

after(() => {
  if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true });
});

const subpaths = Object.entries(pkg.exports)
  .filter(([, target]) => typeof target === "object" && target.import)
  .map(([subpath]) => subpath);

test("package exports at least one JS subpath", () => {
  assert.ok(subpaths.length > 0);
});

for (const subpath of subpaths) {
  const specifier = `${pkg.name}/${subpath.slice(2)}`;
  test(`plain Node ESM can import ${specifier}`, () => {
    const file = join(fixtureDir, `import-${subpath.slice(2).replace(/\W/g, "_")}.mjs`);
    writeFileSync(
      file,
      `const m = await import(${JSON.stringify(specifier)});\n` +
        `if (Object.keys(m).length === 0) throw new Error("no exports");\n`,
    );
    const run = spawnSync(process.execPath, [file], { cwd: fixtureDir, encoding: "utf8" });
    assert.equal(run.status, 0, `import failed:\n${run.stderr}`);
  });
}

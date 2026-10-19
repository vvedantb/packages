// Plain Node ESM check of the published package. Not run by vitest, which
// aliases @vvedantb/server to src/index.ts and would hide missing extensions.
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

function runImport(name, source) {
  const file = join(fixtureDir, `${name}.mjs`);
  writeFileSync(file, source);
  return spawnSync(process.execPath, [file], { cwd: fixtureDir, encoding: "utf8" });
}

test("exports map has only the root and package.json", () => {
  assert.deepEqual(Object.keys(pkg.exports).sort(), [".", "./package.json"]);
  assert.deepEqual(pkg.exports["."], { types: "./dist/index.d.ts", import: "./dist/index.js" });
});

test(`plain Node ESM can import ${pkg.name}`, () => {
  const run = runImport(
    "import-root",
    `const m = await import(${JSON.stringify(pkg.name)});\n` +
      // One export from each internal folder.
      `for (const name of ["extractBearerToken", "createMcpHttpHandler", "sha256Hex", "registerMcpRoutes", "verifyClerkAccessToken", "createClerkUserAuth"]) {\n` +
      `  if (typeof m[name] !== "function") throw new Error("missing export " + name);\n` +
      `}\n`,
  );
  assert.equal(run.status, 0, `import failed:\n${run.stderr}`);
});

for (const removed of ["convex", "mcp"]) {
  const specifier = `${pkg.name}/${removed}`;
  test(`${specifier} no longer resolves`, () => {
    const run = runImport(
      `import-${removed}`,
      `try {\n` +
        `  await import(${JSON.stringify(specifier)});\n` +
        `} catch (err) {\n` +
        `  if (err.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") process.exit(0);\n` +
        `  throw err;\n` +
        `}\n` +
        `process.exit(1);\n`,
    );
    assert.equal(run.status, 0, `expected ERR_PACKAGE_PATH_NOT_EXPORTED:\n${run.stderr}`);
  });
}

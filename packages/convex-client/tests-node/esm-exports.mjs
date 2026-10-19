// Plain Node ESM and consumer typecheck of the built package. Not run by
// vitest, which aliases @vvedantb/convex-client to src/index.ts.
// Run with: node --test tests-node/esm-exports.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const tsc = createRequire(join(pkgDir, "package.json")).resolve("typescript/bin/tsc");

const runtimeExports = [
  "ConvexClerkProvider",
  "VITE_ENV_NAMES",
  "createMemoryOptimisticStore",
  "forEachLoadedQuery",
  "mapLoadedQuery",
  "parseClientEnv",
  "patchLoadedQuery",
  "tempId",
  "updateAllCachedQueries",
  "useEnsureUser",
];

/**
 * A fixture outside the repo, laid out like an install: the published files
 * (package.json, dist) copied in, and the peers linked beside them, so the
 * package resolves `zod`, `convex` and the rest from the fixture.
 */
function makeFixture(zodDir) {
  const dir = mkdtempSync(join(tmpdir(), "vvedantb-convex-client-"));
  const modules = join(dir, "node_modules");
  const installed = join(modules, "@vvedantb", "convex-client");
  mkdirSync(installed, { recursive: true });
  mkdirSync(join(modules, "@clerk"), { recursive: true });
  mkdirSync(join(modules, "@types"), { recursive: true });
  cpSync(join(pkgDir, "package.json"), join(installed, "package.json"));
  cpSync(join(pkgDir, "dist"), join(installed, "dist"), { recursive: true });
  for (const name of ["convex", "react", "@clerk/clerk-react", "@types/react"]) {
    symlinkSync(join(pkgDir, "node_modules", name), join(modules, name), "dir");
  }
  symlinkSync(join(pkgDir, "node_modules", zodDir), join(modules, "zod"), "dir");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
  return dir;
}

before(() => {
  const build = spawnSync(process.execPath, [tsc, "-p", "tsconfig.json"], { cwd: pkgDir, encoding: "utf8" });
  assert.equal(build.status, 0, `tsc failed:\n${build.stdout}${build.stderr}`);
});

test("exports map has only the root and package.json", () => {
  assert.deepEqual(Object.keys(pkg.exports).sort(), [".", "./package.json"]);
  assert.deepEqual(pkg.exports["."], { types: "./dist/index.d.ts", import: "./dist/index.js" });
});

test(`plain Node ESM can import ${pkg.name} without zod`, () => {
  const dir = makeFixture("zod");
  rmSync(join(dir, "node_modules", "zod"));
  try {
    const file = join(dir, "import-root.mjs");
    writeFileSync(
      file,
      `const m = await import(${JSON.stringify(pkg.name)});\n` +
        `const expected = ${JSON.stringify(runtimeExports)};\n` +
        `const actual = Object.keys(m).sort();\n` +
        `if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("exports: " + actual.join(", "));\n`,
    );
    const run = spawnSync(process.execPath, [file], { cwd: dir, encoding: "utf8" });
    assert.equal(run.status, 0, `import failed:\n${run.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const consumer = `
import { z } from "zod";
import { parseClientEnv, type ViteEnvName } from "@vvedantb/convex-client";

const env = parseClientEnv({ VITE_CONVEX_URL: "u", VITE_CLERK_PUBLISHABLE_KEY: "k", VITE_ENV: "staging" }, {
  z,
  viteEnv: "fallback",
  extend: { VITE_SITE: z.string().optional() },
});
const url: string = env.VITE_CONVEX_URL;
const mode: ViteEnvName = env.VITE_ENV;
const site: string | undefined = env.VITE_SITE;
const ext = parseClientEnv({}, { z, viteEnv: false });
// @ts-expect-error no VITE_ENV with viteEnv: false
ext.VITE_ENV;
export { url, mode, site };
`;

for (const [label, zodDir] of [
  ["zod 4", "zod"],
  ["zod 3.25", "zod3"],
]) {
  test(`the published types work for a ${label} consumer (skipLibCheck off)`, () => {
    const dir = makeFixture(zodDir);
    try {
      writeFileSync(join(dir, "consumer.ts"), consumer);
      writeFileSync(
        join(dir, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            lib: ["ES2022", "DOM"],
            jsx: "react-jsx",
            strict: true,
            noEmit: true,
            skipLibCheck: false,
            types: [],
          },
          files: ["consumer.ts", "node_modules/@vvedantb/convex-client/dist/index.d.ts"],
        }),
      );
      const check = spawnSync(process.execPath, [tsc, "-p", "tsconfig.json"], { cwd: dir, encoding: "utf8" });
      assert.equal(check.status, 0, `tsc failed:\n${check.stdout}${check.stderr}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

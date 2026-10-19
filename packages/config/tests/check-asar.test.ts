import { createPackage } from "@electron/asar";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CHECK_ASAR_CHILD_ENV, findBareImports, findSpecifiers, packageName, runCheckAsar, type CheckAsarIo } from "../src/check-asar.js";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = join(pkgDir, "dist", "check-asar-cli.js");

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vvedantb-check-asar-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(path: string, content: string): void {
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), content);
}

async function run(argv: string[], env: Record<string, string | undefined> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const io: CheckAsarIo = {
    log: (message) => out.push(message),
    error: (message) => err.push(message),
    cwd: () => dir,
    env,
    selfPath: cliPath,
  };
  const code = await runCheckAsar(argv, io);
  return { code, out, err };
}

// Ported from the list-mode app's script tests.
describe("packageName", () => {
  it("maps subpaths to the package", () => {
    expect(packageName("@clerk/electron/storage")).toBe("@clerk/electron");
    expect(packageName("@ai-sdk/openai")).toBe("@ai-sdk/openai");
    expect(packageName("zod/v4")).toBe("zod");
    expect(packageName("ai")).toBe("ai");
  });

  it("skips provided modules and relative paths", () => {
    for (const specifier of ["electron", "node:path", "fs", "fs/promises", "./chunk.js"]) expect(packageName(specifier)).toBeNull();
  });
});

describe("findSpecifiers", () => {
  it("finds import and require specifiers", () => {
    const source = `import { a } from "zod";\nimport "ai";\nconst e = require("electron");\nawait import("@clerk/electron/storage");`;
    expect([...findSpecifiers(source)].sort()).toEqual(["@clerk/electron/storage", "ai", "electron", "zod"]);
  });

  it("ignores the word from inside a string list", () => {
    const source = `const STOP = new Set(["the", "from", "will"]);\nimport { z } from "zod";`;
    expect([...findSpecifiers(source)]).toEqual(["zod"]);
  });
});

describe("findBareImports", () => {
  it("keeps subpaths and drops electron, built-ins and relative paths", () => {
    const source = [
      `import a from "dep";`,
      `import "side-effect";`,
      `const b = require("dep/sub");`,
      `await import("@scope/pkg/x");`,
      `import fs from "fs/promises";`,
      `import p from "node:path";`,
      `import e from "electron";`,
      `import r from "./local.js";`,
      `import abs from "/abs.js";`,
    ].join("\n");
    expect([...findBareImports(source)].sort()).toEqual(["@scope/pkg/x", "dep", "dep/sub", "side-effect"]);
  });

  it("matches the looser pattern of the resolve-mode script", () => {
    // Unlike findSpecifiers: spaces are allowed and `import"x"` with no space is not an import.
    expect([...findBareImports(`x(" from "a b")`)]).toEqual(["a b"]);
    expect([...findBareImports(`import"min"`)]).toEqual([]);
    expect([...findSpecifiers(`import"min"`)]).toEqual(["min"]);
  });
});

describe("arguments", () => {
  it("prints usage and exits 2 without a mode, 0 for --help", async () => {
    expect((await run([])).code).toBe(2);
    const help = await run(["--help"]);
    expect(help.code).toBe(0);
    expect(help.out[0]).toMatch(/^Usage:/);
  });

  it("exits 2 for an unknown mode, unknown option or missing value", async () => {
    expect((await run(["nope"])).code).toBe(2);
    expect((await run(["list", "--nope", "x"])).code).toBe(2);
    expect((await run(["list", "--scan"])).code).toBe(2);
    expect((await run(["list", "a", "b"])).code).toBe(2);
    expect((await run(["resolve", "bin", "--hook", "a", "--hook", "b", "--scan", "dist"])).code).toBe(2);
  });

  it("resolve needs a --scan and a binary", async () => {
    const noScan = await run(["resolve", "bin"]);
    expect(noScan.code).toBe(2);
    expect(noScan.err[0]).toMatch(/^resolve needs at least one --scan/);
    const noBinary = await run(["resolve", "--scan", "dist"]);
    expect(noBinary.code).toBe(2);
    expect(noBinary.err[0]).toMatch(/^resolve needs a binary or --default-binary/);
  });
});

describe("list mode", () => {
  /** An app with built main/preload output and a packaged asar holding `packages`. */
  async function packageApp(packages: string[]): Promise<string> {
    write("out/main/index.js", `import { z } from "zod";\nimport { app } from "electron";\nimport fs from "node:fs";\nconst a = require("@scope/dep/sub");\n`);
    write("out/preload/index.cjs", `const p = require("path");\nrequire("ai");\n`);
    // Fully bundled renderer: not scanned unless asked.
    write("out/renderer/index.js", `import "react";\n`);
    const app = join(dir, "app");
    mkdirSync(app);
    writeFileSync(join(app, "package.json"), "{}");
    for (const name of packages) {
      mkdirSync(join(app, "node_modules", name), { recursive: true });
      writeFileSync(join(app, "node_modules", name, "package.json"), "{}");
    }
    const asar = join(dir, "release/mac/App.app/Contents/Resources/app.asar");
    mkdirSync(dirname(asar), { recursive: true });
    await createPackage(app, asar);
    return asar;
  }

  const flags = ["--scan", "out/main", "--scan", "out/preload", "--require", "extra-peer"];

  it("passes when every imported and required package is in the archive", async () => {
    const asar = await packageApp(["zod", "@scope/dep", "ai", "extra-peer"]);
    const result = await run(["list", "--default-asar", "release/mac-arm64/App.app/Contents/Resources/app.asar", "--default-asar", "release/mac/App.app/Contents/Resources/app.asar", ...flags]);
    expect(result).toEqual({
      code: 0,
      out: [`Checked 4 packages in ${asar}: @scope/dep, ai, extra-peer, zod`, "check-asar-modules: OK"],
      err: [],
    });
  });

  it("fails and names what is missing", async () => {
    const asar = await packageApp(["zod"]);
    const result = await run(["list", asar, ...flags]);
    expect(result).toEqual({
      code: 1,
      out: [`Checked 4 packages in ${asar}: @scope/dep, ai, extra-peer, zod`],
      err: ["Missing from app.asar: @scope/dep, ai, extra-peer"],
    });
  });

  it("takes the asar from $ASAR when no argument is given, and a relative argument from cwd", async () => {
    await packageApp(["zod", "@scope/dep", "ai", "extra-peer"]);
    const relative = "release/mac/App.app/Contents/Resources/app.asar";
    expect((await run(["list", ...flags], { ASAR: relative })).out[0]).toBe(`Checked 4 packages in ${relative}: @scope/dep, ai, extra-peer, zod`);
    expect((await run(["list", relative, ...flags])).code).toBe(0);
  });

  it("reports the asar it tried", async () => {
    expect(await run(["list", "nope.asar"])).toEqual({ code: 1, out: [], err: ["app.asar not found (tried nope.asar). Pass a path or set ASAR."] });
    expect(await run(["list", "--default-asar", "a/app.asar", "--default-asar", "b/app.asar"])).toEqual({
      code: 1,
      out: [],
      err: ["app.asar not found (tried a/app.asar, b/app.asar). Pass a path or set ASAR."],
    });
  });

  it("reads scan dirs from --root and treats a missing one as empty", async () => {
    const asar = await packageApp([]);
    const result = await run(["list", asar, "--root", "out", "--scan", "nothing-here"]);
    expect(result.out[0]).toBe(`Checked 0 packages in ${asar}: `);
    expect(result.code).toBe(0);
  });
});

describe("resolve mode", () => {
  /** An unpacked app.asar directory: plain Node reads it as Electron reads the archive. */
  function makeAsar(): string {
    write("release/linux-unpacked/resources/app.asar/package.json", "{}");
    write("release/linux-unpacked/resources/app.asar/dist/main.js", `import a from "dep";\nconst b = require("dep/sub.js");\nimport "electron";\nimport("node:fs");\n`);
    write("release/linux-unpacked/resources/app.asar/dist/chunks/x.cjs", `require("other");\n`);
    // Browser code: skipped with --skip-dir renderer.
    write("release/linux-unpacked/resources/app.asar/dist/renderer/index.js", `import "vvedantb-not-installed";\n`);
    write("release/linux-unpacked/resources/app.asar/node_modules/dep/package.json", `{ "name": "dep", "main": "index.js" }`);
    write("release/linux-unpacked/resources/app.asar/node_modules/dep/index.js", "");
    write("release/linux-unpacked/resources/app.asar/node_modules/dep/sub.js", "");
    write("release/linux-unpacked/resources/app.asar/node_modules/other/package.json", `{ "name": "other" }`);
    write("release/linux-unpacked/resources/app.asar/node_modules/other/index.js", "");
    return join(dir, "release/linux-unpacked/resources/app.asar");
  }
  const child = { [CHECK_ASAR_CHILD_ENV]: "1" };

  it("resolves every bare import from inside the asar", async () => {
    const asar = makeAsar();
    expect(await run(["resolve", asar, "--scan", "dist", "--skip-dir", "renderer"], child)).toEqual({
      code: 0,
      out: ["checked 2 JS files, 3 unbundled imports", "CHECK_ASAR_OK"],
      err: [],
    });
  });

  it("fails on an unresolved import", async () => {
    const asar = makeAsar();
    const result = await run(["resolve", asar, "--scan", "dist"], child);
    expect(result.code).toBe(1);
    expect(result.out).toEqual(["checked 3 JS files, 4 unbundled imports"]);
    expect(result.err).toHaveLength(1);
    expect(result.err[0]).toMatch(/^FAIL unresolved import "vvedantb-not-installed": Cannot find module .vvedantb-not-installed./);
  });

  it("throws when a scan dir is missing, as the original script did", async () => {
    const asar = makeAsar();
    await expect(run(["resolve", asar, "--scan", "nope"], child)).rejects.toThrow(/ENOENT/);
  });

  it("runs the hook after the import check and prints its problems in order", async () => {
    const asar = makeAsar();
    write(
      "scripts/hook.mjs",
      `export default async ({ asar }) => { console.info("hook ran"); return ["missing native file: " + asar + ".unpacked/x.node", "boot failed: Error"]; };\n`,
    );
    const result = await run(["resolve", asar, "--scan", "dist", "--skip-dir", "renderer", "--hook", join(dir, "scripts/hook.mjs")], child);
    expect(result).toEqual({
      code: 1,
      out: ["checked 2 JS files, 3 unbundled imports"],
      err: [`FAIL missing native file: ${asar}.unpacked/x.node`, "FAIL boot failed: Error"],
    });
  });

  it("passes when the hook returns nothing, and fails on a hook without a default function", async () => {
    const asar = makeAsar();
    write("scripts/ok.mjs", `export default () => undefined;\n`);
    write("scripts/bad.mjs", `export const check = () => [];\n`);
    const ok = await run(["resolve", asar, "--scan", "dist", "--skip-dir", "renderer", "--hook", join(dir, "scripts/ok.mjs")], child);
    expect(ok.code).toBe(0);
    const bad = await run(["resolve", asar, "--scan", "dist", "--skip-dir", "renderer", "--hook", join(dir, "scripts/bad.mjs")], child);
    expect(bad.err).toEqual([`FAIL hook ${join(dir, "scripts/bad.mjs")} has no default export function`]);
  });

  it("reports a missing asar next to the binary", async () => {
    const binary = join(dir, "release/linux-unpacked/app-bin");
    expect(await run(["resolve", "--default-binary", "release/linux-unpacked/app-bin", "--scan", "dist"])).toEqual({
      code: 1,
      out: [],
      err: [`No asar at ${join(dirname(binary), "resources", "app.asar")}. Package the app first.`],
    });
  });

  describe("built CLI", () => {
    beforeAll(() => {
      const tsc = createRequire(join(pkgDir, "package.json")).resolve("typescript/bin/tsc");
      const build = spawnSync(process.execPath, [tsc, "-p", "tsconfig.json"], { cwd: pkgDir, encoding: "utf8" });
      expect(build.status, `${build.stdout}${build.stderr}`).toBe(0);
    });

    // Node stands in for the Electron binary: ELECTRON_RUN_AS_NODE means nothing to it, and the asar is a directory.
    it("runs itself inside the binary with ELECTRON_RUN_AS_NODE and passes its exit code on", () => {
      const asar = makeAsar();
      write("scripts/hook.mjs", `export default () => { console.info("node:" + process.env.ELECTRON_RUN_AS_NODE); return []; };\n`);
      const args = ["--scan", "dist", "--skip-dir", "renderer", "--hook", "scripts/hook.mjs"];
      const ok = spawnSync(process.execPath, [cliPath, "resolve", process.execPath, asar, ...args], { cwd: dir, encoding: "utf8" });
      expect(ok.stdout).toBe("checked 2 JS files, 3 unbundled imports\nnode:1\nCHECK_ASAR_OK\n");
      expect(ok.status).toBe(0);
      const failing = spawnSync(process.execPath, [cliPath, "resolve", process.execPath, asar, "--scan", "dist"], { cwd: dir, encoding: "utf8" });
      expect(failing.status).toBe(1);
      expect(failing.stderr).toMatch(/^FAIL unresolved import "vvedantb-not-installed"/);
    });

    it("list exits 1 when the asar is missing", () => {
      const result = spawnSync(process.execPath, [cliPath, "list", "missing.asar"], { cwd: dir, encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stderr).toBe("app.asar not found (tried missing.asar). Pass a path or set ASAR.\n");
    });
  });
});

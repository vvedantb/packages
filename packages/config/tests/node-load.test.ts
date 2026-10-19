import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Loads the built root with plain Node from a folder that holds only this
// package: no vite, no plugins, no @electron/asar. Run `pnpm build` first.

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(pkgDir, "dist");
let dir = "";

beforeAll(() => {
  if (!existsSync(join(distDir, "index.js"))) throw new Error("dist/index.js is missing: run `pnpm build` first");
  dir = mkdtempSync(join(tmpdir(), "vvedantb-config-load-"));
  const installed = join(dir, "node_modules", "@vvedantb", "config");
  mkdirSync(installed, { recursive: true });
  for (const entry of ["package.json", "dist", "files", "tsconfig", "oxlint"]) {
    cpSync(join(pkgDir, entry), join(installed, entry), { recursive: true });
  }
});

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

function node(file: string, source: string) {
  writeFileSync(join(dir, file), source);
  return spawnSync(process.execPath, [file], { cwd: dir, encoding: "utf8" });
}

const CHECK = `
const vite = config.defineWebViteConfig({ react: { plugin: () => ({ name: "react" }) }, tsconfigPaths: true });
const babel = config.expoBabelConfig({ cache() {} });
console.log(JSON.stringify({ vite, babel, versions: typeof config.versions }));
`;

const EXPECTED = {
  vite: { plugins: [{ name: "react" }], resolve: { tsconfigPaths: true } },
  babel: { presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"] },
  versions: "object",
};

describe("plain Node, no optional peers installed", () => {
  it("has no vite, plugin or asar package next to it", () => {
    expect(readdirSync(join(dir, "node_modules"))).toStrictEqual(["@vvedantb"]);
  });

  it("imports the root as ESM", () => {
    const result = node("load.mjs", `import * as config from "@vvedantb/config";\n${CHECK}`);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toStrictEqual(EXPECTED);
  });

  it("requires the root from CommonJS, as babel.config.js and metro.config.js do", () => {
    const result = node("load.cjs", `const config = require("@vvedantb/config");\n${CHECK}`);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toStrictEqual(EXPECTED);
  });

  it("never imports vite or a plugin from dist", () => {
    for (const file of readdirSync(distDir).filter((name) => name.endsWith(".js"))) {
      expect(readFileSync(join(distDir, file), "utf8")).not.toMatch(/from "(vite|@vitejs|@tanstack|@tailwindcss|expo|nativewind)/);
    }
  });
});

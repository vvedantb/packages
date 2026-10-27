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

  it("never imports vite, WXT or a plugin from dist", () => {
    for (const file of readdirSync(distDir).filter((name) => name.endsWith(".js"))) {
      expect(readFileSync(join(distDir, file), "utf8")).not.toMatch(/from "(vite|@vitejs|@tanstack|@tailwindcss|expo|nativewind|wxt|@wxt-dev)/);
    }
  });

  it("imports @vvedantb/config/extension as ESM and from CommonJS, without WXT", () => {
    const check = `
const preset = extension.defineVExtensionConfig({ app: "ext", react: { plugin: () => ({ name: "react" }) }, hosts: ["https://app.example.com/*"] });
console.log(JSON.stringify({ manifest: preset.manifest({ mode: "production" }), vite: preset.vite() }));
`;
    const expected = {
      manifest: {
        name: "ext",
        icons: { "16": "icons/icon-16.png", "32": "icons/icon-32.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" },
        action: { default_icon: { "16": "icons/icon-16.png", "32": "icons/icon-32.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" } },
        host_permissions: ["https://app.example.com/*"],
      },
      vite: { plugins: [{ name: "react" }] },
    };
    for (const [file, load] of [
      ["extension.mjs", `import * as extension from "@vvedantb/config/extension";`],
      ["extension.cjs", `const extension = require("@vvedantb/config/extension");`],
    ] as const) {
      const result = node(file, `${load}\n${check}`);
      expect(result.stderr).toBe("");
      expect(JSON.parse(result.stdout)).toStrictEqual(expected);
    }
  });

  it("runs the vvedantb-clerk-allow bin: exit 2 without an ID or a key, and no request", () => {
    const bin = join(dir, "node_modules/@vvedantb/config/dist/clerk-allow-cli.js");
    const env = { ...process.env, CLERK_SECRET_KEY: "" };
    const missingId = spawnSync(process.execPath, [bin], { cwd: dir, encoding: "utf8", env });
    expect(missingId.status).toBe(2);
    expect(missingId.stderr).toMatch(/^Missing the extension ID\.\nUsage: vvedantb-clerk-allow <extension-id>/);
    const missingKey = spawnSync(process.execPath, [bin, "abcdefghijklmnopabcdefghijklmnop"], { cwd: dir, encoding: "utf8", env });
    expect(missingKey.status).toBe(2);
    expect(missingKey.stderr).toBe("CLERK_SECRET_KEY is not set.\n");
    const help = spawnSync(process.execPath, [bin, "--help"], { cwd: dir, encoding: "utf8", env });
    expect(help.status).toBe(0);
    expect(help.stdout).toMatch(/^Usage: vvedantb-clerk-allow/);
  });
});

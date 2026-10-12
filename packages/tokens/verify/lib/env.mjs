// Paths, app inputs and the scratch install shared by analyze.mjs and run.mjs.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VERIFY_SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PKG_DIR = resolve(VERIFY_SRC, "..");
export const REPO_DIR = resolve(PKG_DIR, "../..");
export const APPS_DIR = resolve(process.env.APPS_DIR ?? "/workspace/cvx");
export const VERIFY_DIR = resolve(process.env.VERIFY_DIR ?? "/workspace/pk-tokens-verify");

// Versions the five apps resolve in their lockfiles (checked by run.mjs).
export const SCRATCH_DEPS = {
  tailwindcss: "4.3.3",
  "@tailwindcss/cli": "4.3.3",
  "@tailwindcss/node": "4.3.3",
  "shadow-plugin": "1.2.7",
  "tailwindcss-animate": "1.0.7",
  postcss: "8.5.29",
  "postcss-selector-parser": "7.1.6",
  jiti: "2.7.0",
};

// Stylesheet inputs per app, relative to the app repo root.
export const APPS = {
  vmem: { css: ["apps/web/src/globals.css"] },
  vibot: {
    css: ["apps/web/src/styles/globals.css", "apps/web/src/styles/markdown.css"],
    config: "apps/web/tailwind.config.ts",
  },
  verve: { css: ["apps/web/src/globals.css"], config: "apps/web/tailwind.config.ts" },
  velth: {
    css: ["apps/web/src/globals.css"],
    config: "apps/web/tailwind.config.ts",
    // tailwind.config.ts `content` scans the app's own UI package.
    extra: ["packages/ui/src"],
  },
  vhub: { css: ["apps/web/src/globals.css"] },
};

export function appDir(app) {
  return join(APPS_DIR, app);
}

export function gitHead(app) {
  return execFileSync("git", ["-C", appDir(app), "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

export function ensureScratchDeps() {
  mkdirSync(VERIFY_DIR, { recursive: true });
  const pkgPath = join(VERIFY_DIR, "package.json");
  const want = JSON.stringify(SCRATCH_DEPS);
  const have = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : null;
  const ok =
    have &&
    JSON.stringify(have.dependencies) === want &&
    Object.keys(SCRATCH_DEPS).every((d) => existsSync(join(VERIFY_DIR, "node_modules", d, "package.json")));
  if (ok) return;
  writeFileSync(
    pkgPath,
    JSON.stringify({ name: "pk-tokens-verify", private: true, type: "module", dependencies: SCRATCH_DEPS }, null, 2),
  );
  console.log(`installing scratch deps in ${VERIFY_DIR}`);
  execFileSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: VERIFY_DIR, stdio: "inherit" });
}

export const scratchRequire = createRequire(join(VERIFY_DIR, "package.json"));

export async function scratchImport(name) {
  return import(pathToFileURL(scratchRequire.resolve(name)).href);
}

export function tailwindBin() {
  return join(VERIFY_DIR, "node_modules", ".bin", "tailwindcss");
}

// Loads a tailwind.config.ts the same way Tailwind does (jiti), stubbing nothing.
export async function loadConfig(file) {
  const { createJiti } = await scratchImport("jiti");
  const jiti = createJiti(file, { moduleCache: false, fsCache: false });
  const mod = await jiti.import(file);
  return mod.default ?? mod;
}

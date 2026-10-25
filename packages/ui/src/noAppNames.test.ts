import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The shared package names no app: app-specific details are passed in by the app. This mirrors
// packages/server/tests/artifacts/noAppNames.test.ts for the shipped UI source.
//
// One exception: `src/brand/` holds the family marks and must name all six apps. The exception is
// that folder only. A name anywhere else under src, shell/src or app/src still fails.
const pkgDir = fileURLToPath(new URL("..", import.meta.url));
const BRAND_DIR = join("src", "brand");
const SCANNED_DIRS = ["src", "shell/src", "app/src"];
const SCANNED_FILE = /\.(?:ts|tsx|svg|css)$/;
const TEST_FILE = /\.test\.(?:ts|tsx|mjs)$/;

// The distinctive names match anywhere (`__VIBOT_SNAPSHOT__`, `vmemClient`); the short ones that
// are also English words only as whole words.
const APP_NAMES = /(?:vibot|vmem|vhub|velth)|\b(?:eva|verve)\b/i;

// The legacy plan slug `vibot_pro` is a Clerk Billing key that `hasVPlan` must match.
const LEGACY_PLAN_SLUG = /vibot_pro/gi;

function filesUnder(dir: string): string[] {
  return readdirSync(join(pkgDir, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

const inBrand = (file: string) => relative(pkgDir, file).startsWith(BRAND_DIR + sep);
const productionFiles = SCANNED_DIRS.flatMap(filesUnder).filter((file) => SCANNED_FILE.test(file) && !TEST_FILE.test(file));
const files = productionFiles.filter((file) => !inBrand(file));

function hitsIn(text: string): string[] {
  return text.split("\n").flatMap((line, i) => (APP_NAMES.test(line.replace(LEGACY_PLAN_SLUG, "")) ? [`${String(i + 1)}: ${line.trim()}`] : []));
}

describe("no app name", () => {
  it("scans production source outside src/brand", () => {
    expect(files.some((file) => file.endsWith(join("src", "index.ts")))).toBe(true);
    expect(files.some((file) => file.endsWith(join("src", "artifacts", "artifact-viewer.tsx")))).toBe(true);
    expect(files.length).toBeGreaterThan(100);
  });

  it("excludes only src/brand", () => {
    const brand = productionFiles.filter(inBrand);
    expect(brand.length).toBeGreaterThan(0);
    expect(brand.every((file) => relative(pkgDir, file).startsWith(BRAND_DIR + sep))).toBe(true);
    expect(files.some(inBrand)).toBe(false);
    expect(files.some((file) => file.endsWith(join("src", "icons", "memory-icon.tsx")))).toBe(true);
  });

  it("src/brand does name the apps (the exception is in use)", () => {
    const text = readFileSync(join(pkgDir, BRAND_DIR, "svg.ts"), "utf8");
    for (const app of ["projectv", "vibot", "vhub", "vmem", "verve", "velth"]) expect(text).toContain(app);
  });

  it.each(files.map((file) => [relative(pkgDir, file), file]))("%s", (_name, file) => {
    expect(hitsIn(readFileSync(file as string, "utf8"))).toEqual([]);
  });

  it("the pattern catches app names and spares ordinary words", () => {
    for (const hit of ["window.vibot.state", "__VIBOT_SNAPSHOT__", "vmemClient", "VHUB", "Eva app", "verve", "velthium"]) expect(hitsIn(hit), hit).not.toEqual([]);
    for (const miss of ["evaluate", "medieval", "Nevada", "reverve", "nerves", "vibot_pro"]) expect(hitsIn(miss), miss).toEqual([]);
  });
});

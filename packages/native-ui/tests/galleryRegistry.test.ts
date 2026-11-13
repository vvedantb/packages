import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  GALLERY_COVERAGE,
  GALLERY_SECTIONS,
  NON_VISUAL_COMPONENTS,
} from "../../../apps/native-gallery/src/galleryRegistry";

// Every React component that a public entry point exports must have an entry in the
// Expo gallery registry (`apps/native-gallery/src/galleryRegistry.ts`), and the gallery
// source it points at must use the name. The component list is read from the entry
// sources, so a new export fails here until the gallery shows it.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "../..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  exports: Record<string, string | { default?: string }>;
};

function resolveFile(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec);
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext;
  }
  return null;
}

/** Value exports (not `export type`) of a module, following `export * from`. */
function valueExports(file: string, seen = new Set<string>()): Set<string> {
  const out = new Set<string>();
  if (seen.has(file)) return out;
  seen.add(file);
  const source = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const match of source.matchAll(/export\s+(?!type\s)\{([^}]*)\}/g)) {
    for (const part of match[1]!.split(",")) {
      const text = part.trim();
      if (!text || text.startsWith("type ")) continue;
      out.add(text.split(/\s+as\s+/).pop()!);
    }
  }
  for (const match of source.matchAll(/export\s+\*\s+from\s+"([^"]+)"/g)) {
    const target = resolveFile(file, match[1]!);
    if (target) for (const name of valueExports(target, seen)) out.add(name);
  }
  for (const match of source.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g)) {
    out.add(match[1]!);
  }
  return out;
}

/** React component exports are PascalCase values. Constants (ALL_CAPS) and helpers (camelCase) are not. */
const isComponentName = (name: string) => /^[A-Z][A-Za-z0-9]*$/.test(name) && /[a-z]/.test(name);

const entryFiles = Object.entries(pkg.exports).flatMap(([key, target]) => {
  const file = typeof target === "string" ? target : target.default;
  return file && /\.tsx?$/.test(file) ? [[key, join(root, file)] as const] : [];
});

const exported = new Set<string>();
for (const [, file] of entryFiles) {
  for (const name of valueExports(file)) if (isComponentName(name)) exported.add(name);
}

function galleryFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === "android" || entry.name === "ios" || entry.name.startsWith(".")) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? galleryFiles(path) : /\.(tsx?|js)$/.test(entry.name) ? [path] : [];
  });
}

describe("gallery registry", () => {
  it("finds the component exports", () => {
    // A floor, so a broken parser cannot pass the other checks by finding nothing.
    expect(exported.size).toBeGreaterThan(150);
    expect(exported.has("Button")).toBe(true);
    expect(exported.has("PromptInput")).toBe(true);
    expect(exported.has("SignInScreen")).toBe(true);
  });

  it("has a gallery entry for every exported component", () => {
    const covered = new Set([...Object.keys(GALLERY_COVERAGE), ...Object.keys(NON_VISUAL_COMPONENTS)]);
    const missing = [...exported].filter((name) => !covered.has(name)).sort();
    expect(missing, `Add these to apps/native-gallery/src/galleryRegistry.ts and render them in the gallery: ${missing.join(", ")}`).toEqual([]);
  });

  it("lists no name that is no longer exported", () => {
    const stale = [...Object.keys(GALLERY_COVERAGE), ...Object.keys(NON_VISUAL_COMPONENTS)].filter((name) => !exported.has(name)).sort();
    expect(stale).toEqual([]);
  });

  it("does not list a component as both covered and non-visual", () => {
    expect(Object.keys(NON_VISUAL_COMPONENTS).filter((name) => name in GALLERY_COVERAGE)).toEqual([]);
  });

  it("gives every non-visual component a reason", () => {
    for (const [name, reason] of Object.entries(NON_VISUAL_COMPONENTS)) {
      expect(reason.length, name).toBeGreaterThan(20);
    }
  });

  it("points each component at a section whose source uses its name", () => {
    const wrong: string[] = [];
    for (const [name, section] of Object.entries(GALLERY_COVERAGE)) {
      const files = GALLERY_SECTIONS[section];
      if (!files) {
        wrong.push(`${name}: unknown section ${section}`);
        continue;
      }
      const used = files.some((file) => new RegExp(`\\b${name}\\b`).test(readFileSync(join(repo, file), "utf8")));
      if (!used) wrong.push(`${name}: not used in ${section}`);
    }
    expect(wrong).toEqual([]);
  });

  it("has every section source file", () => {
    for (const files of Object.values(GALLERY_SECTIONS)) {
      for (const file of files) expect(existsSync(join(repo, file)), file).toBe(true);
    }
  });

  it("imports every entry point in the gallery", () => {
    // `/tailwind-preset` is CommonJS: `tailwind.config.js` requires it. `package.json` is not code.
    const source = galleryFiles(join(repo, "apps/native-gallery"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const missing = Object.keys(pkg.exports)
      .filter((key) => key !== "./package.json")
      .map((key) => (key === "." ? "@vvedantb/native-ui" : `@vvedantb/native-ui/${key.slice(2)}`))
      .filter((specifier) => !source.includes(`"${specifier}"`));
    expect(missing).toEqual([]);
  });

  it("keeps the tailwind preset exports the gallery relies on", () => {
    // `tests/tailwindPreset.test.ts` covers the values. The gallery needs these two names.
    const preset = readFileSync(join(root, "src/tailwind-preset.cjs"), "utf8");
    expect(preset).toMatch(/nativeUiPreset/);
    expect(preset).toMatch(/nativeUiContent/);
    expect(readFileSync(join(repo, "apps/native-gallery/tailwind.config.js"), "utf8")).toContain("@vvedantb/native-ui/tailwind-preset");
  });
});

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Metro bundles every module an entry reaches through `import`, `export … from`
// or `require`. These checks walk the relative imports from each package entry
// and record every package it names, so a heavy optional peer on a basic entry
// fails here instead of in an app's bundle. `import type` and `export type`
// are erased and are recorded as types; `require(…)` and `import(…)` are lazy.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

type Kind = "static" | "type" | "lazy";
type Ref = { file: string; specifier: string; kind: Kind };

const STATIC_REF = /^(?:import|export)\s+(type\s+)?(?:[^;'"]*?\bfrom\s+)?["']([^"']+)["']/gm;
const LAZY_REF = /\b(?:require|import)\(\s*["']([^"']+)["']\s*\)/g;

function refsIn(file: string): Ref[] {
  const source = readFileSync(file, "utf8");
  const refs: Ref[] = [];
  for (const match of source.matchAll(STATIC_REF)) {
    refs.push({ file, specifier: match[2]!, kind: match[1] ? "type" : "static" });
  }
  for (const match of source.matchAll(LAZY_REF)) {
    refs.push({ file, specifier: match[1]!, kind: "lazy" });
  }
  return refs;
}

function resolveRelative(from: string, specifier: string): string {
  const base = resolve(dirname(from), specifier);
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`${relative(root, from)}: cannot resolve "${specifier}"`);
}

/** Every package reference reachable from `entry` through relative imports. */
function packageRefs(entry: string): Ref[] {
  const seen = new Set<string>();
  const queue = [join(root, entry)];
  const refs: Ref[] = [];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const ref of refsIn(file)) {
      if (ref.specifier.startsWith(".")) {
        queue.push(resolveRelative(file, ref.specifier));
      } else {
        refs.push({ ...ref, file: relative(srcDir, ref.file) });
      }
    }
  }
  return refs;
}

function packageName(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
}

/** Names exported by a file, following `export * from` into relative files. */
function exportedNames(file: string): Set<string> {
  const source = readFileSync(file, "utf8");
  const names = new Set<string>();
  for (const match of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of match[1]!.split(",")) {
      const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop();
      if (name) names.add(name);
    }
  }
  for (const match of source.matchAll(
    /^export\s+(?:async\s+)?(?:function|const|let|class|type|interface)\s+([\w$]+)/gm,
  )) {
    names.add(match[1]!);
  }
  for (const match of source.matchAll(/export\s+\*\s+from\s+"(\.[^"]+)"/g)) {
    for (const name of exportedNames(resolveRelative(file, match[1]!))) names.add(name);
  }
  return names;
}

const entryFile = (subpath: string): string => pkg.exports[subpath].default;

// The heavy optional peers, and the one file allowed to name each of them (as
// a type, or in the `require` inside its loader's `try`).
const HEAVY_PEERS: Record<string, string | null> = {
  "expo-blur": "blur.ts",
  "expo-haptics": "haptics.ts",
  "expo-linear-gradient": "gradient.ts",
  "@gorhom/bottom-sheet": null,
  "@react-native-community/datetimepicker": null,
  dayjs: null,
  "expo-router": null,
};

// Entries that may import heavy peers. Every other entry in `exports` must not.
const HEAVY_ENTRIES = [".", "./gallery", "./bottom-sheet", "./date-time"];

const basicEntries = Object.keys(pkg.exports).filter(
  (subpath) => subpath !== "./package.json" && !HEAVY_ENTRIES.includes(subpath),
);

function heavyRefs(subpath: string): string[] {
  return packageRefs(entryFile(subpath))
    .filter((ref) => packageName(ref.specifier) in HEAVY_PEERS)
    .map((ref) => `${ref.file}: ${ref.kind} ${ref.specifier}`)
    .sort();
}

describe("granular entries", () => {
  it("cover the V Store entries", () => {
    for (const subpath of ["./tab-bar", "./brand", "./button", "./primitives", "./search-input", "./toast"]) {
      expect(basicEntries, subpath).toContain(subpath);
    }
  });

  it.each(basicEntries)("%s reaches heavy peers only through the optional-peer loaders", (subpath) => {
    const offending = packageRefs(entryFile(subpath)).filter((ref) => {
      const name = packageName(ref.specifier);
      if (!(name in HEAVY_PEERS)) return false;
      return ref.file !== HEAVY_PEERS[name] || ref.kind === "static";
    });
    expect(offending.map((ref) => `${ref.file}: ${ref.kind} ${ref.specifier}`)).toEqual([]);
  });

  it("keeps expo-router, gorhom, datetimepicker and dayjs off the brand, button, primitives, search-input and toast graphs entirely", () => {
    for (const subpath of ["./brand", "./button", "./primitives", "./search-input", "./toast"]) {
      const names = packageRefs(entryFile(subpath)).map((ref) => packageName(ref.specifier));
      for (const peer of ["expo-router", "@gorhom/bottom-sheet", "@react-native-community/datetimepicker", "dayjs"]) {
        expect(names, `${subpath} ${peer}`).not.toContain(peer);
      }
    }
  });

  it("gives the tab bar blur and haptics through the loaders, and no expo-router at all", () => {
    expect(heavyRefs("./tab-bar")).toEqual([
      "blur.ts: lazy expo-blur",
      "blur.ts: type expo-blur",
      "haptics.ts: lazy expo-haptics",
      "haptics.ts: type expo-haptics",
    ]);
  });

  it("brand, button, search-input and toast reach no heavy peer, not even a loader", () => {
    expect(heavyRefs("./brand")).toEqual([]);
    expect(heavyRefs("./button")).toEqual([]);
    expect(heavyRefs("./search-input")).toEqual([]);
    // From 0.3.12 the toast surface is flat, so the entry no longer reaches the expo-blur loader.
    expect(heavyRefs("./toast")).toEqual([]);
  });

  it("loads expo-linear-gradient on the ambient entry only through its loader", () => {
    expect(heavyRefs("./ambient")).toEqual([
      "gradient.ts: lazy expo-linear-gradient",
      "gradient.ts: type expo-linear-gradient",
    ]);
  });

  it("reaches expo-linear-gradient from no basic entry but ambient", () => {
    const reaching = basicEntries.filter((subpath) =>
      heavyRefs(subpath).some((ref) => ref.endsWith(" expo-linear-gradient")),
    );
    expect(reaching).toEqual(["./ambient"]);
  });

  // Negative controls: the scanner sees the static imports that the heavy
  // entries do have.
  it("finds the static heavy imports on the heavy entries", () => {
    expect(heavyRefs("./bottom-sheet")).toContain("BottomSheetContainer.tsx: static @gorhom/bottom-sheet");
    expect(heavyRefs("./date-time")).toEqual([
      "DateTimeField.tsx: static @react-native-community/datetimepicker",
      "DateTimeField.tsx: static dayjs",
    ]);
    const rootRefs = heavyRefs(".");
    expect(rootRefs).toContain("BottomSheetContainer.tsx: static @gorhom/bottom-sheet");
    expect(rootRefs).toContain("DateTimeField.tsx: static dayjs");
    // The root entry no longer imports expo-router or expo-linear-gradient.
    expect(rootRefs.filter((ref) => / static expo-/.test(ref))).toEqual([]);
  });

  it("names the optional-peer modules only in their loaders, across the whole package", () => {
    const files = readdirSync(srcDir, { recursive: true, encoding: "utf8" }).filter((file) =>
      /\.tsx?$/.test(file),
    );
    for (const file of files) {
      for (const ref of refsIn(join(srcDir, file))) {
        const loader = HEAVY_PEERS[packageName(ref.specifier)];
        if (loader) expect(file, ref.specifier).toBe(loader);
      }
    }
    expect(readFileSync(join(srcDir, "gradient.ts"), "utf8")).toMatch(
      /try \{\s*expoLinearGradient = require\("expo-linear-gradient"\)/,
    );
  });

  it("export what V Store needs", () => {
    const expected: Record<string, string[]> = {
      "./tab-bar": [
        "FloatingTabBar",
        "FloatingTabBarProps",
        "FLOATING_INSET",
        "FLOATING_TAB_BAR_HEIGHT",
        "FLOATING_TAB_BAR_HEIGHT_LARGE",
        "tabBarReserve",
      ],
      "./brand": [
        "AppMark",
        "AppWordmark",
        "APP_ICONS",
        "IconVibot",
        "IconProjectV",
        "APP_MARKS",
        "APP_NAMES",
        "appMarkSvg",
        "appTileSvg",
        "FAMILY_APPS",
        "familyApp",
        "V_PRO_APP_BENEFITS",
      ],
      "./button": ["Button", "ButtonProps", "ButtonSize", "ButtonVariant"],
      "./primitives": ["Button", "Input", "SearchInput", "Textarea", "Label", "Select", "Switch", "Checkbox", "Dialog", "AlertDialog", "Sheet", "Toaster", "toast"],
      "./search-input": ["SearchInput", "SearchInputProps"],
      "./toast": ["toast", "Toaster", "ToastOptions", "ToastVariant"],
      "./theme": ["NativeUiProvider", "tokens", "palette", "cn"],
      "./floating": ["FloatingSurface", "GlassBlurProvider", "GlassBlurTarget", "FLOATING_INSET"],
      "./ambient": ["AmbientBackground"],
      "./bottom-sheet": ["BottomSheetContainer"],
      "./date-time": ["DateTimeField"],
    };
    for (const [subpath, names] of Object.entries(expected)) {
      const exported = exportedNames(join(root, entryFile(subpath)));
      for (const name of names) expect(exported.has(name), `${subpath} ${name}`).toBe(true);
    }
    const primitives = exportedNames(join(root, entryFile("./primitives")));
    for (const name of ["BottomSheetContainer", "DateTimeField", "AmbientBackground"]) {
      expect(primitives.has(name), name).toBe(false);
    }
  });

  it("keeps the search-input and toast entries to their own names", () => {
    const names = (subpath: string) => [...exportedNames(join(root, entryFile(subpath)))].sort();
    expect(names("./search-input")).toEqual(["SearchInput", "SearchInputProps"]);
    expect(names("./toast")).toEqual(["ToastOptions", "ToastVariant", "Toaster", "toast"]);
  });

  it("together export everything the root entry does", () => {
    const granular = new Set<string>();
    for (const subpath of Object.keys(pkg.exports)) {
      if ([".", "./gallery", "./package.json"].includes(subpath)) continue;
      for (const name of exportedNames(join(root, entryFile(subpath)))) granular.add(name);
    }
    const missing = [...exportedNames(join(root, entryFile(".")))].filter((name) => !granular.has(name));
    expect(missing).toEqual([]);
  });
});

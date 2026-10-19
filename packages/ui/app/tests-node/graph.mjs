// Shared by the plain Node suites: the local module graph under given entries,
// the bare packages it imports at runtime, and a transpiled copy of it in a
// fixture that links only the packages a suite chooses.
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ts = createRequire(join(pkgDir, "package.json"))("typescript");

/** Runtime import and re-export specifiers (type-only ones are erased by the transpile). */
export function runtimeImports(source) {
  return [...source.matchAll(/^(?:import|export)\s+(?!type\b)[^;]*?from\s+"([^"]+)";/gms)].map((m) => m[1]);
}

export function resolveLocal(from, specifier) {
  const base = resolve(dirname(from), specifier.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`cannot resolve ${specifier} from ${from}`);
}

function packageName(specifier) {
  return specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
}

/** Every local module reachable from the entries, and the bare packages they use, with the modules that import each. */
export function graph(entries) {
  const files = new Set();
  const packages = new Map();
  const queue = entries.map((e) => join(pkgDir, e));
  while (queue.length) {
    const file = queue.pop();
    if (files.has(file) || file.endsWith(".css")) continue;
    files.add(file);
    for (const specifier of runtimeImports(readFileSync(file, "utf8"))) {
      if (specifier.startsWith(".")) {
        if (!specifier.endsWith(".css")) queue.push(resolveLocal(file, specifier));
        continue;
      }
      const name = packageName(specifier);
      packages.set(name, [...(packages.get(name) ?? []), relative(pkgDir, file)]);
    }
  }
  return { files, packages };
}

/** Transpile `files` into `dir` (paths kept relative to the package) and link `packages` from this package's node_modules. */
export function writeFixture(dir, files, packages) {
  for (const file of files) {
    const out = join(dir, relative(pkgDir, file).replace(/\.tsx?$/, ".js"));
    mkdirSync(dirname(out), { recursive: true });
    const source = readFileSync(file, "utf8").replace(/(from\s+")(\.[^"]+)(")/g, (_m, open, specifier, close) => {
      const target = resolveLocal(file, specifier).replace(/\.tsx?$/, ".js");
      const rel = relative(dirname(file), target).replace(/\\/g, "/");
      return `${open}${rel.startsWith(".") ? rel : `./${rel}`}${close}`;
    });
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    writeFileSync(out, outputText);
  }
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
  for (const name of packages) {
    const link = join(dir, "node_modules", name);
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(join(pkgDir, "node_modules", name), link, "dir");
  }
}

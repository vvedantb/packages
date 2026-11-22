// Shared by the plain Node suites: the local module graph under given entries,
// the bare packages it imports at runtime, and a transpiled copy of it in a
// fixture that links only the packages a suite chooses.
import { transformSync } from "esbuild";
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * The directory an installed dependency lives in. The search walks up from the package, because a hoisted
 * install puts dependencies in the repository root and an isolated one puts them in the package.
 */
export function depDir(name) {
  for (let dir = pkgDir; ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    if (dirname(dir) === dir) throw new Error(`${name} is not installed for @vvedantb/ui`);
  }
}

/**
 * Arguments for `node` that run `check.mjs` in a fixture with one copy of React. A hoisted install keeps one
 * copy of each library, and a library such as convex can carry a React of its own when another workspace
 * uses a different React version. An app's bundler dedupes React; this preload does the same for plain Node.
 */
export const fixtureNodeArgs = ["--import", "./single-react.mjs", "check.mjs"];

const singleReact = `
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
const fromFixture = pathToFileURL(process.cwd() + "/check.mjs").href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    const react = /^react(-dom)?([/]|$)/.test(specifier);
    return nextResolve(specifier, react ? { ...context, parentURL: fromFixture } : context);
  },
});
`;

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
      packages.set(name, [...(packages.get(name) ?? []), relative(pkgDir, file).replaceAll("\\", "/")]);
    }
  }
  return { files, packages };
}

/** Transpile `files` into `dir` (paths kept relative to the package) and link `packages` from where they are installed. */
export function writeFixture(dir, files, packages) {
  for (const file of files) {
    const out = join(dir, relative(pkgDir, file).replace(/\.tsx?$/, ".js"));
    mkdirSync(dirname(out), { recursive: true });
    const source = readFileSync(file, "utf8").replace(/(from\s+")(\.[^"]+)(")/g, (_m, open, specifier, close) => {
      const target = resolveLocal(file, specifier).replace(/\.tsx?$/, ".js");
      const rel = relative(dirname(file), target).replace(/\\/g, "/");
      return `${open}${rel.startsWith(".") ? rel : `./${rel}`}${close}`;
    });
    const { code } = transformSync(source, {
      loader: file.endsWith(".tsx") ? "tsx" : "ts",
      format: "esm",
      target: "es2022",
      jsx: "automatic",
    });
    writeFileSync(out, code);
  }
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(join(dir, "single-react.mjs"), singleReact);
  for (const name of packages) {
    const link = join(dir, "node_modules", name);
    mkdirSync(dirname(link), { recursive: true });
    // A junction on Windows, where a directory symlink needs a privilege; other systems ignore the type.
    symlinkSync(depDir(name), link, "junction");
  }
}

// Builds a package's `dist/`: the runtime code it publishes, compiled with
// React Compiler (target 19), so apps get memoised components without
// compiling node_modules (Expo and Vite skip them). Each source file is
// compiled on its own, at the same relative path, so subpath exports,
// relative imports across folders and `.web` / `.native` platform files keep
// resolving. TypeScript is stripped. Types still come from `src`.
//
// Options (per package, see each package's `scripts/build-dist.mjs`):
// - `dirs`: source folders, relative to the package, each built to the same
//   path under `dist` (or to `dist` itself when `flat` is set, one folder only).
// - `jsx`: "preserve" keeps JSX for the app's own JSX transform (native-ui:
//   NativeWind's `className` depends on `jsxImportSource: "nativewind"`);
//   "automatic" compiles it to `react/jsx-runtime` (web, plain JavaScript).
//
// The compiler skips a component that breaks the Rules of React; it still
// runs, unmemoised. `compiler-baseline.json` in the package lists the
// accepted skips, and a new one fails the build. `--update` rewrites it.
import { transformFileAsync } from "@babel/core";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createRequire } from "node:module";

// Babel plugins resolve from this script (the repo root devDependencies).
const require = createRequire(import.meta.url);
const resolved = (name) => require.resolve(name);

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

const isTest = (rel) => /\.test\.tsx?$/.test(rel) || /(^|\/)__snapshots__\//.test(rel);

export async function buildDist({ root, dirs, flat = false, jsx, update = process.argv.includes("--update") }) {
  const name = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).name;
  const dist = join(root, "dist");
  const baselinePath = join(root, "compiler-baseline.json");
  const skips = [];
  const logger = {
    logEvent(filename, event) {
      if (event.kind !== "CompileError" && event.kind !== "PipelineError") return;
      const file = relative(root, filename ?? "?");
      const reason = String(event.detail?.reason ?? event.detail?.options?.reason ?? event.data ?? event.kind)
        .split("\n")[0]
        .slice(0, 160);
      skips.push(`${file} :: ${reason}`);
    },
  };
  const presets = [];
  if (jsx === "automatic") presets.push([resolved("@babel/preset-react"), { runtime: "automatic" }]);

  rmSync(dist, { recursive: true, force: true });
  let compiled = 0;
  for (const dir of dirs) {
    const from = join(root, dir);
    for (const file of walk(from)) {
      const rel = relative(from, file);
      if (isTest(rel)) continue;
      const out = join(flat ? dist : join(dist, dir), rel);
      mkdirSync(dirname(out), { recursive: true });
      if (!/\.tsx?$/.test(rel) || /\.d\.c?ts$/.test(rel)) {
        // CSS, declarations, plain JavaScript and assets ship as they are.
        copyFileSync(file, out);
        continue;
      }
      const isTsx = rel.endsWith(".tsx");
      const result = await transformFileAsync(file, {
        babelrc: false,
        configFile: false,
        sourceMaps: false,
        // The compiler runs first, on the typed source, as Expo orders it.
        plugins: [[resolved("babel-plugin-react-compiler"), { target: "19", logger }]],
        presets: [
          ...presets,
          [resolved("@babel/preset-typescript"), { isTSX: isTsx, allExtensions: true, onlyRemoveTypeImports: false }],
        ],
      });
      const ext = isTsx && jsx === "preserve" ? ".jsx" : ".js";
      writeFileSync(out.replace(/\.tsx?$/, ext), `${result.code}\n`);
      compiled++;
    }
  }

  const unique = [...new Set(skips)].sort();
  if (update) {
    writeFileSync(baselinePath, `${JSON.stringify(unique, null, 2)}\n`);
    console.log(`${name} build-dist: ${compiled} files; baseline updated (${unique.length} compiler skips).`);
    return;
  }
  const baseline = new Set(JSON.parse(readFileSync(baselinePath, "utf8")));
  const fresh = unique.filter((skip) => !baseline.has(skip));
  for (const skip of [...baseline].filter((s) => !unique.includes(s))) {
    console.log(`${name} build-dist: no longer skipped (run build:baseline to shrink the baseline): ${skip}`);
  }
  if (fresh.length > 0) {
    console.error(`${name} build-dist: ${fresh.length} NEW React Compiler skip(s); the component ships unmemoised:`);
    for (const skip of fresh) console.error(`  ${skip}`);
    console.error('Fix the Rules of React break, add "use no memo" with a reason, or run build:baseline to accept it.');
    process.exit(1);
  }
  console.log(`${name} build-dist: ${compiled} files compiled; ${unique.length} known compiler skips, none new.`);
}

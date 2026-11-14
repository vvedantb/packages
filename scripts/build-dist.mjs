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
// - `explicitExtensions`: rewrites relative imports to name the file
//   (`./cn` → `./cn.js`, `./ui` → `./ui/index.js`), as Node's ESM resolver
//   (Vitest, SSR) requires. Not for native-ui: Metro picks `.web` / `.native`
//   files from an extensionless path.
// - `jsx`: "preserve" keeps JSX for the app's own JSX transform (native-ui:
//   NativeWind's `className` depends on `jsxImportSource: "nativewind"`);
//   "automatic" compiles it to `react/jsx-runtime` (web, plain JavaScript).
//
// The compiler skips a component that breaks the Rules of React; it still
// runs, unmemoised. `compiler-baseline.json` in the package lists the
// accepted skips, and a new one fails the build. `--update` rewrites it.
import { transformAsync, transformFileAsync } from "@babel/core";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
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

/**
 * One `.ts` / `.tsx` file as it ships in `dist`: React Compiler output with
 * TypeScript stripped, and compiler-hoisted helpers put back into worklets.
 */
export async function compileFile(file, { jsx, logger }) {
  const isTsx = file.endsWith(".tsx");
  const presets = [];
  if (jsx === "automatic") presets.push([resolved("@babel/preset-react"), { runtime: "automatic" }]);
  const compiled = await transformFileAsync(file, {
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
  const inlined = await transformAsync(compiled.code, {
    babelrc: false,
    configFile: false,
    sourceMaps: false,
    parserOpts: { plugins: ["jsx"] },
    plugins: [keepWorkletHelpersInline],
  });
  return inlined.code;
}

export async function buildDist({ root, dirs, flat = false, jsx, explicitExtensions = false, update = process.argv.includes("--update") }) {
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
      const code = await compileFile(file, { jsx, logger });
      const ext = isTsx && jsx === "preserve" ? ".jsx" : ".js";
      writeFileSync(out.replace(/\.tsx?$/, ext), `${code}\n`);
      compiled++;
    }
  }

  if (explicitExtensions) addExtensions(dist);

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

// Worklet callbacks, as react-native-worklets' Babel plugin finds them: the
// callee name and which arguments it workletizes.
const WORKLET_ARGS = new Map([
  ["useFrameCallback", [0]], ["useAnimatedStyle", [0]], ["useAnimatedProps", [0]], ["createAnimatedPropAdapter", [0]],
  ["useDerivedValue", [0]], ["useAnimatedScrollHandler", [0]], ["useAnimatedReaction", [0, 1]],
  ["withTiming", [2]], ["withSpring", [2]], ["withDecay", [1]], ["withRepeat", [3]],
  ["runOnUI", [0]], ["scheduleOnUI", [0]], ["runOnUISync", [0]], ["runOnUIAsync", [0]],
  ...["onBegin", "onStart", "onEnd", "onFinalize", "onUpdate", "onChange", "onTouchesDown", "onTouchesMove", "onTouchesUp", "onTouchesCancelled"].map((name) => [name, [0]]),
]);

/**
 * React Compiler hoists a function that captures nothing to a module-level
 * `_temp` function, also from inside a worklet (`boxes.map((box) => box.x)` in
 * `useAnimatedStyle`). The app's worklets plugin then sees a plain JS function,
 * and calling it on the UI thread crashes the app ("Tried to synchronously
 * call a Remote Function", Eva 0.1.59). This pass puts each hoisted function
 * back inline where a worklet uses it, as the source wrote it.
 */
function keepWorkletHelpersInline({ types: t }) {
  const calleeName = (callee) =>
    t.isIdentifier(callee) ? callee.name : t.isMemberExpression(callee) && t.isIdentifier(callee.property) ? callee.property.name : null;
  const inline = (fn) =>
    fn.traverse({
      Identifier(path) {
        if (!/^_temp\d*$/.test(path.node.name) || !path.isReferencedIdentifier()) return;
        const declaration = path.scope.getBinding(path.node.name)?.path;
        if (!declaration?.isFunctionDeclaration() || !declaration.parentPath.isProgram()) return;
        const { params, body, async, generator } = t.cloneNode(declaration.node, true);
        path.replaceWith(t.functionExpression(null, params, body, generator, async));
      },
    });
  return {
    visitor: {
      CallExpression(path) {
        const args = WORKLET_ARGS.get(calleeName(path.node.callee));
        const passed = path.get("arguments");
        for (const index of args ?? []) {
          const arg = passed[index];
          if (arg?.isFunction()) inline(arg);
        }
      },
      Function(path) {
        if (t.isBlockStatement(path.node.body) && path.node.body.directives.some((d) => d.value.value === "worklet")) inline(path);
      },
    },
  };
}

const isFile = (path) => existsSync(path) && statSync(path).isFile();

/** Names the file in every relative import of `dist`'s JavaScript; fails on one it cannot resolve. */
function addExtensions(dist) {
  const specifier = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']+)\2/g;
  const unresolved = [];
  for (const file of walk(dist).filter((f) => f.endsWith(".js"))) {
    const code = readFileSync(file, "utf8");
    const next = code.replace(specifier, (match, lead, quote, spec) => {
      const target = join(dirname(file), spec);
      if (isFile(target)) return match;
      if (isFile(`${target}.js`)) return `${lead}${quote}${spec}.js${quote}`;
      if (isFile(join(target, "index.js"))) return `${lead}${quote}${spec}/index.js${quote}`;
      unresolved.push(`${relative(dist, file)}: ${spec}`);
      return match;
    });
    if (next !== code) writeFileSync(file, next);
  }
  if (unresolved.length > 0) {
    throw new Error(`build-dist: unresolved relative imports in dist:\n  ${unresolved.join("\n  ")}`);
  }
}

// Builds `dist/`: the runtime code the package publishes. Each source file is
// compiled on its own (same paths, so subpath exports and `.web` / `.native`
// platform files keep resolving):
//
// - React Compiler (`babel-plugin-react-compiler`, target 19) memoises
//   components and hooks, so apps get it without compiling node_modules
//   (Expo never compiles node_modules).
// - TypeScript is stripped.
// - JSX stays JSX. The app's Babel transforms it with its own JSX runtime;
//   NativeWind's `className` styling depends on that (`jsxImportSource:
//   "nativewind"`), so compiling JSX here would drop every kit class name.
//
// `.tsx` becomes `.jsx` and `.ts` becomes `.js`. The compiler skips a
// component that breaks the Rules of React (the code still runs, unmemoised).
// Each skip is listed, and `compiler-baseline.json` holds the accepted ones:
// a new skip fails the build. `--update` rewrites the baseline.
import { transformFileAsync } from "@babel/core";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");
const baselinePath = join(root, "compiler-baseline.json");
const update = process.argv.includes("--update");

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

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
for (const file of walk(src)) {
  const rel = relative(src, file);
  const out = join(dist, rel);
  mkdirSync(dirname(out), { recursive: true });
  if (/\.d\.c?ts$/.test(rel) || /\.c?js$/.test(rel) || /\.cts$/.test(rel)) {
    // Declarations and plain CommonJS (the Tailwind preset) ship as they are.
    copyFileSync(file, out);
    continue;
  }
  if (!/\.tsx?$/.test(rel)) {
    copyFileSync(file, out);
    continue;
  }
  const isTsx = rel.endsWith(".tsx");
  const result = await transformFileAsync(file, {
    babelrc: false,
    configFile: false,
    sourceMaps: false,
    retainLines: false,
    // The compiler runs first, on the typed source, as Expo orders it.
    plugins: [["babel-plugin-react-compiler", { target: "19", logger }]],
    presets: [["@babel/preset-typescript", { isTSX: isTsx, allExtensions: true, onlyRemoveTypeImports: false }]],
    parserOpts: { plugins: isTsx ? ["jsx", "typescript"] : ["typescript"] },
  });
  writeFileSync(out.replace(/\.tsx$/, ".jsx").replace(/\.ts$/, ".js"), `${result.code}\n`);
  compiled++;
}

const unique = [...new Set(skips)].sort();
if (update) {
  writeFileSync(baselinePath, `${JSON.stringify(unique, null, 2)}\n`);
  console.log(`build-dist: ${compiled} files; baseline updated (${unique.length} compiler skips).`);
  process.exit(0);
}
const baseline = new Set(JSON.parse(readFileSync(baselinePath, "utf8")));
const fresh = unique.filter((skip) => !baseline.has(skip));
const gone = [...baseline].filter((skip) => !unique.includes(skip));
for (const skip of gone) console.log(`build-dist: no longer skipped (run --update to shrink the baseline): ${skip}`);
if (fresh.length > 0) {
  console.error(`build-dist: ${fresh.length} NEW React Compiler skip(s); the component ships unmemoised:`);
  for (const skip of fresh) console.error(`  ${skip}`);
  console.error("Fix the Rules of React break, add \"use no memo\" with a reason, or run with --update to accept it.");
  process.exit(1);
}
console.log(`build-dist: ${compiled} files compiled; ${unique.length} known compiler skips, none new.`);

// Fails when the client entry of @vvedantb/ui reaches server-only code.
//
// The client entry (`@vvedantb/ui/client`, src/client.ts) is for Chrome
// extensions and other pages that cannot load `@vvedantb/server`, Convex,
// Clerk or a Node built-in. This script bundles the entry with esbuild and
// reads the metafile: the resolved module graph, including type-free
// side-effect and dynamic imports. It does not read import lines itself.
//
// A positive control bundles the root entry (src/index.ts). It must reach
// those modules, or the check is not looking at the right thing.
//
// Usage: node scripts/check-client-graph.mjs
import { builtinModules } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(pkgDir, "..", "..");

// Matched against resolved real paths of bundled modules.
const FORBIDDEN_PATH = [
  ["@vvedantb/server", (p) => p.startsWith(`packages${sep}server${sep}`)],
  ["convex", (p) => /(^|[\\/])node_modules[\\/]convex[\\/]/.test(p)],
  ["@clerk/*", (p) => /(^|[\\/])node_modules[\\/]@clerk[\\/]/.test(p)],
];
const isBuiltin = (id) => id.startsWith("node:") || builtinModules.includes(id.split("/")[0]);

/** Bundles an entry and returns what the graph reaches that a client page cannot load. */
async function reach(entry) {
  const builtins = new Set();
  // Leaves Node built-ins unresolved but records them, so the build does not fail on them.
  const recordBuiltins = {
    name: "record-builtins",
    setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === "entry-point" || !isBuiltin(args.path)) return undefined;
        builtins.add(`node:${args.path.replace(/^node:/, "")}`);
        return { path: args.path, external: true };
      });
    },
  };
  const result = await build({
    entryPoints: [join(pkgDir, entry)],
    absWorkingDir: pkgDir,
    bundle: true,
    write: false,
    metafile: true,
    platform: "browser",
    format: "esm",
    logLevel: "silent",
    loader: { ".css": "empty", ".svg": "empty", ".woff2": "empty", ".png": "empty" },
    outdir: "out",
    plugins: [recordBuiltins],
  });
  const inputs = Object.keys(result.metafile.inputs);
  const hits = new Set(builtins);
  for (const input of inputs) {
    const real = relative(repoRoot, join(pkgDir, input));
    for (const [name, test] of FORBIDDEN_PATH) if (test(real)) hits.add(name);
  }
  return { count: inputs.length, hits: [...hits].sort() };
}

const client = await reach("src/client.ts");
const root = await reach("src/index.ts");

let failed = false;
if (client.count < 200) {
  console.error(`client graph: only ${client.count} modules reached; the bundle is not seeing the entry`);
  failed = true;
}
if (client.hits.length) {
  console.error(`client graph reaches modules a client page cannot load: ${client.hits.join(", ")}`);
  failed = true;
}
for (const name of ["@vvedantb/server", "convex", "@clerk/*"]) {
  if (!root.hits.includes(name)) {
    console.error(`positive control failed: the root entry did not reach ${name}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`@vvedantb/ui client graph: ${client.count} modules, no server, Convex, Clerk or node: module (root control reaches: ${root.hits.join(", ")})`);

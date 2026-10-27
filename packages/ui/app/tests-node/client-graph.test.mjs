// Plain Node, no vitest: the module graph under src/client.ts, the
// @vvedantb/ui/client entry, read statically. It must reach no
// `@vvedantb/server`, convex, Clerk or Node built-in import. Unlike `graph`,
// this walk also follows type-only, side-effect and dynamic imports: the
// package ships TypeScript, so an app type-checks every file it reaches.
// Test files are not in the graph because no entry module imports one.
// Run with: node --test app/tests-node/client-graph.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { join, relative } from "node:path";
import { test } from "node:test";
import { pkgDir, resolveLocal } from "./graph.mjs";

// `from "x"`, `import "x"`, `import("x")` and `require("x")`.
const SPECIFIER = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*["']([^"']+)["']/g;
const FORBIDDEN = /^(@vvedantb\/server|convex|@clerk\/[^/]+)$/;

function packageName(specifier) {
  return specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
}

/** Every local file reachable from `entry`, with the bare specifiers it imports. */
function reachable(entry) {
  const files = new Map();
  const queue = [join(pkgDir, entry)];
  while (queue.length) {
    const file = queue.pop();
    if (files.has(file)) continue;
    const specifiers = [...readFileSync(file, "utf8").matchAll(SPECIFIER)].map((m) => m[1]);
    files.set(file, specifiers.filter((s) => !s.startsWith(".")));
    for (const s of specifiers) if (s.startsWith(".") && !s.endsWith(".css")) queue.push(resolveLocal(file, s));
  }
  return files;
}

/** `[file, specifier]` for each import that a client page cannot load. */
function forbidden(files) {
  return [...files].flatMap(([file, specifiers]) =>
    specifiers
      .filter((s) => s.startsWith("node:") || builtinModules.includes(packageName(s)) || FORBIDDEN.test(packageName(s)))
      .map((s) => [relative(pkgDir, file), s]),
  );
}

test("the client graph imports no @vvedantb/server, convex, Clerk or node: module", () => {
  const files = reachable("src/client.ts");
  assert.ok(files.size > 200, `only ${files.size} files reached`);
  assert.deepEqual([...files.keys()].filter((f) => /\.test\.tsx?$/.test(f)), []);
  assert.deepEqual(forbidden(files), []);
});

test("the same walk finds @vvedantb/server, convex and Clerk under the root", () => {
  const names = new Set(forbidden(reachable("src/index.ts")).map(([, s]) => packageName(s)));
  assert.deepEqual([...names].sort(), ["@clerk/clerk-react", "@vvedantb/server", "convex"]);
});

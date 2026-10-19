// Plain Node ESM, no vitest: the Convex helpers in app/src/convex,
// transpiled as they are.
//
// `convex` and `@clerk/clerk-react` are optional peers, but the package root
// cannot be loaded without them: `ConvexClerkProvider` and `useEnsureUser` need
// `convex/react` hooks and providers, and `useStableAuth` and
// `ConvexClerkProvider` default to Clerk's `useAuth`, all as static imports
// (ESM has no synchronous optional import). So these suites pin down which root
// modules import them, and load each helper with only what it needs.
// Run with: node --test app/tests-node/convex-esm.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { graph, writeFixture } from "./graph.mjs";

const CONVEX_OR_CLERK = /^(convex|@clerk\/clerk-react)$/;

test("in the root graph only ConvexClerkProvider, useEnsureUser and useStableAuth import convex or Clerk", () => {
  const { packages } = graph(["src/index.ts"]);
  const importers = new Set(
    [...packages].filter(([name]) => CONVEX_OR_CLERK.test(name)).flatMap(([, files]) => files),
  );
  assert.deepEqual([...importers].sort(), [
    "app/src/auth/useStableAuth.ts",
    "app/src/convex/ConvexClerkProvider.tsx",
    "app/src/convex/useEnsureUser.ts",
  ]);
});

function run(prefix, entries, links, check) {
  const { files, packages } = graph(entries);
  const dir = mkdtempSync(join(tmpdir(), `vvedantb-ui-${prefix}-`));
  try {
    writeFixture(dir, files, new Set([...packages.keys(), ...links]));
    writeFileSync(join(dir, "check.mjs"), check);
    const result = spawnSync(process.execPath, ["check.mjs"], { cwd: dir, encoding: "utf8" });
    assert.equal(result.status, 0, `plain Node import failed:\n${result.stdout}${result.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("parseClientEnv loads without convex, Clerk or zod installed and parses with the app's z", () => {
  const { packages } = graph(["app/src/convex/env.ts"]);
  assert.deepEqual([...packages.keys()], []);
  run(
    "convex-env",
    ["app/src/convex/env.ts"],
    [],
    `
import assert from "node:assert/strict";
import { parseClientEnv, VITE_ENV_NAMES } from "./app/src/convex/env.js";

for (const name of ["convex", "@clerk/clerk-react", "zod"]) {
  await assert.rejects(import(name), /Cannot find package/);
}
assert.deepEqual(VITE_ENV_NAMES, ["development", "staging", "production"]);

// A stand-in for the app's z, enough for the calls parseClientEnv makes.
const string = () => ({ min: () => ({ kind: "string" }) });
const z = {
  string,
  enum: (values) => ({ kind: "enum", values }),
  object: (shape) => ({ parse: (input) => Object.fromEntries(Object.keys(shape).map((key) => [key, input[key]])) }),
};
const raw = { VITE_CONVEX_URL: "u", VITE_CLERK_PUBLISHABLE_KEY: "k", VITE_ENV: "preview", OTHER: "x" };
assert.deepEqual(parseClientEnv(raw, { z, viteEnv: "fallback" }), {
  VITE_CONVEX_URL: "u",
  VITE_CLERK_PUBLISHABLE_KEY: "k",
  VITE_ENV: "development",
});
assert.deepEqual(parseClientEnv(raw, { z, viteEnv: false }), { VITE_CONVEX_URL: "u", VITE_CLERK_PUBLISHABLE_KEY: "k" });
`,
  );
});

test("ConvexClerkProvider and useEnsureUser render in plain Node with convex and Clerk installed", () => {
  const entries = ["app/src/convex/ConvexClerkProvider.tsx", "app/src/convex/useEnsureUser.ts"];
  const { packages } = graph(entries);
  assert.deepEqual([...packages.keys()].sort(), ["@clerk/clerk-react", "convex", "react"]);
  run(
    "convex-react",
    entries,
    ["react-dom"],
    `
import assert from "node:assert/strict";
import { ConvexReactClient } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConvexClerkProvider } from "./app/src/convex/ConvexClerkProvider.js";
import { useEnsureUser } from "./app/src/convex/useEnsureUser.js";

assert.equal(renderToStaticMarkup(h(ConvexClerkProvider, { client: null }, "child")), "child");

const client = new ConvexReactClient("https://example.convex.cloud", { skipConvexDeploymentUrlCheck: true, webSocketConstructor: class {} });
const ensureUserExists = makeFunctionReference("users:ensureUserExists");
function Probe() {
  useEnsureUser(ensureUserExists);
  return "ready";
}
assert.equal(renderToStaticMarkup(h(ConvexClerkProvider, { client, clerk: false }, "plain")), "plain");
// useEnsureUser reads Convex auth, so it needs the Clerk variant; a signed-out stub stands in for Clerk's useAuth.
const useAuth = () => ({ isLoaded: true, isSignedIn: false, getToken: async () => null, orgId: undefined, orgRole: undefined });
assert.equal(renderToStaticMarkup(h(ConvexClerkProvider, { client, useAuth }, h(Probe))), "ready");
await client.close();
`,
  );
});

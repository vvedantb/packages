// Plain Node ESM check of the published package. Not run by vitest, which
// aliases @vvedantb/server to src/index.ts and would hide missing extensions.
// Run with: node --test tests-node/esm-exports.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { build, installFixture, pkg, tsc } from "./installed.mjs";

let bare;

before(() => {
  build();
  // No peer installed: no zod, convex, @clerk/backend or @modelcontextprotocol/sdk.
  bare = installFixture("esm");
});

after(() => {
  if (bare) rmSync(bare, { recursive: true, force: true });
});

function runIn(dir, name, source) {
  const file = join(dir, `${name}.mjs`);
  writeFileSync(file, source);
  return spawnSync(process.execPath, [file], { cwd: dir, encoding: "utf8" });
}

test("exports map has only the root and package.json", () => {
  assert.deepEqual(Object.keys(pkg.exports).sort(), [".", "./package.json"]);
  assert.deepEqual(pkg.exports["."], { types: "./dist/index.d.ts", import: "./dist/index.js" });
});

test(`plain Node ESM can import ${pkg.name} with no peer installed`, () => {
  const run = runIn(
    bare,
    "import-root",
    `const m = await import(${JSON.stringify(pkg.name)});\n` +
      // One export from each internal folder, and every former @vvedantb/mcp-client and convex-client runtime export.
      `for (const name of ["extractBearerToken", "createMcpHttpHandler", "sha256Hex", "registerMcpRoutes", "verifyClerkAccessToken", "createClerkUserAuth",\n` +
      `  "createMemoryOptimisticStore", "forEachLoadedQuery", "mapLoadedQuery", "patchLoadedQuery", "updateAllCachedQueries", "tempId",\n` +
      `  "authorizeMcpServer", "createMcpOAuthProvider", "createMcpOAuthStateSchema", "hasMcpOAuthTokens", "isAccessTokenExpiring",\n` +
      `  "refreshMcpOAuth", "revokeMcpOAuth", "startLoopback"]) {\n` +
      `  if (typeof m[name] !== "function") throw new Error("missing export " + name);\n` +
      `}\n` +
      `if (m.LOOPBACK_PATH !== "/callback" || m.LOOPBACK_TIMEOUT_MS !== 300000) throw new Error("loopback constants");\n`,
  );
  assert.equal(run.status, 0, `import failed:\n${run.stderr}`);
});

test("without the SDK: the pure MCP client helpers, the store and the loopback work; the SDK ones fail cleanly", () => {
  const run = runIn(
    bare,
    "no-sdk",
    `import assert from "node:assert/strict";\n` +
      `import * as m from ${JSON.stringify(pkg.name)};\n` +
      `await assert.rejects(import("@modelcontextprotocol/sdk/client/auth.js"), /Cannot find package/);\n` +
      `await assert.rejects(import("convex/server"), /Cannot find package/);\n` +
      `assert.equal(m.hasMcpOAuthTokens({ tokens: { access_token: "a", token_type: "bearer" } }), true);\n` +
      `assert.equal(m.isAccessTokenExpiring({ tokens: { access_token: "a", token_type: "bearer", expires_in: 60, obtained_at: 0 } }, 0), true);\n` +
      `const store = m.createMemoryOptimisticStore();\n` +
      `const list = { [Symbol.for("functionName")]: "tasks:list" };\n` +
      `store.setQuery(list, {}, [1]);\n` +
      `assert.deepEqual(store.getQuery(list, {}), [1]);\n` +
      `assert.match(m.tempId("tasks"), /^[0-9a-f-]{36}$/);\n` +
      `const provider = m.createMcpOAuthProvider({ clientName: "App", storage: { load: () => undefined, save: () => undefined } });\n` +
      `assert.match(provider.state(), /^[A-Za-z0-9_-]{22}$/);\n` +
      `const loopback = await m.startLoopback();\n` +
      `assert.match(loopback.redirectUrl, /^http:\\/\\/127\\.0\\.0\\.1:\\d+\\/callback$/);\n` +
      `loopback.close();\n` +
      // refresh and revoke never throw: without the SDK they report false.
      `assert.equal(await m.refreshMcpOAuth({ url: "https://mcp.example.test/mcp", provider }), false);\n` +
      `await assert.rejects(provider.redirectToAuthorization(new URL("https://as.example.test/authorize")), /need the @modelcontextprotocol\\/sdk package/);\n` +
      `assert.equal(await m.revokeMcpOAuth({ url: "https://mcp.example.test/mcp", state: { tokens: { access_token: "a", token_type: "bearer" } } }), false);\n`,
  );
  assert.equal(run.status, 0, `failed:\n${run.stdout}${run.stderr}`);
});

test("with the SDK installed, a non-interactive provider rejects with the SDK's UnauthorizedError", () => {
  const dir = installFixture("sdk", { "@modelcontextprotocol/sdk": "@modelcontextprotocol/sdk" });
  try {
    const run = runIn(
      dir,
      "sdk",
      `import assert from "node:assert/strict";\n` +
        `import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";\n` +
        `import { createMcpOAuthProvider } from ${JSON.stringify(pkg.name)};\n` +
        `const provider = createMcpOAuthProvider({ clientName: "App", signInRequiredMessage: "Sign in first", storage: { load: () => undefined, save: () => undefined } });\n` +
        `const error = await provider.redirectToAuthorization(new URL("https://as.example.test/authorize")).then(() => undefined, (e) => e);\n` +
        `assert.ok(error instanceof UnauthorizedError);\n` +
        `assert.equal(error.message, "Sign in first");\n`,
    );
    assert.equal(run.status, 0, `failed:\n${run.stdout}${run.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const removed of ["convex", "mcp"]) {
  const specifier = `${pkg.name}/${removed}`;
  test(`${specifier} no longer resolves`, () => {
    const run = runIn(
      bare,
      `import-${removed}`,
      `try {\n` +
        `  await import(${JSON.stringify(specifier)});\n` +
        `} catch (err) {\n` +
        `  if (err.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") process.exit(0);\n` +
        `  throw err;\n` +
        `}\n` +
        `process.exit(1);\n`,
    );
    assert.equal(run.status, 0, `expected ERR_PACKAGE_PATH_NOT_EXPORTED:\n${run.stderr}`);
  });
}

// From @vvedantb/mcp-client's consumer check, plus the former convex-client helpers' Convex types.
const consumer = `
import { z } from "zod";
import { makeFunctionReference } from "convex/server";
import {
  createMcpOAuthProvider,
  createMcpOAuthStateSchema,
  mapLoadedQuery,
  startLoopback,
  tempId,
  type McpOAuthState,
  type OptimisticStore,
} from "@vvedantb/server";

const schema = createMcpOAuthStateSchema(z);
const settings = z.object({ oauth: schema.optional() });
const state: McpOAuthState | undefined = settings.parse({}).oauth;
const parsed: McpOAuthState = schema.parse({});
const loopback = await startLoopback({ title: "App", messages: { success: "Done." } });
const provider = createMcpOAuthProvider({
  clientName: "App",
  storage: { load: () => state ?? parsed, save: () => undefined },
  redirectUrl: loopback.redirectUrl,
  redirectToAuthorization: () => undefined,
});
const pending: string | undefined = provider.pendingState;

type Task = { _id: string; title: string };
const list = makeFunctionReference<"query", { projectId: string }, Task[]>("tasks:list");
const id: string = tempId("tasks");
declare const store: OptimisticStore;
mapLoadedQuery(store, list, (tasks) => [...tasks, { _id: id, title: "new" }]);
export { pending };
`;

for (const [label, zodDir] of [
  ["zod 4", "zod"],
  ["zod 3.25", "zod3"],
]) {
  test(`the published types work for a ${label} consumer (skipLibCheck off for this package)`, () => {
    const dir = installFixture("types", {
      zod: zodDir,
      convex: "convex",
      "@modelcontextprotocol/sdk": "@modelcontextprotocol/sdk",
      "@types/node": "@types/node",
    });
    try {
      writeFileSync(join(dir, "consumer.ts"), consumer);
      writeFileSync(
        join(dir, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            // The SDK's own declarations name DOM's HeadersInit.
            lib: ["ES2022", "DOM"],
            strict: true,
            noEmit: true,
            skipLibCheck: false,
            types: ["node"],
          },
          files: ["consumer.ts", `node_modules/${pkg.name}/dist/index.d.ts`],
        }),
      );
      const check = spawnSync(process.execPath, [tsc, "-p", "tsconfig.json"], { cwd: dir, encoding: "utf8" });
      assert.equal(check.status, 0, `tsc failed:\n${check.stdout}${check.stderr}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

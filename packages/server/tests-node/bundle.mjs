// Bundles a Convex function file that imports the package root the way
// `convex deploy` bundles for the default (V8) runtime: Convex's own esbuild
// with the options from convex/dist/esm/bundler/debugBundle.js (1.47). The
// root also carries Node-only MCP client OAuth (node:http, the MCP SDK) and the
// QuickJS code sandbox, so this checks none of it reaches a V8 bundle.
// Run with: node --test tests-node/bundle.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { builtinModules, createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, test } from "node:test";
import { pathToFileURL } from "node:url";
import { build, installFixture, pkg, pkgDir } from "./installed.mjs";

const convexPackageJson = realpathSync(join(pkgDir, "node_modules", "convex", "package.json"));
const { default: esbuild } = await import(pathToFileURL(createRequire(convexPackageJson).resolve("esbuild")).href);

// Server root exports a Convex backend uses (the MCP token cache among them), plus pure MCP client OAuth and artifacts ones.
const functionFile = `
import { httpActionGeneric } from "convex/server";
import {
  applyArtifactStatePatch,
  authenticateClerkBearer,
  authenticateWithTokenCache,
  extractBearerToken,
  hasMcpOAuthTokens,
  isAccessTokenExpiring,
  jsonResponse,
  sha256Hex,
  utcDayKey,
  wrapArtifactDocument,
} from ${JSON.stringify(pkg.name)};

export const status = httpActionGeneric(async (_ctx, request) => {
  const token = extractBearerToken(request.headers.get("authorization"));
  const state = token ? { tokens: { access_token: token, token_type: "bearer" } } : undefined;
  return jsonResponse({
    signedIn: hasMcpOAuthTokens(state),
    expiring: isAccessTokenExpiring(state, Date.now()),
    hash: token ? await sha256Hex(token) : null,
    jwtPrincipal: token
      ? await authenticateClerkBearer({ token, issuer: "https://clerk.example.test", verifyFallback: async () => null })
      : null,
    principal: token
      ? await authenticateWithTokenCache({ token, get: async () => null, put: async () => null, verify: async () => null })
      : null,
    state: applyArtifactStatePatch({}, { sets: { day: String(utcDayKey(Date.now())) } }),
    srcdoc: wrapArtifactDocument("<p>x</p>", "html"),
  });
});
`;

async function convexBundle(dir) {
  const entry = join(dir, "convex", "status.ts");
  mkdirSync(join(dir, "convex"));
  writeFileSync(entry, functionFile);
  return esbuild.build({
    entryPoints: [entry],
    absWorkingDir: dir,
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "esnext",
    jsx: "automatic",
    outdir: "out",
    outbase: join(dir, "convex"),
    conditions: ["convex", "module"],
    write: false,
    splitting: true,
    chunkNames: "_deps/[hash]",
    treeShaking: true,
    minifySyntax: true,
    minifyIdentifiers: true,
    minifyWhitespace: false,
    keepNames: true,
    define: { "process.env.NODE_ENV": '"production"' },
    metafile: true,
    logLevel: "silent",
  });
}

const builtins = builtinModules.filter((name) => !name.startsWith("_")).map((name) => name.replace(/^node:/, ""));
const escape = (name) => name.replace(/[/]/g, "\\/");
const nodeImport = /["']node:[a-z_/]+["']/;
const builtinRequire = new RegExp(`require\\(\\s*["'](?:${builtins.map(escape).join("|")})["']\\s*\\)`);
const builtinSpecifier = new RegExp(`(?:from|import)\\s*\\(?\\s*["'](?:${builtins.map(escape).join("|")})["']`);

function assertNoNode(result) {
  for (const file of result.outputFiles) {
    assert.doesNotMatch(file.text, nodeImport, `${file.path} imports a node: built-in`);
    assert.doesNotMatch(file.text, builtinRequire, `${file.path} requires a Node built-in`);
    assert.doesNotMatch(file.text, builtinSpecifier, `${file.path} imports a Node built-in`);
  }
}

/** The entry output: the function file and what it pulled in from the package. */
function entryOutput(result) {
  const entry = result.outputFiles.find((file) => file.path.endsWith("status.js"));
  assert.ok(entry, "no entry output");
  return entry.text;
}

// Only the pure helpers of the MCP client OAuth may reach the entry: no SDK loader, no loopback server.
function assertNoMcpClientRuntime(text) {
  assert.match(text, /hasMcpOAuthTokens/);
  for (const marker of ["@modelcontextprotocol/sdk", "createServer", "startLoopback", "authorizeMcpServer"]) {
    assert.ok(!text.includes(marker), `entry output contains ${marker}`);
  }
}

// The sandbox imports QuickJS (and its embedded WASM) on first call. The package's "browser" field maps both
// QuickJS packages to empty modules for platform "browser" bundles such as Convex V8, so they never get there:
// esbuild leaves one empty chunk per mapped package, and nothing else.
const quickJsMarkers = ["quickjs-emscripten-core", "quickjs-singlefile", "newQuickJSWASMModuleFromVariant", "QTS_"];

function assertNoQuickJs(result) {
  for (const file of result.outputFiles) {
    for (const marker of quickJsMarkers) {
      assert.ok(!file.text.includes(marker), `${file.path} contains ${marker}`);
    }
  }
}

/** Outputs besides the entry and the two empty QuickJS stand-ins. */
function extraOutputs(result) {
  const stubs = result.outputFiles.filter((file) => file.path.includes("_deps") && file.text.trim() === "");
  assert.equal(stubs.length, 2, "one empty chunk per QuickJS package");
  return result.outputFiles.length - 1 - stubs.length;
}

before(() => build());

test("no module in dist has a static import of a Node built-in", () => {
  const dist = join(pkgDir, "dist");
  const files = readdirSync(dist, { recursive: true }).filter((file) => String(file).endsWith(".js"));
  assert.ok(files.length > 0);
  for (const file of files) {
    const text = readFileSync(join(dist, String(file)), "utf8");
    assert.doesNotMatch(text, /^\s*(?:import|export)\b[^;]*?from\s*["']node:/m, `dist/${file}`);
    assert.doesNotMatch(text, /^\s*import\s*["']node:/m, `dist/${file}`);
  }
});

test("a Convex V8 bundle of the root, without the MCP SDK installed (most backends), has no Node built-in", async (t) => {
  const dir = installFixture("convex-v8", { convex: "convex" });
  try {
    const result = await convexBundle(dir);
    assert.deepEqual(result.errors, []);
    assertNoNode(result);
    assertNoMcpClientRuntime(entryOutput(result));
    // The artifacts core is pure strings and data, so it bundles into the entry as is.
    assert.match(entryOutput(result), /artifact:ready/);
    assertNoQuickJs(result);
    assert.equal(extraOutputs(result), 0, "no extra chunks");
    t.diagnostic(`${result.outputFiles.length} outputs, ${entryOutput(result).length} bytes in the entry`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a Convex V8 bundle of the root, with the MCP SDK installed, has no Node built-in", async (t) => {
  const dir = installFixture("convex-v8-sdk", {
    convex: "convex",
    zod: "zod",
    "@modelcontextprotocol/sdk": "@modelcontextprotocol/sdk",
  });
  try {
    const result = await convexBundle(dir);
    assert.deepEqual(result.errors, []);
    assertNoNode(result);
    assertNoMcpClientRuntime(entryOutput(result));
    // esbuild still emits the lazily imported SDK modules as chunks. Nothing imports them at runtime.
    assertNoQuickJs(result);
    const chunks = result.outputFiles.filter((file) => file.path.includes("_deps") && file.text.trim() !== "");
    t.diagnostic(`${result.outputFiles.length} outputs; ${chunks.length} unused SDK chunks, ${chunks.reduce((n, f) => n + f.text.length, 0)} bytes`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a Convex V8 bundle of the root, with QuickJS installed, has no QuickJS in any output", async (t) => {
  const dir = installFixture("convex-v8-quickjs", {
    convex: "convex",
    "quickjs-emscripten-core": "quickjs-emscripten-core",
    "@jitl/quickjs-singlefile-cjs-release-sync": "@jitl/quickjs-singlefile-cjs-release-sync",
  });
  try {
    const result = await convexBundle(dir);
    assert.deepEqual(result.errors, []);
    assertNoNode(result);
    assertNoQuickJs(result);
    assert.equal(extraOutputs(result), 0, "no extra chunks");
    t.diagnostic(`${result.outputFiles.length} outputs, ${entryOutput(result).length} bytes in the entry`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A Node bundle (a Convex "use node" action, an Electron main process): esbuild for Node with nothing external and no
// node_modules shipped. The lazily imported QuickJS must be bundled in, and the sandbox must run. The QuickJS variant
// is CommonJS and requires Node built-ins, so ESM output needs the usual createRequire banner.
test("a Node bundle carries QuickJS and runs the sandbox without node_modules", async () => {
  const dir = installFixture("node-quickjs", {
    "quickjs-emscripten-core": "quickjs-emscripten-core",
    "@jitl/quickjs-singlefile-cjs-release-sync": "@jitl/quickjs-singlefile-cjs-release-sync",
  });
  const out = mkdtempSync(join(tmpdir(), "vvedantb-server-node-quickjs-out-"));
  try {
    const entry = join(dir, "main.ts");
    writeFileSync(
      entry,
      `import assert from "node:assert/strict";
import { runSandboxedScript } from ${JSON.stringify(pkg.name)};
const tools = [{ name: "double", mutating: false, invoke: async (json: string) => String(JSON.parse(json).n * 2) }];
const outcome = await runSandboxedScript("return await tools.double({ n: args.n });", tools, {}, { globals: { args: { n: 21 } } });
assert.deepEqual({ ok: outcome.ok, result: outcome.ok ? outcome.result : outcome.error }, { ok: true, result: 42 });
`,
    );
    const result = await esbuild.build({
      entryPoints: [entry],
      absWorkingDir: dir,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      splitting: true,
      outdir: out,
      banner: { js: `import { createRequire } from "node:module"; const require = createRequire(import.meta.url);` },
      logLevel: "silent",
    });
    assert.deepEqual(result.errors, []);
    writeFileSync(join(out, "package.json"), JSON.stringify({ type: "module" }));
    const run = spawnSync(process.execPath, [join(out, "main.js")], { cwd: out, encoding: "utf8" });
    assert.equal(run.status, 0, `bundle failed:\n${run.stdout}${run.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

// An Electron main process bundled like the desktop app's: esbuild for Node,
// ESM with splitting, nothing external but electron, and no node_modules
// shipped. The lazily imported SDK must be bundled in, not left to resolve
// at runtime.
test("an Electron main bundle (platform node) carries the SDK and runs without node_modules", async () => {
  const dir = installFixture("electron-main", {
    zod: "zod",
    "@modelcontextprotocol/sdk": "@modelcontextprotocol/sdk",
  });
  const out = mkdtempSync(join(tmpdir(), "vvedantb-server-electron-out-"));
  try {
    const entry = join(dir, "main.ts");
    writeFileSync(
      entry,
      `import assert from "node:assert/strict";
import { createMcpOAuthProvider, startLoopback } from ${JSON.stringify(pkg.name)};
const loopback = await startLoopback();
const provider = createMcpOAuthProvider({ clientName: "App", signInRequiredMessage: "Sign in first", storage: { load: () => undefined, save: () => undefined } });
const error = await provider.redirectToAuthorization(new URL("https://as.example.test/authorize")).then(() => undefined, (e) => e);
loopback.close();
assert.equal(error?.constructor?.name, "UnauthorizedError");
assert.equal(error.message, "Sign in first");
`,
    );
    const result = await esbuild.build({
      entryPoints: [entry],
      absWorkingDir: dir,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      splitting: true,
      outdir: out,
      external: ["electron"],
      logLevel: "silent",
    });
    assert.deepEqual(result.errors, []);
    writeFileSync(join(out, "package.json"), JSON.stringify({ type: "module" }));
    for (const file of readdirSync(out).filter((name) => name.endsWith(".js"))) {
      const text = readFileSync(join(out, file), "utf8");
      assert.doesNotMatch(text, /^\s*(?:import|export)\b[^\n]*from\s*["']@modelcontextprotocol\//m, `${file} leaves the SDK external`);
      assert.doesNotMatch(text, /import\(\s*["']@modelcontextprotocol\//, `${file} leaves the SDK external`);
    }
    const run = spawnSync(process.execPath, [join(out, "main.js")], { cwd: out, encoding: "utf8" });
    assert.equal(run.status, 0, `bundle failed:\n${run.stdout}${run.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

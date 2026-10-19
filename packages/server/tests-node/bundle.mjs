// Bundles a Convex function file that imports the package root the way
// `convex deploy` bundles for the default (V8) runtime: Convex's own esbuild
// with the options from convex/dist/esm/bundler/debugBundle.js (1.47). The
// root also carries Node-only MCP client OAuth (node:http, the MCP SDK), so
// this checks none of it reaches a V8 bundle.
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

// Server root exports a Convex backend uses, plus pure ones from the former @vvedantb/mcp-client.
const functionFile = `
import { httpActionGeneric } from "convex/server";
import { extractBearerToken, hasMcpOAuthTokens, isAccessTokenExpiring, jsonResponse, sha256Hex } from ${JSON.stringify(pkg.name)};

export const status = httpActionGeneric(async (_ctx, request) => {
  const token = extractBearerToken(request.headers.get("authorization"));
  const state = token ? { tokens: { access_token: token, token_type: "bearer" } } : undefined;
  return jsonResponse({
    signedIn: hasMcpOAuthTokens(state),
    expiring: isAccessTokenExpiring(state, Date.now()),
    hash: token ? await sha256Hex(token) : null,
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
    assert.equal(result.outputFiles.length, 1, "no extra chunks");
    t.diagnostic(`1 output, ${result.outputFiles[0].text.length} bytes`);
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
    const chunks = result.outputFiles.filter((file) => file.path.includes("_deps"));
    t.diagnostic(`${result.outputFiles.length} outputs; ${chunks.length} unused SDK chunks, ${chunks.reduce((n, f) => n + f.text.length, 0)} bytes`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
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

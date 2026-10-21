# Changelog

## 0.5.0

Additive: a QuickJS code sandbox joins the root. Nothing in 0.4.1 changes.

### Added

- `runSandboxedScript(code, tools, limits?, options?)`: runs untrusted JavaScript (the body of an async function) in a fresh QuickJS runtime. The script calls host tools with `await tools.<name>(args)`, logs with `console`, and returns a JSON value. Never throws; resolves to `{ ok, result | error, logs, calls, ms }`. See `docs/sandbox.md`.
- `DEFAULT_EXECUTE_LIMITS`: 60 s wall clock, 64 MB heap, 1 MB stack, 50 tool calls of which at most 10 mutating, logs capped at 200 lines of 2,000 characters. Every field can be overridden per run.
- `options.globals`: JSON-serialisable values set as VM globals, for example `{ args }`. Names that would replace an existing global are refused.
- `options.onCall`: called before each tool call with `{ name, args, mutating }`. Returns `{ allow: true }`, `{ allow: false, error }` (the script's call rejects; the tool does not run) or `{ stub }` (the call resolves to the stub; the tool does not run and the call is recorded with `skipped: true`). Refused and stubbed calls count against the call caps.
- `serializeExecuteOutcome(outcome, maxChars?)` and `DEFAULT_RESULT_CHAR_CAP` (100,000): pretty JSON of an outcome for a tool reply; a larger successful result becomes `{ truncated, note, resultPreview }`.
- Types: `SandboxTool`, `ExecuteLimits`, `ExecuteOutcome`, `SandboxOptions`, `SandboxCall`, `SandboxCallDecision`, `SandboxCallRecord`.
- New optional peers: `quickjs-emscripten-core` and `@jitl/quickjs-singlefile-cjs-release-sync` `^0.32.0`. They load on the first `runSandboxedScript` call, never when the root is imported. Without them the call returns `ok: false` with `Sandbox unavailable: …`.
- `package.json` `browser` field: maps both QuickJS packages to empty modules, so browser-platform bundles of the root (Convex V8) never include QuickJS or its Node built-ins, even when it is installed.
- Tests: `tests/sandbox` runs against real QuickJS (limits, deadline, out of memory, stack overflow, stalled promise, error mapping, disposal after a timeout, log caps, result preview, globals, `onCall` refusal and stubs, call caps). `tests-node/bundle.mjs` bundles the root for Convex V8 with QuickJS installed and checks no output contains it, and runs a Node bundle of the sandbox with no `node_modules`. `tests-node/esm-exports.mjs` covers the new exports and types, and the sandbox with and without QuickJS installed.

## 0.4.1

Docs and comments only; no runtime change.

- Shipped docs describe the Convex optimistic-update helpers and the MCP OAuth client helpers by what they do, and name no consuming app.
- `docs/mcp-client.md` is now `docs/mcp-oauth-client.md`. Internal folders `src/mcp-client` and `tests/mcp-client` are now `mcp-oauth-client`. Export names do not change.

## 0.4.0

Additive: the Convex optimistic-update helpers and the MCP OAuth client helpers join the root. Nothing in 0.3.0 changes. (Historical: these came from the former `@vvedantb/convex-client` and `@vvedantb/mcp-client` 0.1.0 packages, under the same export names.)

### Added

- Convex optimistic-update helpers (no React): `mapLoadedQuery` (also `forEachLoadedQuery` and `updateAllCachedQueries`), `patchLoadedQuery`, `OptimisticStore`, `tempId(table?, { format? })`, `TempIdFormat`, `TempIdOptions` and `createMemoryOptimisticStore()`. See `docs/convex.md`. The package still never imports `convex` at runtime: the memory store carries a copy of `getFunctionName`, tested against Convex's.
- MCP OAuth client helpers: `createMcpOAuthStateSchema`, `hasMcpOAuthTokens`, `isAccessTokenExpiring`, `createMcpOAuthProvider`, `authorizeMcpServer`, `refreshMcpOAuth`, `revokeMcpOAuth`, `startLoopback`, `LOOPBACK_PATH`, `LOOPBACK_TIMEOUT_MS` and their types. See `docs/mcp-oauth-client.md`. Node only; nothing Node-only loads when the root is imported: `startLoopback` imports `node:http` when called, the SDK loads on first use, and `state()` uses WebCrypto instead of `node:crypto` (same format).
- New optional peers: `@modelcontextprotocol/sdk` `^1.29.0` (MCP client OAuth calls) and `convex` `^1.24.0` (types only). Neither is imported when the root loads.
- Tests: suites for both sets of helpers. `tests-node/bundle.mjs` bundles a Convex function that imports the root with Convex's own esbuild and options, with and without the SDK installed, and asserts no `node:` import or built-in `require` in any output; it also runs an Electron-style Node bundle with no `node_modules`. `tests-node/esm-exports.mjs` imports the root with no peer installed.

### Changed (from the earlier MCP OAuth client package)

- A non-interactive provider's `redirectToAuthorization` returns a promise that rejects with the SDK's `UnauthorizedError`, instead of throwing it synchronously: the class is only reachable once the SDK is loaded. The SDK awaits the call, so its sign-in, refresh and connect flows are unchanged.
- Without the SDK installed, `authorizeMcpServer` and `redirectToAuthorization` reject with "The MCP client OAuth helpers need the @modelcontextprotocol/sdk package", and `refreshMcpOAuth` and `revokeMcpOAuth` return `false`. Before, a missing SDK failed the package import.

## 0.3.0

### Added

- `createClerkUserAuth<DataModel>()({ table, index, field, adminField?, lookup?, unauthenticatedMessage? })`: Clerk-user helpers for Convex queries and mutations. Returns `getUserByClerkId`, `getCurrentUser`, `getCurrentUserId`, `requireCurrentUserId`, `isCurrentUserAdmin` and `ensureUser(ctx, buildFields, { patch?, unauthenticatedMessage?, missingSubjectMessage? })`. Typed structurally (no `convex` import); config keys are checked against your `DataModel`. See `docs/convex.md` for semantics and the per-app mapping.

## 0.2.0

### Breaking

- The `@vvedantb/server/convex` and `@vvedantb/server/mcp` subpath exports are removed. Import everything from `@vvedantb/server`. The `exports` map now has only `.` and `./package.json`. No export was renamed and there are no name collisions; replace `@vvedantb/server/convex` and `@vvedantb/server/mcp` with `@vvedantb/server`.

### Added

- `verifyClerkAccessToken(clerk, token, options?)` and `consoleClerkVerifyLogger`: the shared Clerk bearer verification core, with `acceptsToken`, `onReject` and `onError` options to reproduce each app's logging.
- `registerMcpRoutes(http, config)`: registers the MCP route block (well-known metadata, optional path-suffixed variants, `/mcp` methods, token proxy, health) on a Convex `httpRouter()`.
- `jsonResponse(data, status, extraHeaders?)`.
- `createOriginAllowlistCors(allowedOrigins)`: `{ headers(origin), preflightHeaders(origin) }`.
- Crypto primitives on WebCrypto: `sha256Hex`, `bytesToBase64`, `base64ToBytes`, `bytesToBase64Url`, `base64UrlToBytes`, `bytesToHex`, `hexToBytes`, `randomBytes`, `randomToken`, `timingSafeEqual`, `aesGcmEncrypt`, `aesGcmDecrypt`. See `docs/crypto.md`.

## 0.1.1

- Fix ESM imports for plain Node (relative imports with `.js` extensions).

## 0.1.0

- First release: Convex helpers at `@vvedantb/server/convex` and MCP scaffolding at `@vvedantb/server/mcp`.

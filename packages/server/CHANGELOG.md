# Changelog

## 0.4.0

Additive: two packages fold in under the same export names. Nothing in 0.3.0 changes.

### Added

- From `@vvedantb/convex-client` 0.1.0, its non-React helpers: `mapLoadedQuery` (also `forEachLoadedQuery` and `updateAllCachedQueries`), `patchLoadedQuery`, `OptimisticStore`, `tempId(table?, { format? })`, `TempIdFormat`, `TempIdOptions` and `createMemoryOptimisticStore()`. See `docs/convex.md`. The package still never imports `convex` at runtime: the memory store carries a copy of `getFunctionName`, tested against Convex's.
- From `@vvedantb/mcp-client` 0.1.0, every export: `createMcpOAuthStateSchema`, `hasMcpOAuthTokens`, `isAccessTokenExpiring`, `createMcpOAuthProvider`, `authorizeMcpServer`, `refreshMcpOAuth`, `revokeMcpOAuth`, `startLoopback`, `LOOPBACK_PATH`, `LOOPBACK_TIMEOUT_MS` and their types. See `docs/mcp-client.md`. Node only; nothing Node-only loads when the root is imported: `startLoopback` imports `node:http` when called, the SDK loads on first use, and `state()` uses WebCrypto instead of `node:crypto` (same format).
- New optional peers: `@modelcontextprotocol/sdk` `^1.29.0` (MCP client OAuth calls) and `convex` `^1.24.0` (types only). Neither is imported when the root loads.
- Tests: the convex-client and mcp-client suites are ported. `tests-node/bundle.test.mjs` bundles a Convex function that imports the root with Convex's own esbuild and options, with and without the SDK installed, and asserts no `node:` import or built-in `require` in any output; it also runs an Electron-style Node bundle with no `node_modules`. `tests-node/esm-exports.mjs` imports the root with no peer installed.

### Changed (from `@vvedantb/mcp-client` 0.1.0)

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

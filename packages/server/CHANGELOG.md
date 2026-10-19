# Changelog

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

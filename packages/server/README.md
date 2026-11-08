# @vvedantb/server

Server-side helpers for Convex backends, Convex optimistic updates, Node-side MCP OAuth client helpers, a QuickJS code sandbox and an artifacts core, from one root import. Vercel AI Gateway helpers are on the `@vvedantb/server/ai` subpath.

```sh
npm install @vvedantb/server
```

```ts
import { createMcpHttpHandler, extractBearerToken, registerMcpRoutes, sha256Hex } from "@vvedantb/server";
```

```ts
import { classifyGatewayError, FLEX_GATEWAY_PROVIDER_OPTIONS, readGatewayCost } from "@vvedantb/server/ai";
```

The one subpath export is `./ai` (0.11.0). The root does not re-export it, so a root import never loads the AI SDK. 0.2.0 removed `/convex` and `/mcp`; see [CHANGELOG.md](CHANGELOG.md).

| Area | What it holds | Docs |
| --- | --- | --- |
| Convex helpers | Query-limit errors, Clerk auth config and client, Clerk token verification (Node `verifyClerkAccessToken`, V8 `authenticateClerkBearer` for OAuth access token JWTs, with `verifyFallback` for opaque tokens and session JWTs; the MCP token cache is deprecated), Clerk-user lookups and `ensureUser` (`createClerkUserAuth`), V Pro checks and configurable Clerk Billing webhook helpers (`hasVPro`, `verifyClerkWebhook`, `parseClerkBillingEvent`, `createVProModule` with granting statuses, prefix event matching, `createUser` and `extraPatch`), bearer tokens, env, MCP CORS, origin-allowlist CORS, `jsonResponse`, server info, test helpers, and Expo push notifications (`createExpoPushFunctions`: token table helpers, `register`/`unregister`, batched send, receipts, `schedulePush`). | [docs/convex.md](docs/convex.md#expo-push-notifications) |
| MCP scaffolding | For Convex `httpAction`s: bearer-auth handler, OAuth metadata, route registration, a pure JSON-RPC dispatcher, tool helpers and explorer tools. | [docs/mcp.md](docs/mcp.md) |
| Crypto | WebCrypto-only base64/base64url/hex, SHA-256, random tokens, `timingSafeEqual`, AES-GCM. Convex default runtime and Node 20+. | [docs/crypto.md](docs/crypto.md) |
| Optimistic updates | `mapLoadedQuery` (also `forEachLoadedQuery`, `updateAllCachedQueries`), `patchLoadedQuery`, `tempId`, `createMemoryOptimisticStore`. Client-side, no React. | [docs/convex.md](docs/convex.md#optimistic-updates-client-side) |
| MCP OAuth client | Node only (Electron main): OAuth provider over injected storage, sign-in, refresh, revocation, loopback redirect server. Node built-ins and the MCP SDK load on first use, so Convex V8 bundles of the root stay clean. | [docs/mcp-oauth-client.md](docs/mcp-oauth-client.md) |
| Artifacts core | Pure, no DOM: Zod contract for artifact rows and typed bodies (`createArtifactSchemas`, `validateArtifactBody`), state limits and ops, the host's save debounce, built-in quiz and flashcards pages, and `wrapArtifactDocument` (CSP plus a guest state bridge with host-given global aliases). | [docs/artifacts.md](docs/artifacts.md) |
| AI Gateway (`@vvedantb/server/ai`) | Service tier provider options (`gatewayServiceTier`, `FLEX_GATEWAY_PROVIDER_OPTIONS`, `withFlexGatewayOptions`), `readGatewayCost` from provider metadata, and `classifyGatewayError` (AI SDK and Gateway errors to `invalid_request`, `auth`, `model_not_found`, `rate_limit`, `quota`, `gateway`, `malformed_response`, `timeout` or `other`). Convex default runtime safe. | [docs/ai.md](docs/ai.md) |
| Code sandbox | Node only: `runSandboxedScript` runs untrusted JavaScript in QuickJS (WASM) with a `tools` proxy to host handlers, time, heap, stack, call and log limits, injected `globals`, and an `onCall` hook for allow-lists and dry runs. QuickJS loads on first call. | [docs/sandbox.md](docs/sandbox.md) |

Migration steps per app: [docs/migration.md](docs/migration.md).

## Peers

All are optional. None is imported when the root loads.

- `ai` `>=5` and `@ai-sdk/gateway` `>=1`: only for `@vvedantb/server/ai`, which imports their error classes statically, so that subpath needs both installed. The root never imports them.
- `@clerk/backend` `>=1`: only for `getClerkClient`, `verifyClerkAccessToken` and `verifyClerkWebhook`, which take its factory, client or `verifyWebhook` as an argument.
- `zod` `^3.25.0 || ^4.0.0`: only if you pass zod schemas to `defineTool`, or your `z` to `createMcpOAuthStateSchema` or `createArtifactSchemas`.
- `convex` `^1.24.0`: types only, for the optimistic-update helpers. The package never imports `convex` at runtime: `registerMcpRoutes` and `createClerkUserAuth` type the router and ctx structurally, and `createMemoryOptimisticStore` carries its own copy of `getFunctionName` (`convex` is a dev dependency, used to check that real Convex types fit).
- `@modelcontextprotocol/sdk` `^1.29.0`: only for the MCP client OAuth calls, which import it on first use.
- `quickjs-emscripten-core` and `@jitl/quickjs-singlefile-cjs-release-sync` `^0.32.0`: only for `runSandboxedScript`, which imports them on first call. The `browser` field maps both to empty modules, so browser-platform bundles (Convex V8) of the root never include them.

No React, no web dependencies. `"sideEffects": false`. Compiled ESM with types in `dist`, built on pack.

## Layout

```
src/index.ts             the root export: re-exports the six folders below (not ai/)
src/ai/                  the ./ai subpath: AI Gateway tier, cost and error helpers (static ai and @ai-sdk/gateway imports)
src/convex/              Convex helpers and optimistic updates
src/mcp/                 MCP scaffolding (imports ../convex by relative path)
src/mcp-oauth-client/    MCP OAuth client helpers (Node only; lazy node:http and SDK imports)
src/crypto/              WebCrypto primitives
src/sandbox/             QuickJS code sandbox (Node only; lazy QuickJS import)
src/artifacts/           artifacts core (pure strings and data; runs anywhere)
tests/ai/                vitest, including errors built by generateText through the Gateway provider with a fake fetch
tests/convex/            vitest
tests/mcp/               vitest, with fixtures/ (SDK captures, app references)
tests/mcp-oauth-client/  vitest, against fake MCP and authorization servers
tests/crypto/            vitest, with published vectors and app format parity
tests/sandbox/           vitest, against real QuickJS
tests/artifacts/         vitest, including the guest bootstrap in a VM realm and a no-app-name check
tests-node/              plain Node checks of the built package: exports map and peers (esm-exports.mjs),
                         Convex V8 and Node/Electron bundles with esbuild (bundle.mjs)
docs/                    ai.md, convex.md, mcp.md, mcp-oauth-client.md, crypto.md, sandbox.md, artifacts.md, migration.md, migrated/<app>/
scripts/                 capture-sdk-fixtures.mjs
```

## Develop

```sh
pnpm --filter @vvedantb/server build
pnpm --filter @vvedantb/server test
pnpm --filter @vvedantb/server typecheck
```

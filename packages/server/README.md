# @vvedantb/server

Server-side helpers for Convex backends, from one root import.

```sh
npm install @vvedantb/server
```

```ts
import { createMcpHttpHandler, extractBearerToken, registerMcpRoutes, sha256Hex } from "@vvedantb/server";
```

There are no subpath exports (0.2.0 removed `/convex` and `/mcp`; see [CHANGELOG.md](CHANGELOG.md)).

| Area | What it holds | Docs |
| --- | --- | --- |
| Convex helpers | Query-limit errors, Clerk auth config and client, Clerk token verification, Clerk-user lookups and `ensureUser` (`createClerkUserAuth`), bearer tokens, env, MCP CORS, origin-allowlist CORS, `jsonResponse`, server info, test helpers. | [docs/convex.md](docs/convex.md) |
| MCP scaffolding | For Convex `httpAction`s: bearer-auth handler, OAuth metadata, route registration, a pure JSON-RPC dispatcher, tool helpers and explorer tools. | [docs/mcp.md](docs/mcp.md) |
| Crypto | WebCrypto-only base64/base64url/hex, SHA-256, random tokens, `timingSafeEqual`, AES-GCM. Convex default runtime and Node 20+. | [docs/crypto.md](docs/crypto.md) |

Migration steps per app: [docs/migration.md](docs/migration.md).

## Peers

Both are optional.

- `@clerk/backend` `>=1`: only for `getClerkClient` and `verifyClerkAccessToken`, which take its client or factory as an argument.
- `zod` `^3.25.0 || ^4.0.0`: only if you pass zod schemas to `defineTool`.

`convex` is not a dependency: `registerMcpRoutes` and `createClerkUserAuth` type the router and ctx structurally (`convex` is a dev dependency, used to check that real Convex types fit). No React, no web dependencies. Compiled ESM with types in `dist`, built on pack.

## Layout

```
src/index.ts       the only export: re-exports the three folders
src/convex/        Convex helpers
src/mcp/           MCP scaffolding (imports ../convex by relative path)
src/crypto/        WebCrypto primitives
tests/convex/      vitest
tests/mcp/         vitest, with fixtures/ (SDK captures, app references)
tests/crypto/      vitest, with published vectors and app format parity
tests-node/        plain Node ESM check of the built exports map
docs/              convex.md, mcp.md, crypto.md, migration.md, migrated/<app>/
scripts/           capture-sdk-fixtures.mjs
```

## Develop

```sh
pnpm --filter @vvedantb/server build
pnpm --filter @vvedantb/server test
pnpm --filter @vvedantb/server typecheck
```

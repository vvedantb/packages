# @vvedantb/server

Server-side helpers for Convex backends. One package, two subpaths.

| Import | What it holds | Docs |
| --- | --- | --- |
| `@vvedantb/server/convex` | Query-limit errors, Clerk auth config, bearer tokens, env, MCP CORS and server info. | [docs/convex.md](docs/convex.md) |
| `@vvedantb/server/mcp` | MCP server scaffolding for Convex `httpAction`s: bearer-auth handler, OAuth metadata, a pure JSON-RPC dispatcher, tool helpers and explorer tools. | [docs/mcp.md](docs/mcp.md) |

There is no `.` export. Import from a subpath.

```sh
npm install @vvedantb/server
```

```ts
import { extractBearerToken } from "@vvedantb/server/convex";
import { createMcpHttpHandler } from "@vvedantb/server/mcp";
```

## Peers

Both are optional.

- `@clerk/backend` `>=1`: only for `getClerkClient`.
- `zod` `^3.25.0 || ^4.0.0`: only if you pass zod schemas to `defineTool`.

No React, no web dependencies. Compiled ESM with types in `dist`, built on pack.

## Layout

```
src/convex/        @vvedantb/server/convex
src/mcp/           @vvedantb/server/mcp (imports ../convex by relative path)
tests/convex/      vitest
tests/mcp/         vitest, with fixtures/ (SDK captures, app references)
docs/              convex.md, mcp.md, migration.md, migrated/<app>/
scripts/           capture-sdk-fixtures.mjs
```

## Develop

```sh
pnpm --filter @vvedantb/server build
pnpm --filter @vvedantb/server test
pnpm --filter @vvedantb/server typecheck
```

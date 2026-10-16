# @vvedantb/server/convex

Plain Convex backend helpers. No React, no generated Convex imports. Compiled ESM with types. Import it as `@vvedantb/server/convex`.

## Install

```sh
npm install @vvedantb/server
```

## Peers

None required. `@clerk/backend` is an optional peer: install it only if you use `getClerkClient`, and pass its `createClerkClient`.

## Usage

```ts
// convex/auth.config.ts
import { clerkAuthConfig } from "@vvedantb/server/convex";
export default clerkAuthConfig(); // domain from CLERK_FRONTEND_API_URL, applicationID "convex"
```

```ts
import { createClerkClient } from "@clerk/backend";
import { getClerkClient, requiredEnvUrl, extractBearerToken } from "@vvedantb/server/convex";

const clerk = getClerkClient(createClerkClient); // throws if CLERK_SECRET_KEY or CLERK_PUBLISHABLE_KEY is missing
const issuer = requiredEnvUrl("CLERK_FRONTEND_API_URL"); // trailing slash removed
const token = extractBearerToken(request.headers.get("Authorization"));
```

```ts
import { corsPreflight, jsonWithCors, defineMcpServerInfo } from "@vvedantb/server/convex";

if (request.method === "OPTIONS") return corsPreflight();
return jsonWithCors({ error: "Unauthorized" }, { status: 401, extraHeaders: { "WWW-Authenticate": "Bearer" } });

const serverInfo = defineMcpServerInfo({ name: "my-mcp", version: "1.0.0" });
```

```ts
import { formatConvexQueryError, isConvexResourceLimitError } from "@vvedantb/server/convex";
import { assertMcpTools, expectMcpToolCount } from "@vvedantb/server/convex";

assertMcpTools(toolNames, ["search", "write"]); // sorted, unique comparison
expectMcpToolCount(toolNames, 2);
```

| Export | What it does |
| --- | --- |
| `isConvexResourceLimitError`, `formatConvexQueryError` | Detect Convex read, write and time limit failures and add a remedy to the message. |
| `clerkAuthConfig(env?)` | `auth.config.ts` provider list. |
| `getClerkClient(factory, env?)` | Clerk backend client from env, with an injected factory. |
| `extractBearerToken(header)` | Token from an `Authorization` header, or `null`. |
| `requiredEnv(name, env?)`, `requiredEnvUrl(name, env?)` | Required env value, optionally stripping a trailing slash. |
| `mcpCorsHeaders`, `corsPreflight`, `jsonWithCors` | CORS for MCP HTTP handlers. Methods `GET,POST,DELETE,OPTIONS`; headers `Authorization,Content-Type`; credentials `false`. |
| `defineMcpServerInfo({ name, version })` | MCP `serverInfo`. The caller owns both values. |
| `expectMcpToolCount`, `assertMcpTools` | Test helpers. They throw plain errors, so they work with any runner. |

Not included: Clerk user helpers, `ensureUserExists`, rate limits, crypto, MCP scaffolding.

## Develop

```sh
pnpm --filter @vvedantb/server build
pnpm --filter @vvedantb/server test
```

Publish steps for the whole package are in the root `README.md`.

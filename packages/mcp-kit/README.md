# @vvedantb/mcp-kit

MCP server scaffolding for Convex `httpAction`s: the `/mcp` bearer-auth handler, OAuth metadata endpoints, a pure JSON-RPC dispatcher, tool helpers and user-scoped explorer tools. Web-standard `Request`/`Response` only, no Node APIs, no MCP SDK dependency. Compiled ESM with types. `0.1.0`, not yet published to npm.

It replaces the near-copies of `convex/mcp/native.ts`, the `handleMcpRequest` body and the explorer tools in vmem, vibot, verve and velth. vhub uses only the metadata, CORS and protocol-version helpers. See [docs/migration.md](docs/migration.md) for per-app steps and measured line counts.

## Install

```sh
npm install @vvedantb/mcp-kit
```

## Dependencies and peers

- `@vvedantb/convex-kit` is a normal dependency (`workspace:^` here, rewritten to `^0.1.0` by `pnpm publish`). The kit imports its `extractBearerToken`, `requiredEnvUrl`, `mcpCorsHeaders`, `McpServerInfo` and `EnvSource` at runtime, so it is not a peer: every app already installs convex-kit, pnpm dedupes the copy, and a dependency avoids a second install step. Publish convex-kit first.
- `zod` is an optional peer (`^3.25.0 || ^4.0.0`). The kit never imports zod. `defineTool` accepts any object with zod's `safeParse` (zod 3.25+ or 4), and calls the schema's own `toJSONSchema()` (zod 4) for `tools/list`. With zod 3, pass `jsonSchema` per tool or a `toJsonSchema` converter (see below).
- Nothing else. The MCP SDK is optional and stays in the app (`runSdkMcpRequest` takes its classes as arguments).

## Quick start

Today's architecture: the HTTP layer runs in `httpAction`; JSON-RPC runs in a `"use node"` internalAction with the MCP SDK.

```ts
// convex/mcp/native.ts
import { httpAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  createAuthorizationServerMetadataProxy,
  createHealthHandler,
  createMcpHttpHandler,
  createProtectedResourceMetadata,
} from "@vvedantb/mcp-kit";

export const oauthMetadata = httpAction(createAuthorizationServerMetadataProxy());
export const protectedResourceMetadata = httpAction(createProtectedResourceMetadata());
export const health = httpAction(createHealthHandler());

export const mcpHandler = httpAction(
  createMcpHttpHandler<{ clerkUserId: string }, ActionCtx>({
    authenticate: ({ ctx, token }) =>
      ctx.runAction(internal.mcp.nodeActions.verifyAccessToken, { token }),
    handleRpc: ({ ctx, principal, body }) =>
      ctx.runAction(internal.mcp.nodeActions.handleMcpRequest, { clerkUserId: principal.clerkUserId, body }),
  }),
);
```

```ts
// convex/mcp/nodeActions.ts ("use node")
import { runSdkMcpRequest } from "@vvedantb/mcp-kit";

export const handleMcpRequest = internalAction({
  args: { clerkUserId: v.string(), body: v.string() },
  returns: v.object({ status: v.number(), body: v.string() }),
  handler: async (ctx, { clerkUserId, body }) =>
    runSdkMcpRequest({
      body,
      Transport: WebStandardStreamableHTTPServerTransport,
      createServer: () => {
        const server = new McpServer(defineMcpServerInfo({ name: "my-mcp", version: "1.0.0" }));
        registerTools(server, clerkUserId, ctx);
        return server;
      },
    }),
});
```

Self-contained alternative (no SDK, no `"use node"`): replace `handleRpc` with the kit dispatcher.

```ts
const dispatcher = createMcpDispatcher<Principal, ActionCtx>({
  serverInfo: defineMcpServerInfo({ name: "my-mcp", version: "1.0.0" }),
  tools: [searchTool, ...createExplorerTools({ tables, execute })],
});

export const mcpHandler = httpAction(
  createMcpHttpHandler<Principal, ActionCtx>({ authenticate, handleRpc: dispatcher.handleRpc }),
);
```

## API

### HTTP layer

| Export | What it does |
| --- | --- |
| `createMcpHttpHandler(config)` | `/mcp` handler for `httpAction`. Order: CORS preflight (if `cors`), optional early method check, bearer token (`extractBearerToken`), `authenticate`, method check, body parsing, `handleRpc`. |
| `createAuthorizationServerMetadataProxy(options)` | `GET /.well-known/oauth-authorization-server`: fetches `<issuer>/.well-known/oauth-authorization-server`. 502 `{"error":"Failed to fetch authorization server metadata"}` on a non-2xx upstream. |
| `createProtectedResourceMetadata(options)` | `{ resource, authorization_servers, bearer_methods_supported: ["header"], resource_documentation }`. |
| `createHealthHandler(options)` | 200 `{"status":"ok"}` (body configurable). |
| `createOptionsHandler({ cors })` | 204 preflight with only the CORS headers. |
| `mcpCors(overrides?, origin?)` | convex-kit `mcpCorsHeaders(origin)` with overrides on top. |
| `readEnvUrl(source, env?)` | Env URL with optional fallback var, through convex-kit `requiredEnvUrl`. |
| `consoleMcpLogger` | Default log hook with the vmem strings. |
| `runSdkMcpRequest(options)` | The apps' `handleMcpRequest` body: stateless JSON-response SDK transport, 500 JSON-RPC -32603 on any throw. SDK classes are passed in. |
| `mcpInternalError(err)` | `{ status: 500, body: '{"jsonrpc":"2.0","error":{"code":-32603,"message":...},"id":null}' }`. |

`createMcpHttpHandler` config:

| Key | Default | Notes |
| --- | --- | --- |
| `authenticate({ token, request, ctx, scope })` | required | Return the principal or `null` (401 "Invalid or expired token"). A throw escapes (Convex answers 500), as in the apps today; `onAuthenticateError: "unauthorized"` maps it to 401 instead. |
| `handleRpc({ principal, body, json, request, ctx, scope })` | required | Returns `{ status, body }`, sent with `Content-Type: application/json` plus CORS. `body` is the JSON text, `json` the parsed value. |
| `scope` | none | Opaque value passed to both callbacks (vmem `"personal"` / `"team"`). |
| `resourceMetadataPath` / `resourceMetadataUrl(request)` | `/.well-known/oauth-protected-resource` | Used in `WWW-Authenticate: Bearer resource_metadata="<origin><path>"`. |
| `rejectMethods` | `["GET", "DELETE"]` | 405 "Method not supported in stateless mode". |
| `methodCheck` | `"after-auth"` | All four apps check after auth; vhub before. |
| `body` | `"json"` | `"json"`: `JSON.stringify(await request.json())` (vmem, vibot, verve). `"text"`: raw text checked with `JSON.parse` (velth). Bad JSON: 400 "Invalid JSON body". |
| `cors` | none | `false`, a header map, or `(request) => headers`. With CORS, `OPTIONS` returns a 204 preflight. |
| `headers` | none | Extra headers on every response. |
| `messages` | apps' strings | `missingToken`, `invalidToken`, `methodNotAllowed`, `invalidJson`. |
| `log` | `consoleMcpLogger` | Events: `auth-failed`, `invalid-json`, `authenticate-threw`. `false` for none. |

Env fallback modes (`EnvUrl = string | { name, fallback?, fallbackMode? }`). They differ only when vars are missing or empty:

| `fallbackMode` | Rule | App |
| --- | --- | --- |
| `"fallback-if-set"` (default) | `!env[name] && !!env[fallback] ? fallback : name` | velth |
| `"prefer-primary"` | `env[name] ? name : fallback` (error names the fallback when both are missing) | verve |
| `"nullish"` | `env[name] ?? env[fallback]`, read as `name` (an empty primary does not fall back) | vibot |
| plain string | no fallback | vmem, vhub |

### JSON-RPC dispatcher

| Export | What it does |
| --- | --- |
| `createMcpDispatcher(config)` | `{ handleRpc }` for stateless HTTP: `initialize`, `ping`, `tools/list`, `tools/call`, notifications (202, empty body), batches. Other methods: -32601 "Method not found". |
| `negotiateProtocolVersion(requested, { versions, fallback })` | Echo a supported version, else the fallback. |
| `SDK_PROTOCOL_VERSIONS` | `["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"]`, the list in MCP SDK 1.29.0 to 1.32.1. |
| `parseRpcBody(text)` | Parse a body, or the SDK's 400 -32700 "Parse error: Invalid JSON" result. |
| `rpcResult`, `rpcError`, `JSON_RPC_ERROR` | Response builders with the SDK's key order. |

Config: `serverInfo` (or a function of the scope), `tools`, `protocol` (`versions`, `fallback`; default SDK list, fallback `"2025-11-25"` as the SDK), `capabilities` (default `{ tools: { listChanged: true } }` as `McpServer`), `instructions`, `toJsonSchema`.

### Tools

| Export | What it does |
| --- | --- |
| `defineTool({ name, description, inputSchema, handler, annotations?, scopes?, title?, jsonSchema? })` | zod schema (3.25+ or 4), or a raw JSON Schema plus `parseArgs`. `description` may be a function of the scope. `call()` validates, runs the handler, and shapes errors like MCP SDK 1.30+. |
| `toolTextResult(text)`, `toolJsonResult(data)`, `toolErrorResult(message)` | `{content:[{type:"text",text}]}`, pretty JSON text, and `{content:[...], isError:true}`, as in the apps. |
| `runTool(fn, { errorLabel? })` | velth `jsonTool`: value as pretty JSON, a throw as an error result. |
| `createToolRegistry(tools)`, `toolsToList`, `assertUniqueToolNames` | Duplicate names throw. Scope filtering (vmem `scopes`). `registry.names(scope)` feeds convex-kit `assertMcpTools`. |
| `formatIssues`, `invalidArgumentsResult` | SDK-style validation messages. |

zod 3 converter, typed without a cast:

```ts
import { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
const toJsonSchema: JsonSchemaConverter = (schema) => (schema instanceof ZodType ? zodToJsonSchema(schema) : {});
```

### Explorer tools

`createExplorerTools({ tables, execute, runQuery?, limits?, features?, names?, descriptions?, messages?, scopes? })` returns `list_tables`, `query_table`, `count_table`, `get_document` and, with `runQuery`, `run_query`. All are marked `readOnlyHint`.

- `tables`: a list of names or `{ name, fields? }` entries (vibot, velth), or a predicate (verve's deny-list). Names must match `^[A-Za-z_][A-Za-z0-9_]*$`.
- `execute(op, { principal, ctx, scope })`: the app's user-scoped executor. `op` is `list_tables`, `query_table` (`table`, `order`, `limit`, `cursor`, `filters`), `count_table` or `get_document`. Return a string (sent as-is), any other JSON value (pretty JSON) or `null` (denied). A throw becomes an error result with its message.
- Checked before `execute` runs: table in catalog, argument types, `order`, `limit` (default 100, max 1000, floored and clamped to at least 1), filter field names (identifiers; in `fields` when the entry lists them, plus `_id` and `_creationTime`), document id `^[a-zA-Z0-9_]+$`, `run_query` tables. An unknown table never reaches the executor.
- `features`: `cursor` (vibot), `filters` (`eq`/`gte`/`lte`, velth), `getDocument` (default on), `runQueryTables` (velth `tables`/`limitPerTable`).
- `createExplorerTools` throws at creation without `execute` or `tables`.

## Configuration per app

| | vmem | vibot | verve | velth | vhub |
| --- | --- | --- | --- | --- | --- |
| MCP routes | `/mcp`, `/mcp/team` | `/mcp` (+OPTIONS) | `/mcp` | `/mcp` (+OPTIONS) | own gateway |
| `scope` | `personal` / `team` | none | none | none | n/a |
| `resourceMetadataPath` | default; team `/.well-known/oauth-protected-resource/mcp/team` | default | default | default | default |
| `cors` | none | `mcpCors({ Allow-Headers: "Content-Type, Authorization, MCP-Protocol-Version", Max-Age: "86400" })` | none | `mcpCors({ Allow-Headers: "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id", Expose-Headers: "WWW-Authenticate, MCP-Session-Id" })` | function reflecting `Origin` |
| `body` | `json` | `json` | `json` | `text` | n/a |
| `log` | default | `false` | `auth-failed` only | `false` | n/a |
| principal | `{ clerkUserId }` | `{ clerkUserId, isPro }` | `{ clerkUserId }` | `{ clerkUserId }` (Clerk or legacy JWT) | API key / Clerk JWT |
| AS proxy `forward` | `json` | `stream` | `text` | `text` | `json` + `fetch` hook |
| issuer env | `CLERK_FRONTEND_API_URL` | + `NEXT_PUBLIC_…` `nullish` | + `NEXT_PUBLIC_…` `prefer-primary` | + `NEXT_PUBLIC_…` `fallback-if-set` | `CLERK_FRONTEND_API_URL` |
| documentation env | `WEB_APP_URL` | `WEB_APP_URL` | + `SITE_URL` `prefer-primary` | + `SITE_URL` `fallback-if-set` | `WEB_APP_URL` |
| health | `/health` | none | `/health` | `/mcp/health`, with CORS | `/health`, `{status, service}` |
| SDK version locked | 1.29.0 | 1.30.0 | 1.30.0 | 1.32.1 | none |

The exact configs are in `tests/fixtures/apps/<app>.kit.ts` and `docs/migrated/<app>/`.

## Security model

The kit does not do authentication, authorisation or data access.

- `authenticate` is the app's. Clerk verification, vibot's Pro claim, velth's legacy HS256 tokens, vhub's API keys and scopes, and user creation all stay in the app.
- Per-user scoping stays in the app: vibot `userScope.ts`/`scoping.ts`/`owned.ts`/`queries.ts`, verve `scoping.ts`/`owned.ts`/`queries.ts`, velth `scope.ts`/`owned.ts`/`queries.ts`, vmem `memoryScope.ts`.
- The explorer `execute` and `runQuery` callbacks MUST enforce per-user scoping. The kit passes the principal through as an opaque value and has no bypass option. It only narrows input: an unknown table or malformed field name never reaches the callback.
- `run_query` code is never evaluated by the kit.
- A missing bearer token is rejected before `authenticate` runs. A thrown `authenticate` is not swallowed unless you opt in.

## Compatibility

**HTTP layer: byte-for-byte compatible with each app today.** `tests/appParity.test.ts` runs each app's current `native.ts` (ported verbatim under `tests/fixtures/apps/*.reference.ts`) and the kit config side by side over 14 request scenarios, 5 env combinations and both upstream outcomes. Status, every header, body bytes, `console.error` calls and the arguments sent to `handleMcpRequest` must be equal. One addition: with `cors` set, the `/mcp` handler also answers `OPTIONS`; the apps route `OPTIONS` to a separate handler, which gives the same response.

**`runSdkMcpRequest`: byte-for-byte compatible.** Run with each app's real SDK build (1.29.0, 1.30.0, 1.32.1), it returned exactly the captured responses for all 14 or 15 exchanges per app. This was a one-off check: the SDK is not a dev dependency. `tests/sdk.test.ts` covers the same behaviour with a fake transport.

**Pure dispatcher: protocol-equivalent, not byte-identical.** Compared with `tests/fixtures/sdk/*.sdk.json`, captured from each app's SDK by `scripts/capture-sdk-fixtures.mjs`:

| Exchange | Same bytes? |
| --- | --- |
| initialize (supported, latest, unsupported version), notifications/initialized (202, empty), ping, tools/call ok, handler throw, unknown tool, resources/list and unknown methods (-32601), batches, parse error | yes |
| invalid arguments | yes against SDK 1.30+; SDK 1.29.0 (vmem) dumps raw zod issues instead |
| tools/list | names, descriptions and annotations yes; the SDK adds `execution: {taskSupport: "forbidden"}`; schemas are equal with zod 4 and depend on the converter with zod 3 |
| invalid JSON-RPC message | no: the kit answers 400 -32600 "Invalid Request" (JSON-RPC spec); the SDK answers 400 -32700 "Parse error: Invalid JSON-RPC message" |

Not implemented in the dispatcher: resources, prompts, completions, `logging/setLevel`, tasks, elicitation, sampling and output-schema validation. vmem registers resources and an MCP app, so vmem keeps the SDK.

## Develop

```sh
pnpm --filter @vvedantb/mcp-kit build
pnpm --filter @vvedantb/mcp-kit test
pnpm --filter @vvedantb/mcp-kit typecheck
```

Tests and typecheck read convex-kit from source (`vitest.config.ts` alias, `tsconfig.test.json` paths), so they run without building convex-kit first. `zod` (4) and `zod3` (`npm:zod@^3.25.76`) are dev dependencies so both zod majors are tested.

To recapture SDK fixtures from an installed SDK (read-only):

```sh
node scripts/capture-sdk-fixtures.mjs <path>/node_modules/@modelcontextprotocol/sdk velth-mcp 1.2.0 no tests/fixtures/sdk/velth.sdk.json
```

## Publish

Not yet published. Publish `@vvedantb/convex-kit` first. Use `pnpm publish`, not `npm publish`, so the `workspace:^` dependency becomes `^0.1.0`:

```sh
pnpm --filter @vvedantb/mcp-kit publish --access public
```

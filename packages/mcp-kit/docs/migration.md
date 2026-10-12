# Migrating the apps to @vvedantb/mcp-kit

Read-only sources: `/workspace/cvx/<app>/packages/backend` at origin/main on 12 October 2026 (vmem `8c972b1a`, vibot `f7b61259`, verve `4d0ab45`, velth `3bdce79`, vhub `7077eaf`). All paths below are relative to `packages/backend` in each app.

There are two phases per app. Ship them as separate PRs.

- **Phase 1, HTTP layer and SDK runner.** Replace `convex/mcp/native.ts` with kit factories, shorten `handleMcpRequest` with `runSdkMcpRequest`, and use the kit's result helpers. The MCP SDK stays. Responses are byte-identical: `tests/appParity.test.ts` checks every route, and the SDK runner was checked against each app's real SDK build.
- **Phase 2, explorer tools on the pure dispatcher.** Replace `list_tables`, `query_table`, `count_table`, `get_document` and `run_query` with `createExplorerTools`. Kit tools are not SDK `server.tool` registrations, so the whole server must move to `defineTool` + `createMcpDispatcher` (one server answers `tools/list`). After that the SDK and, for MCP, `"use node"` can go. Protocol-equivalent, not byte-identical (see the README compatibility table and the behaviour changes below).

Add the dependency in each app's `packages/backend/package.json` (after both packages are published, convex-kit first):

```json
"@vvedantb/mcp-kit": "^0.1.0"
```

`http.ts` route tables do not change in any app: the exported names stay the same.

## vmem

Phase 1 only. vmem registers resources (`resources.ts`) and an MCP app (`memoryGraphApp.ts`), which the dispatcher does not support, so the SDK stays and there are no explorer tools.

1. Replace `convex/mcp/native.ts` with [migrated/vmem/native.ts](migrated/vmem/native.ts). Delete `requestOrigin`, `createProtectedResourceMetadataAction`, `unauthorized`, `runMcpEndpoint` and the inline handlers. The two scopes are two `createMcpHttpHandler` instances with `scope` and the team `resourceMetadataPath`.
2. In `convex/mcp/nodeActions.ts`, replace `handleMcpRequest` (lines 56-116) with [migrated/vmem/nodeActions.handleMcpRequest.ts](migrated/vmem/nodeActions.handleMcpRequest.ts). The `url` option keeps `http://localhost/mcp/team` for the team scope.
3. Keep: `verifyAccessToken` (Clerk `authenticateRequest`, `isMcpAcceptedTokenType`), `serverInfo.ts`, `memoryScope.ts`, `tools.ts`/`toolTypes.ts`/`toolCatalog.ts`/`content.ts` (their `errorLabel` formatting and image content are vmem-specific; `bindToolSpec` stays on the SDK), resources and the graph app.

Checklist:

- [ ] 401 `{"error":"Missing Authorization header"}` / `{"error":"Invalid or expired token"}`, `Content-Type: application/json`, `WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource"` (team: `.../oauth-protected-resource/mcp/team`). No CORS headers.
- [ ] 405 `{"error":"Method not supported in stateless mode"}` for GET/DELETE after auth; 400 `{"error":"Invalid JSON body"}`.
- [ ] Logs: "[MCP][mcpHandler] token verification failed", "[MCP][mcpHandler] failed to parse JSON body:", "[MCP][handleMcpRequest] threw:" (all kit defaults).
- [ ] Body forwarded re-encoded (`JSON.stringify(await request.json())`); `scope` passed to `handleMcpRequest`.
- [ ] Metadata: `resource` `<origin>/mcp` and `<origin>/mcp/team`; `CLERK_FRONTEND_API_URL`, `WEB_APP_URL` (no fallbacks); AS metadata re-encoded JSON; 502 body unchanged.
- [ ] `serverInfo` `vmem-mcp` / `vmem-mcp-team` `2.0.0`; protocol strings from SDK 1.29.0 (unchanged).
- [ ] Routes unchanged: `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, `/.well-known/oauth-protected-resource/mcp/team`, `/mcp` and `/mcp/team` (POST/GET/DELETE), `/health`.
- [ ] Run: `convex/mcp/serverInfo.test.ts`, `tests/mcp/*.test.ts` (toolCatalog, toolPaths, memoryTools, skillResources, contextPack, extreme, retrieveQuality), and `tests/mcp/live.integration.test.ts` against a dev deployment.

## vibot

1. Replace `convex/mcp/native.ts` with [migrated/vibot/native.ts](migrated/vibot/native.ts): `cors = mcpCors({...})` with vibot's two overrides, the `nullish` Clerk fallback, `forward: "stream"`, `log: false`, `createOptionsHandler` for `mcpOptions`. Delete `clerkFrontendApiUrl`, `requestOrigin`, `MCP_CORS_OVERRIDES`, `corsHeaders`, `unauthorized`, `runMcpEndpoint`.
2. In `convex/mcp/nodeActions.ts`, replace `handleMcpRequest` (lines 201-261) with [migrated/vibot/nodeActions.handleMcpRequest.ts](migrated/vibot/nodeActions.handleMcpRequest.ts).
3. In `convex/mcp/toolShared.ts`, replace `TextContent`, `textContent`, `errorResult`, `textResult` (lines 5-22) with [migrated/vibot/toolShared.resultHelpers.ts](migrated/vibot/toolShared.resultHelpers.ts) (re-export, plus an import for `runMcpTool`). `runMcpTool` stays: it wraps primitives in `{ result }`, which `runTool` does not.
4. Phase 2: replace the five explorer registrations in `convex/mcp/tools.ts` (lines 32-169) with [migrated/vibot/tools.explorer.ts](migrated/vibot/tools.explorer.ts), and move the other tools to `defineTool` + `createMcpDispatcher`.
5. Keep: `verifyAccessToken` with `claimsFromJwt` + `claimsIndicatePro` (the Pro claim), `runTestQuery`/`runTestQueryRemote`/deploy key lookup, `userScope.ts`, `scoping.ts`, `owned.ts`, `queries.ts`, `catalog.ts`, all product tools, `MCP_SERVER_VERSION`.

Checklist:

- [ ] Every MCP response carries `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET,POST,DELETE,OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization, MCP-Protocol-Version`, `Access-Control-Allow-Credentials: false`, `Access-Control-Max-Age: 86400`; OPTIONS `/mcp` 204 with only those.
- [ ] 401/405/400 messages and `WWW-Authenticate` as vmem personal; no `console.error` on auth or JSON failure.
- [ ] `isPro` and `clerkUserId` passed to `handleMcpRequest`; body re-encoded.
- [ ] AS metadata streamed (`res.body`) as `application/json` with CORS; 502 with CORS.
- [ ] `CLERK_FRONTEND_API_URL ?? NEXT_PUBLIC_CLERK_FRONTEND_API_URL` (an empty primary does not fall back); `WEB_APP_URL` with no fallback.
- [ ] Routes unchanged, including `/.well-known/oauth-protected-resource/mcp`; vibot has no health route.
- [ ] `serverInfo` `vibot-mcp` `1.15.0`; SDK 1.30.0 protocol strings.
- [ ] Phase 2 behaviour changes: `limit` above 1000 is clamped (was a validation error) and below 1 becomes 1; property descriptions are the kit's; tools gain `readOnlyHint`; `tools/list` has no `execution` field. Messages kept via config: `Cannot query table "<t>". Use list_tables.`, `Cannot count table "<t>".`, `Invalid document ID format.`.
- [ ] Run: `convex/mcp/tools.test.ts` (in phase 2, list names from `createToolRegistry(...).names()` instead of an SDK client).

## verve

1. Replace `convex/mcp/native.ts` with [migrated/verve/native.ts](migrated/verve/native.ts): `prefer-primary` fallbacks for the Clerk URL and `WEB_APP_URL`→`SITE_URL`, `forward: "text"`, and a log hook that keeps only `auth-failed`.
2. In `convex/mcp/nodeActions.ts`, replace `handleMcpRequest` (lines 324-383) with [migrated/verve/nodeActions.handleMcpRequest.ts](migrated/verve/nodeActions.handleMcpRequest.ts).
3. In `convex/mcp/tools.ts`, replace `textResult`/`errorResult` (lines 12-23) with the import in [migrated/verve/tools.resultHelpers.ts](migrated/verve/tools.resultHelpers.ts).
4. Phase 2: replace the explorer registrations (lines 55-195) with [migrated/verve/tools.explorer.ts](migrated/verve/tools.explorer.ts). `tables: isTableAllowed` keeps the deny-list; `resolveUserId` is the existing `getContext` lookup.
5. Keep: `verifyAccessToken`, `runTestQuery`, `listTables` (remote shapes + `FALLBACK_TABLES`), deploy-key bootstrap, `scoping.ts`, `owned.ts`, `queries.ts`, every product tool.

Checklist:

- [ ] No CORS headers anywhere. 401/405/400 as vmem personal. Logs "[MCP][mcpHandler] token verification failed" only (no JSON-parse log).
- [ ] AS metadata forwarded as text; 502 unchanged.
- [ ] Env: `process.env.CLERK_FRONTEND_API_URL ? it : NEXT_PUBLIC_CLERK_FRONTEND_API_URL`; with neither set the error names `NEXT_PUBLIC_CLERK_FRONTEND_API_URL`. Same rule for `WEB_APP_URL`/`SITE_URL`.
- [ ] Routes unchanged: two well-known routes, `/mcp` (POST/GET/DELETE), `/health`.
- [ ] `serverInfo` `verve-mcp` `1.2.4`; SDK 1.30.0 protocol strings.
- [ ] Phase 2: `limit` clamped to 1..1000; `Access denied: table "<t>" is not available via MCP.` unchanged (kit default); invalid id message unchanged (kit default).
- [ ] Run: `convex/mcp/tools.test.ts` (its regex counts `server.tool("...")` registrations, so update it in phase 2), `convex/mcpProduct.test.ts`, `convex/mcpWrites.test.ts`, `convex/mcp/content.test.ts`, `convex/mcp/date.test.ts`.

## velth

1. Replace `convex/mcp/native.ts` with [migrated/velth/native.ts](migrated/velth/native.ts). It keeps `legacyRefreshToken`, `readTokenBody` and `refreshBodySchema` unchanged; `json()` becomes a 3-line `Response.json(data, { status, headers: cors })` (same headers as `jsonWithCors` + extras); `getClerkFrontendApiUrl()` becomes `readEnvUrl(clerk)`.
2. In `convex/mcp/nodeActions.ts`, replace `handleMcpRequest` (lines 224-277) with [migrated/velth/nodeActions.handleMcpRequest.ts](migrated/velth/nodeActions.handleMcpRequest.ts) (`parsedBody: false`, as velth does not pass it today).
3. Replace `convex/mcp/toolResult.ts` with the re-export in [migrated/velth/toolResult.ts](migrated/velth/toolResult.ts). `runTool` matches `jsonTool` exactly, including "Result is not JSON" and "Tool failed".
4. Phase 2: replace the explorer schemas and registrations in `convex/mcp/tools.ts` (lines 12-43 and 103-238) with [migrated/velth/tools.explorer.ts](migrated/velth/tools.explorer.ts). The `run_query` snapshot and sandbox code moves into the `runQuery` callback unchanged.
5. Keep: `verifyAccessToken` (legacy HS256 path with `MCP_JWT_SECRET`, then Clerk, then `ensureUser`), `refreshToken`, `scope.ts`, `owned.ts`, `queries.ts`, `sandbox.ts`, `validators.ts`, product tools, `whoami`.

Checklist:

- [ ] Every MCP response, including `/mcp/health` and the refresh endpoint, carries `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET,POST,DELETE,OPTIONS`, `Access-Control-Allow-Headers: Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id`, `Access-Control-Allow-Credentials: false`, `Access-Control-Expose-Headers: WWW-Authenticate, MCP-Session-Id`. OPTIONS `/mcp` and `/mcp/oauth/token`: 204.
- [ ] Raw request text forwarded after `JSON.parse` validation; no logs on auth or JSON failure.
- [ ] AS metadata as text with CORS; served on `/.well-known/oauth-authorization-server` and `/.well-known/oauth-authorization-server/mcp`.
- [ ] Env: `!env[name] && !!env[fallback] ? fallback : name` for the Clerk URL and `WEB_APP_URL`/`SITE_URL`.
- [ ] Refresh endpoint: `invalid_request` / `unsupported_grant_type` / `invalid_grant` bodies unchanged.
- [ ] `serverInfo` `velth-mcp` `1.2.0`; SDK 1.32.1 protocol strings.
- [ ] Phase 2 behaviour changes: an unknown table becomes an `isError` result (same JSON text `{"error":"Table \"<t>\" is not queryable"}`; it was a non-error text result); `get_document` now rejects ids outside `^[a-zA-Z0-9_]+$` (it returned null); filter field names must be identifiers in the table's `fields` or `_id`/`_creationTime` (unknown fields matched nothing before); `limit` default 50, max `MAX_QUERY_LIMIT` (200), as `clampLimit`.
- [ ] Run: `tests/mcpOauth.test.ts` (discovery, bearer auth, legacy tokens, refresh), `tests/mcpProduct.test.ts`, `tests/mcpWrites.test.ts`, `tests/scope.test.ts`, `tests/sandbox.test.ts`.

## vhub (partial)

vhub's `/mcp` handler stays: it checks methods before auth, reads the body with a 1 MiB limit (413), authenticates API keys and Clerk JWTs inside the node action, maps 401/429 results to `WWW-Authenticate`/`Retry-After`, and answers 202 without a `Content-Type`. The gateway (`gateway.ts`, `protocol.ts`, `proxy.ts`, `oauth.ts`, `clerkAuth.ts`, `clerkJwt.ts`) stays. vhub already took `extractBearerToken` and `requiredEnvUrl` from convex-kit in `7077eaf`.

1. In `convex/mcp/native.ts`, replace `optionsHandler`, `oauthMetadata`, `protectedResourceMetadata` and `health` with [migrated/vhub/native.partial.ts](migrated/vhub/native.partial.ts). `corsHeaders(request)` stays and is passed as the `cors` function. `assertOutboundUrl` moves into the proxy's `fetch` hook. It checks protocol, credentials, host and port, which the full metadata URL shares with the issuer base URL.
2. Optional: `negotiateProtocolVersion(requested, { versions: SUPPORTED_PROTOCOL_VERSIONS, fallback: PROTOCOL_VERSION })` can replace the 6-line function in `protocol.ts`. It is not counted below.
3. Run: `tests/e2e.test.ts`, `tests/mcpApiKeys.test.ts`, `tests/gateway.test.ts`, `tests/hardening.test.ts`, `tests/limits.test.ts`, `tests/keyAccess.test.ts`, `tests/envelope.test.ts`, `tests/twoUsers.test.ts`.

## Measured lines removed

Reproduce with `node packages/mcp-kit/docs/count-loc.mjs /workspace/cvx`.

How counted:

- Physical lines, blank and comment lines included (`wc -l`). A file without a final newline counts its last line.
- "removable" is the whole file or the listed blocks in the app today. Blocks run from a start pattern to the line where brackets balance again, plus the comment lines directly above.
- "remains" is the replacement in `docs/migrated/<app>/`: real code using the kit's real exports and each app's real names, written out in full. It includes moved strings (the `run_query` descriptions and velth's blocked-table list) and the new import lines.
- Not counted:
  - imports that become unused, such as `extractBearerToken` in nodeActions (a few more lines saved);
  - phase 2 rewiring of the other tools from `server.tool(name, desc, shape, fn)` to `defineTool({ ... })`, which is roughly line-neutral;
  - `tests/` changes in the apps;
  - `http.ts` (unchanged).

| app | phase | file | LOC now | removable | remains (wiring) | net |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| vmem | 1 | `convex/mcp/native.ts` | 122 | 122 | 38 | -84 |
| vmem | 1 | `convex/mcp/nodeActions.ts` | 116 | 61 | 19 | -42 |
| vibot | 1 | `convex/mcp/native.ts` | 141 | 141 | 44 | -97 |
| vibot | 1 | `convex/mcp/nodeActions.ts` | 261 | 61 | 18 | -43 |
| vibot | 1 | `convex/mcp/toolShared.ts` | 61 | 15 | 2 | -13 |
| vibot | 2 | `convex/mcp/tools.ts` | 170 | 134 | 54 | -80 |
| verve | 1 | `convex/mcp/native.ts` | 107 | 107 | 43 | -64 |
| verve | 1 | `convex/mcp/nodeActions.ts` | 383 | 60 | 18 | -42 |
| verve | 1 | `convex/mcp/tools.ts` | 430 | 11 | 1 | -10 |
| verve | 2 | `convex/mcp/tools.ts` | 430 | 137 | 46 | -91 |
| velth | 1 | `convex/mcp/native.ts` | 186 | 186 | 116 | -70 |
| velth | 1 | `convex/mcp/nodeActions.ts` | 277 | 54 | 17 | -37 |
| velth | 1 | `convex/mcp/toolResult.ts` | 23 | 23 | 5 | -18 |
| velth | 2 | `convex/mcp/tools.ts` | 241 | 160 | 68 | -92 |
| vhub | 1 | `convex/mcp/native.ts` | 183 | 41 | 21 | -20 |

| app | phase 1 net | phase 2 net | total net |
| --- | ---: | ---: | ---: |
| vmem | -126 | 0 | -126 |
| vibot | -153 | -80 | -233 |
| verve | -116 | -91 | -207 |
| velth | -125 | -92 | -217 |
| vhub | -20 | 0 | -20 |
| **all** | **-540** | **-263** | **-803** |

Removed ranges (line numbers in the app file today):
- vmem convex/mcp/native.ts: whole file 1-122
- vmem convex/mcp/nodeActions.ts: handleMcpRequest 56-116
- vibot convex/mcp/native.ts: whole file 1-141
- vibot convex/mcp/nodeActions.ts: handleMcpRequest 201-261
- vibot convex/mcp/toolShared.ts: TextContent 5-5; textContent 7-9; errorResult 11-16; textResult 18-22
- vibot convex/mcp/tools.ts: tool list_tables 32-43; tool query_table 45-86; tool get_document 88-108; tool count_table 110-130; tool run_query 132-169
- verve convex/mcp/native.ts: whole file 1-107
- verve convex/mcp/nodeActions.ts: handleMcpRequest 324-383
- verve convex/mcp/tools.ts: textResult 12-16; errorResult 18-23
- verve convex/mcp/tools.ts: tool list_tables 55-66; tool query_table 68-108; tool get_document 110-133; tool run_query 135-168; tool count_table 170-195
- velth convex/mcp/native.ts: whole file 1-186
- velth convex/mcp/nodeActions.ts: handleMcpRequest 224-277
- velth convex/mcp/toolResult.ts: whole file 1-23
- velth convex/mcp/tools.ts: filterValueSchema 12-17; queryTableSchema 19-26; countTableSchema 28-33; getDocumentSchema 35-37; runQuerySchema 39-43; tool list_tables 103-129; tool query_table 131-153; tool count_table 155-175; tool get_document 177-194; tool run_query 196-238
- vhub convex/mcp/native.ts: optionsHandler 22-24; oauthMetadata 26-45; protectedResourceMetadata 47-58; health 105-110

### Package cost

`packages/mcp-kit/src` is 1,565 physical lines, 1,153 without blank and comment lines. Most of it is JSDoc, explorer validation that the apps did not have, and the pure dispatcher. That is more than the R4 estimate of about 500, so across all repos the line count goes up: -803 in the apps against +1,565 in the package. The gain is one tested copy instead of four drifting ones, not fewer lines overall. On phase 1 alone the apps lose 540 lines. If phase 2 is not adopted, the explorer (408 lines) and dispatcher (151 lines) could be dropped from the package.

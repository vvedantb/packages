# Convex helpers (`@vvedantb/server`)

Plain Convex backend helpers. No React, no generated Convex imports. Compiled ESM with types. Import everything from the package root, `@vvedantb/server`.

## Install

```sh
npm install @vvedantb/server
```

## Peers

None required. `@clerk/backend` is an optional peer. The package never imports it: `getClerkClient` takes its `createClerkClient`, and `verifyClerkAccessToken` takes a client (or a function that builds one).

## Usage

```ts
// convex/auth.config.ts
import { clerkAuthConfig } from "@vvedantb/server";
export default clerkAuthConfig(); // domain from CLERK_FRONTEND_API_URL, applicationID "convex"
```

```ts
import { createClerkClient } from "@clerk/backend";
import { getClerkClient, requiredEnvUrl, extractBearerToken } from "@vvedantb/server";

const clerk = getClerkClient(createClerkClient); // throws if CLERK_SECRET_KEY or CLERK_PUBLISHABLE_KEY is missing
const issuer = requiredEnvUrl("CLERK_FRONTEND_API_URL"); // trailing slash removed
const token = extractBearerToken(request.headers.get("Authorization"));
```

```ts
import { corsPreflight, jsonWithCors, defineMcpServerInfo } from "@vvedantb/server";

if (request.method === "OPTIONS") return corsPreflight();
return jsonWithCors({ error: "Unauthorized" }, { status: 401, extraHeaders: { "WWW-Authenticate": "Bearer" } });

const serverInfo = defineMcpServerInfo({ name: "my-mcp", version: "1.0.0" });
```

```ts
import { formatConvexQueryError, isConvexResourceLimitError } from "@vvedantb/server";
import { assertMcpTools, expectMcpToolCount } from "@vvedantb/server";

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
| `jsonResponse(data, status, extraHeaders?)` | `JSON.stringify(data)` with `Content-Type: application/json`; `extraHeaders` spread after it. |
| `createOriginAllowlistCors(allowedOrigins)` | `{ headers(origin), preflightHeaders(origin) }` for credentialed browser CORS on a fixed origin list. |
| `verifyClerkAccessToken(clerk, token, options?)`, `consoleClerkVerifyLogger` | Clerk bearer verification core: `{ userId, tokenType, auth }` or `null`. See below. |

Crypto primitives are in [crypto.md](crypto.md); MCP scaffolding in [mcp.md](mcp.md). Not included: Clerk user helpers, `ensureUserExists`, rate limits.

## `jsonResponse`

```ts
return jsonResponse({ error: "Unauthorized" }, 401, cors.headers(origin));
```

The same as the local `jsonResponse` in app-c and app-d `convex/http.ts`: body `JSON.stringify(data)`, headers `{ "Content-Type": "application/json", ...extraHeaders }` (so `extraHeaders` can override `Content-Type`), no default status. `data` is `JsonInput` (`object | string | number | boolean | null`).

Other local copies:

- An app's `convex/mcpServers/http.ts` has `jsonResponse(data, request, status = 200)` with `...corsHeaders(request)` after `Content-Type`. `jsonResponse(data, status, corsHeaders(request))` gives the same response (tested), but the signature differs, so its call sites change if it adopts this.
- Another repo's `convex/http.ts` has `jsonResponse(status, body)`: arguments reversed, a string body is sent as-is (not JSON-encoded), lower-case `content-type`, CORS after it. Not compatible without changing its behaviour; it keeps its own.

## `createOriginAllowlistCors`

```ts
const cors = createOriginAllowlistCors(ALLOWED_ORIGINS);
const origin = request.headers.get("origin") ?? "";
new Response(null, { status: 200, headers: cors.preflightHeaders(origin) }); // OPTIONS
jsonResponse(body, 200, cors.headers(origin));
```

Reproduces app-c and app-d `getCorsHeaders` / `getPreflightHeaders` exactly, key order included (only their origin lists differ):

| Header | `headers(origin)` | `preflightHeaders(origin)` |
| --- | --- | --- |
| `Access-Control-Allow-Origin` | `origin` if `allowedOrigins.includes(origin)`, else `""` | `origin` if allowed (added last), else omitted |
| `Access-Control-Allow-Methods` | `GET,POST,PUT,DELETE,OPTIONS` | same |
| `Access-Control-Allow-Headers` | `Content-Type,Authorization,X-Requested-With` | same |
| `Access-Control-Allow-Credentials` | `true` | same |
| `Access-Control-Max-Age` | not sent | `86400` |

Matching is exact and case-sensitive. There are no options: no app needs other strings.

## `verifyClerkAccessToken`

```ts
"use node";
import { createClerkClient } from "@clerk/backend";
import { consoleClerkVerifyLogger, getClerkClient, verifyClerkAccessToken } from "@vvedantb/server";

export const verifyAccessToken = internalAction({
  args: { token: v.string() },
  returns: v.union(v.object({ clerkUserId: v.string() }), v.null()),
  handler: async (_ctx, { token }) => {
    const verified = await verifyClerkAccessToken(
      () => getClerkClient(createClerkClient),
      token,
      consoleClerkVerifyLogger,
    );
    return verified ? { clerkUserId: verified.userId } : null;
  },
});
```

Steps, all inside one `try`:

1. Build the client (when `clerk` is a function).
2. `new Request("https://mcp.local/", { headers: { Authorization: `Bearer ${token}` } })`. An invalid header value (for example a newline in the token) throws here.
3. `clerk.authenticateRequest(request, { acceptsToken })`, default `["oauth_token", "session_token"]`.
4. `!state.isAuthenticated`: `onReject({ kind: "unauthenticated", reason, message })`, `null`.
5. `auth = state.toAuth()`; `!auth.isAuthenticated` or `auth.tokenType` not in `acceptsToken`: `onReject({ kind: "wrong-token", tokenType })`, `null`.
6. `auth.userId` not a non-empty string: `onReject({ kind: "no-user" })`, `null`.
7. Return `{ userId, tokenType, auth }`.

Anything thrown: `onError(err)`, `null`. Both hooks default to silent. `consoleClerkVerifyLogger` is `{ onReject, onError }` with the strings four apps log: `console.error("[MCP][verifyAccessToken] authenticateRequest failed:", reason, message)` for `unauthenticated` only, and `console.error("[MCP][verifyAccessToken] threw:", err instanceof Error ? err.message : err)`.

`auth` is typed `ClerkAuthLike` (`isAuthenticated`, `tokenType`, `userId`). For Clerk's own types, pass them explicitly: `verifyClerkAccessToken<SignedInAuthObject | AuthenticatedMachineObject<"oauth_token">>(...)` (from `@clerk/backend/internal`). The type is not inferred from the client because TypeScript would pick the last `authenticateRequest` overload, which only covers session tokens. A real `ClerkClient` (checked against `@clerk/backend` 2.33) fits `ClerkLike` without a cast.

App-specific claims (a Pro flag, scopes, legacy tokens, user upserts) stay in the app, after this returns.

### How each app maps onto the options

| App | Today | With the kit |
| --- | --- | --- |
| app-a | `verifyAccessToken` in `convex/mcp/nodeActions.ts`; logs unauthenticated and throws; token type via its `isMcpAcceptedTokenType` | `verifyClerkAccessToken(() => getClerkClient(createClerkClient), token, consoleClerkVerifyLogger)` → `{ clerkUserId: userId }` |
| app-b | Same file; logs throws only; adds `isPro` from the raw token's claims | `{ onError: consoleClerkVerifyLogger.onError }`; keep `isPro: claimsIndicatePro(claimsFromJwt(token))` |
| app-c | Same file; identical to app-a | as app-a |
| app-d | Clerk branch is `verifyClerkToken` (no own `try`) inside `verifyAccessToken`, whose `try` logs throws | `verifyClerkToken = async (token) => (await verifyClerkAccessToken(getClerkClient, token, consoleClerkVerifyLogger))?.userId ?? null`; the legacy JWT branch, `getUser` and `ensureUser` stay |
| app-e | `verifyClerkBearer` in `convex/mcp/clerkAuth.ts`: tries two Clerk instances in turn, silent | in its loop: `const v = await verifyClerkAccessToken(() => getClerkClient(clerkApp), token); if (v) return { clerkUserId: v.userId };` (no options) |

`tests/convex/verifyClerkAccessToken.test.ts` runs each app's copy (ported) and the kit version over 12 scenarios (app-e: every pair of scenarios across its two instances). Return values and every `console.error` call match.

### Differences between the five copies

- **Unauthenticated log.** app-a, app-c and app-d log "authenticateRequest failed:" with `reason` and `message`. app-b and app-e do not.
- **Throw log.** app-a to app-d log "threw:" with `err.message` (or the raw value). app-e logs nothing and moves on to its next Clerk instance.
- **Where the client is built.** app-a, app-b, app-c and app-e build it inside the `try`, so missing env gives `null` (plus the "threw:" log in app-a to app-c). app-d builds it in a helper with no `try`; its caller's `try` logs the same "threw:" message and returns `null`, so the output is the same. With the kit, pass a factory to keep missing env inside the `try`.
- **app-d's outer `try`** also covers its legacy HS256 path and the Clerk user fetch and `ensureUser` mutation after verification. Those failures still log "threw:" from the app.
- **app-e** has its own `getClerkClient(clerkApp)` that reads a second instance's keys and throws "`<NAME>` is required" (not this package's "is not set in Convex env"). It is silent, so the message is never seen; it keeps its own factory.
- **Token-type check.** app-a calls a helper that loops over `["oauth_token", "session_token"]`; the others inline `!== "oauth_token" && !== "session_token"`; app-e splits the checks into separate `continue`s. All equivalent.
- **Return shape.** `{ clerkUserId }` in app-a, app-c, app-d and app-e; `{ clerkUserId, isPro }` in app-b.
- Wrong token types and missing user ids are silent in every app.

## Develop

```sh
pnpm --filter @vvedantb/server build
pnpm --filter @vvedantb/server test
```

Publish steps for the whole package are in the root `README.md`.

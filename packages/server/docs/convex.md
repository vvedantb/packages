# Convex helpers (`@vvedantb/server`)

Plain Convex backend helpers. No React, no generated Convex imports. Compiled ESM with types. Import everything from the package root, `@vvedantb/server`.

## Install

```sh
npm install @vvedantb/server
```

## Peers

None required. `@clerk/backend` is an optional peer. The package never imports it: `getClerkClient` takes its `createClerkClient`, `verifyClerkAccessToken` takes a client (or a function that builds one), and `verifyClerkWebhook` takes `verifyWebhook` from `@clerk/backend/webhooks`.

`convex` is an optional peer for types only: the optimistic-update helpers and the MCP token cache below name Convex types (`FunctionReference`, `OptimisticLocalStore`, `GenericId`, `RegisteredQuery`, the type of `v`). The package never imports `convex` at runtime; the token cache takes `v`, `defineTable` and your function builders as arguments.

`convex-helpers` is an optional peer for types only, used by [the auth function builders](#auth-function-builders). The package never imports it at runtime: the app passes `customQuery`, `customMutation`, `customAction` and `customCtx` in.

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
const withIcon = defineMcpServerInfo({
  name: "my-mcp",
  version: "1.0.0",
  title: "My app",
  websiteUrl: "https://my-app.example",
  icons: [{ src: "https://my-app.example/icon.png", mimeType: "image/png", sizes: ["any"] }],
});
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
| `defineMcpServerInfo({ name, version, title?, websiteUrl?, icons? })` | MCP `serverInfo`. The caller owns every value. `name` and `version` must not be empty. Optional fields appear only when passed; each icon is `{ src, mimeType?, sizes?, theme? }` and an empty `src` throws. See [mcp.md](mcp.md). |
| `expectMcpToolCount`, `assertMcpTools` | Test helpers. They throw plain errors, so they work with any runner. |
| `jsonResponse(data, status, extraHeaders?)` | `JSON.stringify(data)` with `Content-Type: application/json`; `extraHeaders` spread after it. |
| `createOriginAllowlistCors(allowedOrigins)` | `{ headers(origin), preflightHeaders(origin) }` for credentialed browser CORS on a fixed origin list. |
| `verifyClerkAccessToken(clerk, token, options?)`, `consoleClerkVerifyLogger` | Clerk bearer verification core: `{ userId, tokenType, auth }` or `null`. See below. |
| `createClerkUserAuth<DataModel>()(config)` | Clerk-user lookups for queries and mutations: `getCurrentUserId`, `requireCurrentUserId`, `getCurrentUser`, `isCurrentUserAdmin`, `getUserByClerkId`, `ensureUser`. See below. |
| `hasVPlan`, `hasVPro`, `parseVProCompUserIds` | V Pro checks: the session `pla` claim, stored plan slugs and a complimentary id list. See [V Pro plan check](#v-pro-plan-check). |
| `verifyClerkWebhook`, `parseClerkBillingEvent`, `createVProModule<DataModel>()(config)` | Clerk Billing webhook: verify, read the plan change, write it to the users row. See [Clerk Billing webhook](#clerk-billing-webhook-v-pro). |
| `createAuthFunctions<DataModel, UserId>(config)` | `authQuery`/`authMutation`/`authAction` on convex-helpers, with `ctx.userId` and an optional maintenance gate. See [Auth function builders](#auth-function-builders). |
| `createConvexAdminClient(config)`, `convexSiteToCloudUrl`, `parseConvexApiResponse` | Deployment admin client for an MCP "run query" tool: run queries, list tables. URL and admin key as arguments. See [Convex admin API client](#convex-admin-api-client). |

Crypto primitives are in [crypto.md](crypto.md); MCP scaffolding in [mcp.md](mcp.md). Not included: rate limits.

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

## `createClerkUserAuth`

The caller's identity `subject`, resolved to a users row through one index. Curried so you pass your generated `DataModel` and the config keys are inferred and checked against it (unknown table, an index not on the table, a field that is not the index's first field, or an admin field not on the document are type errors).

```ts
// convex/userAuth.ts
import { createClerkUserAuth } from "@vvedantb/server";
import type { DataModel } from "./_generated/dataModel";

export const userAuth = createClerkUserAuth<DataModel>()({
  table: "users",
  index: "by_clerk_id",
  field: "clerkId",
  adminField: "admin", // optional; needed only for isCurrentUserAdmin
  // lookup: "unique",              // default "first"
  // unauthenticatedMessage: "...", // default "Not authenticated"
});

export const { getCurrentUserId, requireCurrentUserId, getCurrentUser, getUserByClerkId } = userAuth;
```

```ts
// convex/users.ts
export const ensureUserExists = mutation({
  args: {},
  returns: v.object({ userId: v.id("users"), wasCreated: v.boolean() }),
  handler: async (ctx) => {
    const result = await userAuth.ensureUser(
      ctx,
      (identity) => ({ clerkId: identity.subject, email: identity.email ?? "" }),
      { patch: (existing, identity) => (identity.email && existing.email !== identity.email ? { email: identity.email } : undefined) },
    );
    if (result.wasCreated) await createDefaults(ctx, result.userId); // app-specific
    return result;
  },
});
```

`ctx` is typed structurally (the package never imports `convex`). A generated `QueryCtx`, `MutationCtx` or `QueryCtx | MutationCtx` fits without a cast; an `ActionCtx` does not (no `db`). `tests/convex/clerkUserAuth.types.ts` checks this against `convex/server` 1.47.

| Function | Semantics |
| --- | --- |
| `getUserByClerkId(ctx, clerkId)` | `ctx.db.query(table).withIndex(index, (q) => q.eq(field, clerkId))`, then `.first()` (or `.unique()` with `lookup: "unique"`, which throws on duplicates). Only needs `ctx.db`. |
| `getCurrentUser(ctx)` | `null` when there is no identity or `subject` is empty; otherwise `getUserByClerkId(ctx, identity.subject)`. |
| `getCurrentUserId(ctx)` | `(await getCurrentUser(ctx))?._id ?? null`. |
| `requireCurrentUserId(ctx, message?)` | `getCurrentUserId`, but throws `new Error(message)` instead of returning `null`. `message` defaults to the config's `unauthenticatedMessage`, default `"Not authenticated"` (the message in about 120 throw sites across the apps). |
| `isCurrentUserAdmin(ctx)` | `user[adminField] === true`; `false` with no identity or no row. Throws if `adminField` is not set. |
| `ensureUser(ctx, buildFields, options?)` | No identity: throws `options.unauthenticatedMessage` (default the config's). Empty `subject`: throws `options.missingSubjectMessage` (default `"Clerk user ID is required"`). Existing row: `ctx.db.patch(row._id, fields)` when `options.patch(row, identity)` returns fields, then `{ userId, wasCreated: false }`. No row: `ctx.db.insert(table, buildFields(identity))` and `{ userId, wasCreated: true }`. `buildFields` must set the Clerk id field itself. `identity` is your ctx's identity type (Convex `UserIdentity`). |

Stays in the apps: legacy email lookups, migration-table lookups, API-key actors and scopes, admission checks, `customQuery`/`customMutation` builders, action helpers (`ctx.runQuery`), internal by-id upserts, and anything done after a user is created (default profiles, skills).

### How each app maps onto the config

| App | Config | Uses | Stays in the app |
| --- | --- | --- | --- |
| app-a | `users` / `by_clerk_id` / `clerkId`, `first` | `getUserByClerkId`; its throwing `getCurrentUserId` is `requireCurrentUserId`; `ensureUserExists` is `ensureUser` with `patch` (normalised email, only when defined and changed) and `buildFields` (`givenName`/`familyName`/`name`), then the "Personal" profile insert when `wasCreated` | `authQuery`/`authMutation`/`authAction`, `requireClerkId`, `ensureUserForClerkIdInternal`, `me` |
| app-b | `users` / `by_clerk_id` / `clerkId`, `first`, `adminField: "admin"` | `ensureUserExists` (`users.ts`) is `ensureUser` without `patch` (`email: identity.email \|\| ""`, `firstName`/`lastName` claims, `updatedAt`), then the default skills install | the email fallback: `getCurrentUserId = (await userAuth.getCurrentUserId(ctx)) ?? emailLookup(ctx)`; `getCurrentUser` and `checkIsAdmin` read through that, so they stay as today unless the fallback is dropped (then they are `getCurrentUser` and `isCurrentUserAdmin`) |
| app-c | `users` / `by_clerk_id` / `clerkUserId`, `first`, `adminField: "isAdmin"` | `getUserByClerkId` for the non-migrated branch of `currentUser` and `isCurrentUserAdmin` | email-keyed `getCurrentUserId`, the `userMigrations` lookups, `createOrMigrateUser` |
| app-d | `users` / `by_clerk_id` / `clerkId`, `first`, `adminField: "isAdmin"` | `getCurrentUserId` before its email fallback | `requireCurrentUserId` (an upsert that also finds by email and patches `clerkId`), `createOrMigrateUser`, `isCurrentUserAdmin` (reads through the email fallback) |
| app-e | `users` / `by_clerk_user` / `clerkUserId`, `lookup: "unique"`, `unauthenticatedMessage: "Sign in to continue"` | `getUserByClerkId` / `getCurrentUser` in `users.current` and `users.ensureUser` | `requireUser`/`requireSession` (admission, API keys, scopes); `ensureUser` keeps its own body because the admission check runs between the identity check and the lookup and it returns `{ clerkUserId, createdAt, isNew }` (with `ensureUser` it would need an extra `ctx.db.get`) |

### Differences between the copies

- **Lookup end.** app-a to app-d use `.first()`; app-e uses `.unique()`.
- **Missing identity.** app-a's `getCurrentUserId` throws `"Not authenticated"` for no identity, empty `subject` and no row; app-b, app-c, app-d and app-e return `null`. The kit has both (`requireCurrentUserId`, `getCurrentUserId`).
- **Empty `subject`.** app-b still tries its email lookup; app-d and app-e return `null`; app-a throws. Convex always sets `subject`, so this is unreachable; the kit returns `null`.
- **Email fallback.** app-b and app-d look up `by_email` when the Clerk id finds nothing (app-c looks up by email only). Legacy, so it stays in the apps; compose it after `getCurrentUserId`.
- **Admin flag.** app-b `admin === true`, app-d `isAdmin === true`, app-c `user?.isAdmin || false` (the same for a `boolean | undefined` field). A non-boolean truthy value is not admin in the kit.
- **ensure-user errors.** app-a and app-b throw `"Not authenticated"` (no identity) and `"Clerk user ID is required"` (empty `subject`); app-d throws `"Not authenticated"` for both; app-e `"Sign in to continue"` for both. Set `missingSubjectMessage` to match.
- **ensure-user patch.** app-a patches the normalised email when it is defined and changed; app-b never patches; app-d patches `clerkId` (only possible after an email match); app-e touches `lastSeenAt` after 60 s.

`tests/convex/clerkUserAuth.test.ts` ports each app's code and runs it next to the kit on the same fake ctx over each identity case (none, empty subject, known, duplicate, unknown, legacy email): return values, thrown messages, rows and writes match.

## Clerk OAuth JWT verification (V8)

Clerk OAuth access tokens are JWTs now. `authenticateClerkBearer` verifies them in the Convex default runtime (`httpAction`): WebCrypto and `fetch`, no Node action, no token cache. Tokens that are not OAuth access token JWTs go to `verifyFallback`, your Node `verifyClerkAccessToken` action: opaque tokens issued earlier, and JWTs with another or no header `typ`, such as Clerk session tokens (`acceptsToken: ["oauth_token", "session_token"]`). `verifyOpaque` is a deprecated alias of `verifyFallback`. Clerk OAuth access tokens last 1 day ([Clerk docs](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth)), so opaque tokens stop arriving about 1 day after the switch.

```ts
import { authenticateClerkBearer } from "@vvedantb/server";

const principal = await authenticateClerkBearer({
  token,
  issuer: "https://clerk.example.com", // Clerk Frontend API URL
  verifyFallback: (token) => ctx.runAction(internal.mcp.nodeActions.verifyAccessToken, { token }),
});
// { clerkUserId } | null
```

| Export | Semantics |
| --- | --- |
| `authenticateClerkBearer({ token, issuer, verifyFallback, jwksUrl?, fetch?, now?, clockSkewMs?, onReject?, onError? })` | Three base64url segments with header `typ` `at+jwt` or `application/at+jwt`: `verifyClerkOAuthJwt`, never retried through `verifyFallback`. Everything else (opaque tokens, session JWTs, other or missing `typ`): `verifyFallback(token)`, mapped from `{ clerkUserId }` or `{ userId }` to `{ clerkUserId }`. `null` on rejection. |
| `verifyClerkOAuthJwt(token, options)` | Checks RS256 signature (JWKS from `${issuer}/.well-known/jwks.json` unless `jwksUrl`), `iss` (trailing slash ignored), `exp` and `nbf` with `clockSkewMs` (default 5000), header `typ` `at+jwt` or `application/at+jwt`, and non-empty `sub`. Returns `{ clerkUserId, claims }` or `null`. Silent unless `onReject({ kind })` or `onError` is set. It does not check `aud`; check `claims` yourself if you need it. |
| `clearClerkJwksCache()` | The JWKS and imported keys are cached in module scope per isolate for `CLERK_JWKS_TTL_MS` (1 hour); an unknown `kid` refetches at most once per `CLERK_JWKS_REFETCH_MIN_MS` (1 minute). Revocation is not checked: a JWT is valid until `exp`. |
| `looksLikeJwt(token)` | Three non-empty base64url segments. |

Migration: change `authenticate` in your http/mcp files to call `authenticateClerkBearer`, rename `verifyOpaque` to `verifyFallback`, keep the Node `verifyAccessToken` action for opaque tokens and session tokens, then (about 1 day later) drop the Node action, the `mcpTokenCache` table and the purge cron.

## MCP token cache

> **Deprecated since 0.8.0.** JWT tokens do not need this cache; use [`authenticateClerkBearer`](#clerk-oauth-jwt-verification-v8). Remove the cache once old opaque tokens expire (about 1 day after the switch to JWTs).

Caches verified MCP bearer tokens, so most requests skip the verify step (for Clerk: a network call, often from a cold Node action). Rows hold the SHA-256 hex of the token (`hashMcpToken`), never the token. Only successful verifications are cached, so a revoked token keeps working until its row expires: at most `MCP_TOKEN_CACHE_TTL_MS` (5 minutes).

The package cannot own a table, so define it in your schema and register the three internal functions in one module.

Define the table locally. `convex/schema.ts` cannot import runtime code from a package: `convex deploy` fails with `NoImportModuleInSchema`. So do not call `mcpTokenCacheTable` or `mcpTokenCacheFields` there.

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // the fields of mcpTokenCacheFields; schema.test.ts checks they match
  mcpTokenCache: defineTable({ tokenHash: v.string(), clerkUserId: v.string(), expiresAt: v.number() })
    .index("by_token_hash", ["tokenHash"])
    .index("by_expires", ["expiresAt"]),
});
```

Check the local table against the package in a test, outside `convex/schema.ts`, so a change to the fields or indexes fails the test:

```ts
// convex/schema.test.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";
import { expect, test } from "vitest";
import { mcpTokenCacheFields, mcpTokenCacheTable } from "@vvedantb/server";
import schema from "./schema";

test("mcpTokenCache matches @vvedantb/server", () => {
  const table = schema.tables.mcpTokenCache;
  expect(table.validator).toEqual(v.object(mcpTokenCacheFields(v)));
  expect(table[" indexes"]()).toEqual(mcpTokenCacheTable(defineTable, v)[" indexes"]());
});
```

```ts
// convex/mcp/tokenCache.ts
import { v } from "convex/values";
import { createMcpTokenCacheFunctions, type McpTokenCachePurgeRef } from "@vvedantb/server";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";

export const { getInternal, putInternal, purgeExpired } = createMcpTokenCacheFunctions({
  v,
  internalQuery,
  internalMutation,
  // tableName: "authCache", // default "mcpTokenCache"; the table needs both indexes
  purgeSelf: (): McpTokenCachePurgeRef => internal.mcp.tokenCache.purgeExpired,
});
```

Keep the `McpTokenCachePurgeRef` return annotation on `purgeSelf`. Without it TypeScript infers the thunk's type from `internal`, which is built from this module, and reports a circular type (TS7022).

```ts
// in the MCP bearer-auth action
const principal = await authenticateWithTokenCache({
  token,
  get: (tokenHash) => ctx.runQuery(internal.mcp.tokenCache.getInternal, { tokenHash }),
  put: (row) => ctx.runMutation(internal.mcp.tokenCache.putInternal, row),
  verify: (token) => verifyWithClerk(token), // your verify; null means invalid
});
```

```ts
// convex/crons.ts
crons.hourly("purge MCP token cache", { minuteUTC: 0 }, internal.mcp.tokenCache.purgeExpired, {});
```

| Export | Semantics |
| --- | --- |
| `authenticateWithTokenCache({ token, get, put, verify, now? })` | Hit when a row exists and `expiresAt > now`: returns `{ clerkUserId }` only, without `verify`. Miss: runs `verify`. A `null` from `verify` is returned and never cached. Otherwise writes `{ tokenHash, clerkUserId, expiresAt }` through `put`; a `put` failure is logged with `console.warn` and ignored. Logs `[MCP][auth] {"authCached":…,"authMs":…}` each call. Errors from `get` and `verify` are not caught. |
| `tokenCacheExpiresAt(token, nowMs)` | `min(now + TTL, JWT exp)`; `now + TTL` for an opaque token or an unreadable payload; `null` (not cached) when the JWT `exp` is not after `now`. |
| `jwtExpiryMs(token)` | The payload `exp` × 1000 when the token has three parts and `exp` is a finite number; otherwise `null`. Does not check the signature. |
| `getInternal` | Internal query `{ tokenHash }` → `{ clerkUserId, expiresAt } \| null` via `by_token_hash`. Does not check expiry, so the query stays cacheable. |
| `putInternal` | Internal mutation. Inserts a new row; patches an existing one only when `clerkUserId` differs or the new `expiresAt` is later. |
| `purgeExpired` | Internal mutation. Deletes up to `MCP_TOKEN_CACHE_PURGE_BATCH` (500) rows with `expiresAt < now` via `by_expires`, and reschedules itself (`runAfter(0)`) when it deleted a full batch. Returns the count. |
| `mcpTokenCacheFields(v)`, `mcpTokenCacheTable(defineTable, v)` | The fields `tokenHash`, `clerkUserId` (strings) and `expiresAt` (number), and the table with `MCP_TOKEN_CACHE_HASH_INDEX` (`by_token_hash`) and `MCP_TOKEN_CACHE_EXPIRES_INDEX` (`by_expires`). For tests only: do not import them in `convex/schema.ts` (`NoImportModuleInSchema`). `mcpTokenCacheTable` is `@deprecated` to flag schema use. |

The ctx types are structural, so the factory checks that the table exists and has both indexes. `getInternal`, `putInternal` and `purgeExpired` are real registered functions, so `ctx.runQuery(internal.mcp.tokenCache.getInternal, …)` is typed. `tests/convex/mcpTokenCache.types.ts` checks this against a codegen-shaped app with `convex/server` 1.47.

## Expo push notifications

Device-token storage, a batched send through the Expo Push API, and push receipts that drop dead tokens. Like the MCP token cache, the package cannot own a table: define it in your schema and wire one `convex/push.ts`. `convex` is used for types only.

Define the table locally. `convex/schema.ts` cannot import runtime code from a package (`NoImportModuleInSchema`), so do not call `pushTokensTable` or `pushTokensFields` there.

```ts
// convex/schema.ts
pushTokens: defineTable({
  userId: v.id("users"), // pushTokensFields(v) uses v.string(); pass v.id("users") as its second argument to match
  token: v.string(),
  platform: v.union(v.literal("android"), v.literal("ios")),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_token", ["token"]),
```

Check it in a test outside the schema: `expect(schema.tables.pushTokens.validator).toEqual(v.object(pushTokensFields(v, v.id("users"))))`, and compare `table[" indexes"]()` with `pushTokensTable(defineTable, v, v.id("users"))[" indexes"]()`, as in the MCP token cache section.

```ts
// convex/push.ts
import { v } from "convex/values";
import {
  createClerkUserAuth,
  createExpoPushFunctions,
  type ExpoPushCheckReceiptsRef,
  type ExpoPushListTokensRef,
  type ExpoPushRemoveTokensRef,
  type ExpoPushSendRef,
} from "@vvedantb/server";
import { internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery, mutation, type MutationCtx } from "./_generated/server";

const userAuth = createClerkUserAuth<DataModel>()({ table: "users", index: "by_clerk_id", field: "clerkId" });

export const { register, unregister, listTokensForUser, removeTokens, send, checkReceipts, schedulePush } =
  createExpoPushFunctions({
    v,
    userId: v.id("users"),
    mutation,
    internalQuery,
    internalMutation,
    internalAction,
    // Annotate ctx with your MutationCtx.
    requireCurrentUserId: (ctx: MutationCtx) => userAuth.requireCurrentUserId(ctx),
    // Keep the return annotations: without them `internal` refers to itself (TS7022).
    listTokensRef: (): ExpoPushListTokensRef<Id<"users">> => internal.push.listTokensForUser,
    removeTokensRef: (): ExpoPushRemoveTokensRef => internal.push.removeTokens,
    sendRef: (): ExpoPushSendRef<Id<"users">> => internal.push.send,
    checkReceiptsRef: (): ExpoPushCheckReceiptsRef => internal.push.checkReceipts,
    // tableName: "pushTokens", receiptDelayMs: 15 * 60 * 1000, accessToken: () => process.env.EXPO_ACCESS_TOKEN,
  });
```

Send from any mutation. `schedulePush` returns at once when the user has no token, so most users cost no action:

```ts
import { schedulePush } from "./push";

await schedulePush(ctx, { userId: task.ownerId, title: "Task done", body: task.title, data: { target: task._id } });
```

Mobile: pass `api.push.register` to the hook from `@vvedantb/native-ui/push` (see its README), or call `register({ token, platform })` yourself with a token from `expo-notifications`.

```tsx
const register = useMutation(api.push.register);
useExpoPushRegistration({ register, onNotificationTap: ({ data }) => router.push(`/chat/${String(data.target)}`) });
```

| Export | Semantics |
| --- | --- |
| `register({ token, platform })` | Public mutation. Rejects tokens that do not match `/^Expo(nent)?PushToken\[.+\]$/`. Upserts by `by_token`: an existing token is patched to the caller (a token moves with the device), otherwise inserted. No duplicates. |
| `unregister({ token })` | Public mutation. Deletes the row only when it belongs to the caller. |
| `listTokensForUser({ userId })` | Internal query: the user's tokens. |
| `removeTokens({ tokens })` | Internal mutation: deletes rows by token. |
| `send({ userId, title, body?, data? })` | Internal action. Sends `{ to, title, body?, sound: "default", priority: "high", data? }` to `https://exp.host/--/api/v2/push/send` in batches of `EXPO_PUSH_BATCH_SIZE` (100). Removes tokens whose ticket has `details.error` `DeviceNotRegistered`. Schedules `checkReceipts` after `receiptDelayMs` (default 15 minutes) with each `ok` ticket id and its token. A failed batch is logged and skipped. |
| `checkReceipts({ receipts })` | Internal action. Posts the ids to `.../push/getReceipts` (1000 per request) and removes tokens whose receipt says `DeviceNotRegistered`. Ids Expo has no receipt for are ignored; receipts last 24 hours. |
| `schedulePush(ctx, { userId, title, body?, data? })` | Checks `by_user` for a token; none: returns. Otherwise `ctx.scheduler.runAfter(0, sendRef, params)`. The factory returns it bound; the standalone export takes `{ sendRef, tableName }` as a third argument. |
| `sendExpoPushMessages`, `fetchExpoPushReceipts`, `tokensToRemoveFromTickets`, `receiptRefsFromTickets`, `tokensToRemoveFromReceipts`, `parseExpoTickets`, `parseExpoReceipts` | The HTTP and cleanup logic as plain functions with an injectable `fetch`, for Node scripts and tests. |

Only `DeviceNotRegistered` removes a token. `InvalidCredentials`, `MessageTooBig` and `MessageRateExceeded` describe your credentials or the message, not the device, so the token stays. The `userId` validator sets the user id type; with `v.id("users")` it is `Id<"users">`.

## Optimistic updates (client side)

Client-side helpers for Convex optimistic updates. They live here, not in `@vvedantb/ui`, because they have no React: a backend package's client folder, its tests and a React Native app import them, and none of those can load the `@vvedantb/ui` root.

```ts
import { mapLoadedQuery, patchLoadedQuery, tempId } from "@vvedantb/server";

const createTask = useMutation(api.tasks.create).withOptimisticUpdate((store, args) => {
  const now = Date.now();
  mapLoadedQuery(store, api.tasks.list, (tasks, listArgs) =>
    listArgs.projectId === args.projectId
      ? [{ _id: tempId("tasks"), _creationTime: now, title: args.title, done: false }, ...tasks]
      : tasks,
  );
  patchLoadedQuery(store, api.tasks.count, { projectId: args.projectId }, (count) => count + 1);
});
```

| Export | Semantics |
| --- | --- |
| `mapLoadedQuery(store, query, update)` | For each entry of `store.getAllQueries(query)` whose `value` is not `undefined` (still loading), `store.setQuery(query, entry.args, update(entry.value, entry.args))`. Does nothing if the store has no `getAllQueries`. |
| `forEachLoadedQuery`, `updateAllCachedQueries` | The same function as `mapLoadedQuery`, under the names some apps use. |
| `patchLoadedQuery(store, query, args, update)` | If `store.getQuery(query, args)` is not `undefined`, set it to `update(value)`. Never creates an entry. |
| `OptimisticStore` | The part of `OptimisticLocalStore` these read (`getAllQueries` optional). A real `OptimisticLocalStore` fits. |
| `tempId(table?, { format? })` | A placeholder `GenericId<table>`. `"uuid"` (default): `crypto.randomUUID()`. `"timestamp"`: `` `optimistic_${Date.now()}_${Math.random().toString(36).slice(2)}` ``. `table` only types the id. |
| `createMemoryOptimisticStore()` | An in-memory `OptimisticLocalStore` for tests: keyed by function name and `JSON.stringify(args)` (missing args read as `{}`, so key order matters), entries in first-set order, setting `undefined` deletes. |

```ts
// Test an optimistic update without a client.
const store = createMemoryOptimisticStore();
store.setQuery(api.tasks.list, { projectId }, []);
applyCreateTask(store, { projectId, title: "Write tests" });
expect(store.getQuery(api.tasks.list, { projectId })).toHaveLength(1);
```

`createMemoryOptimisticStore` names functions with a copy of Convex's `getFunctionName` (as of `convex` 1.47), so the package still never imports `convex`. `tests/convex/memoryStore.test.ts` checks it against Convex's own for `api` references, name strings, function handles and component references.

### How each app maps onto them

| App | Today | With the package |
| --- | --- | --- |
| app-a web | `tempId<T>()` and `updateAllCachedQueries` in `apps/web/src/lib/convex-optimistic.ts` | the same names from `@vvedantb/server`; the query-specific helpers stay |
| app-b shared | `OptimisticStore`, `mapLoadedQuery`, `patchLoadedQuery` in `packages/shared/optimistic/store.ts` | same names |
| app-c shared | `tempId(table)` and `createMemoryStore` in `packages/shared/optimistic/` | `tempId(table)`, `createMemoryOptimisticStore` |
| app-d backend client | `forEachLoadedQuery` in `client/optimistic/store.ts`, `tempId(table, { format: "timestamp" })` in `client/optimistic/id.ts`, `createMemoryOptimisticStore` in `tests/optimisticMemoryStore.ts` | the same names from `@vvedantb/server` (already a dependency) |

### Differences between the copies

- **`tempId` format.** app-a and app-c use `crypto.randomUUID()` (app-c takes the table name as an unused argument); app-d uses `optimistic_<ms>_<random base 36>`. Both are reproducible through `format`.
- **`getAllQueries`.** app-b's `OptimisticStore` makes it optional and does nothing without it; app-a and app-d require it. Same result on a real store, so the three are one function.
- **Update callback.** app-a's map function gets the value only; app-b and app-d also get the args. Passing args to a one-argument callback changes nothing.
- **Memory stores.** app-d's is a `Map` per function; app-c's is one array. Same lookups, order and deletes. app-d also reads `setQuery` with missing args as `{}`; app-c would key it as `undefined` (unreachable through Convex's types). The package follows app-d. `getAllQueries` returns the stored entry objects (app-d), not copies (app-c).

## V Pro plan check

`hasVPlan` tells whether a session holds the shared V Pro plan (Clerk Billing key `v_pro`, $10/month or $100/year). The retired `vibot_pro` plan no longer counts. It reads the Clerk session token v2 `pla` claim (`u:v_pro`, `o:v_pro`, or a bare slug), because Clerk's `has({ plan })` is not available in Convex. Convex surfaces custom JWT claims on the identity.

```ts
import { hasVPlan } from "@vvedantb/server";

const identity = await ctx.auth.getUserIdentity();
if (!hasVPlan(identity)) throw new Error("V Pro required");
```

`null`, a missing `pla` or a malformed value returns `false`; it never throws. `V_PRO_PLAN_KEY` and `V_PRO_PLAN_KEYS` are exported too.

A Convex JWT template without a `pla` claim gives `hasVPlan` nothing to read. Apps then store the user's granting plan slugs on the users row from Clerk Billing webhooks, and check both with `hasVPro`:

```ts
import { hasVPro, parseVProCompUserIds } from "@vvedantb/server";

hasVPro({
  identity, // hasVPlan(identity)
  planSlugs: user?.planSlugs, // any slug in V_PRO_PLAN_KEYS
  compIds: parseVProCompUserIds(process.env.V_PRO_COMP_USER_IDS), // complimentary Clerk user ids
  clerkId: user?.clerkId, // matched against compIds; default identity.subject
});
```

Any one source grants. Every field is optional; missing or malformed ones count as no plan, and it never throws. `hasVPro` reads no env: pass `compIds` yourself. `parseVProCompUserIds` splits a comma-separated list, trims each id and drops empty ones. A stored `vibot_pro` slug does not count.

## Clerk Billing webhook (V Pro)

Pure helpers for the webhook that keeps the stored slugs current, and a factory bound to your users table. Apps keep their own `httpAction`, `internalMutation` and Node backfill action; these are the logic inside them.

| Export | What it does |
| --- | --- |
| `verifyClerkWebhook(verifyWebhook, request, options?)` | Verify a Clerk (Svix) webhook. Pass `verifyWebhook` from `@clerk/backend/webhooks`; the event type is inferred from it. The secret is `options.signingSecret`, else `CLERK_WEBHOOK_SIGNING_SECRET` from `options.env` (default `process.env`). Returns `{ ok: true, event }` or `{ ok: false, reason, error }`; never throws. |
| `parseClerkBillingEvent(event, options?)` | `{ kind: "replace", clerkId, planSlugs }`, `{ kind: "item", clerkId, status, slug }`, or `null` when the event changes nothing. Reads `data` defensively; never throws. |
| `applyBillingChange(current, change, options?)` | The slugs to store after a change: `replace` overwrites, `item` merges. |
| `activePlanSlugs(items, options?)` | Slugs of the items that grant their plan, unique and sorted. Takes webhook `data.items` and the Clerk backend client's `subscription.subscriptionItems` as they are. |
| `applyItemToPlanSlugs(current, item, options?)` | Add the item's slug when it grants, remove it when it does not. |
| `itemGrantsPlan(item, options?)`, `GRANTING_ITEM_STATUSES` | By default `active`, `past_due` and `canceled` grant. See [Options](#options). |
| `GRANTING_STATUSES_ACTIVE_PAST_DUE`, `GRANTING_STATUSES_ACTIVE_ONLY` | Presets for `grantingStatuses`: `["active", "past_due"]` and `["active"]`. |
| `createVProModule<DataModel>()(config)` | Helpers bound to one users table and its field names. See below. |

### Events

| Event `type` | Change |
| --- | --- |
| `subscription.created`, `subscription.updated`, `subscription.active`, `subscription.pastDue` | `replace` with `activePlanSlugs(data.items)` |
| `subscriptionItem.updated`, `.active`, `.canceled`, `.ended`, `.abandoned`, `.incomplete`, `.pastDue` | `item` with `data.status` and `data.plan.slug` |
| anything else | `null` |

With `eventMatch: "prefix"`, any type that starts with `subscription.` gives `replace` and any type that starts with `subscriptionItem.` gives `item`. The listed types give the same change in both modes.

- **Granting statuses.** By default `active`, `past_due` and `canceled` grant. `canceled` means cancel at period end, so access stays until the item is `ended`. `ended`, `expired`, `abandoned`, `incomplete`, `upcoming` and any other status remove the slug.
- **Billing period.** Only `status` and `plan.slug` are read. Monthly and yearly items of `v_pro` both store `v_pro`.
- **Organisation payers.** An event whose `data.payer.user_id` is missing or empty returns `null`, so the app answers 200 and writes nothing.
- **Malformed data.** A subscription event without an `items` array returns `null` rather than revoking access. An item event without a string `status` or a plan slug returns `null`. Malformed entries in `items` are skipped.
- **Free plans.** A free plan's slug (for example `free_user`) is stored like any other granting slug. It does not count as V Pro. A subscription with no granting items stores `[]`.
- **Order.** The helpers do not assume events arrive in order. A subscription event lists every item, so it overwrites the stored set and corrects earlier drift. An item event knows only its own item and merges it. So an `ended` item event after `subscription.active` still removes the slug, and a later `active` item event restores it. One limit: when two items share a slug (for example a monthly and a yearly item of one plan), an item event with a non-granting status for one of them (`ended`, `upcoming`, `abandoned`, `incomplete`) removes the slug while the other still grants. The next subscription event, or a backfill, restores it.

### Options

The pure helpers take an optional `ClerkBillingOptions`. Leaving it out keeps the defaults listed below.

| Option | Default | Read by | Effect |
| --- | --- | --- | --- |
| `grantingStatuses` | `GRANTING_ITEM_STATUSES` (`active`, `past_due`, `canceled`) | `itemGrantsPlan`, `activePlanSlugs`, `applyItemToPlanSlugs`, `applyBillingChange`, `parseClerkBillingEvent` | Item statuses that grant the plan. Any other status removes the slug. |
| `eventMatch` | `"exact"` | `parseClerkBillingEvent` | `"exact"`: the listed event types only. `"prefix"`: any `subscription.*` or `subscriptionItem.*` type. |

Pass the same `grantingStatuses` to the parser and to the writer. A `replace` change is filtered when it is parsed; an `item` change keeps the raw `status` and is decided when it is applied. Mixed settings give a stored set that neither setting would give. `vPro.parseBillingEvent` and `vPro.writeBillingChange` share the module's settings, so using both avoids the mismatch.

Behaviours an app can keep through config:

| App behaviour | Config |
| --- | --- |
| `canceled` (cancel at period end) keeps access until `ended` | default |
| `past_due` keeps access; `canceled` removes it at once | `grantingStatuses: GRANTING_STATUSES_ACTIVE_PAST_DUE` |
| Only `active` grants | `grantingStatuses: GRANTING_STATUSES_ACTIVE_ONLY` |
| Event types matched by `startsWith("subscription.")` / `startsWith("subscriptionItem.")` | `eventMatch: "prefix"` |
| Refetch the subscription from Clerk on each billing event, ignoring the payload | Call `activePlanSlugs(subscription.subscriptionItems, { grantingStatuses })` on the fetched items and write a `replace` change |
| Insert a users row when the webhook arrives first | module `createUser` |
| Stamp a field on every write (for example `billingPlansUpdatedAt`) | module `extraPatch` |
| Different stored field names | module `clerkIdField`, `planSlugsField` |

Stored slugs are always unique and sorted. Apps that stored them unsorted see a different order after the next write, but the same members, so plan checks do not change.

### `verifyClerkWebhook` result

It never throws, so the route needs no `try`. Map both failure reasons to an HTTP error so Clerk retries. 400 for both is the suggested mapping; an app that answers 500 for a missing secret can keep doing so by checking `reason`:

| `reason` | When | `verifyWebhook` called |
| --- | --- | --- |
| `"missing-secret"` | No secret, or an empty one. `error` is `"CLERK_WEBHOOK_SIGNING_SECRET is not set in Convex env"`. An explicit empty `signingSecret` does not fall back to env. | no |
| `"invalid"` | `verifyWebhook` threw or rejected (bad signature, missing headers). `error` is its message. | yes |

The package does not import `@clerk/backend` and adds no dependency.

### `createVProModule`

Curried like `createClerkUserAuth`, so you pass your generated `DataModel` and the keys are checked against it. `planSlugsField` must be a `string[]` field (optional is fine), so each app keeps its stored field name with no data migration.

```ts
// convex/vPro.ts
import { createVProModule } from "@vvedantb/server";
import type { DataModel } from "./_generated/dataModel";

export const vPro = createVProModule<DataModel>()({
  table: "users",
  index: "by_clerk_id",
  clerkIdField: "clerkId",
  planSlugsField: "planSlugs", // or "billingPlanSlugs"
  // lookup: "unique",          // default "first"
});
```

Optional config. Every field has a default, so leaving it out changes nothing.

| Field | Default | Effect |
| --- | --- | --- |
| `grantingStatuses` | `GRANTING_ITEM_STATUSES` | Used by `nextPlanSlugs`, `writeBillingChange` and `parseBillingEvent`. |
| `eventMatch` | `"exact"` | Used by `parseBillingEvent`. |
| `createUser(ctx, { clerkId, planSlugs })` | none | Called by `writeBillingChange` when there is no row. `ctx.db.insert` is typed against the table, so the app supplies its own fields (for example `createdAt`, `lastSeenAt`); the package adds none. `writeBillingChange` then returns `true`. |
| `onMissingUser` | `"noop"`, or `"create"` when `createUser` is set | `"create"` without `createUser` is a type error and throws at configure time. `"noop"` with `createUser` is a type error. |
| `extraPatch(planSlugs)` | none | Extra fields merged into the `writeBillingChange` patch of an existing row, typed as `Partial` of the document. The slugs field always wins. Not used by `planSlugsPatch` or `createUser`. |

```ts
// Insert a row when the webhook arrives first; only `active` grants; prefix event matching.
export const vPro = createVProModule<DataModel>()({
  table: "users",
  index: "by_clerk_user_id",
  clerkIdField: "clerkUserId",
  planSlugsField: "planSlugs",
  grantingStatuses: GRANTING_STATUSES_ACTIVE_ONLY,
  eventMatch: "prefix",
  createUser: async (ctx, { clerkId, planSlugs }) => {
    const now = Date.now();
    await ctx.db.insert("users", { clerkUserId: clerkId, planSlugs, createdAt: now, lastSeenAt: now });
  },
});

// Stamp a timestamp on every write.
export const vPro = createVProModule<DataModel>()({
  table: "users",
  index: "by_clerk_id",
  clerkIdField: "clerkId",
  planSlugsField: "billingPlanSlugs",
  extraPatch: () => ({ billingPlansUpdatedAt: Date.now() }),
});
```

| Function | Semantics |
| --- | --- |
| `writeBillingChange(ctx, change)` | Look up the row by `change.clerkId` through the index, then `ctx.db.patch(row._id, { ...extraPatch?.(next), [planSlugsField]: next })`. With no row: returns `false` with no write (the next event or a backfill fills it in), or calls `createUser` and returns `true`. Otherwise `true`. A `MutationCtx` fits without a cast. |
| `nextPlanSlugs(user, change)` | `applyBillingChange(planSlugsOf(user), change, { grantingStatuses })`. |
| `parseBillingEvent(event)` | `parseClerkBillingEvent(event, { grantingStatuses, eventMatch })`. |
| `planSlugsOf(user)` | The stored slugs; `[]` for no row, a missing field or a non-array value. |
| `planSlugsPatch(planSlugs)` | `{ [planSlugsField]: [...planSlugs] }`, for your own `ctx.db.patch`. |
| `userHasVPro(user, { identity?, compIds? })` | `hasVPro` over the row's stored slugs and Clerk id, plus the identity and comp ids given. |

`tests/convex/vProModule.types.ts` checks the config and ctx types against `convex/server` 1.47.

### Adoption sketch

```ts
// convex/clerkBilling.ts
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { vPro } from "./vPro";

export const applyBillingChangeInternal = internalMutation({
  args: {
    change: v.union(
      v.object({ kind: v.literal("replace"), clerkId: v.string(), planSlugs: v.array(v.string()) }),
      v.object({ kind: v.literal("item"), clerkId: v.string(), status: v.string(), slug: v.string() }),
    ),
  },
  returns: v.boolean(),
  handler: (ctx, { change }) => vPro.writeBillingChange(ctx, change),
});
```

```ts
// convex/http/clerkWebhook.ts (httpAction, registered on POST)
import { verifyWebhook } from "@clerk/backend/webhooks";
import { parseClerkBillingEvent, verifyClerkWebhook } from "@vvedantb/server";
import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";

export const clerkWebhook = httpAction(async (ctx, request) => {
  const verified = await verifyClerkWebhook(verifyWebhook, request);
  if (!verified.ok) {
    console.error("[clerkWebhook]", verified.reason, verified.error);
    return new Response("Invalid webhook", { status: 400 });
  }
  const change = parseClerkBillingEvent(verified.event);
  if (change) await ctx.runMutation(internal.clerkBilling.applyBillingChangeInternal, { change });
  return new Response(null, { status: 200 });
});
```

```ts
// convex/users.ts
export const hasVPlan = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await userAuth.getUserByClerkId(ctx, identity.subject); // createClerkUserAuth
    return vPro.userHasVPro(user, {
      identity,
      compIds: parseVProCompUserIds(process.env.V_PRO_COMP_USER_IDS),
    });
  },
});
```

```ts
// Backfill ("use node" action, stays in the app), per Clerk user id:
const subscription = await clerk.billing.getUserBillingSubscription(clerkId);
await ctx.runMutation(internal.clerkBilling.applyBillingChangeInternal, {
  change: { kind: "replace", clerkId, planSlugs: activePlanSlugs(subscription.subscriptionItems) },
});
```

Moving from an app copy: `planSlugsFromItems` is `activePlanSlugs`. `userHasVPlan(user, env)` is `vPro.userHasVPro(user, { compIds: parseVProCompUserIds(env.V_PRO_COMP_USER_IDS) })`. `identityHasVPlan(identity)` is `hasVPlan(identity)`. The replace and apply-item mutations can become one `writeBillingChange` mutation, or keep their names and call `vPro.writeBillingChange` with `{ kind: "replace", ... }` or `{ kind: "item", ... }`. Stays in the apps: the route, the mutation and query wrappers, the paged user listing and the backfill action.

Also stays in the apps, by design:

- **Webhook runtime.** V8 `httpAction` or a Node action that verifies a forwarded body and headers. `verifyClerkWebhook` takes any `verifyWebhook`-shaped function, so a Node action can pass a wrapper around Svix's `Webhook`.
- **HTTP status for a missing secret.** Map `reason` to 400 or 500 in the route.
- **Refetch on each event.** An app that ignores the payload and refetches the subscription from Clerk calls `activePlanSlugs` with its `grantingStatuses` on the fetched items.
- **Custom JWT claims.** Checks on app-specific claims (for example a custom `plans` or `plan` claim) stay beside `hasVPro`; `hasVPro` reads only `pla`.
- **Backfill.** Page size, scheduling and how a 404 from Clerk is stored. Pass the same `grantingStatuses` to `activePlanSlugs` as the webhook uses.

## Auth function builders

`createAuthFunctions` builds `authQuery`, `authMutation` and `authAction` on convex-helpers `customFunctions`. Each handler receives `ctx.userId`, and an unauthenticated caller is rejected before the handler runs. The app wires its own generated builders and its user lookup in one place.

convex-helpers is an [optional peer for types only](#peers): the app imports the four runtime functions and passes them in, so importing `@vvedantb/server` never forces convex-helpers (or convex) on a consumer.

```ts
// convex/functions.ts
import { customAction, customCtx, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { createAuthFunctions } from "@vvedantb/server";
import type { DataModel, Id } from "./_generated/dataModel";
import {
  action, internalAction, internalMutation, internalQuery, mutation, query,
} from "./_generated/server";
import { userAuth } from "./userAuth"; // createClerkUserAuth
import { resolveActionUserId } from "./lib/actionAuth"; // runs a query, throws when null

const customFunctions = { customQuery, customMutation, customAction, customCtx };

export const { authQuery, authMutation, authAction } = createAuthFunctions<DataModel, Id<"users">>({
  customFunctions,
  query, mutation, action,
  resolveUserId: (ctx) => userAuth.requireCurrentUserId(ctx),
  resolveActionUserId: (ctx) => resolveActionUserId(ctx),
  beforeEach: () => assertNotInMaintenance(), // optional gate; omit when there is none
});

// Internal variants: a second call with the internal builders and no gate.
export const {
  authQuery: internalAuthQuery,
  authMutation: internalAuthMutation,
  authAction: internalAuthAction,
} = createAuthFunctions<DataModel, Id<"users">>({
  customFunctions,
  query: internalQuery, mutation: internalMutation, action: internalAction,
  resolveUserId: (ctx) => userAuth.requireCurrentUserId(ctx),
  resolveActionUserId: (ctx) => resolveActionUserId(ctx),
});
```

```ts
export const myTasks = authQuery({
  args: {},
  handler: (ctx) => ctx.db.query("tasks").withIndex("by_owner", (q) => q.eq("ownerId", ctx.userId)).collect(),
});
```

| Export | What it does |
| --- | --- |
| `createAuthFunctions<DataModel, UserId, Visibility?>(config)` | Returns `{ authQuery, authMutation, authAction }`. Call again with the internal builders for the internal variants. |
| `AuthCustomFunctions` | The four convex-helpers functions the app injects (`customQuery`, `customMutation`, `customAction`, `customCtx`). |
| `AuthReadCtx<DataModel>` | A query-or-mutation ctx union, the type `resolveUserId` and `beforeEach` receive. |
| `CreateAuthFunctionsConfig<DataModel, UserId, Visibility?>`, `AuthFunctions<…>` | The config and the return type. |

Config: `customFunctions`; the generated `query`/`mutation`/`action` (public or internal); `resolveUserId(ctx)` (throws to reject, for example `userAuth.requireCurrentUserId`); `resolveActionUserId(ctx)` (an action has no `ctx.auth` database access, so it usually runs a query and throws on null); and an optional `beforeEach(ctx)` gate that runs on every call before the user is resolved — throw to block it (a maintenance check). Omit `beforeEach` for internal builders that must run during maintenance.

- **Maintenance gate.** `beforeEach` is the optional hook for eva's `assertNotInMaintenance()`. It is not a dependency: an app without a gate omits it.
- **Internal variants.** A second `createAuthFunctions` call with `internalQuery`/`internalMutation`/`internalAction` and no `beforeEach`, renamed on destructure. The result is the same shape, so the first call's logic is reused.

`tests/convex/authFunctions.test.ts` wires the real convex-helpers builders to stub base builders and runs each wrapped handler: the userId is injected for query, mutation and action; `beforeEach` runs before `resolveUserId` and a throwing gate blocks the handler without resolving the user; an authentication rejection from `resolveUserId` propagates; the internal variant works through a second call.

## Convex admin API client

`createConvexAdminClient` is the deployment admin client each app's MCP "run query" tool uses: run an ad-hoc query against a deployment, run a system query, and list tables (inferred shapes merged with the declared schema). The deployment URL and admin key are arguments; it reads no env vars. `fetch` is injectable for tests. No convex or zod import — plain TypeScript, like the Expo push HTTP helpers.

```ts
import { convexSiteToCloudUrl, createConvexAdminClient } from "@vvedantb/server";

const client = createConvexAdminClient({
  cloudUrl: convexSiteToCloudUrl(deploymentUrl), // .convex.site -> .convex.cloud; cloud/self-hosted unchanged
  adminKey, // the deploy key; passed as an argument, never read from env
});

const { value, logLines } = await client.runTestFunction(bundledQuerySource, { args: { limit: 10 } });
const tables = await client.listTables({ hideTable: (name) => name.startsWith("_") });
```

| Export | What it does |
| --- | --- |
| `createConvexAdminClient(config)` | `{ runTestFunction, runSystemQuery, getShapes, listTables }`. `config` is `{ cloudUrl, adminKey, fetch? }`. |
| `convexSiteToCloudUrl(url)` | Rewrites a `.convex.site` URL to `.convex.cloud`; leaves a cloud or self-hosted URL unchanged. |
| `parseConvexApiResponse(json)` | Returns `{ value, logLines }` on `status: "success"`; throws the `errorMessage` on `status: "error"`; throws on a non-object or unknown status. |
| `ConvexAdminClient`, `ConvexAdminClientConfig`, `RunTestFunctionOptions`, `ListTablesOptions`, `ConvexTableInfo`, `ConvexTestFunctionResult`, `ConvexJsonValue` | The client and its types. |

| Method | Semantics |
| --- | --- |
| `runTestFunction(source, options?)` | POST `/api/run_test_function` with `{ adminKey, bundle: { path, source }, args, format: "convex_encoded_json" }` (the admin key is in the body). `options.args` defaults to `{}`, `options.path` to `testQuery.js`. Returns `parseConvexApiResponse` of the body, so a query resource-limit error throws its message (format it with `formatConvexQueryError` for MCP). Throws on a non-ok HTTP response. |
| `runSystemQuery(path, args?)` | POST `/api/query` with `Authorization: Convex <adminKey>`, for a `_system/...` function. |
| `getShapes()` | GET `/api/shapes2` with the same auth header: inferred table shapes. |
| `listTables(options?)` | Merges `getShapes` with the declared schema from `_system/frontend/getSchemas`, one `ConvexTableInfo` per table (`name`, `inferredShape`, `declaredSchema`), sorted by name. `options.hideTable(name)` drops tables. |

`tests/convex/convexAdminClient.test.ts` exercises every function against a stubbed `fetch`: the URL rewrite, the parse success/error/unknown cases, the `runTestFunction` body shape, args and path, trailing-slash stripping and error paths, and the `listTables` merge, sort, `hideTable` and admin auth header.

## Develop

```sh
pnpm --filter @vvedantb/server build
pnpm --filter @vvedantb/server test
```

Publish steps for the whole package are in the root `README.md`.

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
| `createClerkUserAuth<DataModel>()(config)` | Clerk-user lookups for queries and mutations: `getCurrentUserId`, `requireCurrentUserId`, `getCurrentUser`, `isCurrentUserAdmin`, `getUserByClerkId`, `ensureUser`. See below. |

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

## Develop

```sh
pnpm --filter @vvedantb/server build
pnpm --filter @vvedantb/server test
```

Publish steps for the whole package are in the root `README.md`.

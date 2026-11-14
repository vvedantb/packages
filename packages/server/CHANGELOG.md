# Changelog

## 0.16.0

### Minor Changes

- [#236](https://github.com/vvedantb/packages/pull/236) [`7db4f19`](https://github.com/vvedantb/packages/commit/7db4f194aeaa25b5352ce5524cd236d6f386f404) Thanks [@agenteva1](https://github.com/apps/agenteva1)! - Generative UI in the kits: agent-composed panels from one shared catalog.
  
  - `@vvedantb/server/generative-ui`: the 16 component definitions (zod props), the `reply` and `open_url` actions, tones and styles, `parseGenerativeUiSpec` and `isHttpUrl`. No json-render runtime: pass `generativeUiCatalogDefinition` to json-render's `defineCatalog`.
  - `@vvedantb/ui/generative-ui`: `GenerativeUiPanel` (stored spec, `onReply`, `onOpenUrl`), `GenerativeUiRenderer` and `generativeUiCatalog` on `@json-render/react`.
  - `@vvedantb/native-ui/generative-ui`: `GenerativeUiPanel` (plus `onCopy` and `renderUnsupported`) and `generativeUiNativeCatalog` on `@json-render/react-native`, drawn as the web panel on the native tokens.
  
  New optional peers: `@json-render/core`, `@json-render/react` (ui), `@json-render/react-native` (native-ui), `>=0.21.0`.

## 0.15.0

### Minor Changes

- [#223](https://github.com/vvedantb/packages/pull/223) [`9e1f80d`](https://github.com/vvedantb/packages/commit/9e1f80db6d5c6af6419989194ab999d56e807a9a) Thanks [@vvedantb](https://github.com/vvedantb)! - Add three shared backend helpers.
  
  HMAC and webhook signatures (`@vvedantb/server`, crypto area): `hmacSha256`, `hmacSha256Hex`, `githubStyleSignature` and `verifyGithubStyleSignature`. WebCrypto only, so they run in the Convex default runtime. Each takes a string or `Uint8Array` message (type `HmacMessage`), so a verifier can read raw request bytes or decoded text. `verifyGithubStyleSignature` compares a `sha256=<hex>` header in constant time, trims the header, and returns `false` for a `null` header.
  
  Convex admin API client (`createConvexAdminClient`, `convexSiteToCloudUrl`, `parseConvexApiResponse`) for each app's MCP "run query" tool. The deployment URL and admin key are arguments; it reads no env vars, imports no convex or zod, and takes an injectable `fetch`. The client runs an ad-hoc query (`runTestFunction`), a system query (`runSystemQuery`), reads inferred shapes (`getShapes`) and lists tables merged with the declared schema (`listTables`).
  
  Auth function builders (`createAuthFunctions`) on convex-helpers `customFunctions`: `authQuery`, `authMutation` and `authAction` whose handlers receive `ctx.userId` and reject an unauthenticated caller. The app injects the four convex-helpers functions and its generated builders, so convex-helpers is an optional peer for types only. An optional `beforeEach` gate (for a maintenance check) runs before the user is resolved; internal variants come from a second call with the internal builders and no gate.

## 0.14.0

Reusable Expo push notification helpers, generalised from an app's own push code. Additive; nothing in 0.13.0 changes. `convex` is used for types only and `zod` is not needed.

### Added

- `createExpoPushFunctions({ v, userId, mutation, internalQuery, internalMutation, internalAction, requireCurrentUserId, listTokensRef, removeTokensRef, sendRef, checkReceiptsRef, tableName?, receiptDelayMs?, fetch?, accessToken? })` returns `register`, `unregister`, `listTokensForUser`, `removeTokens`, `send`, `checkReceipts` and a bound `schedulePush`. `requireCurrentUserId` takes `createClerkUserAuth(...).requireCurrentUserId`.
- Table helpers `pushTokensFields(v, userId?)` and `pushTokensTable(defineTable, v, userId?)` (deprecated for schema use, as the MCP token cache), constants `PUSH_TOKENS_TABLE` (`"pushTokens"`), `PUSH_TOKENS_USER_INDEX` (`by_user`) and `PUSH_TOKENS_TOKEN_INDEX` (`by_token`). Apps copy the table into their own schema (`NoImportModuleInSchema`).
- `register` validates tokens against `EXPO_PUSH_TOKEN_PATTERN` and upserts by token; `unregister` deletes only the caller's row.
- `send` posts to the Expo Push API in batches of `EXPO_PUSH_BATCH_SIZE` (100), removes `DeviceNotRegistered` tokens from tickets and schedules `checkReceipts` after `EXPO_RECEIPT_DELAY_MS` (15 minutes, set with `receiptDelayMs`). `checkReceipts` fetches receipts (1000 ids per request, `EXPO_RECEIPT_BATCH_SIZE`) and removes `DeviceNotRegistered` tokens. Only that error removes a token.
- Plain helpers with an injectable `fetch`: `sendExpoPushMessages`, `fetchExpoPushReceipts`, `tokensToRemoveFromTickets`, `receiptRefsFromTickets`, `tokensToRemoveFromReceipts`, `parseExpoTickets`, `parseExpoReceipts`, `isExpoPushToken`, `isDeviceNotRegistered`; constants `EXPO_PUSH_SEND_URL` and `EXPO_PUSH_RECEIPTS_URL`; a standalone `schedulePush(ctx, params, { sendRef, tableName })`.
- Docs: "Expo push notifications" in `docs/convex.md`.

### Tests

- `tests/convex/expoPush.test.ts` (12, mocked `fetch`, fake in-memory db): schema helpers, register upsert and takeover, invalid token, unregister ownership, batching (250 tokens, 3 calls), ticket and receipt cleanup, `schedulePush` no-op. `tests/convex/expoPush.types.ts` checks the factory against real Convex builders. `tests-node/esm-exports.mjs` checks the new exports.

## 0.13.0

Optional `title`, `websiteUrl` and `icons` in MCP `serverInfo` (MCP 2025-11-25 `Implementation`), so MCP clients can show an app's name and icon. Additive; nothing in 0.12.0 changes. `defineMcpServerInfo({ name, version })` returns the same object as before.

### Added

- `defineMcpServerInfo` takes optional `title`, `websiteUrl` and `icons`. Each is included only when passed; no `undefined` keys. Icons are copied as given, with no `mimeType`, `sizes` or `theme` invented. An icon with an empty `src` throws. `name` and `version` checks are unchanged.
- Type `McpServerIcon` (`{ src, mimeType?, sizes?, theme? }`, `theme` is `"light"` or `"dark"`). `McpServerInfo` gains the optional fields.
- `createMcpDispatcher` already returns `serverInfo` as given, so the optional fields reach the initialize result with no dispatcher change.

### Tests

- `defineMcpServerInfo`: title, websiteUrl and icons included when passed, omitted when not, and empty icon `src` rejected.
- Dispatcher: an initialize result carries `title`, `websiteUrl` and `icons`.

## 0.12.0

Shared V Pro checks and Clerk Billing webhook helpers, so apps stop keeping their own copies, with config options so apps whose webhook copies differ from the defaults can adopt them with no change users can see. Additive; nothing in 0.11.0 changes. No new dependency: `@clerk/backend` stays an optional peer and is never imported. (These helpers were first drafted as 0.11.0; 0.11.0 shipped the AI Gateway helpers instead.)

### Added

- `hasVPro({ identity, planSlugs, compIds, clerkId })`: true when `hasVPlan(identity)` is true, a stored slug is in `V_PRO_PLAN_KEYS`, or the Clerk id (`clerkId`, else `identity.subject`) is in `compIds`. Missing or malformed fields count as no plan; it never throws. Reads no env.
- `parseVProCompUserIds(value)`: a comma-separated id list (for example `V_PRO_COMP_USER_IDS`), trimmed, empty ids dropped.
- `verifyClerkWebhook(verifyWebhook, request, options?)`: verifies a Clerk (Svix) webhook with an injected `verifyWebhook` from `@clerk/backend/webhooks`. The secret is `options.signingSecret`, else `CLERK_WEBHOOK_SIGNING_SECRET` from `options.env` (default `process.env`). Returns `{ ok: true, event }` or `{ ok: false, reason: "missing-secret" | "invalid", error }`; never throws. Map both failures to HTTP 400.
- `parseClerkBillingEvent(event)`: `subscription.created`, `.updated`, `.active` and `.pastDue` give `{ kind: "replace", clerkId, planSlugs }`. `subscriptionItem.updated`, `.active`, `.canceled`, `.ended`, `.abandoned`, `.incomplete` and `.pastDue` give `{ kind: "item", clerkId, status, slug }`. Returns `null` for other events, a payer with no `user_id` (an organisation), and malformed data, including a subscription event with no `items` array.
- `applyBillingChange(current, change)`, `applyItemToPlanSlugs(current, item)`, `activePlanSlugs(items)`, `itemGrantsPlan(item)` and `GRANTING_ITEM_STATUSES` (`active`, `past_due`, `canceled`). `canceled` still grants until the item ends. Billing period fields are not read, so monthly and yearly items of one plan store the same slug.
- `createVProModule<DataModel>()({ table, index, clerkIdField, planSlugsField, lookup? })`: `writeBillingChange(ctx, change)` (looks up the row and patches the slugs field; `false` with no write when there is no row), `nextPlanSlugs`, `planSlugsOf`, `planSlugsPatch` and `userHasVPro`. `planSlugsField` is configurable (for example `planSlugs` or `billingPlanSlugs`), so no data migration. Typed structurally; a Convex `MutationCtx` fits without a cast.
- Types `ClerkBillingChange`, `ClerkWebhookEventLike`, `PlanItem`, `HasVProInput`, `ClerkWebhookEnv`, `ClerkWebhookRejection`, `VerifyClerkWebhookOptions`, `VerifyClerkWebhookResult`, `UserHasVProOptions`, `VProModuleConfig`, `VProPlanSlugsFieldOf`, `VProWriterCtx`.

### Added: config options

Every option is optional and defaults to the behaviour above.

- `ClerkBillingOptions` (`grantingStatuses?`, `eventMatch?`) as an optional last argument to `itemGrantsPlan`, `activePlanSlugs`, `applyItemToPlanSlugs`, `applyBillingChange` and `parseClerkBillingEvent`.
  - `grantingStatuses`: the item statuses that grant. Default `GRANTING_ITEM_STATUSES` (`active`, `past_due`, `canceled`).
  - `eventMatch`: `"exact"` (default, the listed event types) or `"prefix"` (any `subscription.*` type gives `replace`, any `subscriptionItem.*` type gives `item`). Read only by `parseClerkBillingEvent`.
- `GRANTING_STATUSES_ACTIVE_PAST_DUE` (`active`, `past_due`) and `GRANTING_STATUSES_ACTIVE_ONLY` (`active`) presets.
- `createVProModule` config:
  - `grantingStatuses` and `eventMatch`, used by `nextPlanSlugs`, `writeBillingChange` and the new `parseBillingEvent`.
  - `createUser(ctx, { clerkId, planSlugs })`: called by `writeBillingChange` when there is no row, which then returns `true`. The app supplies every other field; the package invents none. `ctx.db.insert` is typed against the table.
  - `onMissingUser`: `"noop"` (default) or `"create"` (implied by `createUser`). `"create"` without `createUser` is a type error and throws at configure time.
  - `extraPatch(planSlugs)`: fields merged into the `writeBillingChange` patch of an existing row, typed as `Partial` of the document. The slugs field always wins.
- `vPro.parseBillingEvent(event)`: `parseClerkBillingEvent` with the module's `grantingStatuses` and `eventMatch`, so the parser and the writer cannot disagree.
- Types `ClerkBillingOptions`, `VProCreateUser`, `VProCreateUserCtx`. `VProModuleConfig` takes an optional fifth `Doc` type argument. `VProWriterCtx` gains an optional `db.insert`, which a `MutationCtx` has.

### Renamed from the app copies

- `planSlugsFromItems` is `activePlanSlugs`. `userHasVPlan(user, env)` is `hasVPro` (or `vPro.userHasVPro`) with an explicit `compIds`. `identityHasVPlan` is `hasVPlan`. The replace and apply-item writers are one `writeBillingChange`.

### Known limit

- An item event knows only its own item. When two items share a slug (for example a monthly and a yearly item of one plan), an item event with a non-granting status for one of them (`ended`, `upcoming`, `abandoned`, `incomplete`) removes the slug while the other still grants. The next subscription event or a backfill restores it. The app copy these helpers came from behaves the same.

### Unchanged

- Stored slugs stay unique and sorted. Apps that stored them unsorted get the same members in a different order.
- Webhook runtime (V8 or Node), the HTTP status for a missing secret, refetching the subscription on each event, custom JWT plan claims and backfill paging stay in the apps. See `docs/convex.md`.

### Tests

- `tests/convex/clerkBilling.test.ts`: every handled event type, granting and removing statuses, monthly against yearly items, free plan and empty items, organisation payers, ignored and malformed events, and out-of-order event sequences.
- `tests/convex/clerkWebhook.test.ts`: secret from options, env and `process.env`; missing and empty secrets; `verifyWebhook` rejecting, throwing synchronously and throwing a non-`Error`.
- `tests/convex/vProModule.test.ts` and `tests/convex/vProModule.types.ts`: `planSlugs` against `billingPlanSlugs`, missing rows, `lookup`, `userHasVPro`, a webhook handler built from the helpers, and real Convex ctx and validator types.
- `tests/convex/vPlan.test.ts`: `hasVPro` and `parseVProCompUserIds`. `tests-node/esm-exports.mjs` checks the new exports with no peer installed; `tests-node/bundle.mjs` bundles the webhook helpers for Convex V8.
- `tests/convex/clerkBilling.test.ts`: each `grantingStatuses` preset across every helper, `eventMatch` exact against prefix, and prefix giving the same change as exact for every listed type.
- `tests/convex/vProModule.test.ts`: module `grantingStatuses`, `parseBillingEvent`, `extraPatch`, `createUser` (insert, then patch), `onMissingUser` and a ctx with no `insert`. `tests/convex/vProModule.types.ts`: `createUser` and `extraPatch` against a real Convex schema, and rejected configs.
- `tests-node/esm-exports.mjs` and `tests-node/bundle.mjs`: the presets and options with no peer installed and in a Convex V8 bundle.

## 0.11.0

Additive: Vercel AI Gateway helpers on a new subpath, `@vvedantb/server/ai`, taken from three apps' local copies. The root is unchanged and does not re-export them. No new dependency: `ai` (`>=5`) and `@ai-sdk/gateway` (`>=1`) are new optional peers, needed only by the subpath. See `docs/ai.md`.

### Added

- Export `./ai` (`dist/ai/index.js`). Works in the Convex default runtime: no Node built-ins, no `"use node"`.
- `GatewayServiceTier` (`"flex" | "default" | "ultrafast"`), `gatewayServiceTier(tier)` and its alias `gatewayTier`: `{}` for `"default"`, else `{ gateway: { serviceTier: tier } }`.
- `FLEX_GATEWAY_PROVIDER_OPTIONS` (replaces inline `{ gateway: { serviceTier: "flex" } }` literals) and its alias `FLEX_PROVIDER_OPTIONS`, frozen.
- `withFlexGatewayOptions(extra?)`: flex with the caller's provider options on top. Unlike the local `buildChatProviderOptions` it replaces, a caller `gateway` key is merged over flex instead of replacing it.
- `readGatewayCost(metadata)`: `gateway.cost`, else `gateway.marketCost`, as a number or numeric string. Takes a structural type that the SDK's `ProviderMetadata` fits; no SDK import.
- `classifyGatewayError(error)`, `errorMessageOf(error)`, `GatewayErrorKind` and `GatewayFailure` (from a local `gatewayErrors.ts`). Changes from that copy:
  - New kind `quota`: status 402, a billing message, or "quota" on a Gateway error that is not a rate limit. Not retryable. A rate-limit error that only says "quota" stays `rate_limit`.
  - `auth` also matches the error that `generateText` and the other `ai` calls put in place of `GatewayAuthenticationError` (a plain `Error` named `GatewayAuthenticationError`, or in production an `AISDKError` named `GatewayError`). The local copy returned `other` for both.
  - The Gateway's `GatewayTimeoutError` is `timeout` (retryable), not `gateway`.
  - `statusCode` is set for every Gateway error; `message` has ANSI colour codes removed.
- Types `GatewayServiceTierOptions`, `GatewayProviderOptions`, `GatewayJsonObject`, `GatewayJsonValue`, `GatewayCostMetadata`.
- `docs/ai.md`, with which app files can be deleted once each app adopts it.

### Tests

- `tests/ai/`: tier builder, flex merge, cost parsing, every classifier branch with real SDK error instances, marker matching for a foreign copy, and errors built by `generateText` through `createGateway` with a fake `fetch` (429, 402, 401, 404, 400, 503). Types are checked against the SDK's `providerOptions` and `ProviderMetadata`.
- `tests-node/esm-exports.mjs`: the exports map has `./ai`; the root has no AI exports; `./ai` fails with a missing package when the peers are absent and runs when they are installed; the published `./ai` types check alone and fit the SDK.
- `tests-node/bundle.mjs`: a Convex V8 bundle of an action that uses `./ai` has no Node built-in with the SDK external, and imports no Node built-in with the SDK bundled. The SDK itself carries guarded `process.getBuiltinModule("node:…")` calls; the test allows those and nothing else.
- `ai` and `@ai-sdk/gateway` are dev dependencies.

## 0.10.0

Retires the per-app `vibot_pro` plan. Only the shared `v_pro` plan counts as V Pro. No new dependency.

### Removed

- `V_PRO_LEGACY_PLAN_KEY` (`"vibot_pro"`). Breaking for any consumer that imports it.

### Changed

- `V_PRO_PLAN_KEYS` is now `["v_pro"]`. The export stays.
- `hasVPlan` no longer treats `vibot_pro` (`u:vibot_pro`, `o:vibot_pro` or bare) as V Pro; it returns `false`.

### Tests

- `tests/convex/vPlan.test.ts` and `tests-node/esm-exports.mjs` check that `vibot_pro` no longer counts.

## 0.9.0

Shared "V Pro" plan check for every Project V app. Additive; no new dependency.

### Added

- `hasVPlan(claimsOrIdentity)`: true when the Clerk session token v2 `pla` claim (`u:<plan>` or `o:<plan>`, or a bare slug) is `v_pro` or the legacy `vibot_pro`. Takes a Convex `getUserIdentity()` result or raw JWT claims. `null`, `undefined`, a missing claim or a malformed one returns `false`; it never throws.
- `V_PRO_PLAN_KEY` (`"v_pro"`), `V_PRO_LEGACY_PLAN_KEY` (`"vibot_pro"`) and `V_PRO_PLAN_KEYS`.

### Tests

- `tests/convex/vPlan.test.ts`: both scopes for both plans, bare slugs, identity-shaped objects, unrelated plans and malformed input. `tests-node/esm-exports.mjs` checks the new exports.

## 0.8.1

Fix: 0.8.0 sent every JWT-shaped bearer to `verifyClerkOAuthJwt`, which rejects any header `typ` other than `at+jwt` or `application/at+jwt`. Clerk session tokens (RS256, `typ` `JWT` or none), which apps accept on `/mcp` with `acceptsToken: ["oauth_token", "session_token"]`, were rejected with no retry. No new dependency.

### Fixed

- `authenticateClerkBearer` verifies locally only a JWT whose header `typ` is `at+jwt` or `application/at+jwt` (case-insensitive). A failure there is still final: `verifyFallback` is not called. Every other token goes to `verifyFallback`: opaque OAuth tokens, session JWTs, JWTs with another or no `typ`, and JWTs with an undecodable header. `verifyClerkOAuthJwt` is unchanged and still rejects session JWTs when called directly.

### Added

- `verifyFallback` option on `authenticateClerkBearer`. It replaces `verifyOpaque` and receives non-access-token JWTs as well as opaque tokens. `verifyFallback` wins when both are set.
- `isOAuthAccessTokenJwt(token)`.

### Deprecated

- `verifyOpaque` option: alias of `verifyFallback`. Callers that pass only `verifyOpaque` still compile and work. Rename it when convenient.

### Tests

- `tests/convex/verifyClerkOAuthJwt.test.ts`: session JWT, missing `typ`, undecodable header and opaque token go to the fallback; a valid `at+jwt` verifies locally; a bad `at+jwt` returns `null` without the fallback; the `verifyOpaque` alias works.

## 0.8.0

Additive: V8-safe verification of Clerk OAuth access tokens that are JWTs. Nothing in 0.7.1 is removed or changed. No new dependency (WebCrypto and `fetch` only).

### Added

- `authenticateClerkBearer({ token, issuer, verifyOpaque, jwksUrl?, fetch?, now?, clockSkewMs?, onReject?, onError? })`: a three-segment base64url bearer is verified locally; anything else goes to `verifyOpaque` (your Node `verifyClerkAccessToken` action). Returns `{ clerkUserId }` or `null`. A JWT that fails local checks is rejected, not retried through `verifyOpaque`. `verifyOpaque` may return `{ clerkUserId }` or `{ userId }`.
- `verifyClerkOAuthJwt(token, options)`: RS256 signature against the issuer JWKS (`${issuer}/.well-known/jwks.json` by default), `iss`, `exp` and `nbf` (5 s skew by default), header `typ` of `at+jwt` or `application/at+jwt` (session JWTs are rejected) and a non-empty `sub`. Returns `{ clerkUserId, claims }` or `null`; silent unless `onReject` or `onError` is set.
- The JWKS is cached in module scope for `CLERK_JWKS_TTL_MS` (1 hour). An unknown `kid` refetches at most once per `CLERK_JWKS_REFETCH_MIN_MS` (1 minute), so key rotation works. `clearClerkJwksCache()` empties it.
- `looksLikeJwt(token)`, types `AuthenticateClerkBearerOptions`, `ClerkOAuthJwtRejection`, `VerifiedClerkOAuthJwt`, `VerifyClerkOAuthJwtOptions`.
- Tests: `tests/convex/verifyClerkOAuthJwt.test.ts` with generated RSA keys and a mocked JWKS `fetch`. `tests-node` checks the exports and bundles `authenticateClerkBearer` for Convex V8.

### Deprecated

- `authenticateWithTokenCache` and `createMcpTokenCacheFunctions` (and with them the `mcpTokenCache` table and its purge cron). JWT tokens no longer need a Node action or the cache. They still work. Remove them from your app once old opaque tokens expire: Clerk OAuth access tokens last 1 day ([Clerk docs](https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth)), so about 1 day after the instance switched to JWTs.

### Migration

```ts
// convex/mcp/http.ts (httpAction, default runtime)
import { authenticateClerkBearer } from "@vvedantb/server";

const authenticate = (ctx: ActionCtx, token: string) =>
  authenticateClerkBearer({
    token,
    issuer: "https://clerk.example.com", // your Clerk Frontend API URL
    verifyOpaque: (t) => ctx.runAction(internal.mcp.nodeActions.verifyAccessToken, { token: t }),
  });
```

Keep the Node `verifyAccessToken` action for opaque tokens. After about 1 day, remove `verifyOpaque`'s Node action, the `mcpTokenCache` table and the purge cron.

## 0.7.1

Docs fix: do not import `mcpTokenCacheTable` or `mcpTokenCacheFields` in `convex/schema.ts`. A Convex schema cannot import runtime code from a package, so `convex deploy` fails with `NoImportModuleInSchema`. No runtime change; every export stays.

### Changed

- `docs/convex.md`: define the cache table locally in `convex/schema.ts` (same fields, indexes `by_token_hash` and `by_expires`), and check it against `mcpTokenCacheFields` and `mcpTokenCacheTable` in an app test. Both have an example.
- JSDoc: `mcpTokenCacheFields` and `mcpTokenCacheTable` say not to import them in `convex/schema.ts` and to use them in tests. `mcpTokenCacheTable` is marked `@deprecated` for schema use; it still works.
- The 0.7.0 entry below wrongly said the two are "for the schema".
- Tests: the test app in `tests/convex/mcpTokenCacheApp/schema.ts` defines its tables locally, and `tests/convex/mcpTokenCache.test.ts` checks they match `mcpTokenCacheFields` and the indexes from `mcpTokenCacheTable`.

## 0.7.0

Additive: MCP bearer-token cache for Convex backends. Nothing in 0.6.1 changes. See `docs/convex.md`.

### Added

- `authenticateWithTokenCache({ token, get, put, verify, now? })`: cache lookup by SHA-256 of the token, then `verify` on a miss. Only successful verifications are cached; a hit returns `{ clerkUserId }`; a failed cache write logs a warning and is ignored. Logs `[MCP][auth]` with `authCached` and `authMs`.
- `createMcpTokenCacheFunctions({ v, internalQuery, internalMutation, tableName?, purgeSelf })`: the internal `getInternal`, `putInternal` and `purgeExpired` functions, typed as real registered functions. `purgeExpired` deletes expired rows in batches of 500 and reschedules itself after a full batch.
- `mcpTokenCacheFields(v)` and `mcpTokenCacheTable(defineTable, v)` for the schema, with indexes `by_token_hash` and `by_expires`.
- `jwtExpiryMs`, `tokenCacheExpiresAt` (expiry is `min(now + 5 min, JWT exp)`; an expired JWT is not cached) and `hashMcpToken`.
- Constants `MCP_TOKEN_CACHE_TTL_MS`, `MCP_TOKEN_CACHE_PURGE_BATCH`, `MCP_TOKEN_CACHE_TABLE`, `MCP_TOKEN_CACHE_HASH_INDEX`, `MCP_TOKEN_CACHE_EXPIRES_INDEX`. Types `AuthenticateWithTokenCacheOptions`, `McpTokenCacheEntry`, `McpTokenCacheRow`, `McpTokenCachePrincipal`, `McpTokenCacheDoc`, `McpTokenCachePurgeRef`, the ctx, def and builder types, and `McpTokenCacheFunctionsConfig`.
- Tests: `tests/convex/mcpTokenCache.test.ts` (hit, miss, hash only, failed verify, expired row, expired JWT, TTL capped at `exp`, put patch rules, purge batching and reschedule, swallowed write failure) on a fake backend, and `tests/convex/mcpTokenCache.types.ts` against a codegen-shaped app. `tests-node` runs the cache with no peer installed, type-checks it from the published types, and bundles it for Convex V8.

### Changed (from the app code this came from)

- No runtime `convex` or `zod` import: the app passes `v`, `defineTable` and its builders. `jwtExpiryMs` checks `exp` with plain code (a finite number) instead of a zod schema.
- `authenticateWithTokenCache` takes `get` and `put` functions instead of an action ctx, and an optional `now`.
- `purgeSelf` must be annotated `(): McpTokenCachePurgeRef => …` to avoid a circular `internal` type.

## 0.6.1

Fix: the artifact guest bridge now connects in a browser iframe. No API change.

- The 0.6.0 guest sent `artifact:ready` only through a port it did not have yet, so the host never sent one. State requests went nowhere, and the built-in quiz and flashcards pages waited forever on `getAll()`. The guest now posts `artifact:ready` to `window.parent`, queues requests made before the port arrives, and sends them when it does. React Native WebViews are unchanged.
- Tests: the guest run in a VM realm with a parent window and no `ReactNativeWebView`: ready goes to the parent, a `getAll()` made before the port is sent once the port arrives, and its result resolves.

## 0.6.0

Additive: a pure artifacts core joins the root. Nothing in 0.5.0 changes. See `docs/artifacts.md`.

### Added

- `createArtifactSchemas(z)` (zod 3.25+ or 4, passed in): `artifactType`, `artifactFormat`, `stateSpec`, `quizBodyV1`, `flashcardsBodyV1`, `listRow`, `detailRow`, and `validateArtifactBody(type, format, body, schemaVersion?)`, which caps bodies at 400,000 characters and allows `json` only for quiz and flashcards v1. Constants `ARTIFACT_TYPES`, `ARTIFACT_FORMATS`, `ARTIFACT_JSON_TYPES`, `ARTIFACT_TITLE_MAX_CHARS`, `ARTIFACT_DESCRIPTION_MAX_CHARS`, `ARTIFACT_BODY_MAX_CHARS`. Types `ArtifactType`, `ArtifactFormat`, `ArtifactStateSpec`, `QuizBodyV1`, `FlashcardsBodyV1`, `ArtifactOrigin`, `ArtifactListRow`, `ArtifactDetailRow`, `ArtifactSchemas`, `ArtifactBodyValidation`.
- State: limits (32 keys, 64-character keys, 16 KiB per value, 64 KiB in total, 1 s between writes, 400/4,000 daily writes, 5 s/30 s save debounce, 10 versions kept), `applyArtifactStateOp`, `applyArtifactStatePatch`, `validateArtifactStateMap`, `parseArtifactStateOp`, `utcDayKey`, `utf8ByteLength`, `createTrailingMaxDebounce`, and the storage-shim prefixes and helpers (`ls:`, `ss:`).
- Rendering: `buildQuizHtml`, `buildFlashcardsHtml`, `htmlFromArtifactTemplate` with lenient `parseQuizTemplate` and `parseFlashcardsTemplate`, `wrapArtifactDocument(body, format, snapshot?, { title?, template?, stateGlobalAliases? })`, `wrapArtifactHtml`, `artifactGuestScript`, `GUEST_BOOTSTRAP_SCRIPT`, `ARTIFACT_CSP`, `formatFromLanguage`, `ARTIFACT_FORMAT_FILES` and `artifactFileName`.
- Bridge messages with neutral names: `artifact:ready`, `artifact:port`, `artifact:state`, `artifact:state-result`. The guest exposes `window.artifactState`, plus `window[alias].state` for each alias the host passes (`assertStateGlobalAliases` refuses non-identifiers and globals such as `document`). The built-in pages use `window.artifactState`.
- Tests: `tests/artifacts` (protocol and alias injection, the guest run in a VM realm, state limit edges, debounce, templates, document formats, schema v1 round trips under zod 4 and 3.25, and a check that no app name appears in the source or shipped docs). `tests-node` imports the new exports from the built package with no peer installed, type-checks them for zod 4 and 3.25 consumers, and bundles them for Convex V8.

### Changed (from the app code this came from)

- The snapshot global is `__ARTIFACT_SNAPSHOT__`. The guest limit checks use the exported constants.
- `applyArtifactStatePatch` returns the current data unchanged when any set or remove fails. Before, a failing set returned the partly applied data.
- The quiz and flashcards builders are `buildQuizHtml` and `buildFlashcardsHtml`; their card and question types are `Flashcard` and `QuizQuestion`.

## 0.5.0

Additive: a QuickJS code sandbox joins the root. Nothing in 0.4.1 changes.

### Added

- `runSandboxedScript(code, tools, limits?, options?)`: runs untrusted JavaScript (the body of an async function) in a fresh QuickJS runtime. The script calls host tools with `await tools.<name>(args)`, logs with `console`, and returns a JSON value. Never throws; resolves to `{ ok, result | error, logs, calls, ms }`. See `docs/sandbox.md`.
- `DEFAULT_EXECUTE_LIMITS`: 60 s wall clock, 64 MB heap, 1 MB stack, 50 tool calls of which at most 10 mutating, logs capped at 200 lines of 2,000 characters. Every field can be overridden per run.
- `options.globals`: JSON-serialisable values set as VM globals, for example `{ args }`. Names that would replace an existing global are refused.
- `options.onCall`: called before each tool call with `{ name, args, mutating }`. Returns `{ allow: true }`, `{ allow: false, error }` (the script's call rejects; the tool does not run) or `{ stub }` (the call resolves to the stub; the tool does not run and the call is recorded with `skipped: true`). Refused and stubbed calls count against the call caps.
- `serializeExecuteOutcome(outcome, maxChars?)` and `DEFAULT_RESULT_CHAR_CAP` (100,000): pretty JSON of an outcome for a tool reply; a larger successful result becomes `{ truncated, note, resultPreview }`.
- Types: `SandboxTool`, `ExecuteLimits`, `ExecuteOutcome`, `SandboxOptions`, `SandboxCall`, `SandboxCallDecision`, `SandboxCallRecord`.
- New optional peers: `quickjs-emscripten-core` and `@jitl/quickjs-singlefile-cjs-release-sync` `^0.32.0`. They load on the first `runSandboxedScript` call, never when the root is imported. Without them the call returns `ok: false` with `Sandbox unavailable: …`.
- `package.json` `browser` field: maps both QuickJS packages to empty modules, so browser-platform bundles of the root (Convex V8) never include QuickJS or its Node built-ins, even when it is installed.
- Tests: `tests/sandbox` runs against real QuickJS (limits, deadline, out of memory, stack overflow, stalled promise, error mapping, disposal after a timeout, log caps, result preview, globals, `onCall` refusal and stubs, call caps). `tests-node/bundle.mjs` bundles the root for Convex V8 with QuickJS installed and checks no output contains it, and runs a Node bundle of the sandbox with no `node_modules`. `tests-node/esm-exports.mjs` covers the new exports and types, and the sandbox with and without QuickJS installed.

## 0.4.1

Docs and comments only; no runtime change.

- Shipped docs describe the Convex optimistic-update helpers and the MCP OAuth client helpers by what they do, and name no consuming app.
- `docs/mcp-client.md` is now `docs/mcp-oauth-client.md`. Internal folders `src/mcp-client` and `tests/mcp-client` are now `mcp-oauth-client`. Export names do not change.

## 0.4.0

Additive: the Convex optimistic-update helpers and the MCP OAuth client helpers join the root. Nothing in 0.3.0 changes. (Historical: these came from the former `@vvedantb/convex-client` and `@vvedantb/mcp-client` 0.1.0 packages, under the same export names.)

### Added

- Convex optimistic-update helpers (no React): `mapLoadedQuery` (also `forEachLoadedQuery` and `updateAllCachedQueries`), `patchLoadedQuery`, `OptimisticStore`, `tempId(table?, { format? })`, `TempIdFormat`, `TempIdOptions` and `createMemoryOptimisticStore()`. See `docs/convex.md`. The package still never imports `convex` at runtime: the memory store carries a copy of `getFunctionName`, tested against Convex's.
- MCP OAuth client helpers: `createMcpOAuthStateSchema`, `hasMcpOAuthTokens`, `isAccessTokenExpiring`, `createMcpOAuthProvider`, `authorizeMcpServer`, `refreshMcpOAuth`, `revokeMcpOAuth`, `startLoopback`, `LOOPBACK_PATH`, `LOOPBACK_TIMEOUT_MS` and their types. See `docs/mcp-oauth-client.md`. Node only; nothing Node-only loads when the root is imported: `startLoopback` imports `node:http` when called, the SDK loads on first use, and `state()` uses WebCrypto instead of `node:crypto` (same format).
- New optional peers: `@modelcontextprotocol/sdk` `^1.29.0` (MCP client OAuth calls) and `convex` `^1.24.0` (types only). Neither is imported when the root loads.
- Tests: suites for both sets of helpers. `tests-node/bundle.mjs` bundles a Convex function that imports the root with Convex's own esbuild and options, with and without the SDK installed, and asserts no `node:` import or built-in `require` in any output; it also runs an Electron-style Node bundle with no `node_modules`. `tests-node/esm-exports.mjs` imports the root with no peer installed.

### Changed (from the earlier MCP OAuth client package)

- A non-interactive provider's `redirectToAuthorization` returns a promise that rejects with the SDK's `UnauthorizedError`, instead of throwing it synchronously: the class is only reachable once the SDK is loaded. The SDK awaits the call, so its sign-in, refresh and connect flows are unchanged.
- Without the SDK installed, `authorizeMcpServer` and `redirectToAuthorization` reject with "The MCP client OAuth helpers need the @modelcontextprotocol/sdk package", and `refreshMcpOAuth` and `revokeMcpOAuth` return `false`. Before, a missing SDK failed the package import.

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

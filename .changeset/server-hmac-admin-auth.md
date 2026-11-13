---
"@vvedantb/server": minor
---

Add three shared backend helpers.

HMAC and webhook signatures (`@vvedantb/server`, crypto area): `hmacSha256`, `hmacSha256Hex`, `githubStyleSignature` and `verifyGithubStyleSignature`. WebCrypto only, so they run in the Convex default runtime. Each takes a string or `Uint8Array` message (type `HmacMessage`), so a verifier can read raw request bytes or decoded text. `verifyGithubStyleSignature` compares a `sha256=<hex>` header in constant time, trims the header, and returns `false` for a `null` header.

Convex admin API client (`createConvexAdminClient`, `convexSiteToCloudUrl`, `parseConvexApiResponse`) for each app's MCP "run query" tool. The deployment URL and admin key are arguments; it reads no env vars, imports no convex or zod, and takes an injectable `fetch`. The client runs an ad-hoc query (`runTestFunction`), a system query (`runSystemQuery`), reads inferred shapes (`getShapes`) and lists tables merged with the declared schema (`listTables`).

Auth function builders (`createAuthFunctions`) on convex-helpers `customFunctions`: `authQuery`, `authMutation` and `authAction` whose handlers receive `ctx.userId` and reject an unauthenticated caller. The app injects the four convex-helpers functions and its generated builders, so convex-helpers is an optional peer for types only. An optional `beforeEach` gate (for a maintenance check) runs before the user is resolved; internal variants come from a second call with the internal builders and no gate.

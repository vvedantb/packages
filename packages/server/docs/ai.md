# AI Gateway helpers (`@vvedantb/server/ai`)

Small helpers for apps that call models through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) with the AI SDK: service tier provider options, the Gateway cost from provider metadata, and one mapping from SDK and Gateway errors to something a caller can act on.

They are on their own subpath, not the root:

```ts
import {
  classifyGatewayError,
  FLEX_GATEWAY_PROVIDER_OPTIONS,
  gatewayServiceTier,
  readGatewayCost,
  withFlexGatewayOptions,
} from "@vvedantb/server/ai";
```

The root (`@vvedantb/server`) does not re-export them, so a root import never loads the AI SDK.

## Runtime and peers

- Works in the Convex default runtime (no `"use node"`), Node and browsers. No Node built-ins. `tests-node/bundle.mjs` bundles a Convex action that uses it the way `convex deploy` does.
- `ai` (`>=5`) and `@ai-sdk/gateway` (`>=1`) are optional peers, but `classifyGatewayError` imports their error classes statically, so importing `@vvedantb/server/ai` needs both installed. Any app that calls the Gateway through the AI SDK already has them.
- The service tier and cost helpers import nothing from the SDK. Their types are structural and fit the SDK's `providerOptions` and `ProviderMetadata`.
- No model IDs, prompts or `generateText` wrappers. Those stay in each app.

## Service tier

```ts
const { text } = await generateText({
  model: TITLE_MODEL, // the app's own constant
  prompt,
  providerOptions: FLEX_GATEWAY_PROVIDER_OPTIONS,
});

// Per-call tier
providerOptions: gatewayServiceTier(background ? "flex" : "default");

// Flex plus other options
providerOptions: withFlexGatewayOptions({ alibaba: { enableThinking: false } });
```

| Export | What it does |
| --- | --- |
| `GatewayServiceTier` | `"flex" \| "default" \| "ultrafast"`. |
| `gatewayServiceTier(tier)` | `{}` for `"default"` (no `serviceTier` sent), else `{ gateway: { serviceTier: tier } }`. A new object each call. Alias: `gatewayTier`. |
| `FLEX_GATEWAY_PROVIDER_OPTIONS` | `{ gateway: { serviceTier: "flex" } }`, frozen. Alias: `FLEX_PROVIDER_OPTIONS`. |
| `withFlexGatewayOptions(extra?)` | A new object: flex, with the caller's options on top. Other providers' keys are added as they are. Caller `gateway` keys are merged over `{ serviceTier: "flex" }`, so `{ gateway: { order: [...] } }` keeps flex, and a caller `serviceTier` replaces it. Nothing is mutated. |
| `GatewayProviderOptions`, `GatewayJsonObject`, `GatewayJsonValue` | Structural copies of the SDK's provider options and JSON types. |

Notes:

- Flex is cheaper and may queue. Use it for background work, not for calls a user waits on.
- A tier the provider or model does not support is a no-op on the Gateway side.
- `"ultrafast"` is kept because one app defines it, but no app has confirmed it works. The `@ai-sdk/gateway` 4.x types list `serviceTier` as `"flex" | "priority"`. Check `providerMetadata.gateway.serviceTier` to see what the Gateway applied before you rely on it.
- The local `buildChatProviderOptions(extra)` it replaces was `{ ...FLEX, ...extra }`, where a caller `gateway` key dropped flex. `withFlexGatewayOptions` merges `gateway` instead. For the options passed to it today (a thinking-off option for another provider), the output is the same.

## Cost

```ts
const result = await generateText({ model, prompt, providerOptions: FLEX_GATEWAY_PROVIDER_OPTIONS });
const costUsd = readGatewayCost(result.providerMetadata);
```

`readGatewayCost(metadata)` returns `gateway.cost` (what was billed) or, if that is missing or unusable, `gateway.marketCost` (list price), so budget guards still see a value. Each may be a number or a numeric string. It returns `undefined` when neither is a finite number. A cost of `0` is returned as `0`, not skipped.

## Errors

```ts
try {
  return await generateText({ model, prompt, maxRetries: 2 });
} catch (error) {
  const failure = classifyGatewayError(error);
  // { kind, message, retryable, statusCode? }
  if (failure.kind === "quota") notifyBilling();
  throw new AppError(appCodeFor(failure.kind), failure.message);
}
```

`classifyGatewayError(error)` never throws. It unwraps `RetryError` to its last error, then checks in this order:

| `kind` | Matches | `retryable` |
| --- | --- | --- |
| `invalid_request` | `InvalidArgumentError`, `GatewayInvalidRequestError` | `false` |
| `auth` | `GatewayAuthenticationError`, and the error `ai` puts in its place (see below) | `false` |
| `model_not_found` | `NoSuchModelError`, `GatewayModelNotFoundError` | `false` |
| `quota` | A Gateway error with status 402, or a billing message (credits, funds, billing, payment required, spend limit, budget), or the word "quota" on a Gateway error that is not a rate limit | `false` |
| `rate_limit` | `GatewayRateLimitError` | `true` |
| `timeout` | The Gateway's `GatewayTimeoutError` (matched by name, as the package does not export it) | `true` |
| `gateway` | Any other Gateway error | the SDK's `isRetryable` |
| `malformed_response` | `InvalidResponseDataError` | `true` |
| `timeout` | An `Error` named `TimeoutError` or `AbortError` | `true` |
| `other` | Anything else | `false` |

- `statusCode` is set for every Gateway error. The SDK sets it to 500 when the response had none.
- `message` is the error's own message with ANSI colour codes and outer whitespace removed. The SDK keeps the Gateway's generation ID suffix (`"... [gen_…]"`). Request bodies and keys are not in it.
- Checks use the SDK's `isInstance`, which matches a marker symbol, so errors from another copy of `ai` or `@ai-sdk/gateway` in the bundle still match.
- `errorMessageOf(error)`: `error.message` for an `Error`, the string for a string, else `"Unknown error"`.

### Auth errors from `generateText`

`generateText`, `streamText` and the other `ai` calls replace a `GatewayAuthenticationError` before the caller sees it (`wrapGatewayError` in `ai` 5 to 7). Outside production it becomes a plain `Error` named `GatewayAuthenticationError`. With `NODE_ENV=production` it becomes an `AISDKError` named `GatewayError` whose message starts "Unauthenticated". Neither has the Gateway markers or a status code, so the local copy this came from classified both as `other`. `classifyGatewayError` matches them by name and returns `auth` with no `statusCode`.

### Quota and rate limits

The Gateway has no quota error type. An out-of-credits or spend-limit reply arrives as a rate-limit error or a generic Gateway error (an unknown error type becomes `GatewayInternalServerError` with the response status). So the classifier uses the status and the message:

- Status 402, or a billing word, means `quota` on any Gateway error.
- The bare word "quota" is ambiguous on a rate-limit error ("requests per minute quota"). There it stays `rate_limit`, as before. On any other Gateway error (for example a 403) it means `quota`.
- Errors that are not Gateway errors are never `quota`.

Callers that had only `rate_limit` should handle `quota` too. Treat it as not retryable until someone tops up or the period resets.

### Changes from the local `gatewayErrors.ts`

- New kind `quota`, checked before `rate_limit`.
- `auth` also matches the error `ai` puts in place of `GatewayAuthenticationError`.
- The Gateway's own timeout is `timeout`, not `gateway`.
- `statusCode` is set for every Gateway error, not only the `gateway` kind.
- `message` has ANSI colour codes and outer whitespace removed.
- No `"use node"`.

## Adopting it in the apps

Each app can delete its local copy once it imports from `@vvedantb/server/ai` (0.11.0 or later). Keep model IDs, prompts and app wrappers local. Paths are as found in each app.

| Local file | Replace with | Keep local |
| --- | --- | --- |
| `src/core/gateway.ts`: `GatewayTier`, `gatewayTier`, `FLEX_PROVIDER_OPTIONS` | `GatewayServiceTier`, `gatewayTier`, `FLEX_PROVIDER_OPTIONS` (same names) | Model IDs, the provider routing and Anthropic option helpers, the gateway factory and its type |
| `packages/backend/engine/llm/aiGateway.ts`: `FLEX_GATEWAY_PROVIDER_OPTIONS`, `buildChatProviderOptions`, `readGatewayCost`, `parseCost` | `FLEX_GATEWAY_PROVIDER_OPTIONS`, `withFlexGatewayOptions`, `readGatewayCost` | Model IDs, the thinking-off option, the text and embedding wrappers, result types |
| `systemOneClient.ts` (same app): `classifyError` | Call `classifyGatewayError`, then map `kind` to the app's own errors | The app's error types, key redaction, detail trimming |
| `packages/backend/convex/_ai/gatewayErrors.ts` (whole file) | `classifyGatewayError`, `errorMessageOf`, `GatewayErrorKind`, `GatewayFailure` | Each caller's own codes and copy; add a case for `quota` |
| `packages/backend/convex/textGen.ts` (same app): inline `{ gateway: { serviceTier: "flex" } }` | `FLEX_GATEWAY_PROVIDER_OPTIONS` | Prompts and the model constant |
| Other apps' local Gateway tier, cost and error helpers (not reviewed: those repos were not readable when this was written) | The same exports | App wrappers and model IDs |

Since the shared module has no `"use node"`, callers of the old `gatewayErrors.ts` can import it from the default runtime too.

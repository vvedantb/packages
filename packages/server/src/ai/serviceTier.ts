/**
 * AI Gateway service tier provider options. Pure data: no AI SDK import, so
 * these run anywhere (Convex default runtime, Node, browsers).
 */

/** A JSON value the AI SDK accepts in `providerOptions` (mirrors `JSONValue` from `@ai-sdk/provider`). */
export type GatewayJsonValue =
  | null
  | string
  | number
  | boolean
  | Readonly<GatewayJsonObject>
  | readonly GatewayJsonValue[];

/** A JSON object the AI SDK accepts in `providerOptions` (mirrors `JSONObject` from `@ai-sdk/provider`). */
export type GatewayJsonObject = { [key: string]: GatewayJsonValue | undefined };

/** Per-provider options for an AI SDK call (`providerOptions`). Assignable to the SDK's `ProviderOptions`. */
export type GatewayProviderOptions = Record<string, GatewayJsonObject>;

/**
 * AI Gateway service tier, chosen per call.
 *
 * - `"flex"`: cheaper, may queue and be slower. For background work.
 * - `"default"`: the Gateway's standard tier. No `serviceTier` is sent.
 * - `"ultrafast"`: sent as is. Not confirmed for every model; the Gateway may reject it. Read
 *   `providerMetadata.gateway.serviceTier` to see what the Gateway applied.
 *
 * A tier the provider or model does not support is a no-op on the Gateway side.
 */
export type GatewayServiceTier = "flex" | "default" | "ultrafast";

/** The provider options `gatewayServiceTier` returns: empty for `"default"`. */
export type GatewayServiceTierOptions = {
  gateway?: { serviceTier: Exclude<GatewayServiceTier, "default"> };
};

/**
 * Provider options for a service tier: `{}` for `"default"`, else `{ gateway: { serviceTier: tier } }`.
 * Returns a new object on every call.
 */
export function gatewayServiceTier(tier: GatewayServiceTier): GatewayServiceTierOptions {
  return tier === "default" ? {} : { gateway: { serviceTier: tier } };
}

/** Alias of `gatewayServiceTier`. */
export const gatewayTier = gatewayServiceTier;

/** `{ gateway: { serviceTier: "flex" } }`, frozen. Spread it into `providerOptions`; do not mutate it. */
export const FLEX_GATEWAY_PROVIDER_OPTIONS: {
  readonly gateway: { readonly serviceTier: "flex" };
} = Object.freeze({ gateway: Object.freeze({ serviceTier: "flex" as const }) });

/** Alias of `FLEX_GATEWAY_PROVIDER_OPTIONS`. */
export const FLEX_PROVIDER_OPTIONS = FLEX_GATEWAY_PROVIDER_OPTIONS;

/**
 * Flex tier plus the caller's provider options, as a new object. Caller options win: other providers' keys
 * (for example `{ alibaba: { enableThinking: false } }`) are added as is, and caller `gateway` keys are merged
 * over `{ serviceTier: "flex" }`, so `{ gateway: { order: ["anthropic"] } }` keeps flex and a caller
 * `serviceTier` replaces it. Neither argument is mutated.
 */
export function withFlexGatewayOptions(extra?: GatewayProviderOptions): GatewayProviderOptions {
  return {
    ...extra,
    gateway: { ...FLEX_GATEWAY_PROVIDER_OPTIONS.gateway, ...extra?.gateway },
  };
}

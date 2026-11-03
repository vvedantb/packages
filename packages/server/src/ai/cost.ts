/**
 * The part of AI SDK `providerMetadata` that `readGatewayCost` reads. The SDK's `ProviderMetadata` is
 * assignable to it; no AI SDK import is needed at runtime.
 */
export type GatewayCostMetadata = {
  readonly gateway?: { readonly cost?: unknown; readonly marketCost?: unknown; readonly [key: string]: unknown };
};

/**
 * AI Gateway cost in USD from a result's `providerMetadata`: `gateway.cost` (what was billed), else
 * `gateway.marketCost` (list price), so budget guards still see a value. Each may be a number or a numeric
 * string. Returns `undefined` when neither is a finite number.
 */
export function readGatewayCost(metadata: GatewayCostMetadata | null | undefined): number | undefined {
  const gateway: unknown = metadata?.gateway;
  if (typeof gateway !== "object" || gateway === null) return undefined;
  const { cost, marketCost } = gateway as { cost?: unknown; marketCost?: unknown };
  return parseCost(cost) ?? parseCost(marketCost);
}

function parseCost(cost: unknown): number | undefined {
  if (typeof cost === "number") return Number.isFinite(cost) ? cost : undefined;
  if (typeof cost !== "string" || cost.trim().length === 0) return undefined;
  const parsed = Number(cost);
  return Number.isFinite(parsed) ? parsed : undefined;
}

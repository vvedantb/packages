import type { ProviderMetadata } from "ai";
import { describe, expect, it } from "vitest";
import { readGatewayCost } from "../../src/ai/index.js";

describe("readGatewayCost", () => {
  it("reads gateway.cost as a number or a string", () => {
    expect(readGatewayCost({ gateway: { cost: 0.0003 } })).toBe(0.0003);
    expect(readGatewayCost({ gateway: { cost: "0.00021", marketCost: "0.0009", generationId: "g" } })).toBe(0.00021);
  });

  it("prefers cost over marketCost, including a zero cost", () => {
    expect(readGatewayCost({ gateway: { cost: 0, marketCost: 0.5 } })).toBe(0);
    expect(readGatewayCost({ gateway: { cost: "0", marketCost: "0.5" } })).toBe(0);
  });

  it("falls back to marketCost when cost is missing or unusable", () => {
    expect(readGatewayCost({ gateway: { marketCost: "0.0004" } })).toBe(0.0004);
    expect(readGatewayCost({ gateway: { cost: "n/a", marketCost: 0.0004 } })).toBe(0.0004);
    expect(readGatewayCost({ gateway: { cost: null, marketCost: "1e-4" } })).toBe(0.0001);
  });

  it("returns undefined without a usable cost", () => {
    expect(readGatewayCost(undefined)).toBeUndefined();
    expect(readGatewayCost(null)).toBeUndefined();
    expect(readGatewayCost({})).toBeUndefined();
    expect(readGatewayCost({ gateway: { cost: "", marketCost: "n/a" } })).toBeUndefined();
    expect(readGatewayCost({ gateway: { cost: "  ", marketCost: true } })).toBeUndefined();
    expect(readGatewayCost({ gateway: { cost: Number.NaN, marketCost: Number.POSITIVE_INFINITY } })).toBeUndefined();
    expect(readGatewayCost({ gateway: { cost: "Infinity" } })).toBeUndefined();
  });

  it("ignores a gateway entry that is not an object", () => {
    expect(readGatewayCost({ gateway: "0.1" } as never)).toBeUndefined();
    expect(readGatewayCost({ gateway: null } as never)).toBeUndefined();
  });

  it("accepts the AI SDK's ProviderMetadata type", () => {
    const metadata: ProviderMetadata = { gateway: { cost: "0.002" }, anthropic: { cacheCreationInputTokens: 0 } };
    expect(readGatewayCost(metadata)).toBe(0.002);
  });
});

import type { generateText } from "ai";
import { describe, expect, it } from "vitest";
import {
  FLEX_GATEWAY_PROVIDER_OPTIONS,
  FLEX_PROVIDER_OPTIONS,
  gatewayServiceTier,
  gatewayTier,
  withFlexGatewayOptions,
  type GatewayProviderOptions,
} from "../../src/ai/index.js";

describe("gatewayServiceTier", () => {
  it("sends no serviceTier for the default tier", () => {
    expect(gatewayServiceTier("default")).toEqual({});
  });

  it("sends flex and ultrafast as is", () => {
    expect(gatewayServiceTier("flex")).toEqual({ gateway: { serviceTier: "flex" } });
    expect(gatewayServiceTier("ultrafast")).toEqual({ gateway: { serviceTier: "ultrafast" } });
  });

  it("returns a new object on every call", () => {
    expect(gatewayServiceTier("flex")).not.toBe(gatewayServiceTier("flex"));
  });

  it("is also exported as gatewayTier", () => {
    expect(gatewayTier).toBe(gatewayServiceTier);
  });
});

describe("FLEX_GATEWAY_PROVIDER_OPTIONS", () => {
  it("is the flex tier, frozen, also exported as FLEX_PROVIDER_OPTIONS", () => {
    expect(FLEX_GATEWAY_PROVIDER_OPTIONS).toEqual({ gateway: { serviceTier: "flex" } });
    expect(FLEX_GATEWAY_PROVIDER_OPTIONS).toEqual(gatewayServiceTier("flex"));
    expect(Object.isFrozen(FLEX_GATEWAY_PROVIDER_OPTIONS)).toBe(true);
    expect(Object.isFrozen(FLEX_GATEWAY_PROVIDER_OPTIONS.gateway)).toBe(true);
    expect(FLEX_PROVIDER_OPTIONS).toBe(FLEX_GATEWAY_PROVIDER_OPTIONS);
  });
});

describe("withFlexGatewayOptions", () => {
  const thinkingOff: GatewayProviderOptions = { alibaba: { enableThinking: false } };

  it("is flex alone without caller options", () => {
    expect(withFlexGatewayOptions()).toEqual({ gateway: { serviceTier: "flex" } });
    expect(withFlexGatewayOptions(undefined)).toEqual({ gateway: { serviceTier: "flex" } });
    expect(withFlexGatewayOptions({})).toEqual({ gateway: { serviceTier: "flex" } });
  });

  it("adds other providers' options on top", () => {
    expect(withFlexGatewayOptions(thinkingOff)).toEqual({
      gateway: { serviceTier: "flex" },
      alibaba: { enableThinking: false },
    });
  });

  it("merges caller gateway keys over flex instead of dropping it", () => {
    expect(withFlexGatewayOptions({ gateway: { order: ["anthropic"] } })).toEqual({
      gateway: { serviceTier: "flex", order: ["anthropic"] },
    });
  });

  it("lets a caller serviceTier win", () => {
    expect(withFlexGatewayOptions({ gateway: { serviceTier: "priority" } })).toEqual({
      gateway: { serviceTier: "priority" },
    });
  });

  it("mutates neither the caller options nor the constant", () => {
    const extra: GatewayProviderOptions = { gateway: { order: ["a"] }, alibaba: { enableThinking: false } };
    const before = structuredClone(extra);
    const merged = withFlexGatewayOptions(extra);
    expect(extra).toEqual(before);
    expect(merged.gateway).not.toBe(extra.gateway);
    expect(FLEX_GATEWAY_PROVIDER_OPTIONS).toEqual({ gateway: { serviceTier: "flex" } });
  });
});

// `ai` does not export ProviderOptions by name; take it from generateText.
type ProviderOptions = NonNullable<Parameters<typeof generateText>[0]["providerOptions"]>;

describe("types", () => {
  it("fit the AI SDK's providerOptions", () => {
    const options: ProviderOptions[] = [
      gatewayServiceTier("flex"),
      gatewayTier("default"),
      FLEX_GATEWAY_PROVIDER_OPTIONS,
      FLEX_PROVIDER_OPTIONS,
      withFlexGatewayOptions({ alibaba: { enableThinking: false } }),
    ];
    expect(options).toHaveLength(5);
  });
});

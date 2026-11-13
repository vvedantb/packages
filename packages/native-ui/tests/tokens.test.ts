import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { palette, withAlpha } from "../src/palette";
import { tokens } from "../src/tokens";
import { fontClass, WORDMARK } from "../src/typography";

describe("tokens", () => {

  it("radius.lg and radius.field match --radius and --field-radius (1rem = 16)", () => {
    expect(tokens.radius.lg).toBe(16);
    expect(tokens.radius.field).toBe(Math.min(16, 0.625 * 16));
  });
});

describe("palette", () => {
  it("tabBarPill is --default in light and --segment in dark", () => {
    expect(palette.tabBarPill).toEqual({ light: palette.default.light, dark: palette.segment.dark });
  });

  it("withAlpha turns #rrggbb into rgba()", () => {
    expect(withAlpha("#ff373c", 0.12)).toBe("rgba(255, 55, 60, 0.12)");
    expect(withAlpha("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
  });
});

describe("Instrument Sans wordmark", () => {
  it("matches the web AppWordmark and .landing-wordmark-text", () => {
    expect(WORDMARK.fontWeight).toBe(500);
    expect(WORDMARK.letterSpacingEm).toBe(-0.02);
    expect(WORDMARK.fontClass).toBe(fontClass.medium);
  });
});

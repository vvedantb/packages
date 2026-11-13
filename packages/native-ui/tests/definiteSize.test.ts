import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  StyleSheet: {
    flatten: (style: unknown): Record<string, unknown> | undefined => {
      if (style == null || style === false) return undefined;
      if (Array.isArray(style)) {
        return style.reduce<Record<string, unknown>>(
          (acc, item) => ({ ...acc, ...(StyleSheetFlatten(item) ?? {}) }),
          {},
        );
      }
      return style as Record<string, unknown>;
    },
  },
}));

function StyleSheetFlatten(style: unknown): Record<string, unknown> | undefined {
  if (style == null || style === false) return undefined;
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, item) => ({ ...acc, ...(StyleSheetFlatten(item) ?? {}) }),
      {},
    );
  }
  return style as Record<string, unknown>;
}

const { hasDefiniteHeight } = await import("../src/definiteSize");

describe("hasDefiniteHeight", () => {
  it("is false for no style and for size limits only", () => {
    expect(hasDefiniteHeight(undefined)).toBe(false);
    expect(hasDefiniteHeight({ maxHeight: 300 })).toBe(false);
    expect(hasDefiniteHeight({ maxHeight: 300, maxWidth: 240, minHeight: 40 })).toBe(false);
    expect(hasDefiniteHeight([{ maxHeight: 300 }, null, false])).toBe(false);
  });

  it("is true for height, flex or flexGrow, also inside arrays", () => {
    expect(hasDefiniteHeight({ height: 200 })).toBe(true);
    expect(hasDefiniteHeight({ flex: 1 })).toBe(true);
    expect(hasDefiniteHeight({ flexGrow: 1 })).toBe(true);
    expect(hasDefiniteHeight([{ maxHeight: 300 }, { height: 120 }])).toBe(true);
  });
});

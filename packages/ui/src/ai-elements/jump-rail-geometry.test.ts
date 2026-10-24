import { describe, expect, it } from "vitest";
import {
  JUMP_RAIL_ITEM_SPACING_PX,
  resolveJumpRailHeightStyle,
  resolveJumpRailIndexFromPointer,
  resolveJumpRailTickLevelStyle,
  resolveJumpRailTickWidthClass,
  resolveJumpRailTooltipTranslate,
  resolveJumpRailTopPercent,
} from "./jump-rail-geometry";

describe("resolveJumpRailHeightStyle", () => {
  it("uses one spacing step per gap, capped by the max height", () => {
    expect(resolveJumpRailHeightStyle(5)).toBe(
      `min(${4 * JUMP_RAIL_ITEM_SPACING_PX}px, calc(100dvh - 18rem))`,
    );
  });
  it("never goes below 1px", () => {
    expect(resolveJumpRailHeightStyle(1)).toContain("min(1px");
    expect(resolveJumpRailHeightStyle(0)).toContain("min(1px");
  });
  it("accepts a custom max height", () => {
    expect(resolveJumpRailHeightStyle(3, "200px")).toBe("min(16px, 200px)");
  });
});

describe("resolveJumpRailTopPercent", () => {
  it("spreads items from 0 to 100", () => {
    expect(resolveJumpRailTopPercent(0, 5)).toBe(0);
    expect(resolveJumpRailTopPercent(2, 5)).toBe(50);
    expect(resolveJumpRailTopPercent(4, 5)).toBe(100);
  });
  it("clamps and handles a single item", () => {
    expect(resolveJumpRailTopPercent(-3, 5)).toBe(0);
    expect(resolveJumpRailTopPercent(9, 5)).toBe(100);
    expect(resolveJumpRailTopPercent(0, 1)).toBe(0);
  });
});

describe("resolveJumpRailIndexFromPointer", () => {
  const rail = { railTop: 100, railHeight: 40 };
  it("rounds the pointer position to the nearest item", () => {
    expect(resolveJumpRailIndexFromPointer({ ...rail, itemCount: 5, pointerY: 100 })).toBe(0);
    expect(resolveJumpRailIndexFromPointer({ ...rail, itemCount: 5, pointerY: 120 })).toBe(2);
    expect(resolveJumpRailIndexFromPointer({ ...rail, itemCount: 5, pointerY: 140 })).toBe(4);
  });
  it("clamps a pointer outside the rail", () => {
    expect(resolveJumpRailIndexFromPointer({ ...rail, itemCount: 5, pointerY: 0 })).toBe(0);
    expect(resolveJumpRailIndexFromPointer({ ...rail, itemCount: 5, pointerY: 900 })).toBe(4);
  });
  it("returns null without items or height, 0 for one item", () => {
    expect(resolveJumpRailIndexFromPointer({ ...rail, itemCount: 0, pointerY: 110 })).toBeNull();
    expect(
      resolveJumpRailIndexFromPointer({ itemCount: 3, railTop: 0, railHeight: 0, pointerY: 5 }),
    ).toBeNull();
    expect(resolveJumpRailIndexFromPointer({ ...rail, itemCount: 1, pointerY: 130 })).toBe(0);
  });
});

describe("resolveJumpRailTooltipTranslate", () => {
  it("pins the card to the rail ends", () => {
    expect(resolveJumpRailTooltipTranslate(0, 4)).toBe("0%");
    expect(resolveJumpRailTooltipTranslate(3, 4)).toBe("-100%");
    expect(resolveJumpRailTooltipTranslate(1, 4)).toBe("-50%");
  });
});

describe("tick width", () => {
  it("narrows with distance from the hovered tick", () => {
    expect([0, 1, 2, 3, null].map(resolveJumpRailTickWidthClass)).toEqual([
      "w-6", "w-4", "w-2.5", "w-2", "w-2",
    ]);
  });
  it("leaves level 1 and unset levels to the width class", () => {
    expect(resolveJumpRailTickLevelStyle(0, undefined)).toBeUndefined();
    expect(resolveJumpRailTickLevelStyle(0, 1)).toBeUndefined();
  });
  it("indents and shortens deeper levels", () => {
    expect(resolveJumpRailTickLevelStyle(null, 3)).toEqual({ left: 4, width: 4 });
    expect(resolveJumpRailTickLevelStyle(0, 2)).toEqual({ left: 2, width: 22 });
    expect(resolveJumpRailTickLevelStyle(0, 5)).toEqual({ left: 8, width: 16 });
  });
});

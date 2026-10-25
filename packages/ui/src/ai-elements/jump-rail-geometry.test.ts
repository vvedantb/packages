import { describe, expect, it } from "vitest";
import {
  JUMP_RAIL_ITEM_SPACING_PX,
  JUMP_RAIL_MIN_HEIGHT_PX,
  resolveJumpRailHeightStyle,
  resolveJumpRailIndexFromPointer,
  resolveJumpRailTickLevelStyle,
  resolveJumpRailTickWidthClass,
  resolveJumpRailTooltipTranslate,
  resolveJumpRailTopPercent,
} from "./jump-rail-geometry";

describe("resolveJumpRailHeightStyle", () => {
  it("floors short rails and uses one spacing step per gap once above the floor", () => {
    const floor = `min(${JUMP_RAIL_MIN_HEIGHT_PX}px, calc(100dvh - 18rem))`;
    expect(JUMP_RAIL_MIN_HEIGHT_PX).toBe(48);
    expect(resolveJumpRailHeightStyle(1)).toBe(floor);
    expect(resolveJumpRailHeightStyle(3)).toBe(floor);
    // 5 items: (5-1)*8 = 32 < 48 → still floored
    expect(resolveJumpRailHeightStyle(5)).toBe(floor);
    // 10 items: (10-1)*8 = 72 ≥ 48 → spacing-based (unchanged from pre-floor)
    expect(resolveJumpRailHeightStyle(10)).toBe(
      `min(${9 * JUMP_RAIL_ITEM_SPACING_PX}px, calc(100dvh - 18rem))`,
    );
    // 100 items: same spacing-based height as before the floor
    expect(resolveJumpRailHeightStyle(100)).toBe(
      `min(${99 * JUMP_RAIL_ITEM_SPACING_PX}px, calc(100dvh - 18rem))`,
    );
  });
  it("never goes below the minimum height", () => {
    const floor = `min(${JUMP_RAIL_MIN_HEIGHT_PX}px, calc(100dvh - 18rem))`;
    expect(resolveJumpRailHeightStyle(0)).toBe(floor);
    expect(resolveJumpRailHeightStyle(1)).toBe(floor);
    expect(resolveJumpRailHeightStyle(3)).toBe(floor);
  });
  it("keeps the spacing-based height once it reaches the minimum", () => {
    expect(resolveJumpRailHeightStyle(7)).toBe("min(48px, calc(100dvh - 18rem))");
    expect(resolveJumpRailHeightStyle(10)).toBe("min(72px, calc(100dvh - 18rem))");
    expect(resolveJumpRailHeightStyle(100)).toBe("min(792px, calc(100dvh - 18rem))");
  });
  it("accepts a custom max height", () => {
    expect(resolveJumpRailHeightStyle(3, "200px")).toBe("min(48px, 200px)");
    expect(resolveJumpRailHeightStyle(100, "200px")).toBe("min(792px, 200px)");
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

import { describe, expect, it } from "vitest";
import { isSheetDragDown, SHEET_OVERPULL, sheetDragDismisses, sheetDragOffset, sheetSnapVelocity } from "../src/sheetDrag";

// The drag-to-dismiss rules every bottom sheet (`SheetContent`, the compact
// `DialogContent`) uses through `SheetDragView`.

describe("sheet drag to dismiss", () => {
  it("takes over only for a downward, mostly vertical drag past the slop", () => {
    expect(isSheetDragDown(0, 10)).toBe(true);
    expect(isSheetDragDown(0, 3)).toBe(false);
    expect(isSheetDragDown(20, 10)).toBe(false);
    expect(isSheetDragDown(0, -10)).toBe(false);
  });

  it("follows the finger down and resists an upward pull up to the overpull", () => {
    expect(sheetDragOffset(80)).toBe(80);
    expect(sheetDragOffset(0)).toBe(0);
    expect(sheetDragOffset(-48)).toBeCloseTo(-SHEET_OVERPULL / 2);
    expect(sheetDragOffset(-10_000)).toBeGreaterThan(-SHEET_OVERPULL);
  });

  it("closes on a quick flick, however short", () => {
    expect(sheetDragDismisses({ dy: 20, vy: 1.2, height: 400 })).toBe(true);
  });

  it("springs back after a slow, short drag", () => {
    expect(sheetDragDismisses({ dy: 60, vy: 0.1, height: 400 })).toBe(false);
  });

  it("closes after a slow drag past half the sheet, and never on an upward release", () => {
    expect(sheetDragDismisses({ dy: 220, vy: 0, height: 400 })).toBe(true);
    expect(sheetDragDismisses({ dy: -5, vy: 2, height: 400 })).toBe(false);
  });

  it("carries the release speed into the decision", () => {
    expect(sheetDragDismisses({ dy: 120, vy: 0.5, height: 400 })).toBe(true);
    expect(sheetDragDismisses({ dy: 120, vy: 0, height: 400 })).toBe(false);
  });

  it("springs home at the release speed, except a fling up from above rest", () => {
    expect(sheetSnapVelocity(120, -800)).toBe(-800);
    expect(sheetSnapVelocity(120, 300)).toBe(300);
    expect(sheetSnapVelocity(-8, -2000)).toBe(0);
    expect(sheetSnapVelocity(-8, 500)).toBe(500);
  });
});

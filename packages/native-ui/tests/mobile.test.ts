import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MIN_TOUCH_TARGET, searchInputSize, switchSize, touchSlop } from "../src/controlStyles";

/** Points for a Tailwind size class: `h-10` and `min-h-10` are 40, `min-h-[72px]` is 72. */
function points(classes: string, axis: "h" | "w"): number {
  const scale = classes.match(new RegExp(`(?:^|\\s)(?:min-)?${axis}-(\\d+)(?=\\s|$)`));
  if (scale) return Number(scale[1]) * 4;
  const arbitrary = classes.match(new RegExp(`(?:^|\\s)(?:min-)?${axis}-\\[(\\d+)px\\]`));
  if (arbitrary) return Number(arbitrary[1]);
  throw new Error(`no ${axis} size in "${classes}"`);
}

describe("touchSlop", () => {
  it("brings any size to the 44 pt target with the least slop", () => {
    expect(MIN_TOUCH_TARGET).toBe(44);
    for (const size of [0, 16, 20, 24, 30, 31, 32, 36, 40, 43, 44, 48, 64]) {
      const { top, bottom, left, right } = touchSlop(size);
      expect(top).toBe(bottom);
      expect(left).toBe(right);
      expect(size + top + bottom, `${size}`).toBeGreaterThanOrEqual(44);
      if (top > 0) expect(size + 2 * (top - 1), `${size}`).toBeLessThan(44);
    }
    expect(touchSlop(48)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(touchSlop(36, 20)).toEqual({ top: 12, bottom: 12, left: 4, right: 4 });
  });
});

describe("accessibility roles and states", () => {

  it("Switch is a switch with checked and disabled state, and a 44 target", () => {
    for (const largerText of [false, true]) {
      const { width, height } = switchSize(largerText);
      const slop = touchSlop(width, height);
      expect(width + slop.left + slop.right).toBeGreaterThanOrEqual(44);
      expect(height + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
    }
    // The painted switch stays the web 36 × 20.
    expect(switchSize(false)).toMatchObject({ width: 36, height: 20 });
  });

  it("the Select trigger is a labelled combobox with disabled state and a 44 target", () => {
    const { top, bottom } = touchSlop(MIN_TOUCH_TARGET, 44);
    expect(top + bottom).toBe(0);
  });

  it("the dialog close button is a 44 labelled button; Dialog and Sheet closes are buttons", () => {
    expect(points("h-11", "h")).toBe(44);
  });

  it("the SearchInput clear button is a labelled button, painted at the web 24 with a 44 target", () => {
    for (const largerText of [false, true]) {
      for (const size of ["sm", "md"] as const) {
        const { clear } = searchInputSize(size, largerText);
        const slop = touchSlop(clear);
        expect(clear + slop.left + slop.right, `${size} ${largerText}`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        expect(clear + slop.top + slop.bottom, `${size} ${largerText}`).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      }
    }
    expect(searchInputSize("sm", false).clear).toBe(24);
  });
});

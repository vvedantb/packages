import { describe, expect, it } from "vitest";
import { MIN_TOUCH_TARGET, touchSlop } from "../src/controlStyles";

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

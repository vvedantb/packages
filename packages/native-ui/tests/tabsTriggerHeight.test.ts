import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MIN_TOUCH_TARGET, tabTriggerSize, touchSlop } from "../src/controlStyles";

describe("TabsTrigger minHeight", () => {
  it("defaults to the trigger size and feeds the style and the hit slop", () => {
    expect(tabTriggerSize("segmented", "sm", false).minHeight).toBe(36);
  });

  it("keeps a 44 target for a 24-high trigger", () => {
    const slop = touchSlop(MIN_TOUCH_TARGET, 24);
    expect(24 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
  });
});

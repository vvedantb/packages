import { describe, expect, it } from "vitest";
import { MIN_TOUCH_TARGET, tabTriggerSize, touchSlop } from "../src/controlStyles";

// `TabsTrigger minHeight`: an app sizes its triggers as its web call site does
// (Eva's `h-8` session tabs have 24-high triggers). The default stays the web
// `.t-tab` 30, and the hit slop follows the height, so a short trigger still
// reaches 44.

describe("TabsTrigger minHeight", () => {
  it("defaults to the web trigger size", () => {
    expect(tabTriggerSize("segmented", "sm", false).minHeight).toBe(30);
  });

  it("keeps a 44 target for a 24-high trigger", () => {
    const slop = touchSlop(MIN_TOUCH_TARGET, 24);
    expect(24 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
  });
});

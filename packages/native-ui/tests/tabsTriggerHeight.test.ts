import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MIN_TOUCH_TARGET, tabTriggerSize, touchSlop } from "../src/controlStyles";

// `TabsTrigger minHeight`: an app sizes its triggers as its web call site does
// (Eva's `h-8` session tabs have 24-high triggers). The default is the
// phone-tuned 36, and the hit slop follows the height, so a short trigger still
// reaches 44.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tabs = readFileSync(join(root, "src/Tabs.tsx"), "utf8");
const trigger = tabs.slice(tabs.indexOf("export function TabsTrigger("), tabs.indexOf("export type TabsContentProps"));

describe("TabsTrigger minHeight", () => {
  it("defaults to the trigger size and feeds the style and the hit slop", () => {
    expect(trigger).toMatch(/const height = minHeight \?\? trigger\.minHeight;/);
    expect(trigger).toMatch(/hitSlop=\{touchSlop\(MIN_TOUCH_TARGET, height\)\}/);
    expect(trigger).toMatch(/minHeight: height \}\}/);
    expect(tabTriggerSize("segmented", "sm", false).minHeight).toBe(36);
  });

  it("keeps a 44 target for a 24-high trigger", () => {
    const slop = touchSlop(MIN_TOUCH_TARGET, 24);
    expect(24 + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
  });
});

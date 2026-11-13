import { describe, expect, it } from "vitest";
import { FAMILY_APPS, familyApp } from "../src/brand/familyApps";
import {
  APP_MARK_VIEWBOX,
  APP_NAMES,
  markBBox,
} from "../src/brand/svg";
import { V_PRO_APP_BENEFITS } from "../src/brand/vProAppBenefits";

describe("brand data copies", () => {
  it("every family app has a mark, and every mark has a centred square viewBox", () => {
    // `eva` and `bee` are marks and icons only, not family apps.
    const familyNames = APP_NAMES.filter((app) => app !== "eva" && app !== "bee");
    expect(FAMILY_APPS.map((entry) => entry.app).sort()).toEqual([...familyNames].sort());
    for (const app of APP_NAMES) {
      const [x, y, w, h] = APP_MARK_VIEWBOX[app].split(" ").map(Number);
      expect(w, app).toBe(h);
      const [minX, minY, maxX, maxY] = markBBox(app);
      expect(x! + w! / 2, app).toBeCloseTo((minX + maxX) / 2, 0);
      expect(y! + h! / 2, app).toBeCloseTo((minY + maxY) / 2, 0);
    }
  });

  it("V Pro benefits name only product apps", () => {
    for (const group of V_PRO_APP_BENEFITS) {
      expect(familyApp(group.app).app).toBe(group.app);
      expect(group.items.length).toBeGreaterThan(0);
    }
  });
});

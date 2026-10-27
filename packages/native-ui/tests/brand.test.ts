import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FAMILY_APPS, familyApp } from "../src/brand/familyApps";
import {
  APP_MARK_VIEWBOX,
  APP_NAMES,
  markBBox,
} from "../src/brand/svg";
import { V_PRO_APP_BENEFITS } from "../src/brand/vProAppBenefits";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("brand data copies", () => {
  for (const file of ["svg.ts", "familyApps.ts", "vProAppBenefits.ts"]) {
    it(`src/brand/${file} is byte-identical to @vvedantb/ui src/brand/${file}`, () => {
      expect(readFileSync(join(root, "src/brand", file), "utf8")).toBe(
        readFileSync(join(root, "..", "ui/src/brand", file), "utf8"),
      );
    });
  }

  it("every family app has a mark and a centred square viewBox", () => {
    expect(FAMILY_APPS.map((entry) => entry.app).sort()).toEqual([...APP_NAMES].sort());
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

describe("brand components", () => {
  const read = (file: string) => readFileSync(join(root, "src/brand", file), "utf8");

  it("render with react-native-svg on the shared viewBoxes", () => {
    expect(read("AppIcons.tsx")).toMatch(/from "react-native-svg"/);
    expect(read("AppIcons.tsx")).toMatch(/APP_MARK_VIEWBOX_START\[app\] : APP_MARK_VIEWBOX\[app\]/);
    expect(read("AppMark.tsx")).toMatch(/viewBox=\{MARK_VIEWBOX\}/);
  });

  it("AppWordmark uses Instrument Sans 500 through WORDMARK", () => {
    const src = read("AppWordmark.tsx");
    expect(src).toMatch(/className=\{WORDMARK\.fontClass\}/);
    expect(src).toMatch(/letterSpacing: size \* WORDMARK\.letterSpacingEm/);
    expect(src).toMatch(/Math\.round\(size \* WORDMARK\.iconScale\)/);
  });
});

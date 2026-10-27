import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { V_PRO_APP_BENEFITS } from "../src/brand/vProAppBenefits";
import { initials } from "../src/initials";
import {
  isEmphasised,
  planAppBenefits,
  planButton,
  sortAppBenefits,
  type PricingPlan,
} from "../src/marketing/pricing";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const plan = (extra: Partial<PricingPlan> = {}): PricingPlan => ({
  id: "pro",
  name: "Pro",
  price: { month: "£X", year: "£Y" },
  ...extra,
});

describe("initials", () => {
  it("takes the first letter of the first words", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("  cher  ")).toBe("C");
    expect(initials("grace brewster murray hopper", 3)).toBe("GBM");
    expect(initials("   ")).toBe("");
  });
});

describe("PricingModal helpers", () => {
  it("uses the web featured ?? highlighted rule", () => {
    expect(isEmphasised(plan({ featured: true }))).toBe(true);
    expect(isEmphasised(plan({ highlighted: true }))).toBe(true);
    expect(isEmphasised(plan({ featured: false, highlighted: true }))).toBe(false);
    expect(isEmphasised(plan())).toBe(false);
  });

  it("defaults the emphasised plan to V Pro benefits", () => {
    expect(planAppBenefits(plan({ featured: true }))).toBe(V_PRO_APP_BENEFITS);
    expect(planAppBenefits(plan())).toBeUndefined();
    const own = [{ app: "vhub" as const, items: ["One"] }];
    expect(planAppBenefits(plan({ featured: true, appBenefits: own }))).toBe(own);
  });

  it("moves the current app's group first and keeps the rest in order", () => {
    const sorted = sortAppBenefits(V_PRO_APP_BENEFITS, "velth").map((group) => group.app);
    expect(sorted).toEqual(["velth", "vibot", "vmem", "vhub", "verve"]);
    expect(sortAppBenefits(V_PRO_APP_BENEFITS).map((group) => group.app)).toEqual(
      V_PRO_APP_BENEFITS.map((group) => group.app),
    );
  });

  it("labels the button as the web does", () => {
    expect(planButton(plan({ current: true }))).toEqual({
      label: "Current plan",
      variant: "outline",
      disabled: true,
    });
    expect(planButton(plan({ featured: true }))).toEqual({
      label: "Get started",
      variant: "default",
      disabled: false,
    });
    expect(planButton(plan({ ctaLabel: "Upgrade" })).label).toBe("Upgrade");
  });

  it("keeps the web copy", () => {
    const web = readFileSync(join(root, "..", "ui/src/marketing/PricingModal.tsx"), "utf8");
    const native = readFileSync(join(root, "src/marketing/PricingModal.tsx"), "utf8");
    for (const copy of ['"Current plan"', '"Get started"', '"/month"', '"Monthly"', '"Annual"']) {
      expect(web, copy).toContain(copy);
      expect(
        native + readFileSync(join(root, "src/marketing/pricing.ts"), "utf8"),
        copy,
      ).toContain(copy);
    }
  });
});

describe("UpgradeToProCard", () => {
  it("keeps the SidebarUpgradeCard copy", () => {
    const web = readFileSync(join(root, "..", "ui/shell/src/SidebarUpgradeCard.tsx"), "utf8");
    const native = readFileSync(join(root, "src/marketing/UpgradeToProCard.tsx"), "utf8");
    for (const copy of ["Upgrade to Pro", "Upgrade", "Pro"]) {
      expect(web).toContain(copy);
      expect(native).toContain(`"${copy}"`);
    }
  });
});

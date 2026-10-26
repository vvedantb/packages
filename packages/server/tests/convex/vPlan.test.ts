import { describe, expect, it } from "vitest";
import {
  hasVPlan,
  V_PRO_PLAN_KEY,
  V_PRO_PLAN_KEYS,
} from "@vvedantb/server";

describe("hasVPlan", () => {
  it("exports the plan keys", () => {
    expect(V_PRO_PLAN_KEY).toBe("v_pro");
    expect([...V_PRO_PLAN_KEYS]).toEqual(["v_pro"]);
  });

  it.each(["u:v_pro", "o:v_pro", "v_pro"])(
    "accepts pla %s",
    (pla) => {
      expect(hasVPlan({ pla })).toBe(true);
    },
  );

  it.each(["u:vibot_pro", "o:vibot_pro", "vibot_pro"])("no longer accepts retired plan %s", (pla) => {
    expect(hasVPlan({ pla })).toBe(false);
  });

  it("accepts a getUserIdentity-shaped object", () => {
    const identity = {
      tokenIdentifier: "https://clerk.example|user_1",
      subject: "user_1",
      issuer: "https://clerk.example",
      pla: "u:v_pro",
    };
    expect(hasVPlan(identity)).toBe(true);
    expect(hasVPlan({ ...identity, pla: "u:free" })).toBe(false);
    const { pla: _pla, ...noPlan } = identity;
    expect(hasVPlan(noPlan)).toBe(false);
  });

  it("ignores unrelated plans", () => {
    for (const pla of ["u:free_user", "o:team", "free_user", "u:v_pro_plus", "u:xv_pro"]) {
      expect(hasVPlan({ pla })).toBe(false);
    }
  });

  it("returns false for missing or malformed input", () => {
    expect(hasVPlan(null)).toBe(false);
    expect(hasVPlan(undefined)).toBe(false);
    expect(hasVPlan({})).toBe(false);
    expect(hasVPlan("u:v_pro")).toBe(false);
    expect(hasVPlan(42)).toBe(false);
    for (const pla of [42, {}, ["u:v_pro"], null, true, "", ":", "u:", "x:v_pro", "u:o:v_pro", "u:v_pro:u"]) {
      expect(hasVPlan({ pla })).toBe(false);
    }
  });
});

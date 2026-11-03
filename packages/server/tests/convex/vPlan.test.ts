import { describe, expect, it } from "vitest";
import {
  hasVPlan,
  hasVPro,
  parseVProCompUserIds,
  V_PRO_PLAN_KEY,
  V_PRO_PLAN_KEYS,
  type HasVProInput,
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

describe("parseVProCompUserIds", () => {
  it("trims and drops empty ids", () => {
    expect(parseVProCompUserIds(" user_a, ,user_b ,")).toEqual(["user_a", "user_b"]);
    expect(parseVProCompUserIds("user_a")).toEqual(["user_a"]);
  });

  it("is empty for unset or blank", () => {
    expect(parseVProCompUserIds(undefined)).toEqual([]);
    expect(parseVProCompUserIds(null)).toEqual([]);
    expect(parseVProCompUserIds("")).toEqual([]);
    expect(parseVProCompUserIds(" , ")).toEqual([]);
  });
});

describe("hasVPro", () => {
  const identity = { tokenIdentifier: "https://clerk.example|user_a", subject: "user_a", issuer: "https://clerk.example" };
  const compIds = parseVProCompUserIds("user_comp, user_other");

  it("is false with nothing that grants", () => {
    expect(hasVPro(null)).toBe(false);
    expect(hasVPro(undefined)).toBe(false);
    expect(hasVPro({})).toBe(false);
    expect(hasVPro({ identity: null })).toBe(false);
    expect(hasVPro({ identity: null, planSlugs: null, compIds: null, clerkId: null })).toBe(false);
    expect(hasVPro({ identity, planSlugs: [], compIds: [] })).toBe(false);
    expect(hasVPro({ identity: { ...identity, pla: "u:free_user" }, planSlugs: ["free_user"], compIds })).toBe(false);
  });

  it("is true from the identity alone (hasVPlan)", () => {
    expect(hasVPro({ identity: { ...identity, pla: "u:v_pro" } })).toBe(true);
    expect(hasVPro({ identity: { pla: "o:v_pro" } })).toBe(true);
  });

  it("is true from stored plan slugs alone", () => {
    expect(hasVPro({ planSlugs: ["v_pro"] })).toBe(true);
    expect(hasVPro({ identity: null, planSlugs: ["extra", "v_pro"] })).toBe(true);
    expect(hasVPro({ planSlugs: ["extra", "v_pro_plus", "V_PRO"] })).toBe(false);
  });

  it("no longer counts vibot_pro, as a claim or a stored slug", () => {
    expect(hasVPro({ identity: { ...identity, pla: "u:vibot_pro" }, planSlugs: ["vibot_pro"] })).toBe(false);
  });

  it("is true for a listed comp id, from clerkId or else identity.subject", () => {
    expect(hasVPro({ clerkId: "user_comp", compIds })).toBe(true);
    expect(hasVPro({ identity: { ...identity, subject: "user_other" }, compIds })).toBe(true);
    expect(hasVPro({ identity, compIds })).toBe(false);
    expect(hasVPro({ clerkId: "user_a", compIds })).toBe(false);
    // clerkId wins over the identity when both are set; an empty one falls back.
    expect(hasVPro({ identity: { ...identity, subject: "user_comp" }, clerkId: "user_a", compIds })).toBe(false);
    expect(hasVPro({ identity: { ...identity, subject: "user_comp" }, clerkId: "", compIds })).toBe(true);
  });

  it("does not match an empty id against an empty comp entry", () => {
    expect(hasVPro({ clerkId: "", compIds: [""] })).toBe(false);
    expect(hasVPro({ identity: { subject: "" }, compIds: [""] })).toBe(false);
  });

  it("needs an explicit comp list: no env is read", () => {
    expect(hasVPro({ clerkId: "user_comp" })).toBe(false);
  });

  it("combines sources: any one grants", () => {
    const free = { ...identity, pla: "u:free_user" };
    expect(hasVPro({ identity: free, planSlugs: ["v_pro"] })).toBe(true);
    expect(hasVPro({ identity: { ...identity, pla: "u:v_pro" }, planSlugs: [] })).toBe(true);
    expect(hasVPro({ identity: { ...free, subject: "user_comp" }, planSlugs: ["free_user"], compIds })).toBe(true);
  });

  it("never throws on malformed input", () => {
    const bad = [
      { identity: "u:v_pro" },
      { identity: 42, planSlugs: "v_pro" },
      { planSlugs: { 0: "v_pro", length: 1 } },
      { compIds: "user_comp", clerkId: "user_comp" },
      { identity: { subject: 42, pla: null } },
    ] as unknown as HasVProInput[];
    for (const input of bad) expect(hasVPro(input), JSON.stringify(input)).toBe(false);
    expect(hasVPro("x" as unknown as HasVProInput)).toBe(false);
  });
});

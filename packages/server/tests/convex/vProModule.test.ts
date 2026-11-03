import { describe, expect, it, vi } from "vitest";
import {
  createVProModule,
  parseClerkBillingEvent,
  parseVProCompUserIds,
  verifyClerkWebhook,
  type ClerkBillingChange,
  type ClerkWebhookEventLike,
} from "@vvedantb/server";

// Two users tables that differ only in field names: most apps store
// `planSlugs` by `clerkId`; one stores `billingPlanSlugs` by `clerkUserId`.

type UserRow = { _id: string; _creationTime: number; clerkId: string; planSlugs?: string[]; email?: string };
type AccountRow = { _id: string; _creationTime: number; clerkUserId: string; billingPlanSlugs?: string[] };

type DataModel = {
  users: { document: UserRow; indexes: { by_clerk_id: ["clerkId", "_creationTime"] } };
  accounts: { document: AccountRow; indexes: { by_clerk_user: ["clerkUserId", "_creationTime"] } };
};

type FieldEq = { field: string; value: string };

/** A fake ctx.db: index lookups filter on `field === value`; `unique()` throws on two matches like Convex. */
function fakeDb<Doc extends { _id: string }>(table: string, rows: Doc[]) {
  const patches: Array<{ id: string; value: object }> = [];
  return {
    rows,
    patches,
    db: {
      query(name: string) {
        expect(name).toBe(table);
        return {
          withIndex(_index: string, range: (q: { eq(field: string, value: string): FieldEq }) => FieldEq) {
            const { field, value } = range({ eq: (f, v) => ({ field: f, value: v }) });
            const found = rows.filter((row) => (row as Record<string, unknown>)[field] === value);
            return {
              first: async () => found[0] ?? null,
              unique: async () => {
                if (found.length > 1) throw new Error("unique() query returned more than one result");
                return found[0] ?? null;
              },
            };
          },
        };
      },
      patch: async (id: string, value: Partial<Doc>) => {
        const row = rows.find((r) => r._id === id);
        if (!row) throw new Error(`no row ${id}`);
        Object.assign(row, value);
        patches.push({ id, value });
      },
    },
  };
}

const users = createVProModule<DataModel>()({
  table: "users",
  index: "by_clerk_id",
  clerkIdField: "clerkId",
  planSlugsField: "planSlugs",
});

const accounts = createVProModule<DataModel>()({
  table: "accounts",
  index: "by_clerk_user",
  clerkIdField: "clerkUserId",
  planSlugsField: "billingPlanSlugs",
  lookup: "unique",
});

const replace = (planSlugs: string[], clerkId = "user_a"): ClerkBillingChange => ({ kind: "replace", clerkId, planSlugs });
const itemChange = (status: string, slug = "v_pro", clerkId = "user_a"): ClerkBillingChange => ({ kind: "item", clerkId, status, slug });

describe("createVProModule field names", () => {
  it("reads the configured slugs field", () => {
    expect(users.planSlugsOf({ planSlugs: ["v_pro"] })).toEqual(["v_pro"]);
    expect(accounts.planSlugsOf({ billingPlanSlugs: ["v_pro"] })).toEqual(["v_pro"]);
    // The other app's field is not read.
    expect(users.planSlugsOf({ billingPlanSlugs: ["v_pro"] } as unknown as Pick<UserRow, "planSlugs">)).toEqual([]);
    expect(accounts.planSlugsOf({ planSlugs: ["v_pro"] } as unknown as Pick<AccountRow, "billingPlanSlugs">)).toEqual([]);
  });

  it("reads a missing row, a missing field or a bad value as no slugs", () => {
    expect(users.planSlugsOf(null)).toEqual([]);
    expect(users.planSlugsOf(undefined)).toEqual([]);
    expect(users.planSlugsOf({})).toEqual([]);
    expect(users.planSlugsOf({ planSlugs: "v_pro" } as unknown as UserRow)).toEqual([]);
    expect(users.planSlugsOf({ planSlugs: ["v_pro", 7, null] } as unknown as UserRow)).toEqual(["v_pro"]);
  });

  it("builds a patch keyed by the configured field, with a copy of the slugs", () => {
    const slugs = ["v_pro"];
    const patch = accounts.planSlugsPatch(slugs);
    expect(patch).toEqual({ billingPlanSlugs: ["v_pro"] });
    expect(patch.billingPlanSlugs).not.toBe(slugs);
    expect(users.planSlugsPatch([])).toEqual({ planSlugs: [] });
  });

  it("computes the next slugs from the stored field", () => {
    expect(users.nextPlanSlugs({ planSlugs: ["extra"] }, itemChange("active"))).toEqual(["extra", "v_pro"]);
    expect(accounts.nextPlanSlugs({ billingPlanSlugs: ["extra", "v_pro"] }, itemChange("ended"))).toEqual(["extra"]);
    expect(accounts.nextPlanSlugs(null, replace(["v_pro"]))).toEqual(["v_pro"]);
  });
});

describe("writeBillingChange", () => {
  it("replaces and merges on the configured table and field", async () => {
    const ctx = fakeDb<AccountRow>("accounts", [
      { _id: "accounts_1", _creationTime: 1, clerkUserId: "user_b" },
      { _id: "accounts_2", _creationTime: 2, clerkUserId: "user_a" },
    ]);
    expect(await accounts.writeBillingChange(ctx, replace(["v_pro"]))).toBe(true);
    expect(ctx.rows[1]?.billingPlanSlugs).toEqual(["v_pro"]);
    expect(await accounts.writeBillingChange(ctx, itemChange("ended"))).toBe(true);
    expect(ctx.rows[1]?.billingPlanSlugs).toEqual([]);
    expect(await accounts.writeBillingChange(ctx, itemChange("active"))).toBe(true);
    expect(ctx.rows[1]?.billingPlanSlugs).toEqual(["v_pro"]);
    expect(ctx.patches).toEqual([
      { id: "accounts_2", value: { billingPlanSlugs: ["v_pro"] } },
      { id: "accounts_2", value: { billingPlanSlugs: [] } },
      { id: "accounts_2", value: { billingPlanSlugs: ["v_pro"] } },
    ]);
    expect(ctx.rows[0]).toEqual({ _id: "accounts_1", _creationTime: 1, clerkUserId: "user_b" });
  });

  it("patches only the slugs field and keeps other fields", async () => {
    const ctx = fakeDb<UserRow>("users", [{ _id: "users_1", _creationTime: 1, clerkId: "user_a", email: "a@example.test", planSlugs: ["extra"] }]);
    expect(await users.writeBillingChange(ctx, itemChange("past_due"))).toBe(true);
    expect(ctx.patches).toEqual([{ id: "users_1", value: { planSlugs: ["extra", "v_pro"] } }]);
    expect(ctx.rows[0]).toEqual({ _id: "users_1", _creationTime: 1, clerkId: "user_a", email: "a@example.test", planSlugs: ["extra", "v_pro"] });
  });

  it("is a no-op returning false when there is no row", async () => {
    const ctx = fakeDb<UserRow>("users", [{ _id: "users_1", _creationTime: 1, clerkId: "user_b" }]);
    expect(await users.writeBillingChange(ctx, replace(["v_pro"]))).toBe(false);
    expect(await users.writeBillingChange(ctx, itemChange("active"))).toBe(false);
    expect(ctx.patches).toEqual([]);
  });

  it("follows the configured lookup", async () => {
    const dupes = (table: string) => [
      { _id: `${table}_1`, _creationTime: 1, clerkId: "user_a", clerkUserId: "user_a" },
      { _id: `${table}_2`, _creationTime: 2, clerkId: "user_a", clerkUserId: "user_a" },
    ];
    const first = fakeDb<UserRow>("users", dupes("users"));
    expect(await users.writeBillingChange(first, replace(["v_pro"]))).toBe(true);
    expect(first.patches).toEqual([{ id: "users_1", value: { planSlugs: ["v_pro"] } }]);
    const unique = fakeDb<AccountRow>("accounts", dupes("accounts"));
    await expect(accounts.writeBillingChange(unique, replace(["v_pro"]))).rejects.toThrow(/more than one/);
    expect(unique.patches).toEqual([]);
  });
});

describe("userHasVPro", () => {
  const compIds = parseVProCompUserIds("user_comp, user_other");

  it("reads the configured slugs and Clerk id fields", () => {
    expect(users.userHasVPro({ clerkId: "user_a", planSlugs: ["v_pro"] })).toBe(true);
    expect(accounts.userHasVPro({ clerkUserId: "user_a", billingPlanSlugs: ["v_pro"] })).toBe(true);
    expect(accounts.userHasVPro({ clerkUserId: "user_comp" }, { compIds })).toBe(true);
    expect(users.userHasVPro({ clerkId: "user_comp" }, { compIds })).toBe(true);
    expect(users.userHasVPro({ clerkId: "user_a", planSlugs: ["free_user"] }, { compIds })).toBe(false);
  });

  it("falls back to the identity for a missing row", () => {
    expect(users.userHasVPro(null)).toBe(false);
    expect(users.userHasVPro(null, { identity: { subject: "user_a", pla: "u:v_pro" } })).toBe(true);
    expect(users.userHasVPro(null, { identity: { subject: "user_comp" }, compIds })).toBe(true);
    expect(users.userHasVPro(undefined, { identity: { subject: "user_a", pla: "u:free_user" }, compIds })).toBe(false);
  });

  it("does not count the retired vibot_pro slug", () => {
    expect(users.userHasVPro({ clerkId: "user_a", planSlugs: ["vibot_pro"] }, { identity: { subject: "user_a", pla: "u:vibot_pro" } })).toBe(false);
  });
});

describe("a webhook handler built from the helpers", () => {
  // The shape an app's httpAction + internalMutation take, minus Convex.
  async function handle(ctx: ReturnType<typeof fakeDb<UserRow>>, verify: () => Promise<ClerkWebhookEventLike>, secret = "whsec_test") {
    const verified = await verifyClerkWebhook(verify, new Request("https://example.test/clerk/webhooks", { method: "POST", body: "{}" }), {
      env: { CLERK_WEBHOOK_SIGNING_SECRET: secret },
    });
    if (!verified.ok) return 400;
    const change = parseClerkBillingEvent(verified.event);
    if (change) await users.writeBillingChange(ctx, change);
    return 200;
  }

  function row(planSlugs: string[]) {
    return fakeDb<UserRow>("users", [{ _id: "users_1", _creationTime: 1, clerkId: "user_a", planSlugs }]);
  }

  it("answers 400 on a missing secret or a bad signature, and writes nothing", async () => {
    const ctx = row(["v_pro"]);
    const verify = vi.fn(async (): Promise<ClerkWebhookEventLike> => ({ type: "subscription.active", data: { payer: { user_id: "user_a" }, items: [] } }));
    expect(await handle(ctx, verify, "")).toBe(400);
    expect(verify).not.toHaveBeenCalled();
    expect(await handle(ctx, () => Promise.reject(new Error("bad signature")))).toBe(400);
    expect(ctx.patches).toEqual([]);
  });

  it("replaces from a subscription event and removes on subscriptionItem.ended", async () => {
    const ctx = row(["old"]);
    const active = { type: "subscription.active", data: { payer: { user_id: "user_a" }, items: [{ status: "active", plan: { slug: "v_pro" } }, { status: "ended", plan: { slug: "old" } }] } };
    expect(await handle(ctx, async () => active)).toBe(200);
    expect(ctx.rows[0]?.planSlugs).toEqual(["v_pro"]);
    const ended = { type: "subscriptionItem.ended", data: { payer: { user_id: "user_a" }, status: "ended", plan: { slug: "v_pro" } } };
    expect(await handle(ctx, async () => ended)).toBe(200);
    expect(ctx.rows[0]?.planSlugs).toEqual([]);
  });

  it("answers 200 and writes nothing for organisation payers, unrelated events and unknown users", async () => {
    const ctx = row(["v_pro"]);
    const events: ClerkWebhookEventLike[] = [
      { type: "subscriptionItem.ended", data: { payer: { organization_id: "org_1" }, status: "ended", plan: { slug: "v_pro" } } },
      { type: "user.created", data: {} },
      { type: "subscriptionItem.ended", data: { payer: { user_id: "user_missing" }, status: "ended", plan: { slug: "v_pro" } } },
    ];
    for (const event of events) expect(await handle(ctx, async () => event), event.type).toBe(200);
    expect(ctx.patches).toEqual([]);
    expect(ctx.rows[0]?.planSlugs).toEqual(["v_pro"]);
  });
});

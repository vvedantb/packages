import { describe, expect, it } from "vitest";
import {
  activePlanSlugs,
  applyBillingChange,
  applyItemToPlanSlugs,
  GRANTING_ITEM_STATUSES,
  GRANTING_STATUSES_ACTIVE_ONLY,
  GRANTING_STATUSES_ACTIVE_PAST_DUE,
  hasVPro,
  itemGrantsPlan,
  parseClerkBillingEvent,
  type ClerkBillingChange,
  type ClerkBillingOptions,
  type ClerkWebhookEventLike,
} from "@vvedantb/server";

// Hand-written Clerk Billing webhook shapes. Only `type`, `data.payer.user_id`,
// `data.items[].status`, `data.items[].plan.slug`, `data.status` and
// `data.plan.slug` are read; the other fields show that nothing else matters.

type Period = "month" | "annual";

function item(status: string, slug: string | null, period: Period = "month") {
  return {
    object: "commerce_subscription_item",
    id: `csub_item_${slug ?? "none"}_${period}`,
    status,
    interval: period,
    period_start: 1_700_000_000_000,
    period_end: period === "month" ? 1_702_592_000_000 : 1_731_536_000_000,
    plan: slug === null ? null : { id: `cplan_${slug}`, slug, name: slug },
  };
}

const userPayer = { id: "cpayer_1", user_id: "user_a", email: "a@example.test" };
const orgPayer = { id: "cpayer_2", organization_id: "org_1" };

function subscriptionEvent(type: string, items: unknown[], payer: object = userPayer): ClerkWebhookEventLike {
  return { type, data: { object: "commerce_subscription", id: "csub_1", status: "active", payer, items } };
}

function itemEvent(type: string, status: string, slug: string | null, period: Period = "month", payer: object = userPayer): ClerkWebhookEventLike {
  return { type, data: { ...item(status, slug, period), payer } };
}

/** Parse each event and fold it into the stored slugs, as the webhook writer does. */
function replay(events: ClerkWebhookEventLike[], start: string[] = []): string[] {
  return events.reduce((slugs, event) => {
    const change = parseClerkBillingEvent(event);
    return change ? applyBillingChange(slugs, change) : slugs;
  }, start);
}

const SUBSCRIPTION_TYPES = ["subscription.created", "subscription.updated", "subscription.active", "subscription.pastDue"];
const ITEM_TYPES = [
  "subscriptionItem.updated",
  "subscriptionItem.active",
  "subscriptionItem.canceled",
  "subscriptionItem.ended",
  "subscriptionItem.abandoned",
  "subscriptionItem.incomplete",
  "subscriptionItem.pastDue",
];

describe("itemGrantsPlan", () => {
  it("grants for active, past_due and canceled (access until the period ends)", () => {
    expect([...GRANTING_ITEM_STATUSES]).toEqual(["active", "past_due", "canceled"]);
    for (const status of ["active", "past_due", "canceled"]) {
      expect(itemGrantsPlan({ status, plan: { slug: "v_pro" } }), status).toBe(true);
    }
  });

  it.each(["ended", "expired", "abandoned", "incomplete", "upcoming", "", "ACTIVE"])("does not grant for %j", (status) => {
    expect(itemGrantsPlan({ status, plan: { slug: "v_pro" } })).toBe(false);
  });
});

describe("activePlanSlugs", () => {
  it("keeps granting items only, unique and sorted", () => {
    expect(
      activePlanSlugs([
        { status: "active", plan: { slug: "v_pro" } },
        { status: "active", plan: { slug: "v_pro" } },
        { status: "past_due", plan: { slug: "extra" } },
        { status: "canceled", plan: { slug: "kept" } },
        { status: "ended", plan: { slug: "gone" } },
        { status: "upcoming", plan: { slug: "later" } },
        { status: "active", plan: null },
        { status: "active" },
      ]),
    ).toEqual(["extra", "kept", "v_pro"]);
  });

  it("is empty for no items, and has no V Pro for a free plan only", () => {
    expect(activePlanSlugs([])).toEqual([]);
    const free = activePlanSlugs([item("active", "free_user")]);
    expect(free).toEqual(["free_user"]);
    expect(hasVPro({ planSlugs: free })).toBe(false);
  });

  it("gives the same slugs for a monthly and a yearly item of one plan", () => {
    const monthly = activePlanSlugs([item("active", "v_pro", "month")]);
    const yearly = activePlanSlugs([item("active", "v_pro", "annual")]);
    expect(monthly).toEqual(["v_pro"]);
    expect(yearly).toEqual(monthly);
    expect(activePlanSlugs([item("active", "v_pro", "month"), item("active", "v_pro", "annual")])).toEqual(["v_pro"]);
  });

  it("takes the Clerk backend client's subscriptionItems without mapping", () => {
    // `clerk.billing.getUserBillingSubscription(userId).subscriptionItems` (camelCase, extra fields).
    const subscriptionItems = [
      { id: "csub_item_1", status: "active", planPeriod: "annual", plan: { id: "cplan_1", slug: "v_pro", name: "V Pro" } },
      { id: "csub_item_2", status: "ended", planPeriod: "month", plan: { id: "cplan_2", slug: "free_user", name: "Free" } },
    ];
    expect(activePlanSlugs(subscriptionItems)).toEqual(["v_pro"]);
  });
});

describe("applyItemToPlanSlugs", () => {
  it("adds a slug for a granting item and is idempotent", () => {
    const active = { status: "active", plan: { slug: "v_pro" } };
    const once = applyItemToPlanSlugs(["other"], active);
    expect(once).toEqual(["other", "v_pro"]);
    expect(applyItemToPlanSlugs(once, active)).toEqual(once);
  });

  it("keeps the slug for a canceled item", () => {
    expect(applyItemToPlanSlugs(["other", "v_pro"], { status: "canceled", plan: { slug: "v_pro" } })).toEqual(["other", "v_pro"]);
  });

  it.each(["ended", "expired", "abandoned", "incomplete"])("removes the slug for a %s item and keeps the others", (status) => {
    expect(applyItemToPlanSlugs(["other", "v_pro"], { status, plan: { slug: "v_pro" } })).toEqual(["other"]);
  });

  it("changes nothing for an item with no plan, but returns a sorted unique copy", () => {
    const current = ["v_pro", "extra", "v_pro"];
    const next = applyItemToPlanSlugs(current, { status: "ended" });
    expect(next).toEqual(["extra", "v_pro"]);
    expect(next).not.toBe(current);
    expect(current).toEqual(["v_pro", "extra", "v_pro"]);
  });

  it("treats missing current slugs as none", () => {
    expect(applyItemToPlanSlugs(undefined, { status: "active", plan: { slug: "v_pro" } })).toEqual(["v_pro"]);
    expect(applyItemToPlanSlugs(null, { status: "ended", plan: { slug: "v_pro" } })).toEqual([]);
  });
});

describe("applyBillingChange", () => {
  it("replace overwrites the stored set with a sorted unique copy", () => {
    const planSlugs = ["v_pro", "extra", "v_pro"];
    const next = applyBillingChange(["old"], { kind: "replace", clerkId: "user_a", planSlugs });
    expect(next).toEqual(["extra", "v_pro"]);
    expect(planSlugs).toEqual(["v_pro", "extra", "v_pro"]);
  });

  it("item merges one slug", () => {
    expect(applyBillingChange(["extra"], { kind: "item", clerkId: "user_a", status: "active", slug: "v_pro" })).toEqual(["extra", "v_pro"]);
    expect(applyBillingChange(["extra", "v_pro"], { kind: "item", clerkId: "user_a", status: "ended", slug: "v_pro" })).toEqual(["extra"]);
  });
});

describe("parseClerkBillingEvent", () => {
  it.each(SUBSCRIPTION_TYPES)("%s replaces the full set from data.items", (type) => {
    expect(parseClerkBillingEvent(subscriptionEvent(type, [item("active", "v_pro"), item("ended", "old")]))).toEqual({
      kind: "replace",
      clerkId: "user_a",
      planSlugs: ["v_pro"],
    } satisfies ClerkBillingChange);
  });

  it("subscription.pastDue keeps a past_due item, so access stays during the grace period", () => {
    expect(parseClerkBillingEvent(subscriptionEvent("subscription.pastDue", [item("past_due", "v_pro")]))).toMatchObject({
      planSlugs: ["v_pro"],
    });
  });

  it("a subscription with only ended items or none replaces with no slugs", () => {
    expect(parseClerkBillingEvent(subscriptionEvent("subscription.updated", [item("ended", "v_pro")]))).toMatchObject({
      kind: "replace",
      planSlugs: [],
    });
    expect(parseClerkBillingEvent(subscriptionEvent("subscription.updated", []))).toMatchObject({ kind: "replace", planSlugs: [] });
  });

  it.each([
    ["subscriptionItem.updated", "active"],
    ["subscriptionItem.active", "active"],
    ["subscriptionItem.canceled", "canceled"],
    ["subscriptionItem.ended", "ended"],
    ["subscriptionItem.abandoned", "abandoned"],
    ["subscriptionItem.incomplete", "incomplete"],
    ["subscriptionItem.pastDue", "past_due"],
  ])("%s is one item with status %s", (type, status) => {
    expect(parseClerkBillingEvent(itemEvent(type, status, "v_pro"))).toEqual({
      kind: "item",
      clerkId: "user_a",
      status,
      slug: "v_pro",
    } satisfies ClerkBillingChange);
  });

  it("takes the item status from data.status, not the event type", () => {
    expect(parseClerkBillingEvent(itemEvent("subscriptionItem.updated", "ended", "v_pro"))).toMatchObject({ status: "ended" });
  });

  it("gives the same change for a monthly and a yearly item", () => {
    for (const type of ITEM_TYPES) {
      expect(parseClerkBillingEvent(itemEvent(type, "active", "v_pro", "annual")), type).toEqual(
        parseClerkBillingEvent(itemEvent(type, "active", "v_pro", "month")),
      );
    }
    for (const type of SUBSCRIPTION_TYPES) {
      expect(parseClerkBillingEvent(subscriptionEvent(type, [item("active", "v_pro", "annual")])), type).toEqual(
        parseClerkBillingEvent(subscriptionEvent(type, [item("active", "v_pro", "month")])),
      );
    }
  });

  it("ignores organisation payers (no payer.user_id) for both event kinds", () => {
    for (const type of SUBSCRIPTION_TYPES) {
      expect(parseClerkBillingEvent(subscriptionEvent(type, [item("active", "v_pro")], orgPayer)), type).toBeNull();
    }
    for (const type of ITEM_TYPES) {
      expect(parseClerkBillingEvent(itemEvent(type, "ended", "v_pro", "month", orgPayer)), type).toBeNull();
    }
    for (const payer of [{ user_id: "" }, { user_id: null }, { user_id: 42 }, null, "user_a"]) {
      expect(parseClerkBillingEvent({ type: "subscription.active", data: { payer, items: [] } }), JSON.stringify(payer)).toBeNull();
    }
    expect(parseClerkBillingEvent({ type: "subscriptionItem.active", data: { status: "active", plan: { slug: "v_pro" } } })).toBeNull();
  });

  it.each([
    "user.created",
    "session.created",
    "subscriptionItem.upcoming",
    "subscriptionItem.freeTrialEnding",
    "paymentAttempt.created",
    "",
  ])("ignores the %j event", (type) => {
    expect(parseClerkBillingEvent({ type, data: { payer: userPayer, items: [item("active", "v_pro")], ...item("active", "v_pro") } })).toBeNull();
  });

  it("ignores malformed events without throwing", () => {
    const bad: unknown[] = [
      null,
      undefined,
      {},
      { type: 42, data: {} },
      { type: "subscription.active" },
      { type: "subscription.active", data: null },
      { type: "subscription.active", data: "x" },
      // No items array: not read as "no plan", which would revoke access.
      { type: "subscription.active", data: { payer: userPayer } },
      { type: "subscription.active", data: { payer: userPayer, items: "v_pro" } },
      // An item event needs a string status and a non-empty plan slug.
      { type: "subscriptionItem.ended", data: { payer: userPayer, plan: { slug: "v_pro" } } },
      { type: "subscriptionItem.ended", data: { payer: userPayer, status: 1, plan: { slug: "v_pro" } } },
      { type: "subscriptionItem.ended", data: { payer: userPayer, status: "ended", plan: null } },
      { type: "subscriptionItem.ended", data: { payer: userPayer, status: "ended", plan: { slug: "" } } },
      { type: "subscriptionItem.ended", data: { payer: userPayer, status: "ended" } },
    ];
    for (const event of bad) {
      expect(parseClerkBillingEvent(event as ClerkWebhookEventLike), JSON.stringify(event)).toBeNull();
    }
  });

  it("skips malformed entries inside data.items", () => {
    const items = [null, "v_pro", { plan: { slug: "no_status" } }, { status: "active", plan: { slug: 7 } }, { status: "active", plan: "v_pro" }, item("active", "v_pro")];
    expect(parseClerkBillingEvent(subscriptionEvent("subscription.updated", items))).toMatchObject({ planSlugs: ["v_pro"] });
  });
});

describe("event sequences (Clerk does not guarantee order)", () => {
  it("subscribe, cancel at period end, then end", () => {
    expect(
      replay([
        subscriptionEvent("subscription.created", [item("active", "v_pro")]),
        itemEvent("subscriptionItem.canceled", "canceled", "v_pro"),
      ]),
    ).toEqual(["v_pro"]);
    expect(
      replay([
        subscriptionEvent("subscription.created", [item("active", "v_pro")]),
        itemEvent("subscriptionItem.canceled", "canceled", "v_pro"),
        itemEvent("subscriptionItem.ended", "ended", "v_pro"),
      ]),
    ).toEqual([]);
  });

  it("past due keeps access; abandoned or incomplete checkout removes it", () => {
    expect(replay([itemEvent("subscriptionItem.pastDue", "past_due", "v_pro")], ["v_pro"])).toEqual(["v_pro"]);
    expect(replay([itemEvent("subscriptionItem.abandoned", "abandoned", "v_pro")], ["v_pro"])).toEqual([]);
    expect(replay([itemEvent("subscriptionItem.incomplete", "incomplete", "v_pro")], ["v_pro"])).toEqual([]);
  });

  it("item.ended after subscription.active still removes; a later item.active restores", () => {
    const afterEnd = [subscriptionEvent("subscription.active", [item("active", "v_pro")]), itemEvent("subscriptionItem.ended", "ended", "v_pro")];
    expect(replay(afterEnd)).toEqual([]);
    expect(replay([...afterEnd, itemEvent("subscriptionItem.active", "active", "v_pro")])).toEqual(["v_pro"]);
  });

  it("a subscription event overwrites whatever item events left", () => {
    expect(
      replay(
        [
          itemEvent("subscriptionItem.active", "active", "extra"),
          itemEvent("subscriptionItem.ended", "ended", "v_pro"),
          subscriptionEvent("subscription.updated", [item("active", "v_pro", "annual")]),
        ],
        ["legacy"],
      ),
    ).toEqual(["v_pro"]);
    expect(replay([subscriptionEvent("subscription.updated", [])], ["v_pro", "extra"])).toEqual([]);
  });

  it("monthly to yearly: the canceled monthly item keeps access until the yearly one is active", () => {
    expect(
      replay([
        subscriptionEvent("subscription.active", [item("active", "v_pro", "month")]),
        subscriptionEvent("subscription.updated", [item("canceled", "v_pro", "month"), item("upcoming", "v_pro", "annual")]),
      ]),
    ).toEqual(["v_pro"]);
    expect(
      replay([
        subscriptionEvent("subscription.updated", [item("canceled", "v_pro", "month"), item("upcoming", "v_pro", "annual")]),
        subscriptionEvent("subscription.updated", [item("ended", "v_pro", "month"), item("active", "v_pro", "annual")]),
      ]),
    ).toEqual(["v_pro"]);
  });

  it.each([
    ["subscriptionItem.ended", "ended"],
    ["subscriptionItem.updated", "upcoming"],
    ["subscriptionItem.abandoned", "abandoned"],
    ["subscriptionItem.incomplete", "incomplete"],
  ])("known limit: %s (%s) for one of two same-slug items removes the slug until the next subscription event", (type, status) => {
    // Merging single items keeps no per-item record, so the other item's grant is not seen.
    const both = [item("active", "v_pro", "month"), item("active", "v_pro", "annual")];
    const slugs = replay([subscriptionEvent("subscription.updated", both), itemEvent(type, status, "v_pro", "annual")]);
    expect(slugs).toEqual([]);
    expect(replay([subscriptionEvent("subscription.updated", [item("active", "v_pro", "month"), item(status, "v_pro", "annual")])], slugs)).toEqual(["v_pro"]);
  });

  it("ignored events leave the stored set alone", () => {
    expect(
      replay(
        [
          { type: "user.updated", data: { id: "user_a" } },
          itemEvent("subscriptionItem.ended", "ended", "v_pro", "month", orgPayer),
          subscriptionEvent("subscription.updated", [], orgPayer),
        ],
        ["v_pro"],
      ),
    ).toEqual(["v_pro"]);
  });
});

// Per-app behaviour from config. Defaults are the 0.11.0 behaviour.
const PRESETS: Array<{ app: string; options: ClerkBillingOptions; grants: string[] }> = [
  { app: "default", options: {}, grants: ["active", "past_due", "canceled"] },
  { app: "active and past_due", options: { grantingStatuses: GRANTING_STATUSES_ACTIVE_PAST_DUE }, grants: ["active", "past_due"] },
  { app: "active only", options: { grantingStatuses: GRANTING_STATUSES_ACTIVE_ONLY }, grants: ["active"] },
];
const STATUSES = ["active", "past_due", "canceled", "ended", "upcoming"];

describe("grantingStatuses option", () => {
  it("exports the presets", () => {
    expect([...GRANTING_STATUSES_ACTIVE_PAST_DUE]).toEqual(["active", "past_due"]);
    expect([...GRANTING_STATUSES_ACTIVE_ONLY]).toEqual(["active"]);
  });

  it.each(PRESETS)("itemGrantsPlan grants only the configured statuses: $app", ({ options, grants }) => {
    for (const status of STATUSES) {
      expect(itemGrantsPlan({ status, plan: { slug: "v_pro" } }, options), status).toBe(grants.includes(status));
    }
  });

  it.each(PRESETS)("activePlanSlugs keeps only configured statuses: $app", ({ options, grants }) => {
    const items = STATUSES.map((status) => ({ status, plan: { slug: `plan_${status}` } }));
    expect(activePlanSlugs(items, options)).toEqual(grants.map((status) => `plan_${status}`).sort());
  });

  it.each(PRESETS)("an item change adds or removes by the configured statuses: $app", ({ options, grants }) => {
    for (const status of STATUSES) {
      const expected = grants.includes(status) ? ["extra", "v_pro"] : ["extra"];
      expect(applyItemToPlanSlugs(["extra", "v_pro"], { status, plan: { slug: "v_pro" } }, options), status).toEqual(expected);
      expect(applyBillingChange(["extra"], { kind: "item", clerkId: "user_a", status, slug: "v_pro" }, options), status).toEqual(expected);
    }
  });

  it.each(PRESETS)("parseClerkBillingEvent filters a replace by the configured statuses: $app", ({ options, grants }) => {
    const event = subscriptionEvent("subscription.updated", STATUSES.map((status) => item(status, `plan_${status}`)));
    expect(parseClerkBillingEvent(event, options)).toEqual({
      kind: "replace",
      clerkId: "user_a",
      planSlugs: grants.map((status) => `plan_${status}`).sort(),
    });
  });

  it("active-only removes the slug on past_due and canceled item events; the default keeps it", () => {
    const events = [
      subscriptionEvent("subscription.active", [item("active", "v_pro")]),
      itemEvent("subscriptionItem.pastDue", "past_due", "v_pro"),
    ];
    const fold = (options: ClerkBillingOptions) =>
      events.reduce<string[]>((slugs, event) => {
        const change = parseClerkBillingEvent(event, options);
        return change ? applyBillingChange(slugs, change, options) : slugs;
      }, []);
    expect(fold({})).toEqual(["v_pro"]);
    expect(fold({ grantingStatuses: GRANTING_STATUSES_ACTIVE_PAST_DUE })).toEqual(["v_pro"]);
    expect(fold({ grantingStatuses: GRANTING_STATUSES_ACTIVE_ONLY })).toEqual([]);
    expect(applyBillingChange(["v_pro"], { kind: "item", clerkId: "user_a", status: "canceled", slug: "v_pro" }, { grantingStatuses: GRANTING_STATUSES_ACTIVE_PAST_DUE })).toEqual([]);
  });

  it("an empty list grants nothing", () => {
    expect(itemGrantsPlan({ status: "active", plan: { slug: "v_pro" } }, { grantingStatuses: [] })).toBe(false);
  });
});

describe("eventMatch option", () => {
  const unlisted = subscriptionEvent("subscription.foo", [item("active", "v_pro")]);
  const unlistedItem = itemEvent("subscriptionItem.foo", "active", "v_pro");

  it("exact (default) ignores unlisted subscription types", () => {
    expect(parseClerkBillingEvent(unlisted)).toBeNull();
    expect(parseClerkBillingEvent(unlisted, { eventMatch: "exact" })).toBeNull();
    expect(parseClerkBillingEvent(unlistedItem)).toBeNull();
  });

  it("prefix handles any subscription. or subscriptionItem. type", () => {
    expect(parseClerkBillingEvent(unlisted, { eventMatch: "prefix" })).toEqual({ kind: "replace", clerkId: "user_a", planSlugs: ["v_pro"] });
    expect(parseClerkBillingEvent(unlistedItem, { eventMatch: "prefix" })).toEqual({ kind: "item", clerkId: "user_a", status: "active", slug: "v_pro" });
  });

  it.each([...SUBSCRIPTION_TYPES, ...ITEM_TYPES])("prefix gives the same change as exact for %s", (type) => {
    const event = type.startsWith("subscriptionItem.")
      ? itemEvent(type, "active", "v_pro")
      : subscriptionEvent(type, [item("active", "v_pro")]);
    expect(parseClerkBillingEvent(event, { eventMatch: "prefix" })).toEqual(parseClerkBillingEvent(event));
  });

  it("prefix still ignores other types, organisation payers and malformed data", () => {
    const prefix = { eventMatch: "prefix" } as const;
    for (const event of [
      { type: "user.created", data: { payer: userPayer } },
      { type: "subscriptions.active", data: { payer: userPayer, items: [] } },
      { type: "subscription", data: { payer: userPayer, items: [] } },
      subscriptionEvent("subscription.foo", [item("active", "v_pro")], orgPayer),
      { type: "subscription.foo", data: { payer: userPayer } },
      itemEvent("subscriptionItem.foo", "active", null),
    ]) {
      expect(parseClerkBillingEvent(event, prefix), event.type).toBeNull();
    }
  });
});

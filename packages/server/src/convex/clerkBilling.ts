/**
 * Pure Clerk Billing helpers: which subscription items grant their plan, and
 * how a verified webhook event changes a user's stored plan slugs. No Convex
 * or Clerk import; apps own the `httpAction` and `internalMutation` wrappers.
 */

/**
 * Clerk Billing item statuses that grant the item's plan. `canceled` means
 * cancel at period end, so it still grants until `ended`. Every other status
 * (`ended`, `expired`, `abandoned`, `incomplete`, `upcoming`) does not.
 */
export const GRANTING_ITEM_STATUSES: readonly string[] = ["active", "past_due", "canceled"];

/**
 * One subscription item. Webhook `data.items` entries and the Clerk backend
 * client's `subscription.subscriptionItems` both fit without mapping. Billing
 * period fields are not read: a monthly and a yearly item of one plan share
 * its slug.
 */
export type PlanItem = {
  readonly status: string;
  readonly plan?: { readonly slug: string } | null;
};

/** A verified Clerk webhook event, structurally. `verifyWebhook`'s result fits. */
export type ClerkWebhookEventLike = {
  readonly type: string;
  readonly data?: unknown;
};

/** How one billing event changes a user's stored plan slugs. */
export type ClerkBillingChange =
  /** From a `subscription.*` event, which lists every item: overwrite the stored set. */
  | { kind: "replace"; clerkId: string; planSlugs: string[] }
  /** From a `subscriptionItem.*` event, which holds one item: merge it into the stored set. */
  | { kind: "item"; clerkId: string; status: string; slug: string };

/** Subscription events whose `data.items` is the full item list. */
const SUBSCRIPTION_EVENTS: ReadonlySet<string> = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.pastDue",
]);

/** Subscription item events whose `data` is one item. */
const SUBSCRIPTION_ITEM_EVENTS: ReadonlySet<string> = new Set([
  "subscriptionItem.updated",
  "subscriptionItem.active",
  "subscriptionItem.canceled",
  "subscriptionItem.ended",
  "subscriptionItem.abandoned",
  "subscriptionItem.incomplete",
  "subscriptionItem.pastDue",
]);

export function itemGrantsPlan(item: PlanItem): boolean {
  return GRANTING_ITEM_STATUSES.includes(item.status);
}

/** Slugs of the items that grant their plan, unique and sorted. */
export function activePlanSlugs(items: readonly PlanItem[]): string[] {
  const slugs = new Set<string>();
  for (const item of items) {
    if (item.plan && itemGrantsPlan(item)) slugs.add(item.plan.slug);
  }
  return [...slugs].sort();
}

/**
 * Merge one item into the current slugs: add its slug when it grants, remove
 * it when it does not. An item without a plan changes nothing. Unique and sorted.
 */
export function applyItemToPlanSlugs(
  current: readonly string[] | null | undefined,
  item: PlanItem,
): string[] {
  const slugs = new Set(current ?? []);
  if (item.plan) {
    if (itemGrantsPlan(item)) slugs.add(item.plan.slug);
    else slugs.delete(item.plan.slug);
  }
  return [...slugs].sort();
}

/** The slugs to store after `change`, given the slugs stored now. Unique and sorted. */
export function applyBillingChange(
  current: readonly string[] | null | undefined,
  change: ClerkBillingChange,
): string[] {
  if (change.kind === "replace") return [...new Set(change.planSlugs)].sort();
  return applyItemToPlanSlugs(current, { status: change.status, plan: { slug: change.slug } });
}

/**
 * Read a verified Clerk webhook event as a billing change, or `null` when it
 * changes nothing: another event type, a payer with no `user_id` (an
 * organisation), an item with no status or plan slug, or a subscription with
 * no `items` array. Reads `data` defensively and never throws.
 */
export function parseClerkBillingEvent(
  event: ClerkWebhookEventLike | null | undefined,
): ClerkBillingChange | null {
  if (!isRecord(event) || typeof event.type !== "string") return null;
  const data = event.data;
  if (!isRecord(data)) return null;
  const clerkId = nonEmptyString(isRecord(data.payer) ? data.payer.user_id : undefined);
  if (clerkId === undefined) return null;

  if (SUBSCRIPTION_EVENTS.has(event.type)) {
    if (!Array.isArray(data.items)) return null;
    return { kind: "replace", clerkId, planSlugs: activePlanSlugs(data.items.flatMap(toPlanItem)) };
  }
  if (SUBSCRIPTION_ITEM_EVENTS.has(event.type)) {
    const [item] = toPlanItem(data);
    if (!item?.plan) return null;
    return { kind: "item", clerkId, status: item.status, slug: item.plan.slug };
  }
  return null;
}

/** `[item]` when `value` has a string `status`; the plan is kept only with a non-empty slug. */
function toPlanItem(value: unknown): PlanItem[] {
  if (!isRecord(value) || typeof value.status !== "string") return [];
  const slug = nonEmptyString(isRecord(value.plan) ? value.plan.slug : undefined);
  return [{ status: value.status, plan: slug === undefined ? null : { slug } }];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

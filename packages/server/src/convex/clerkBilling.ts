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

/** `active` and `past_due` grant; `canceled` does not. Pass as `grantingStatuses`. */
export const GRANTING_STATUSES_ACTIVE_PAST_DUE: readonly string[] = ["active", "past_due"];

/** Only `active` grants. Pass as `grantingStatuses`. */
export const GRANTING_STATUSES_ACTIVE_ONLY: readonly string[] = ["active"];

/**
 * Options for the Clerk Billing helpers. Every field is optional; the
 * defaults are the 0.11.0 behaviour. Use the same `grantingStatuses` when
 * parsing an event and when applying the change it gives.
 */
export type ClerkBillingOptions = {
  /** Item statuses that grant the item's plan. Default `GRANTING_ITEM_STATUSES`. */
  readonly grantingStatuses?: readonly string[];
  /**
   * How `parseClerkBillingEvent` matches event types. `"exact"` (default)
   * handles the listed `subscription.*` and `subscriptionItem.*` types only.
   * `"prefix"` handles any type that starts with `subscription.` or
   * `subscriptionItem.`. Read only by `parseClerkBillingEvent`.
   */
  readonly eventMatch?: "exact" | "prefix";
};

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

/** True when the item's status is one of `options.grantingStatuses` (default `GRANTING_ITEM_STATUSES`). */
export function itemGrantsPlan(item: PlanItem, options: ClerkBillingOptions = {}): boolean {
  return (options.grantingStatuses ?? GRANTING_ITEM_STATUSES).includes(item.status);
}

/** Slugs of the items that grant their plan, unique and sorted. */
export function activePlanSlugs(items: readonly PlanItem[], options: ClerkBillingOptions = {}): string[] {
  const slugs = new Set<string>();
  for (const item of items) {
    if (item.plan && itemGrantsPlan(item, options)) slugs.add(item.plan.slug);
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
  options: ClerkBillingOptions = {},
): string[] {
  const slugs = new Set(current ?? []);
  if (item.plan) {
    if (itemGrantsPlan(item, options)) slugs.add(item.plan.slug);
    else slugs.delete(item.plan.slug);
  }
  return [...slugs].sort();
}

/**
 * The slugs to store after `change`, given the slugs stored now. Unique and
 * sorted. `options.grantingStatuses` decides an `item` change; a `replace`
 * change was already filtered when it was parsed.
 */
export function applyBillingChange(
  current: readonly string[] | null | undefined,
  change: ClerkBillingChange,
  options: ClerkBillingOptions = {},
): string[] {
  if (change.kind === "replace") return [...new Set(change.planSlugs)].sort();
  return applyItemToPlanSlugs(current, { status: change.status, plan: { slug: change.slug } }, options);
}

/**
 * Read a verified Clerk webhook event as a billing change, or `null` when it
 * changes nothing: another event type, a payer with no `user_id` (an
 * organisation), an item with no status or plan slug, or a subscription with
 * no `items` array. Reads `data` defensively and never throws.
 *
 * `options.eventMatch` picks exact types (default) or the `subscription.` and
 * `subscriptionItem.` prefixes. `options.grantingStatuses` filters the slugs
 * of a `replace` change.
 */
export function parseClerkBillingEvent(
  event: ClerkWebhookEventLike | null | undefined,
  options: ClerkBillingOptions = {},
): ClerkBillingChange | null {
  if (!isRecord(event) || typeof event.type !== "string") return null;
  const data = event.data;
  if (!isRecord(data)) return null;
  const clerkId = nonEmptyString(isRecord(data.payer) ? data.payer.user_id : undefined);
  if (clerkId === undefined) return null;

  const kind = eventKind(event.type, options.eventMatch ?? "exact");
  if (kind === "replace") {
    if (!Array.isArray(data.items)) return null;
    return { kind: "replace", clerkId, planSlugs: activePlanSlugs(data.items.flatMap(toPlanItem), options) };
  }
  if (kind === "item") {
    const [item] = toPlanItem(data);
    if (!item?.plan) return null;
    return { kind: "item", clerkId, status: item.status, slug: item.plan.slug };
  }
  return null;
}

function eventKind(type: string, match: "exact" | "prefix"): ClerkBillingChange["kind"] | null {
  if (match === "prefix") {
    // "subscriptionItem.x" does not start with "subscription.", so the order does not matter.
    if (type.startsWith("subscriptionItem.")) return "item";
    if (type.startsWith("subscription.")) return "replace";
    return null;
  }
  if (SUBSCRIPTION_EVENTS.has(type)) return "replace";
  if (SUBSCRIPTION_ITEM_EVENTS.has(type)) return "item";
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

/** Clerk Billing plan key for the shared V Pro plan ($10/month or $100/year). */
export const V_PRO_PLAN_KEY = "v_pro";

/** Plan keys that grant V Pro. */
export const V_PRO_PLAN_KEYS: readonly string[] = [V_PRO_PLAN_KEY];

/**
 * True when the session's active plan is V Pro (`v_pro`).
 * Reads the Clerk session token v2 `pla` claim, `u:<plan>` or `o:<plan>`, from a
 * Convex `ctx.auth.getUserIdentity()` result or raw JWT claims. A bare plan slug
 * also matches. Anything else, including `null`, returns `false`; it never throws.
 */
export function hasVPlan(claimsOrIdentity: unknown): boolean {
  if (typeof claimsOrIdentity !== "object" || claimsOrIdentity === null) return false;
  const pla = (claimsOrIdentity as { pla?: unknown }).pla;
  if (typeof pla !== "string") return false;
  const sep = pla.indexOf(":");
  const scope = sep === -1 ? "" : pla.slice(0, sep);
  const plan = sep === -1 ? pla : pla.slice(sep + 1);
  if (sep !== -1 && scope !== "u" && scope !== "o") return false;
  return V_PRO_PLAN_KEYS.includes(plan);
}

/** What `hasVPro` reads. Every field is optional. */
export type HasVProInput = {
  /** A Convex `ctx.auth.getUserIdentity()` result or raw JWT claims, read by `hasVPlan`. */
  identity?: unknown;
  /** Plan slugs stored on the user row, for example from the Clerk Billing webhook. */
  planSlugs?: readonly string[] | null;
  /** Clerk user ids that get V Pro without a paid plan. See `parseVProCompUserIds`. */
  compIds?: readonly string[] | null;
  /** The Clerk user id to match against `compIds`. Default: `identity.subject`. */
  clerkId?: string | null;
};

/**
 * Comma-separated Clerk user ids (for example the `V_PRO_COMP_USER_IDS` env
 * var) as a list. Trims each id and drops empty ones; unset means nobody.
 */
export function parseVProCompUserIds(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * True when any source grants V Pro: the session's `pla` claim (`hasVPlan`), a
 * stored plan slug in `V_PRO_PLAN_KEYS`, or a Clerk id in `compIds`. Missing
 * or malformed fields count as no plan; it never throws.
 */
export function hasVPro(input: HasVProInput | null | undefined): boolean {
  if (typeof input !== "object" || input === null) return false;
  const { identity, planSlugs, compIds, clerkId } = input;
  if (hasVPlan(identity)) return true;
  if (Array.isArray(planSlugs) && planSlugs.some((slug) => V_PRO_PLAN_KEYS.includes(slug))) {
    return true;
  }
  const id = clerkId || identitySubject(identity);
  return id !== undefined && Array.isArray(compIds) && compIds.includes(id);
}

function identitySubject(identity: unknown): string | undefined {
  if (typeof identity !== "object" || identity === null) return undefined;
  const subject = (identity as { subject?: unknown }).subject;
  return typeof subject === "string" && subject.length > 0 ? subject : undefined;
}

/** Clerk Billing plan key for the shared V Pro plan ($10/month or $100/year). */
export const V_PRO_PLAN_KEY = "v_pro";

/** The earlier single-app plan. It still counts as V Pro. */
export const V_PRO_LEGACY_PLAN_KEY = "vibot_pro";

/** Plan keys that grant V Pro. */
export const V_PRO_PLAN_KEYS: readonly string[] = [V_PRO_PLAN_KEY, V_PRO_LEGACY_PLAN_KEY];

/**
 * True when the session's active plan is V Pro (`v_pro` or legacy `vibot_pro`).
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

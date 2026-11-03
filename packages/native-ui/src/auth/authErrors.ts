import { isClerkAPIResponseError } from "@clerk/clerk-expo";

/** Words that must not reach the user: the auth provider and stack names. */
const PRODUCT_NAMES = /\b(clerk|convex)\b/i;

/**
 * A message to show for an auth error. An API error gives its first
 * `longMessage` or `message` (such as "Password is incorrect."); anything
 * else, or a message that names the provider, gives `fallback`. Never shows
 * a raw exception message.
 */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0];
    const message = first?.longMessage ?? first?.message;
    if (message && !PRODUCT_NAMES.test(message)) return message;
  }
  return fallback;
}

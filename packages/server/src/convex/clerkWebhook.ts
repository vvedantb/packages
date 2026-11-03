import { errorMessage } from "../mcp/json.js";

export type ClerkWebhookEnv = {
  CLERK_WEBHOOK_SIGNING_SECRET?: string | undefined;
};

export type VerifyClerkWebhookOptions = {
  /** The Svix signing secret (`whsec_...`). Wins over `env`; an empty string counts as missing. */
  signingSecret?: string;
  /** Read for `CLERK_WEBHOOK_SIGNING_SECRET` when `signingSecret` is not given. Default `process.env`. */
  env?: ClerkWebhookEnv;
};

/** Why a webhook was rejected. Answer 400 for either, so Clerk retries. */
export type ClerkWebhookRejection = "missing-secret" | "invalid";

export type VerifyClerkWebhookResult<Event> =
  | { ok: true; event: Event }
  | { ok: false; reason: ClerkWebhookRejection; error: string };

/**
 * Verify a Clerk (Svix) webhook request. `verifyWebhook` is injected so this
 * package does not import `@clerk/backend`; pass the one from
 * `@clerk/backend/webhooks`. The event type is inferred from it.
 *
 * Never throws. Returns `{ ok: false, reason: "missing-secret" }` without
 * calling `verifyWebhook` when no secret is set, and
 * `{ ok: false, reason: "invalid" }` when `verifyWebhook` throws or rejects.
 */
export async function verifyClerkWebhook<Event>(
  verifyWebhook: (request: Request, options: { signingSecret: string }) => Promise<Event>,
  request: Request,
  options: VerifyClerkWebhookOptions = {},
): Promise<VerifyClerkWebhookResult<Event>> {
  const signingSecret =
    options.signingSecret ?? (options.env ?? process.env).CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    return {
      ok: false,
      reason: "missing-secret",
      error: "CLERK_WEBHOOK_SIGNING_SECRET is not set in Convex env",
    };
  }
  try {
    return { ok: true, event: await verifyWebhook(request, { signingSecret }) };
  } catch (err) {
    return { ok: false, reason: "invalid", error: errorMessage(err) };
  }
}

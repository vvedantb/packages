import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyClerkWebhook, type ClerkWebhookEventLike } from "@vvedantb/server";

// `verifyWebhook` from `@clerk/backend/webhooks` is injected, so a fake stands in for it.

function request(): Request {
  return new Request("https://example.convex.site/clerk/webhooks", { method: "POST", body: "{}" });
}

const event: ClerkWebhookEventLike = { type: "subscription.active", data: { payer: { user_id: "user_a" }, items: [] } };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyClerkWebhook", () => {
  it("returns the verified event, passing the request and the env secret", async () => {
    const verify = vi.fn(async () => event);
    const req = request();
    const result = await verifyClerkWebhook(verify, req, { env: { CLERK_WEBHOOK_SIGNING_SECRET: "whsec_env" } });
    expect(result).toEqual({ ok: true, event });
    expect(verify).toHaveBeenCalledExactlyOnceWith(req, { signingSecret: "whsec_env" });
  });

  it("reads process.env by default", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "whsec_process");
    const verify = vi.fn(async () => event);
    expect(await verifyClerkWebhook(verify, request())).toEqual({ ok: true, event });
    expect(verify).toHaveBeenCalledWith(expect.any(Request), { signingSecret: "whsec_process" });
  });

  it("an explicit signingSecret wins over env", async () => {
    const verify = vi.fn(async () => event);
    await verifyClerkWebhook(verify, request(), {
      signingSecret: "whsec_option",
      env: { CLERK_WEBHOOK_SIGNING_SECRET: "whsec_env" },
    });
    expect(verify).toHaveBeenCalledWith(expect.any(Request), { signingSecret: "whsec_option" });
  });

  it.each([
    ["env unset", {}],
    ["env empty", { env: { CLERK_WEBHOOK_SIGNING_SECRET: "" } }],
    ["env without the key", { env: {} }],
    ["empty signingSecret (no fallback to env)", { signingSecret: "", env: { CLERK_WEBHOOK_SIGNING_SECRET: "whsec_env" } }],
  ])("is missing-secret without calling verify: %s", async (_label, options) => {
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "");
    const verify = vi.fn(async () => event);
    expect(await verifyClerkWebhook(verify, request(), options)).toEqual({
      ok: false,
      reason: "missing-secret",
      error: "CLERK_WEBHOOK_SIGNING_SECRET is not set in Convex env",
    });
    expect(verify).not.toHaveBeenCalled();
  });

  it("is invalid when verify rejects", async () => {
    const verify = vi.fn(async (): Promise<ClerkWebhookEventLike> => {
      throw new Error("No matching signature found");
    });
    expect(await verifyClerkWebhook(verify, request(), { signingSecret: "whsec_test" })).toEqual({
      ok: false,
      reason: "invalid",
      error: "No matching signature found",
    });
  });

  it("is invalid when verify throws synchronously or throws a non-Error", async () => {
    const throwsSync = (): Promise<ClerkWebhookEventLike> => {
      throw new Error("Missing required Svix headers");
    };
    expect(await verifyClerkWebhook(throwsSync, request(), { signingSecret: "whsec_test" })).toMatchObject({
      ok: false,
      reason: "invalid",
      error: "Missing required Svix headers",
    });
    const throwsString = (): Promise<ClerkWebhookEventLike> => Promise.reject("bad");
    expect(await verifyClerkWebhook(throwsString, request(), { signingSecret: "whsec_test" })).toEqual({
      ok: false,
      reason: "invalid",
      error: "bad",
    });
  });
});

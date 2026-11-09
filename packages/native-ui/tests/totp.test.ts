import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

// `submitTotpSecondFactor` (0.10.0), ported from Eva. The sign-in resource is
// a mock: no network and no real sign-in. Clerk is stubbed as in auth.test.ts.

vi.mock("@clerk/clerk-expo", () => ({
  useSignIn: vi.fn(),
  isClerkAPIResponseError: (error: unknown) =>
    typeof error === "object" && error !== null && "clerkError" in error,
}));

const { submitTotpSecondFactor, TOTP_MESSAGES } = await import("../src/auth/totp");

const noopSetActive = async () => {};

describe("submitTotpSecondFactor", () => {
  it("needs_second_factor then complete: sets the session", async () => {
    const calls: unknown[] = [];
    const signIn = {
      status: "needs_second_factor",
      attemptSecondFactor: async (params: unknown) => {
        calls.push(params);
        return { status: "complete", createdSessionId: "sess_123" };
      },
    };
    const activated: unknown[] = [];
    const result = await submitTotpSecondFactor({
      signIn,
      code: "123456",
      setActive: async (params) => {
        activated.push(params);
      },
    });
    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([{ strategy: "totp", code: "123456" }]);
    expect(activated).toEqual([{ session: "sess_123" }]);
  });

  it("wrong code: returns the mapped API message and does not set a session", async () => {
    const signIn = {
      attemptSecondFactor: async () => {
        throw {
          clerkError: true,
          errors: [{ code: "form_code_incorrect", message: "is incorrect", longMessage: "Incorrect code" }],
        };
      },
    };
    const setActive = vi.fn();
    const result = await submitTotpSecondFactor({ signIn, code: "000000", setActive });
    expect(result).toEqual({ ok: false, error: "Incorrect code" });
    expect(setActive).not.toHaveBeenCalled();
  });

  it("unknown failure and provider-named messages fall back to the generic message", async () => {
    const network = { attemptSecondFactor: async () => Promise.reject(new Error("fetch failed")) };
    const branded = {
      attemptSecondFactor: async () => {
        throw { clerkError: true, errors: [{ longMessage: "Clerk could not verify" }] };
      },
    };
    for (const signIn of [network, branded]) {
      const result = await submitTotpSecondFactor({ signIn, code: "111111", setActive: noopSetActive });
      expect(result).toEqual({ ok: false, error: TOTP_MESSAGES.invalidCode });
    }
  });

  it("a status that is not complete reports the another-step message", async () => {
    const signIn = { attemptSecondFactor: async () => ({ status: "needs_new_password", createdSessionId: null }) };
    const result = await submitTotpSecondFactor({ signIn, code: "111111", setActive: noopSetActive });
    expect(result).toEqual({ ok: false, error: TOTP_MESSAGES.needsAnotherStep });
  });

  it("never throws, even when setActive fails", async () => {
    const signIn = { attemptSecondFactor: async () => ({ status: "complete", createdSessionId: "s" }) };
    const result = await submitTotpSecondFactor({
      signIn,
      code: "111111",
      setActive: async () => {
        throw new Error("boom");
      },
    });
    expect(result).toEqual({ ok: false, error: TOTP_MESSAGES.invalidCode });
  });

  it("shows generic messages that name no provider", () => {
    for (const message of Object.values(TOTP_MESSAGES)) expect(message).not.toMatch(/clerk|convex/i);
  });
});

describe("useSecondFactor (source contract)", () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/auth/totp.ts"), "utf8");

  it("uses useSignIn and the TOTP helper, with no zod", () => {
    expect(source).toMatch(/useSignIn\(\)/);
    expect(source).toMatch(/attemptSecondFactor\(\{ strategy: "totp", code: args\.code \}\)/);
    expect(source).toMatch(/setActive\(\{ session: attempt\.createdSessionId \}\)/);
    expect(source).not.toMatch(/zod/);
  });
});

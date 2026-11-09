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

const {
  submitTotpSecondFactor,
  submitSecondFactor,
  prepareSecondFactorIfNeeded,
  pickSecondFactorStrategy,
  supportedSecondFactorStrategies,
  TOTP_MESSAGES,
} = await import("../src/auth/totp");

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

  it("uses useSignIn and the shared helper, with no zod", () => {
    expect(source).toMatch(/useSignIn\(\)/);
    expect(source).toMatch(/attemptSecondFactor\(\{ strategy: args\.strategy, code: args\.code \}\)/);
    expect(source).toMatch(/strategy: "totp"/);
    expect(source).toMatch(/options\.strategy \?\? "totp"/);
    expect(source).toMatch(/setActive\(\{ session: attempt\.createdSessionId \}\)/);
    expect(source).not.toMatch(/zod/);
  });
});

describe("strategy choice", () => {
  const all = [{ strategy: "backup_code" }, { strategy: "phone_code" }, { strategy: "email_code" }, { strategy: "totp" }];

  it("prefers totp, email_code, phone_code, then backup_code, skipping missing ones", () => {
    expect(supportedSecondFactorStrategies(all)).toEqual(["totp", "email_code", "phone_code", "backup_code"]);
    expect(pickSecondFactorStrategy(all)).toBe("totp");
    expect(pickSecondFactorStrategy(all.slice(0, 3))).toBe("email_code");
    expect(pickSecondFactorStrategy(all.slice(0, 2))).toBe("phone_code");
    expect(pickSecondFactorStrategy(all.slice(0, 1))).toBe("backup_code");
  });

  it("ignores strategies it does not handle, and empty or missing lists", () => {
    expect(pickSecondFactorStrategy([{ strategy: "passkey" }])).toBeNull();
    expect(pickSecondFactorStrategy([])).toBeNull();
    expect(pickSecondFactorStrategy(null)).toBeNull();
  });
});

describe("prepareSecondFactorIfNeeded", () => {
  it("totp and backup_code make no prepare call", async () => {
    const prepareSecondFactor = vi.fn();
    for (const strategy of ["totp", "backup_code"] as const) {
      expect(await prepareSecondFactorIfNeeded({ signIn: { prepareSecondFactor }, strategy })).toEqual({ ok: true });
    }
    expect(prepareSecondFactor).not.toHaveBeenCalled();
  });

  it("email_code passes emailAddressId from the matching factor", async () => {
    const prepareSecondFactor = vi.fn(async () => ({}));
    const signIn = {
      prepareSecondFactor,
      supportedSecondFactors: [
        { strategy: "phone_code", phoneNumberId: "idn_phone" },
        { strategy: "email_code", emailAddressId: "idn_email" },
      ],
    };
    expect(await prepareSecondFactorIfNeeded({ signIn, strategy: "email_code" })).toEqual({ ok: true });
    expect(prepareSecondFactor).toHaveBeenCalledWith({ strategy: "email_code", emailAddressId: "idn_email" });
  });

  it("phone_code passes phoneNumberId, from an explicit factor first", async () => {
    const prepareSecondFactor = vi.fn(async () => ({}));
    const signIn = { prepareSecondFactor, supportedSecondFactors: [{ strategy: "phone_code", phoneNumberId: "a" }] };
    await prepareSecondFactorIfNeeded({ signIn, strategy: "phone_code", factor: { strategy: "phone_code", phoneNumberId: "b" } });
    expect(prepareSecondFactor).toHaveBeenCalledWith({ strategy: "phone_code", phoneNumberId: "b" });
  });

  it("sends without an id when no factor matches", async () => {
    const prepareSecondFactor = vi.fn(async () => ({}));
    await prepareSecondFactorIfNeeded({ signIn: { prepareSecondFactor }, strategy: "email_code" });
    expect(prepareSecondFactor).toHaveBeenCalledWith({ strategy: "email_code" });
  });

  it("never throws: a failed send is a generic error", async () => {
    const signIn = { prepareSecondFactor: async () => Promise.reject(new Error("fetch failed")) };
    expect(await prepareSecondFactorIfNeeded({ signIn, strategy: "phone_code" })).toEqual({
      ok: false,
      error: TOTP_MESSAGES.sendFailed,
    });
    expect(await prepareSecondFactorIfNeeded({ signIn: {}, strategy: "email_code" })).toEqual({
      ok: false,
      error: TOTP_MESSAGES.sendFailed,
    });
  });
});

describe("submitSecondFactor", () => {
  it("sends the strategy and code for every strategy, then sets the session", async () => {
    for (const strategy of ["totp", "backup_code", "phone_code", "email_code"] as const) {
      const attemptSecondFactor = vi.fn(async () => ({ status: "complete", createdSessionId: "sess_1" }));
      const setActive = vi.fn(async () => {});
      const result = await submitSecondFactor({ signIn: { attemptSecondFactor }, setActive, code: "12345678", strategy });
      expect(result, strategy).toEqual({ ok: true });
      expect(attemptSecondFactor).toHaveBeenCalledWith({ strategy, code: "12345678" });
      expect(setActive).toHaveBeenCalledWith({ session: "sess_1" });
    }
  });

  it("a wrong non-totp code falls back to the generic message, with no provider name", async () => {
    const signIn = { attemptSecondFactor: async () => Promise.reject(new Error("fetch failed")) };
    const result = await submitSecondFactor({ signIn, setActive: noopSetActive, code: "1", strategy: "email_code" });
    expect(result).toEqual({ ok: false, error: TOTP_MESSAGES.invalidCodeGeneric });
  });

  it("an incomplete status reports the another-step message", async () => {
    const signIn = { attemptSecondFactor: async () => ({ status: "needs_new_password", createdSessionId: null }) };
    const result = await submitSecondFactor({ signIn, setActive: noopSetActive, code: "1", strategy: "backup_code" });
    expect(result).toEqual({ ok: false, error: TOTP_MESSAGES.needsAnotherStep });
  });
});

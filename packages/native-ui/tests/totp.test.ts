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
  prepareFirstFactorIfNeeded,
  submitFirstFactor,
  pickFirstFactorStrategy,
  supportedFirstFactorStrategies,
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
    expect(result).toEqual({ ok: false, error: "Incorrect code (code: form_code_incorrect)" });
    expect(setActive).not.toHaveBeenCalled();
  });

  it("unknown failure falls back to the generic message; provider names are rephrased", async () => {
    const network = { attemptSecondFactor: async () => Promise.reject(new Error("fetch failed")) };
    const branded = {
      attemptSecondFactor: async () => {
        throw { clerkError: true, errors: [{ code: "x", longMessage: "Clerk could not verify" }] };
      },
    };
    const first = await submitTotpSecondFactor({ signIn: network, code: "111111", setActive: noopSetActive });
    expect(first).toEqual({ ok: false, error: TOTP_MESSAGES.invalidCode });
    const second = await submitTotpSecondFactor({ signIn: branded, code: "111111", setActive: noopSetActive });
    expect(second).toEqual({ ok: false, error: "the sign-in service could not verify (code: x)" });
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

describe("first-factor helpers", () => {
  const factors = [
    { strategy: "password" },
    { strategy: "phone_code", phoneNumberId: "idn_phone" },
    { strategy: "email_code", emailAddressId: "idn_email" },
  ];

  it("prefers email_code, then phone_code, and ignores other strategies", () => {
    expect(supportedFirstFactorStrategies(factors)).toEqual(["email_code", "phone_code"]);
    expect(pickFirstFactorStrategy(factors)).toBe("email_code");
    expect(pickFirstFactorStrategy([factors[0]!, factors[1]!])).toBe("phone_code");
    expect(pickFirstFactorStrategy([{ strategy: "password" }, { strategy: "totp" }])).toBeNull();
    expect(pickFirstFactorStrategy(null)).toBeNull();
  });

  it("needs the matching id before a strategy counts", () => {
    expect(pickFirstFactorStrategy([{ strategy: "email_code" }, { strategy: "phone_code" }])).toBeNull();
  });

  it("prepares with the matching id", async () => {
    const prepareFirstFactor = vi.fn(async () => ({}));
    const signIn = { prepareFirstFactor, supportedFirstFactors: factors };
    expect(await prepareFirstFactorIfNeeded({ signIn, strategy: "email_code" })).toEqual({ ok: true });
    expect(prepareFirstFactor).toHaveBeenCalledWith({ strategy: "email_code", emailAddressId: "idn_email" });
    await prepareFirstFactorIfNeeded({ signIn, strategy: "phone_code" });
    expect(prepareFirstFactor).toHaveBeenCalledWith({ strategy: "phone_code", phoneNumberId: "idn_phone" });
  });

  it("makes no call and returns an error without the id or the method", async () => {
    const prepareFirstFactor = vi.fn(async () => ({}));
    const failed = { ok: false, error: TOTP_MESSAGES.sendFailed };
    expect(await prepareFirstFactorIfNeeded({ signIn: { prepareFirstFactor }, strategy: "email_code" })).toEqual(failed);
    expect(prepareFirstFactor).not.toHaveBeenCalled();
    expect(await prepareFirstFactorIfNeeded({ signIn: {}, strategy: "phone_code", factor: factors[1]! })).toEqual(failed);
  });

  it("a failed send is a generic error", async () => {
    const signIn = { prepareFirstFactor: async () => Promise.reject(new Error("fetch failed")), supportedFirstFactors: factors };
    expect(await prepareFirstFactorIfNeeded({ signIn, strategy: "email_code" })).toEqual({
      ok: false,
      error: TOTP_MESSAGES.sendFailed,
    });
  });

  it("submit returns the attempt for the caller to route, without setting a session", async () => {
    const attempt = { status: "needs_client_trust", createdSessionId: null };
    const attemptFirstFactor = vi.fn(async () => attempt);
    expect(await submitFirstFactor({ signIn: { attemptFirstFactor }, code: "123456", strategy: "phone_code" })).toEqual({
      ok: true,
      attempt,
    });
    expect(attemptFirstFactor).toHaveBeenCalledWith({ strategy: "phone_code", code: "123456" });
  });

  it("submit never throws", async () => {
    const attemptFirstFactor = async () => Promise.reject(new Error("fetch failed"));
    expect(await submitFirstFactor({ signIn: { attemptFirstFactor }, code: "1", strategy: "email_code" })).toEqual({
      ok: false,
      error: TOTP_MESSAGES.invalidCodeGeneric,
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

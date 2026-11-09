import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Per-stage timeouts (0.11.1). Hung promises and fake timers: no network.

vi.mock("@clerk/clerk-expo", () => ({
  useSignIn: vi.fn(),
  isClerkAPIResponseError: (error: unknown) =>
    typeof error === "object" && error !== null && "clerkError" in error,
}));

const { withAuthTimeout, authErrorMessage, logAuthFailure, AuthTimeoutError } = await import("../src/auth/authErrors");
const {
  prepareFirstFactorIfNeeded,
  prepareSecondFactorIfNeeded,
  submitFirstFactor,
  submitSecondFactor,
} = await import("../src/auth/totp");

const hang = () => new Promise<never>(() => {});
const MS = 5000;

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  errorSpy.mockRestore();
});

const expectTimeoutResult = async (promise: Promise<{ ok: boolean; error?: string }>, stage: string) => {
  await vi.advanceTimersByTimeAsync(MS);
  const result = await promise;
  expect(result.ok).toBe(false);
  expect(result.error).toContain(stage);
  expect(result.error).toContain("(code: auth_timeout)");
  expect(errorSpy).toHaveBeenCalledWith(
    "[sign-in] failure",
    expect.objectContaining({ stage, code: "auth_timeout" }),
  );
};

describe("withAuthTimeout", () => {
  it("resolves a fast call and clears the timer", async () => {
    const value = await withAuthTimeout(Promise.resolve(7), "create", MS);
    expect(value).toBe(7);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("passes through a fast rejection", async () => {
    await expect(withAuthTimeout(Promise.reject(new Error("boom")), "create", MS)).rejects.toThrow("boom");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects a hung call with code auth_timeout and the stage in the message", async () => {
    const promise = withAuthTimeout(hang(), "create", MS);
    const caught = promise.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(MS);
    const error = await caught;
    expect(error).toBeInstanceOf(AuthTimeoutError);
    expect((error as InstanceType<typeof AuthTimeoutError>).code).toBe("auth_timeout");
    expect((error as Error).message).toContain("create");
    expect(authErrorMessage(error, "Fallback")).toBe(`${(error as Error).message} (code: auth_timeout)`);
  });

  it("logs the stage and code, never a password", () => {
    logAuthFailure("create", new AuthTimeoutError("set-active", MS));
    expect(errorSpy).toHaveBeenCalledWith(
      "[sign-in] failure",
      expect.objectContaining({ stage: "set-active", code: "auth_timeout" }),
    );
  });
});

describe("helper stages time out", () => {
  const factor = { strategy: "email_code", emailAddressId: "e1" };

  it("prepare-first-factor", async () => {
    const signIn = { prepareFirstFactor: hang };
    await expectTimeoutResult(
      prepareFirstFactorIfNeeded({ signIn, strategy: "email_code", factor, timeoutMs: MS }),
      "prepare-first-factor",
    );
  });

  it("attempt-first-factor", async () => {
    const signIn = { attemptFirstFactor: hang };
    await expectTimeoutResult(
      submitFirstFactor({ signIn, code: "123456", strategy: "email_code", timeoutMs: MS }),
      "attempt-first-factor",
    );
  });

  it("prepare-second-factor", async () => {
    const signIn = { prepareSecondFactor: hang, attemptSecondFactor: hang };
    await expectTimeoutResult(
      prepareSecondFactorIfNeeded({ signIn, strategy: "email_code", factor, timeoutMs: MS }),
      "prepare-second-factor",
    );
  });

  it("attempt-second-factor", async () => {
    const signIn = { attemptSecondFactor: hang };
    await expectTimeoutResult(
      submitSecondFactor({ signIn, setActive: async () => {}, code: "123456", strategy: "totp", timeoutMs: MS }),
      "attempt-second-factor",
    );
  });

  it("set-active", async () => {
    const signIn = { attemptSecondFactor: async () => ({ status: "complete", createdSessionId: "s1" }) };
    await expectTimeoutResult(
      submitSecondFactor({ signIn, setActive: hang, code: "123456", strategy: "totp", timeoutMs: MS }),
      "set-active",
    );
  });

  it("a fast call resolves normally", async () => {
    const signIn = { attemptSecondFactor: async () => ({ status: "complete", createdSessionId: "s1" }) };
    const result = await submitSecondFactor({
      signIn,
      setActive: async () => {},
      code: "123456",
      strategy: "totp",
      timeoutMs: MS,
    });
    expect(result).toEqual({ ok: true });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

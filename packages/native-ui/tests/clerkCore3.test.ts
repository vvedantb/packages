import { describe, expect, it, vi } from "vitest";
import { clerkCall, signInCalls } from "../src/auth/clerkCore3";

// The Core 3 sign-in resource: calls resolve with `{ error }`, and the state is read from the resource.
function resource(error: unknown = null) {
  const call = () => vi.fn(async (_params?: unknown) => ({ error }));
  return {
    status: "needs_second_factor",
    createdSessionId: null as string | null,
    supportedFirstFactors: [{ strategy: "email_code", emailAddressId: "idn_1" }],
    supportedSecondFactors: [{ strategy: "totp" }],
    create: call(),
    password: call(),
    emailCode: { sendCode: call(), verifyCode: call() },
    phoneCode: { sendCode: call(), verifyCode: call() },
    resetPasswordEmailCode: { sendCode: call(), verifyCode: call(), submitPassword: call() },
    mfa: {
      sendPhoneCode: call(),
      verifyPhoneCode: call(),
      sendEmailCode: call(),
      verifyEmailCode: call(),
      verifyTOTP: call(),
      verifyBackupCode: call(),
    },
    finalize: call(),
  };
}

describe("signInCalls", () => {
  it("throws the error a call resolves with", async () => {
    const error = { errors: [{ code: "form_code_incorrect", message: "Incorrect code" }] };
    await expect(clerkCall(Promise.resolve({ error }))).rejects.toBe(error);
    await expect(signInCalls(resource(error)).password("a@b.co", "pw")).rejects.toBe(error);
    await expect(signInCalls(resource(error)).setActive()).rejects.toBe(error);
  });

  it("returns the sign-in as it stands after the call", async () => {
    const signIn = resource();
    const attempt = await signInCalls(signIn).password("a@b.co", "pw");
    expect(signIn.password).toHaveBeenCalledWith({ identifier: "a@b.co", password: "pw" });
    expect(attempt).toEqual({
      status: "needs_second_factor",
      createdSessionId: null,
      supportedFirstFactors: signIn.supportedFirstFactors,
      supportedSecondFactors: signIn.supportedSecondFactors,
    });
  });

  it("sends each strategy to its own call", async () => {
    const signIn = resource();
    const calls = signInCalls(signIn);
    await calls.prepareFirstFactor({ strategy: "email_code", emailAddressId: "idn_1" });
    expect(signIn.emailCode.sendCode).toHaveBeenCalledWith({ emailAddressId: "idn_1" });
    await calls.prepareFirstFactor({ strategy: "phone_code", phoneNumberId: "idn_2" });
    expect(signIn.phoneCode.sendCode).toHaveBeenCalledWith({ phoneNumberId: "idn_2" });
    await calls.attemptFirstFactor({ strategy: "phone_code", code: "1" });
    expect(signIn.phoneCode.verifyCode).toHaveBeenCalledWith({ code: "1" });
    await calls.prepareSecondFactor({ strategy: "email_code" });
    expect(signIn.mfa.sendEmailCode).toHaveBeenCalledTimes(1);
    expect(signIn.mfa.sendPhoneCode).not.toHaveBeenCalled();
    const verify = {
      totp: signIn.mfa.verifyTOTP,
      backup_code: signIn.mfa.verifyBackupCode,
      phone_code: signIn.mfa.verifyPhoneCode,
      email_code: signIn.mfa.verifyEmailCode,
    } as const;
    for (const strategy of ["totp", "backup_code", "phone_code", "email_code"] as const) {
      await calls.attemptSecondFactor({ strategy, code: "2" });
      expect(verify[strategy]).toHaveBeenCalledWith({ code: "2" });
    }
  });

  it("runs the password reset: new sign-in, emailed code, then the password with other sessions kept", async () => {
    const signIn = resource();
    const calls = signInCalls(signIn);
    await calls.sendResetCode("a@b.co");
    expect(signIn.create).toHaveBeenCalledWith({ identifier: "a@b.co" });
    expect(signIn.resetPasswordEmailCode.sendCode).toHaveBeenCalledTimes(1);
    await calls.verifyResetCode("424242");
    expect(signIn.resetPasswordEmailCode.verifyCode).toHaveBeenCalledWith({ code: "424242" });
    await calls.resetPassword("new-password");
    expect(signIn.resetPasswordEmailCode.submitPassword).toHaveBeenCalledWith({
      password: "new-password",
      signOutOfOtherSessions: false,
    });
  });
});

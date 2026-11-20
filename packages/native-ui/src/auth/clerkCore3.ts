import type { useSignIn } from "@clerk/expo";
import type { IncompleteSignIn } from "./SignInScreen";
import type { PrepareFirstFactorParams, PrepareSecondFactorParams, SecondFactorStrategy } from "./totp";

/** The sign-in resource of the `useSignIn` hook at the root of `@clerk/expo` 4. */
type CoreSignIn = ReturnType<typeof useSignIn>["signIn"];

/**
 * Awaits a call on Clerk's sign-in or sign-up resource. These calls resolve
 * with `{ error }` where the older ones rejected: this throws that error, so
 * `authErrorMessage` and `logAuthFailure` read it as before.
 */
export async function clerkCall(call: Promise<{ error: unknown }>): Promise<void> {
  const { error } = await call;
  if (error) throw error;
}

/**
 * Wraps the sign-in resource for the helpers in `totp.ts` and for
 * `SignInScreen`. Each method makes the call, throws its error, and returns
 * the sign-in as it stands after the call. The methods are `async`, so an
 * error the resource throws at once is also a rejection.
 */
export function signInCalls(signIn: CoreSignIn) {
  const state = (): IncompleteSignIn => ({
    status: signIn.status,
    createdSessionId: signIn.createdSessionId,
    supportedFirstFactors: signIn.supportedFirstFactors,
    supportedSecondFactors: signIn.supportedSecondFactors,
  });
  return {
    get supportedFirstFactors() {
      return signIn.supportedFirstFactors;
    },
    get supportedSecondFactors() {
      return signIn.supportedSecondFactors;
    },
    /** Starts a new sign-in with email and password. */
    async password(identifier: string, password: string) {
      await clerkCall(signIn.password({ identifier, password }));
      return state();
    },
    /** Starts a new sign-in for `identifier` and emails its password-reset code. */
    async sendResetCode(identifier: string) {
      await clerkCall(signIn.create({ identifier }));
      await clerkCall(signIn.resetPasswordEmailCode.sendCode());
    },
    async verifyResetCode(code: string) {
      await clerkCall(signIn.resetPasswordEmailCode.verifyCode({ code }));
      return state();
    },
    /** Sets the new password. Other sessions stay signed in, as before. */
    async resetPassword(password: string) {
      await clerkCall(signIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: false }));
      return state();
    },
    async prepareFirstFactor(params: PrepareFirstFactorParams) {
      if (params.strategy === "phone_code") {
        await clerkCall(signIn.phoneCode.sendCode({ phoneNumberId: params.phoneNumberId }));
      } else {
        await clerkCall(signIn.emailCode.sendCode({ emailAddressId: params.emailAddressId }));
      }
    },
    async attemptFirstFactor(params: { strategy: "email_code" | "phone_code"; code: string }) {
      const { code } = params;
      if (params.strategy === "phone_code") await clerkCall(signIn.phoneCode.verifyCode({ code }));
      else await clerkCall(signIn.emailCode.verifyCode({ code }));
      return state();
    },
    /** Sends the second-factor code. Clerk picks the phone number or email of the sign-in itself. */
    async prepareSecondFactor(params: PrepareSecondFactorParams) {
      if (params.strategy === "phone_code") await clerkCall(signIn.mfa.sendPhoneCode());
      else await clerkCall(signIn.mfa.sendEmailCode());
    },
    async attemptSecondFactor(params: { strategy: SecondFactorStrategy; code: string }) {
      const { code } = params;
      if (params.strategy === "totp") await clerkCall(signIn.mfa.verifyTOTP({ code }));
      else if (params.strategy === "backup_code") await clerkCall(signIn.mfa.verifyBackupCode({ code }));
      else if (params.strategy === "phone_code") await clerkCall(signIn.mfa.verifyPhoneCode({ code }));
      else await clerkCall(signIn.mfa.verifyEmailCode({ code }));
      return state();
    },
    /** Makes the session of a complete sign-in the active one. */
    async setActive() {
      await clerkCall(signIn.finalize());
    },
  };
}

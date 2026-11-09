import { useState } from "react";
import { useSignIn } from "@clerk/clerk-expo";
import { authErrorMessage } from "./authErrors";

/** The messages the second-factor step can show. Generic: none names a provider. */
export const TOTP_MESSAGES = {
  invalidCode: "Incorrect code. Check your authenticator app and try again.",
  invalidCodeGeneric: "Incorrect code. Check it and try again.",
  sendFailed: "Could not send the code. Try again.",
  needsAnotherStep: "This account needs another step to sign in. Finish it on the web.",
  notReady: "Sign in is not ready yet. Try again in a moment.",
} as const;

/** The second-factor strategies the built-in step handles. */
export type SecondFactorStrategy = "totp" | "backup_code" | "phone_code" | "email_code";

/** Default order: the first one the account supports wins. */
export const SECOND_FACTOR_PREFERENCE: readonly SecondFactorStrategy[] = [
  "totp",
  "email_code",
  "phone_code",
  "backup_code",
];

/** One entry of `signIn.supportedSecondFactors`. */
export type SecondFactor = {
  strategy: string;
  emailAddressId?: string;
  phoneNumberId?: string;
  safeIdentifier?: string;
};

type AttemptResult = { status: string | null; createdSessionId: string | null };

/** The part of the sign-in resource that TOTP needs. Tests pass a mock. */
export type TotpSignIn = {
  attemptSecondFactor(params: { strategy: "totp"; code: string }): Promise<AttemptResult>;
};

/** The part of the sign-in resource that any second factor needs. Tests pass a mock. */
export type SecondFactorSignIn = {
  supportedSecondFactors?: SecondFactor[] | null;
  prepareSecondFactor?(params: {
    strategy: "phone_code" | "email_code";
    phoneNumberId?: string;
    emailAddressId?: string;
  }): Promise<unknown>;
  attemptSecondFactor(params: { strategy: SecondFactorStrategy; code: string }): Promise<AttemptResult>;
};

export type TotpSetActive = (params: { session: string }) => Promise<void>;

export type TotpResult = { ok: true } | { ok: false; error: string };

/** The strategies in `factors` that the built-in step handles, in the order given. */
export function supportedSecondFactorStrategies(
  factors: readonly SecondFactor[] | null | undefined,
): SecondFactorStrategy[] {
  const found = new Set((factors ?? []).map((factor) => factor.strategy));
  return SECOND_FACTOR_PREFERENCE.filter((strategy) => found.has(strategy));
}

/** The default strategy: `totp`, then `email_code`, `phone_code`, `backup_code`. `null` when none is supported. */
export function pickSecondFactorStrategy(
  factors: readonly SecondFactor[] | null | undefined,
): SecondFactorStrategy | null {
  return supportedSecondFactorStrategies(factors)[0] ?? null;
}

/**
 * Sends the code for `phone_code` and `email_code`, with the `phoneNumberId` or
 * `emailAddressId` of the matching factor. `totp` and `backup_code` need no
 * prepare: it returns `{ ok: true }` without a call. Never throws.
 */
export async function prepareSecondFactorIfNeeded(args: {
  signIn: Pick<SecondFactorSignIn, "supportedSecondFactors" | "prepareSecondFactor">;
  strategy: SecondFactorStrategy;
  factor?: SecondFactor;
}): Promise<TotpResult> {
  const { signIn, strategy } = args;
  if (strategy !== "phone_code" && strategy !== "email_code") return { ok: true };
  if (!signIn.prepareSecondFactor) return { ok: false, error: TOTP_MESSAGES.sendFailed };
  const factor = args.factor ?? signIn.supportedSecondFactors?.find((item) => item.strategy === strategy);
  try {
    if (strategy === "phone_code") {
      await signIn.prepareSecondFactor({
        strategy,
        ...(factor?.phoneNumberId ? { phoneNumberId: factor.phoneNumberId } : {}),
      });
    } else {
      await signIn.prepareSecondFactor({
        strategy,
        ...(factor?.emailAddressId ? { emailAddressId: factor.emailAddressId } : {}),
      });
    }
    return { ok: true };
  } catch (caught) {
    return { ok: false, error: authErrorMessage(caught, TOTP_MESSAGES.sendFailed) };
  }
}

/**
 * Checks a second-factor code and starts the session. Call
 * `prepareSecondFactorIfNeeded` first for `phone_code` and `email_code`.
 * Never throws: a failure is `{ ok: false, error }`. An API error shows its
 * own text (such as "Incorrect code") unless it names the provider; anything
 * else gives `TOTP_MESSAGES.invalidCode` (`totp`) or `invalidCodeGeneric`.
 */
export async function submitSecondFactor(args: {
  signIn: Pick<SecondFactorSignIn, "attemptSecondFactor">;
  setActive: TotpSetActive;
  code: string;
  strategy: SecondFactorStrategy;
}): Promise<TotpResult> {
  try {
    const attempt = await args.signIn.attemptSecondFactor({ strategy: args.strategy, code: args.code });
    if (attempt.status === "complete" && attempt.createdSessionId) {
      await args.setActive({ session: attempt.createdSessionId });
      return { ok: true };
    }
    return { ok: false, error: TOTP_MESSAGES.needsAnotherStep };
  } catch (caught) {
    const fallback = args.strategy === "totp" ? TOTP_MESSAGES.invalidCode : TOTP_MESSAGES.invalidCodeGeneric;
    return { ok: false, error: authErrorMessage(caught, fallback) };
  }
}

/** Checks a TOTP code and starts the session. TOTP needs no `prepareSecondFactor`. Same as `submitSecondFactor` with `strategy: "totp"`. */
export function submitTotpSecondFactor(args: {
  signIn: TotpSignIn;
  setActive: TotpSetActive;
  code: string;
}): Promise<TotpResult> {
  return submitSecondFactor({ signIn: args.signIn, setActive: args.setActive, code: args.code, strategy: "totp" });
}

export type UseSecondFactorOptions = {
  /** The strategy `submit` uses until `setStrategy` changes it. Default `"totp"`. */
  strategy?: SecondFactorStrategy;
};

export type UseSecondFactorResult = {
  /** Checks the code and starts the session. Never throws. Sets `error` on failure. */
  submit: (code: string) => Promise<TotpResult>;
  /** Sends the code for `phone_code` and `email_code` (no call for the others). Never throws. Sets `error` on failure. */
  prepare: (strategy?: SecondFactorStrategy, factor?: SecondFactor) => Promise<TotpResult>;
  /** The strategy `submit` uses. */
  strategy: SecondFactorStrategy;
  setStrategy: (strategy: SecondFactorStrategy) => void;
  /** True while `submit` or `prepare` runs. */
  loading: boolean;
  /** The last failure message, or `""`. */
  error: string;
  clearError: () => void;
};

/**
 * Completes a sign-in that returned `needs_second_factor`. Default strategy
 * `"totp"` (an authenticator-app code); pass `{ strategy }` or call
 * `setStrategy` for the others. Pair with `SecondFactorScreen`:
 * `onSubmit={submit}`, `error={error}`, `loading={loading}`. After
 * `{ ok: true }` the session is active: navigate in the caller.
 */
export function useSecondFactor(options: UseSecondFactorOptions = {}): UseSecondFactorResult {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [chosen, setChosen] = useState<SecondFactorStrategy | null>(null);
  const strategy = chosen ?? options.strategy ?? "totp";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (code: string): Promise<TotpResult> => {
    if (loading) return { ok: false, error };
    if (!isLoaded || !signIn || !setActive) {
      setError(TOTP_MESSAGES.notReady);
      return { ok: false, error: TOTP_MESSAGES.notReady };
    }
    setLoading(true);
    setError("");
    const result = await submitSecondFactor({ signIn, setActive, code, strategy });
    if (!result.ok) setError(result.error);
    setLoading(false);
    return result;
  };

  const prepare = async (
    prepareStrategy: SecondFactorStrategy = strategy,
    factor?: SecondFactor,
  ): Promise<TotpResult> => {
    if (!isLoaded || !signIn) {
      setError(TOTP_MESSAGES.notReady);
      return { ok: false, error: TOTP_MESSAGES.notReady };
    }
    setLoading(true);
    setError("");
    const result = await prepareSecondFactorIfNeeded({ signIn, strategy: prepareStrategy, factor });
    if (!result.ok) setError(result.error);
    setLoading(false);
    return result;
  };

  return { submit, prepare, strategy, setStrategy: setChosen, loading, error, clearError: () => setError("") };
}

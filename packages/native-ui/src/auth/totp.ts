import { useState } from "react";
import { useSignIn } from "@clerk/clerk-expo";
import {
  authErrorMessage,
  DEFAULT_STAGE_TIMEOUT_MS,
  isAuthTimeoutError,
  logAuthFailure,
  withAuthTimeout,
} from "./authErrors";

/** Logs a timed-out stage. Other failures are not logged here. */
const logTimeout = (stage: string, error: unknown) => {
  if (isAuthTimeoutError(error)) logAuthFailure(stage, error);
};

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
  /** Time for the Clerk call. Default 20000 ms. */
  timeoutMs?: number;
}): Promise<TotpResult> {
  const { signIn, strategy } = args;
  const ms = args.timeoutMs ?? DEFAULT_STAGE_TIMEOUT_MS;
  if (strategy !== "phone_code" && strategy !== "email_code") return { ok: true };
  if (!signIn.prepareSecondFactor) return { ok: false, error: TOTP_MESSAGES.sendFailed };
  const factor = args.factor ?? signIn.supportedSecondFactors?.find((item) => item.strategy === strategy);
  try {
    if (strategy === "phone_code") {
      await withAuthTimeout(
        signIn.prepareSecondFactor({
          strategy,
          ...(factor?.phoneNumberId ? { phoneNumberId: factor.phoneNumberId } : {}),
        }),
        "prepare-second-factor",
        ms,
      );
    } else {
      await withAuthTimeout(
        signIn.prepareSecondFactor({
          strategy,
          ...(factor?.emailAddressId ? { emailAddressId: factor.emailAddressId } : {}),
        }),
        "prepare-second-factor",
        ms,
      );
    }
    return { ok: true };
  } catch (caught) {
    logTimeout("prepare-second-factor", caught);
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
  /** Time for each Clerk call. Default 20000 ms. */
  timeoutMs?: number;
}): Promise<TotpResult> {
  const ms = args.timeoutMs ?? DEFAULT_STAGE_TIMEOUT_MS;
  try {
    const attempt = await withAuthTimeout(
      args.signIn.attemptSecondFactor({ strategy: args.strategy, code: args.code }),
      "attempt-second-factor",
      ms,
    );
    if (attempt.status === "complete" && attempt.createdSessionId) {
      await withAuthTimeout(args.setActive({ session: attempt.createdSessionId }), "set-active", ms);
      return { ok: true };
    }
    return { ok: false, error: TOTP_MESSAGES.needsAnotherStep };
  } catch (caught) {
    logTimeout("attempt-second-factor", caught);
    const fallback = args.strategy === "totp" ? TOTP_MESSAGES.invalidCode : TOTP_MESSAGES.invalidCodeGeneric;
    return { ok: false, error: authErrorMessage(caught, fallback) };
  }
}

/** The first-factor code strategies the built-in step handles. */
export type FirstFactorStrategy = "email_code" | "phone_code";

/** Default order: `email_code`, then `phone_code`. */
export const FIRST_FACTOR_PREFERENCE: readonly FirstFactorStrategy[] = ["email_code", "phone_code"];

/** One entry of `signIn.supportedFirstFactors`. */
export type FirstFactor = {
  strategy: string;
  emailAddressId?: string;
  phoneNumberId?: string;
  safeIdentifier?: string;
};

/** The part of the sign-in resource that a first-factor code needs. Tests pass a mock. */
export type FirstFactorSignIn = {
  supportedFirstFactors?: FirstFactor[] | null;
  prepareFirstFactor?(params: {
    strategy: FirstFactorStrategy;
    phoneNumberId?: string;
    emailAddressId?: string;
  }): Promise<unknown>;
  attemptFirstFactor(params: { strategy: FirstFactorStrategy; code: string }): Promise<AttemptResult>;
};

/** A first-factor result: the attempt, for the caller to route, or an error. */
export type FirstFactorResult = { ok: true; attempt: AttemptResult } | { ok: false; error: string };

/**
 * The first-factor strategies in `factors` that the built-in step handles, in
 * preference order. A factor counts only when it has the id that
 * `prepareFirstFactor` needs (`emailAddressId` or `phoneNumberId`).
 */
export function supportedFirstFactorStrategies(
  factors: readonly FirstFactor[] | null | undefined,
): FirstFactorStrategy[] {
  const list = factors ?? [];
  return FIRST_FACTOR_PREFERENCE.filter((strategy) =>
    list.some(
      (factor) =>
        factor.strategy === strategy &&
        Boolean(strategy === "email_code" ? factor.emailAddressId : factor.phoneNumberId),
    ),
  );
}

/** The default first-factor strategy: `email_code`, then `phone_code`. `null` when none is supported. */
export function pickFirstFactorStrategy(
  factors: readonly FirstFactor[] | null | undefined,
): FirstFactorStrategy | null {
  return supportedFirstFactorStrategies(factors)[0] ?? null;
}

/**
 * Sends the first-factor code with the `emailAddressId` or `phoneNumberId` of
 * the matching factor. Without that id it returns an error and makes no call.
 * Never throws.
 */
export async function prepareFirstFactorIfNeeded(args: {
  signIn: Pick<FirstFactorSignIn, "supportedFirstFactors" | "prepareFirstFactor">;
  strategy: FirstFactorStrategy;
  factor?: FirstFactor;
  /** Time for the Clerk call. Default 20000 ms. */
  timeoutMs?: number;
}): Promise<TotpResult> {
  const { signIn, strategy } = args;
  const ms = args.timeoutMs ?? DEFAULT_STAGE_TIMEOUT_MS;
  if (!signIn.prepareFirstFactor) return { ok: false, error: TOTP_MESSAGES.sendFailed };
  const factor = args.factor ?? signIn.supportedFirstFactors?.find((item) => item.strategy === strategy);
  try {
    if (strategy === "phone_code") {
      if (!factor?.phoneNumberId) return { ok: false, error: TOTP_MESSAGES.sendFailed };
      await withAuthTimeout(
        signIn.prepareFirstFactor({ strategy, phoneNumberId: factor.phoneNumberId }),
        "prepare-first-factor",
        ms,
      );
    } else {
      if (!factor?.emailAddressId) return { ok: false, error: TOTP_MESSAGES.sendFailed };
      await withAuthTimeout(
        signIn.prepareFirstFactor({ strategy, emailAddressId: factor.emailAddressId }),
        "prepare-first-factor",
        ms,
      );
    }
    return { ok: true };
  } catch (caught) {
    logTimeout("prepare-first-factor", caught);
    return { ok: false, error: authErrorMessage(caught, TOTP_MESSAGES.sendFailed) };
  }
}

/**
 * Checks a first-factor code. It does not start the session: the attempt may
 * need a second factor or a new password, so the caller routes it. Never
 * throws: a failure is `{ ok: false, error }`.
 */
export async function submitFirstFactor(args: {
  signIn: Pick<FirstFactorSignIn, "attemptFirstFactor">;
  code: string;
  strategy: FirstFactorStrategy;
  /** Time for the Clerk call. Default 20000 ms. */
  timeoutMs?: number;
}): Promise<FirstFactorResult> {
  try {
    const attempt = await withAuthTimeout(
      args.signIn.attemptFirstFactor({ strategy: args.strategy, code: args.code }),
      "attempt-first-factor",
      args.timeoutMs ?? DEFAULT_STAGE_TIMEOUT_MS,
    );
    return { ok: true, attempt };
  } catch (caught) {
    logTimeout("attempt-first-factor", caught);
    return { ok: false, error: authErrorMessage(caught, TOTP_MESSAGES.invalidCodeGeneric) };
  }
}

/** Checks a TOTP code and starts the session. TOTP needs no `prepareSecondFactor`. Same as `submitSecondFactor` with `strategy: "totp"`. */
export function submitTotpSecondFactor(args: {
  signIn: TotpSignIn;
  setActive: TotpSetActive;
  code: string;
  timeoutMs?: number;
}): Promise<TotpResult> {
  return submitSecondFactor({
    signIn: args.signIn,
    setActive: args.setActive,
    code: args.code,
    strategy: "totp",
    timeoutMs: args.timeoutMs,
  });
}

export type UseSecondFactorOptions = {
  /** The strategy `submit` uses until `setStrategy` changes it. Default `"totp"`. */
  strategy?: SecondFactorStrategy;
  /** Time for each Clerk call, in milliseconds. Default 20000. */
  stageTimeoutMs?: number;
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
  const timeoutMs = options.stageTimeoutMs ?? DEFAULT_STAGE_TIMEOUT_MS;

  const submit = async (code: string): Promise<TotpResult> => {
    if (loading) return { ok: false, error };
    if (!isLoaded || !signIn || !setActive) {
      setError(TOTP_MESSAGES.notReady);
      return { ok: false, error: TOTP_MESSAGES.notReady };
    }
    setLoading(true);
    setError("");
    const result = await submitSecondFactor({ signIn, setActive, code, strategy, timeoutMs });
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
    const result = await prepareSecondFactorIfNeeded({ signIn, strategy: prepareStrategy, factor, timeoutMs });
    if (!result.ok) setError(result.error);
    setLoading(false);
    return result;
  };

  return { submit, prepare, strategy, setStrategy: setChosen, loading, error, clearError: () => setError("") };
}

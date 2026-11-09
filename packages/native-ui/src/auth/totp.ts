import { useState } from "react";
import { useSignIn } from "@clerk/clerk-expo";
import { authErrorMessage } from "./authErrors";

/** The messages the TOTP step can show. Generic: none names a provider. */
export const TOTP_MESSAGES = {
  invalidCode: "Incorrect code. Check your authenticator app and try again.",
  needsAnotherStep: "This account needs another step to sign in. Finish it on the web.",
  notReady: "Sign in is not ready yet. Try again in a moment.",
} as const;

/** The part of the sign-in resource that TOTP needs. Tests pass a mock. */
export type TotpSignIn = {
  attemptSecondFactor(params: {
    strategy: "totp";
    code: string;
  }): Promise<{ status: string | null; createdSessionId: string | null }>;
};

export type TotpSetActive = (params: { session: string }) => Promise<void>;

export type TotpResult = { ok: true } | { ok: false; error: string };

/**
 * Checks a TOTP code and starts the session. TOTP needs no
 * `prepareSecondFactor`. Never throws: a failure is `{ ok: false, error }`.
 * An API error shows its own text (such as "Incorrect code") unless it names
 * the provider; anything else gives `TOTP_MESSAGES.invalidCode`.
 */
export async function submitTotpSecondFactor(args: {
  signIn: TotpSignIn;
  setActive: TotpSetActive;
  code: string;
}): Promise<TotpResult> {
  try {
    const attempt = await args.signIn.attemptSecondFactor({ strategy: "totp", code: args.code });
    if (attempt.status === "complete" && attempt.createdSessionId) {
      await args.setActive({ session: attempt.createdSessionId });
      return { ok: true };
    }
    return { ok: false, error: TOTP_MESSAGES.needsAnotherStep };
  } catch (caught) {
    return { ok: false, error: authErrorMessage(caught, TOTP_MESSAGES.invalidCode) };
  }
}

export type UseSecondFactorResult = {
  /** Checks the code and starts the session. Never throws. Sets `error` on failure. */
  submit: (code: string) => Promise<TotpResult>;
  /** True while `submit` runs. */
  loading: boolean;
  /** The last failure message, or `""`. */
  error: string;
  clearError: () => void;
};

/**
 * Completes a sign-in that returned `needs_second_factor`, with an
 * authenticator-app code. Pair with `SecondFactorScreen`:
 * `onSubmit={submit}`, `error={error}`, `loading={loading}`. After
 * `{ ok: true }` the session is active: navigate in the caller.
 */
export function useSecondFactor(): UseSecondFactorResult {
  const { isLoaded, signIn, setActive } = useSignIn();
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
    const result = await submitTotpSecondFactor({ signIn, setActive, code });
    if (!result.ok) setError(result.error);
    setLoading(false);
    return result;
  };

  return { submit, loading, error, clearError: () => setError("") };
}

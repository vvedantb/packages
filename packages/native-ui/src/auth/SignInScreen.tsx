import { useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Text, TextInput, View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { Button } from "../Button";
import { textStyle } from "../controlStyles";
import { Input } from "../Input";
import { PasswordInput } from "../PasswordInput";
import { toast } from "../toastStore";
import { useScheme } from "../useScheme";
import { AuthScreen, FieldError, OrDivider } from "./AuthScreen";
import {
  authErrorMessage,
  DEFAULT_STAGE_TIMEOUT_MS,
  isAuthTimeoutError,
  logAuthFailure,
  withAuthTimeout,
} from "./authErrors";
import { clerkCall, signInCalls } from "./clerkCore3";
import { SecondFactorScreen } from "./SecondFactorScreen";
import {
  pickFirstFactorStrategy,
  pickSecondFactorStrategy,
  prepareFirstFactorIfNeeded,
  submitFirstFactor,
  supportedFirstFactorStrategies,
  supportedSecondFactorStrategies,
  useSecondFactor,
  type FirstFactor,
  type FirstFactorStrategy,
  type SecondFactor,
  type SecondFactorStrategy,
} from "./totp";
import { GoogleSignInButton, type AuthNavigationOptions } from "./GoogleSignInButton";

export type SignInMode = "sign-in" | "sign-up" | "reset-password";

/** The messages the screen can show. Generic: none names a provider. */
export const AUTH_MESSAGES = {
  missingFields: "Enter your email and password",
  signInFailed: "Sign in failed",
  invalidCredentials: "Invalid email or password",
  signUpFailed: "Could not create account",
  verifyFailed: "Invalid code",
  missingCode: "Enter the code from the email",
  needsAnotherStep: "This account needs another step to sign in. Finish it on the web.",
  secondFactorTitle: "Two-step verification",
  secondFactorDescription: "Enter the code from your authenticator app.",
  emailCodeTitle: "Check your email",
  emailCodeDescription: "Enter the code we sent to your email.",
  phoneCodeTitle: "Check your phone",
  phoneCodeDescription: "Enter the code we sent by text message.",
  backupCodeTitle: "Enter a backup code",
  backupCodeDescription: "Use one of the backup codes you saved when you set up two-step verification.",
  clientTrustTitle: "Verify it's you",
  clientTrustEmailDescription: "This device is new. Enter the code we sent to your email.",
  clientTrustPhoneDescription: "This device is new. Enter the code we sent by text message.",
  useBackupCode: "Use a backup code",
  useAuthenticator: "Use authenticator app",
  useEmailCode: "Email me a code",
  usePhoneCode: "Text me a code",
  newPasswordTitle: "Set a new password",
  newPasswordDescription: "Your password must change before you can sign in.",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm new password",
  passwordMismatch: "The passwords do not match",
  passwordTooShort: "Use a longer password",
  resetPasswordFailed: "Could not set the new password",
  setPassword: "Set password",
  missingNewPassword: "Enter a new password",
  confirmSignUpPasswordLabel: "Confirm password",
  forgotPassword: "Forgot password?",
  resetTitle: "Reset password",
  resetSubtitle: "Enter your email and we will send you a code.",
  resetNewPasswordDescription: "Choose a new password for your account.",
  missingEmail: "Enter your email",
  sendResetCode: "Send code",
  sendResetFailed: "Could not send the code",
  resendCode: "Send a new code",
} as const;

/**
 * A sign-in that is not complete, as `signIn.create` returns it. Passed to
 * `onIncomplete` so the app can run the step itself.
 */
export type IncompleteSignIn = {
  status: string | null;
  createdSessionId: string | null;
  supportedFirstFactors?: Array<{ strategy: string; [key: string]: unknown }> | null;
  supportedSecondFactors?: SecondFactor[] | null;
};

const METHOD_LABEL: Record<SecondFactorStrategy, string> = {
  totp: AUTH_MESSAGES.useAuthenticator,
  email_code: AUTH_MESSAGES.useEmailCode,
  phone_code: AUTH_MESSAGES.usePhoneCode,
  backup_code: AUTH_MESSAGES.useBackupCode,
};

function secondFactorCopy(strategy: SecondFactorStrategy, clientTrust: boolean) {
  if (strategy === "email_code") {
    return clientTrust
      ? { title: AUTH_MESSAGES.clientTrustTitle, description: AUTH_MESSAGES.clientTrustEmailDescription }
      : { title: AUTH_MESSAGES.emailCodeTitle, description: AUTH_MESSAGES.emailCodeDescription };
  }
  if (strategy === "phone_code") {
    return clientTrust
      ? { title: AUTH_MESSAGES.clientTrustTitle, description: AUTH_MESSAGES.clientTrustPhoneDescription }
      : { title: AUTH_MESSAGES.phoneCodeTitle, description: AUTH_MESSAGES.phoneCodeDescription };
  }
  if (strategy === "backup_code") {
    return { title: AUTH_MESSAGES.backupCodeTitle, description: AUTH_MESSAGES.backupCodeDescription };
  }
  return { title: AUTH_MESSAGES.secondFactorTitle, description: AUTH_MESSAGES.secondFactorDescription };
}

export type SignInScreenProps = AuthNavigationOptions & {
  /**
   * Default `"sign-in"`. `"sign-up"` creates the account and checks an emailed
   * code. `"reset-password"` emails a code, checks it, then sets a new password
   * and signs in.
   */
  mode?: SignInMode;
  /** Default "Welcome back", "Create account" in `sign-up`, or "Reset password" in `reset-password`. */
  title?: string;
  /** Default "Sign in to continue", "Sign up to get started" in `sign-up`, or the reset hint in `reset-password`. */
  subtitle?: string;
  /** The app URL scheme, such as `"vibot"`, for the Google redirect `scheme://sso-callback`. */
  scheme: string;
  /** Default `"sso-callback"`. */
  redirectPath?: string;
  /** Default `true`. */
  showGoogle?: boolean;
  /** Default "Continue with Google". */
  googleLabel?: string;
  /** In `sign-in`: the "Sign up" link in the footer. No link without it. */
  signUpHref?: Href;
  /** In `sign-up` and `reset-password`: the "Sign in" link in the footer. No link without it. */
  signInHref?: Href;
  /**
   * In `sign-in`: the "Forgot password?" link under the password, to a route
   * that renders `ResetPasswordScreen`. No link without it.
   */
  forgotPasswordHref?: Href;
  /** Sign-up and the new-password step reject a shorter password before sending it. Default: no check. */
  minPasswordLength?: number;
  /** Default `"toast"`. `"inline"` shows errors under the fields. */
  errorDisplay?: "toast" | "inline";
  /** Prefix for every `testID`: `sign-in-email`, `sign-in-password`, `sign-in-submit` and the rest. Default the mode. */
  testIDPrefix?: string;
  /** Above the title. App brand chrome goes here. */
  header?: ReactNode;
  /** Below the footer link row, such as an app credit. */
  footer?: ReactNode;
  /**
   * Called with the sign-in when the built-in UI cannot finish it:
   * `needs_identifier`, any unknown status, `needs_first_factor` when no
   * `email_code` or `phone_code` first factor exists (with its id), and
   * `needs_second_factor` or `needs_client_trust` when no supported strategy
   * (totp, backup code, phone code, email code) exists. The built-in screen
   * runs `needs_first_factor` with an email or phone code, and always runs
   * `needs_second_factor`, `needs_client_trust` and `needs_new_password`
   * itself. When called, the web-fallback message is not
   * shown. Without it, the screen shows the web fallback and logs
   * `console.warn`. Ignored in `sign-up`.
   */
  onIncomplete?: (signIn: IncompleteSignIn) => void;
  /**
   * Time for each Clerk call (create, prepare, attempt, reset password,
   * set active), in milliseconds. A call that takes longer fails with code
   * `auth_timeout`. Default 20000.
   */
  stageTimeoutMs?: number;
};

/**
 * Email and password, and Google, sign-in or sign-up. Sign-up sends an email
 * code and checks it before the session starts. On success it calls
 * `onSuccess`, or `router.replace(afterAuthHref, replaceOptions)`.
 *
 * Sign-up has a confirm-password field: a mismatch blocks the submit and shows
 * under the field, whatever `errorDisplay` is.
 *
 * `mode="reset-password"` (`ResetPasswordScreen`) is the forgot-password flow:
 * email, then the emailed code, then a new password typed twice. It ends
 * signed in, through the same second-factor step when the account has one.
 * `forgotPasswordHref` links the sign-in form to it.
 */
export function SignInScreen({
  mode = "sign-in",
  title,
  subtitle,
  scheme,
  redirectPath,
  afterAuthHref = "/",
  replaceOptions,
  onSuccess,
  showGoogle = true,
  googleLabel,
  signUpHref,
  signInHref,
  forgotPasswordHref,
  minPasswordLength,
  errorDisplay = "toast",
  testIDPrefix,
  header,
  footer,
  onIncomplete,
  stageTimeoutMs = DEFAULT_STAGE_TIMEOUT_MS,
}: SignInScreenProps) {
  // Both are always defined: before Clerk loads, a call waits for it.
  const signIn = signInCalls(useSignIn().signIn);
  const signUpAttempt = useSignUp().signUp;
  const router = useRouter();
  const colorScheme = useScheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pendingSecondFactor, setPendingSecondFactor] = useState(false);
  const [pendingFirstFactor, setPendingFirstFactor] = useState(false);
  const [firstFactors, setFirstFactors] = useState<FirstFactor[]>([]);
  const [firstStrategy, setFirstStrategy] = useState<FirstFactorStrategy>("email_code");
  const [firstLoading, setFirstLoading] = useState(false);
  const [firstError, setFirstError] = useState("");
  const [factors, setFactors] = useState<SecondFactor[]>([]);
  const [clientTrust, setClientTrust] = useState(false);
  const [pendingNewPassword, setPendingNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [pendingResetCode, setPendingResetCode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCodeError, setResetCodeError] = useState("");
  const secondFactor = useSecondFactor({ stageTimeoutMs });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The field each "next" key moves to.
  const passwordField = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmField = useRef<ComponentRef<typeof TextInput>>(null);
  const signUp = mode === "sign-up";
  const reset = mode === "reset-password";
  const id = (name: string) => `${testIDPrefix ?? mode}-${name}`;

  const fail = (heading: string, message: string) => {
    if (errorDisplay === "inline") setError(message);
    else toast.error(heading, message === heading ? undefined : { description: message });
  };

  const done = () => {
    if (onSuccess) onSuccess();
    else router.replace(afterAuthHref, replaceOptions);
  };

  const warnIncomplete = (attempt: IncompleteSignIn) => {
    console.warn(
      `[native-ui] Sign-in not complete: status=${attempt.status}, ` +
        `secondFactors=${JSON.stringify((attempt.supportedSecondFactors ?? []).map((f) => f.strategy))}, ` +
        `firstFactors=${JSON.stringify((attempt.supportedFirstFactors ?? []).map((f) => f.strategy))}. ` +
        "Pass onIncomplete to handle it in the app.",
    );
  };

  // A status the built-in UI cannot finish: the app's `onIncomplete`, or the web fallback.
  const unhandled = (attempt: IncompleteSignIn) => {
    if (onIncomplete) return onIncomplete(attempt);
    warnIncomplete(attempt);
    fail(AUTH_MESSAGES.signInFailed, AUTH_MESSAGES.needsAnotherStep);
  };

  const chooseStrategy = async (strategy: SecondFactorStrategy, list: SecondFactor[]) => {
    secondFactor.clearError();
    secondFactor.setStrategy(strategy);
    setPendingSecondFactor(true);
    await secondFactor.prepare(
      strategy,
      list.find((factor) => factor.strategy === strategy),
    );
  };

  const startSecondFactor = async (attempt: IncompleteSignIn, trust: boolean) => {
    const list = attempt.supportedSecondFactors ?? [];
    const strategy = pickSecondFactorStrategy(list);
    if (!strategy) return unhandled(attempt);
    setFactors(list);
    setClientTrust(trust);
    await chooseStrategy(strategy, list);
  };

  const chooseFirstStrategy = async (strategy: FirstFactorStrategy, list: FirstFactor[]) => {
    setFirstError("");
    setFirstStrategy(strategy);
    setPendingFirstFactor(true);
    setFirstLoading(true);
    const sent = await prepareFirstFactorIfNeeded({
      signIn,
      strategy,
      factor: list.find((factor) => factor.strategy === strategy),
      timeoutMs: stageTimeoutMs,
    });
    if (!sent.ok) setFirstError(sent.error);
    setFirstLoading(false);
  };

  const startFirstFactor = async (attempt: IncompleteSignIn) => {
    const list = attempt.supportedFirstFactors ?? [];
    const strategy = pickFirstFactorStrategy(list);
    if (!strategy) return unhandled(attempt);
    setFirstFactors(list);
    await chooseFirstStrategy(strategy, list);
  };

  // Routes a sign-in attempt. `needs_first_factor` is built in only after `signIn.create`.
  const routeAttempt = async (attempt: IncompleteSignIn, afterCreate: boolean) => {
    // Clerk's `SignInStatus` omits `needs_client_trust`: widen before comparing.
    const status: string | null = attempt.status;
    if (status === "complete" && attempt.createdSessionId) {
      await withAuthTimeout(signIn.setActive(), "set-active", stageTimeoutMs);
      done();
    } else if (status === "needs_new_password") {
      setPendingFirstFactor(false);
      setPendingResetCode(false);
      setPendingNewPassword(true);
    } else if (status === "needs_second_factor" || status === "needs_client_trust") {
      setPendingFirstFactor(false);
      setPendingResetCode(false);
      await startSecondFactor(attempt, status === "needs_client_trust");
    } else if (status === "needs_first_factor" && afterCreate) {
      await startFirstFactor(attempt);
    } else {
      unhandled(attempt);
    }
  };

  const onFirstFactor = async (firstCode: string) => {
    if (firstLoading) return;
    setFirstLoading(true);
    setFirstError("");
    const result = await submitFirstFactor({
      signIn,
      code: firstCode,
      strategy: firstStrategy,
      timeoutMs: stageTimeoutMs,
    });
    if (!result.ok) {
      setFirstError(result.error);
      setFirstLoading(false);
      return;
    }
    try {
      await routeAttempt(result.attempt, false);
    } catch (caught) {
      if (isAuthTimeoutError(caught)) logAuthFailure("set-active", caught);
      setFirstError(authErrorMessage(caught, AUTH_MESSAGES.verifyFailed));
    } finally {
      setFirstLoading(false);
    }
  };

  const onNewPassword = async () => {
    if (submitting) return;
    if (!newPassword) return fail(AUTH_MESSAGES.resetPasswordFailed, AUTH_MESSAGES.missingNewPassword);
    if (minPasswordLength && newPassword.length < minPasswordLength) {
      return fail(AUTH_MESSAGES.resetPasswordFailed, `Use at least ${minPasswordLength} characters for the password`);
    }
    if (newPassword !== confirmPassword) {
      return fail(AUTH_MESSAGES.resetPasswordFailed, AUTH_MESSAGES.passwordMismatch);
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await withAuthTimeout(signIn.resetPassword(newPassword), "reset-password", stageTimeoutMs);
      // Clerk's `SignInStatus` omits `needs_client_trust`: widen before comparing.
      const afterReset: string | null = result.status;
      if (afterReset === "complete" && result.createdSessionId) {
        await withAuthTimeout(signIn.setActive(), "set-active", stageTimeoutMs);
        done();
      } else if (afterReset === "needs_second_factor" || afterReset === "needs_client_trust") {
        // A reset on an account with two-step verification: the code step, then the session.
        setPendingNewPassword(false);
        await startSecondFactor(result, afterReset === "needs_client_trust");
      } else if (onIncomplete) {
        onIncomplete(result);
      } else {
        warnIncomplete(result);
        fail(AUTH_MESSAGES.resetPasswordFailed, AUTH_MESSAGES.needsAnotherStep);
      }
    } catch (caught) {
      if (isAuthTimeoutError(caught)) logAuthFailure("reset-password", caught);
      fail(AUTH_MESSAGES.resetPasswordFailed, authErrorMessage(caught, AUTH_MESSAGES.resetPasswordFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const onSignIn = async () => {
    if (submitting) return;
    if (!email || !password) return fail(AUTH_MESSAGES.signInFailed, AUTH_MESSAGES.missingFields);
    setSubmitting(true);
    setError("");
    try {
      const attempt = await withAuthTimeout(signIn.password(email, password), "create", stageTimeoutMs);
      await routeAttempt(attempt, true);
    } catch (caught) {
      logAuthFailure("create", caught);
      fail(
        AUTH_MESSAGES.signInFailed,
        authErrorMessage(caught, AUTH_MESSAGES.invalidCredentials, { credentials: true }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Emails the reset code. Throws what the call throws.
  const requestResetCode = async () => {
    await withAuthTimeout(signIn.sendResetCode(email.trim()), "create", stageTimeoutMs);
  };

  const onResetRequest = async () => {
    if (submitting) return;
    if (!email.trim()) return fail(AUTH_MESSAGES.sendResetFailed, AUTH_MESSAGES.missingEmail);
    setSubmitting(true);
    setError("");
    try {
      await requestResetCode();
      setResetCodeError("");
      setPendingResetCode(true);
    } catch (caught) {
      logAuthFailure("create", caught);
      fail(AUTH_MESSAGES.sendResetFailed, authErrorMessage(caught, AUTH_MESSAGES.sendResetFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const onResetResend = async () => {
    if (resetLoading) return;
    setResetLoading(true);
    setResetCodeError("");
    try {
      await requestResetCode();
    } catch (caught) {
      logAuthFailure("create", caught);
      setResetCodeError(authErrorMessage(caught, AUTH_MESSAGES.sendResetFailed));
    } finally {
      setResetLoading(false);
    }
  };

  // Checks the emailed code. A good code gives `needs_new_password`, which `routeAttempt` shows.
  const onResetCode = async (resetCode: string) => {
    if (resetLoading) return;
    setResetLoading(true);
    setResetCodeError("");
    try {
      const attempt = await withAuthTimeout(signIn.verifyResetCode(resetCode), "attempt-first-factor", stageTimeoutMs);
      const status: string | null = attempt.status;
      const known = ["complete", "needs_new_password", "needs_second_factor", "needs_client_trust"];
      if (status && known.includes(status)) {
        await routeAttempt(attempt, false);
      } else if (onIncomplete) {
        onIncomplete(attempt);
      } else {
        warnIncomplete(attempt);
        setResetCodeError(AUTH_MESSAGES.needsAnotherStep);
      }
    } catch (caught) {
      if (isAuthTimeoutError(caught)) logAuthFailure("attempt-first-factor", caught);
      setResetCodeError(authErrorMessage(caught, AUTH_MESSAGES.verifyFailed));
    } finally {
      setResetLoading(false);
    }
  };

  const onSecondFactor = async (secondFactorCode: string) => {
    const result = await secondFactor.submit(secondFactorCode);
    if (result.ok) done();
  };

  const onSecondFactorBack = () => {
    // The pending attempt stays; the next `signIn.create` replaces it.
    setPendingSecondFactor(false);
    setPendingFirstFactor(false);
    setFirstError("");
    setPendingResetCode(false);
    setResetCodeError("");
    setPendingNewPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPassword("");
    setError("");
    secondFactor.clearError();
  };

  const onSignUp = async () => {
    if (submitting) return;
    if (!email || !password) return fail(AUTH_MESSAGES.signUpFailed, AUTH_MESSAGES.missingFields);
    if (minPasswordLength && password.length < minPasswordLength) {
      return fail(AUTH_MESSAGES.signUpFailed, `Use at least ${minPasswordLength} characters for the password`);
    }
    if (password !== signUpConfirm) {
      // Always under the confirm field, also with `errorDisplay="toast"`.
      setError("");
      setMismatch(true);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await clerkCall(signUpAttempt.password({ emailAddress: email, password }));
      await clerkCall(signUpAttempt.verifications.sendEmailCode());
      setPendingVerification(true);
    } catch (caught) {
      fail(AUTH_MESSAGES.signUpFailed, authErrorMessage(caught, AUTH_MESSAGES.signUpFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async () => {
    if (submitting) return;
    if (!code) return fail(AUTH_MESSAGES.verifyFailed, AUTH_MESSAGES.missingCode);
    setSubmitting(true);
    setError("");
    try {
      await clerkCall(signUpAttempt.verifications.verifyEmailCode({ code }));
      if (signUpAttempt.status === "complete" && signUpAttempt.createdSessionId) {
        await clerkCall(signUpAttempt.finalize());
        done();
      } else {
        fail(AUTH_MESSAGES.verifyFailed, AUTH_MESSAGES.needsAnotherStep);
      }
    } catch (caught) {
      fail(AUTH_MESSAGES.verifyFailed, authErrorMessage(caught, AUTH_MESSAGES.verifyFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const toSignIn = signUp || reset;
  const linkHref = toSignIn ? signInHref : signUpHref;
  const footerRow = (
    <>
      {linkHref && !pendingVerification ? (
        <>
          <Text className="font-instrument-sans text-sm" style={textStyle("muted", colorScheme)}>
            {reset ? "Remembered your password?" : signUp ? "Already have an account?" : "Don't have an account?"}
          </Text>
          <Button
            testID={id(toSignIn ? "sign-in-link" : "sign-up-link")}
            variant="link"
            size="sm"
            fullWidth={false}
            onPress={() => router.push(linkHref)}
          >
            {toSignIn ? "Sign in" : "Sign up"}
          </Button>
        </>
      ) : null}
      {footer}
    </>
  );
  const hasFooter = Boolean((linkHref && !pendingVerification) || footer);

  if (pendingNewPassword) {
    return (
      <AuthScreen
        testID={id("new-password-screen")}
        title={AUTH_MESSAGES.newPasswordTitle}
        subtitle={reset ? AUTH_MESSAGES.resetNewPasswordDescription : AUTH_MESSAGES.newPasswordDescription}
        header={header}
      >
        <PasswordInput
          testID={id("new-password")}
          accessibilityLabel={AUTH_MESSAGES.newPasswordLabel}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          autoFocus
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmField.current?.focus()}
          value={newPassword}
          placeholder={AUTH_MESSAGES.newPasswordLabel}
          onChangeText={setNewPassword}
        />
        <PasswordInput
          testID={id("confirm-password")}
          ref={confirmField}
          accessibilityLabel={AUTH_MESSAGES.confirmPasswordLabel}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          value={confirmPassword}
          placeholder={AUTH_MESSAGES.confirmPasswordLabel}
          onChangeText={setConfirmPassword}
          onSubmitEditing={() => void onNewPassword()}
        />
        <FieldError testID={id("error")} message={error} />
        <Button testID={id("new-password-submit")} loading={submitting} onPress={() => void onNewPassword()}>
          {AUTH_MESSAGES.setPassword}
        </Button>
        <Button testID={id("new-password-back")} variant="ghost" onPress={onSecondFactorBack}>
          {reset ? "Use a different email" : "Use a different account"}
        </Button>
      </AuthScreen>
    );
  }

  if (pendingResetCode && !pendingSecondFactor) {
    return (
      <SecondFactorScreen
        key="reset-code"
        title={AUTH_MESSAGES.emailCodeTitle}
        description={AUTH_MESSAGES.emailCodeDescription}
        footer={
          <Button
            testID={id("resend")}
            variant="link"
            size="sm"
            fullWidth={false}
            disabled={resetLoading}
            onPress={() => void onResetResend()}
          >
            {AUTH_MESSAGES.resendCode}
          </Button>
        }
        onSubmit={onResetCode}
        error={resetCodeError}
        loading={resetLoading}
        onBack={onSecondFactorBack}
        backLabel="Use a different email"
        header={header}
        testIDPrefix={id("email-code")}
      />
    );
  }

  if (pendingFirstFactor && !pendingSecondFactor && !pendingNewPassword) {
    const others = supportedFirstFactorStrategies(firstFactors).filter((strategy) => strategy !== firstStrategy);
    const switchTo = others[0] ?? null;
    const copy = secondFactorCopy(firstStrategy, false);
    return (
      <SecondFactorScreen
        key={`first-${firstStrategy}`}
        title={copy.title}
        description={copy.description}
        footer={
          switchTo ? (
            <Button
              testID={id("first-factor-switch")}
              variant="link"
              size="sm"
              fullWidth={false}
              disabled={firstLoading}
              onPress={() => void chooseFirstStrategy(switchTo, firstFactors)}
            >
              {METHOD_LABEL[switchTo]}
            </Button>
          ) : undefined
        }
        onSubmit={onFirstFactor}
        error={firstError}
        loading={firstLoading}
        onBack={onSecondFactorBack}
        backLabel="Use a different account"
        header={header}
        testIDPrefix={id("first-factor")}
      />
    );
  }

  if (pendingSecondFactor) {
    const active = secondFactor.strategy;
    const available = supportedSecondFactorStrategies(factors);
    const others = available.filter((strategy) => strategy !== active);
    // From a backup code, go back to the default non-backup method. Otherwise offer a backup code.
    const switchTo =
      active === "backup_code"
        ? pickSecondFactorStrategy(factors.filter((factor) => factor.strategy !== "backup_code"))
        : others.includes("backup_code")
          ? "backup_code"
          : null;
    const copy = secondFactorCopy(active, clientTrust);
    const backup = active === "backup_code";
    return (
      <SecondFactorScreen
        key={active}
        title={copy.title}
        description={copy.description}
        codeLength={backup ? 8 : 6}
        digitsOnly={!backup}
        placeholder="Backup code"
        footer={
          switchTo ? (
            <Button
              testID={id("second-factor-switch")}
              variant="link"
              size="sm"
              fullWidth={false}
              disabled={secondFactor.loading}
              onPress={() => void chooseStrategy(switchTo, factors)}
            >
              {METHOD_LABEL[switchTo]}
            </Button>
          ) : undefined
        }
        onSubmit={onSecondFactor}
        error={secondFactor.error}
        loading={secondFactor.loading}
        onBack={onSecondFactorBack}
        backLabel="Use a different account"
        header={header}
        testIDPrefix={id("second-factor")}
      />
    );
  }

  if (pendingVerification) {
    return (
      <AuthScreen
        testID={id("screen")}
        title="Check your email"
        subtitle="Enter the code we sent to your email."
        header={header}
        footer={hasFooter ? footerRow : undefined}
      >
        <Input
          testID={id("code")}
          accessibilityLabel="Verification code"
          value={code}
          placeholder="Verification code"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoFocus
          returnKeyType="go"
          onChangeText={setCode}
          onSubmitEditing={() => void onVerify()}
        />
        <FieldError testID={id("error")} message={error} />
        <Button testID={id("verify")} loading={submitting} onPress={() => void onVerify()}>
          Verify
        </Button>
        <Button
          testID={id("back")}
          variant="ghost"
          onPress={() => {
            setPendingVerification(false);
            setCode("");
            setError("");
          }}
        >
          Use a different email
        </Button>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      testID={id("screen")}
      title={title ?? (reset ? AUTH_MESSAGES.resetTitle : signUp ? "Create account" : "Welcome back")}
      subtitle={
        subtitle ?? (reset ? AUTH_MESSAGES.resetSubtitle : signUp ? "Sign up to get started" : "Sign in to continue")
      }
      header={header}
      footer={hasFooter ? footerRow : undefined}
    >
      {showGoogle && !reset ? (
        <>
          <GoogleSignInButton
            testID={id("google")}
            scheme={scheme}
            redirectPath={redirectPath}
            afterAuthHref={afterAuthHref}
            replaceOptions={replaceOptions}
            onSuccess={onSuccess}
            onError={(message) => fail(message, message)}
            label={googleLabel}
            disabled={submitting}
          />
          <OrDivider />
        </>
      ) : null}
      <Input
        testID={id("email")}
        accessibilityLabel="Email"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType={reset ? "go" : "next"}
        submitBehavior={reset ? undefined : "submit"}
        onSubmitEditing={() => (reset ? void onResetRequest() : passwordField.current?.focus())}
        value={email}
        placeholder="Email"
        onChangeText={setEmail}
      />
      {reset ? null : (
        <PasswordInput
          testID={id("password")}
          ref={passwordField}
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete={signUp ? "new-password" : "password"}
          textContentType={signUp ? "newPassword" : "password"}
          returnKeyType={signUp ? "next" : "go"}
          submitBehavior={signUp ? "submit" : undefined}
          value={password}
          placeholder="Password"
          onChangeText={(text) => {
            setPassword(text);
            setMismatch(false);
          }}
          onSubmitEditing={() => (signUp ? confirmField.current?.focus() : void onSignIn())}
        />
      )}
      {signUp ? (
        <>
          <PasswordInput
            testID={id("confirm-password")}
            ref={confirmField}
            accessibilityLabel={AUTH_MESSAGES.confirmSignUpPasswordLabel}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            value={signUpConfirm}
            placeholder={AUTH_MESSAGES.confirmSignUpPasswordLabel}
            onChangeText={(text) => {
              setSignUpConfirm(text);
              setMismatch(false);
            }}
            onSubmitEditing={() => void onSignUp()}
          />
          <FieldError testID={id("confirm-error")} message={mismatch ? AUTH_MESSAGES.passwordMismatch : ""} />
        </>
      ) : null}
      {!signUp && !reset && forgotPasswordHref ? (
        <View className="items-end">
          <Button
            testID={id("forgot-password")}
            variant="link"
            size="sm"
            fullWidth={false}
            onPress={() => router.push(forgotPasswordHref)}
          >
            {AUTH_MESSAGES.forgotPassword}
          </Button>
        </View>
      ) : null}
      <FieldError testID={id("error")} message={error} />
      <Button
        testID={id("submit")}
        loading={submitting}
        onPress={() => void (reset ? onResetRequest() : signUp ? onSignUp() : onSignIn())}
      >
        {reset ? AUTH_MESSAGES.sendResetCode : signUp ? "Create account" : "Sign in"}
      </Button>
      {/* Bot protection mounts its widget here on web sign-up. */}
      {signUp ? <View nativeID="clerk-captcha" /> : null}
    </AuthScreen>
  );
}

export type SignUpScreenProps = Omit<SignInScreenProps, "mode">;

/** `SignInScreen` with `mode="sign-up"`. */
export function SignUpScreen(props: SignUpScreenProps) {
  return <SignInScreen {...props} mode="sign-up" />;
}

export type ResetPasswordScreenProps = Omit<SignInScreenProps, "mode">;

/** `SignInScreen` with `mode="reset-password"`: the forgot-password flow. */
export function ResetPasswordScreen(props: ResetPasswordScreenProps) {
  return <SignInScreen {...props} mode="reset-password" />;
}

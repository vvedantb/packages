import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Button } from "../Button";
import { textStyle } from "../controlStyles";
import { Input } from "../Input";
import { PasswordInput } from "../PasswordInput";
import { toast } from "../toastStore";
import { useScheme } from "../useScheme";
import { AuthScreen, FieldError, OrDivider } from "./AuthScreen";
import { authErrorMessage, logAuthFailure } from "./authErrors";
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

export type SignInMode = "sign-in" | "sign-up";

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
  /** Default `"sign-in"`. `"sign-up"` creates the account and checks an emailed code. */
  mode?: SignInMode;
  /** Default "Welcome back", or "Create account" in `sign-up`. */
  title?: string;
  /** Default "Sign in to continue", or "Sign up to get started" in `sign-up`. */
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
  signUpHref?: string;
  /** In `sign-up`: the "Sign in" link in the footer. No link without it. */
  signInHref?: string;
  /** Sign-up rejects a shorter password before sending it. Default: no check. */
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
};

/**
 * Email and password, and Google, sign-in or sign-up. Sign-up sends an email
 * code and checks it before the session starts. On success it calls
 * `onSuccess`, or `router.replace(afterAuthHref, replaceOptions)`.
 *
 * Forgot-password is not here: an app that needs it keeps its own screen.
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
  minPasswordLength,
  errorDisplay = "toast",
  testIDPrefix,
  header,
  footer,
  onIncomplete,
}: SignInScreenProps) {
  const signInState = useSignIn();
  const signUpState = useSignUp();
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
  const secondFactor = useSecondFactor();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const signUp = mode === "sign-up";
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
    const { signIn } = signInState;
    if (!signIn) return;
    setFirstError("");
    setFirstStrategy(strategy);
    setPendingFirstFactor(true);
    setFirstLoading(true);
    const sent = await prepareFirstFactorIfNeeded({
      signIn,
      strategy,
      factor: list.find((factor) => factor.strategy === strategy),
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
    const { setActive } = signInState;
    // Clerk's `SignInStatus` omits `needs_client_trust`: widen before comparing.
    const status: string | null = attempt.status;
    if (status === "complete" && attempt.createdSessionId && setActive) {
      await setActive({ session: attempt.createdSessionId });
      done();
    } else if (status === "needs_new_password") {
      setPendingFirstFactor(false);
      setPendingNewPassword(true);
    } else if (status === "needs_second_factor" || status === "needs_client_trust") {
      setPendingFirstFactor(false);
      await startSecondFactor(attempt, status === "needs_client_trust");
    } else if (status === "needs_first_factor" && afterCreate) {
      await startFirstFactor(attempt);
    } else {
      unhandled(attempt);
    }
  };

  const onFirstFactor = async (firstCode: string) => {
    const { isLoaded, signIn } = signInState;
    if (!isLoaded || !signIn || firstLoading) return;
    setFirstLoading(true);
    setFirstError("");
    const result = await submitFirstFactor({ signIn, code: firstCode, strategy: firstStrategy });
    if (!result.ok) {
      setFirstError(result.error);
      setFirstLoading(false);
      return;
    }
    try {
      await routeAttempt(result.attempt, false);
    } catch (caught) {
      setFirstError(authErrorMessage(caught, AUTH_MESSAGES.verifyFailed));
    } finally {
      setFirstLoading(false);
    }
  };

  const onNewPassword = async () => {
    const { isLoaded, signIn, setActive } = signInState;
    if (!isLoaded || !signIn || !setActive || submitting) return;
    if (!newPassword) return fail(AUTH_MESSAGES.resetPasswordFailed, AUTH_MESSAGES.missingFields);
    if (minPasswordLength && newPassword.length < minPasswordLength) {
      return fail(AUTH_MESSAGES.resetPasswordFailed, `Use at least ${minPasswordLength} characters for the password`);
    }
    if (newPassword !== confirmPassword) {
      return fail(AUTH_MESSAGES.resetPasswordFailed, AUTH_MESSAGES.passwordMismatch);
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await signIn.resetPassword({ password: newPassword });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        done();
      } else if (onIncomplete) {
        onIncomplete(result);
      } else {
        warnIncomplete(result);
        fail(AUTH_MESSAGES.resetPasswordFailed, AUTH_MESSAGES.needsAnotherStep);
      }
    } catch (caught) {
      fail(AUTH_MESSAGES.resetPasswordFailed, authErrorMessage(caught, AUTH_MESSAGES.resetPasswordFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const onSignIn = async () => {
    const { isLoaded, signIn, setActive } = signInState;
    if (!isLoaded || !signIn || !setActive || submitting) return;
    if (!email || !password) return fail(AUTH_MESSAGES.signInFailed, AUTH_MESSAGES.missingFields);
    setSubmitting(true);
    setError("");
    try {
      const attempt = await signIn.create({ identifier: email, password });
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

  const onSecondFactor = async (secondFactorCode: string) => {
    const result = await secondFactor.submit(secondFactorCode);
    if (result.ok) done();
  };

  const onSecondFactorBack = () => {
    // The pending attempt stays; the next `signIn.create` replaces it.
    setPendingSecondFactor(false);
    setPendingFirstFactor(false);
    setFirstError("");
    setPendingNewPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    setPassword("");
    setError("");
    secondFactor.clearError();
  };

  const onSignUp = async () => {
    const { isLoaded, signUp: attempt } = signUpState;
    if (!isLoaded || !attempt || submitting) return;
    if (!email || !password) return fail(AUTH_MESSAGES.signUpFailed, AUTH_MESSAGES.missingFields);
    if (minPasswordLength && password.length < minPasswordLength) {
      return fail(AUTH_MESSAGES.signUpFailed, `Use at least ${minPasswordLength} characters for the password`);
    }
    setSubmitting(true);
    setError("");
    try {
      await attempt.create({ emailAddress: email, password });
      await attempt.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (caught) {
      fail(AUTH_MESSAGES.signUpFailed, authErrorMessage(caught, AUTH_MESSAGES.signUpFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async () => {
    const { isLoaded, signUp: attempt, setActive } = signUpState;
    if (!isLoaded || !attempt || !setActive || submitting) return;
    if (!code) return fail(AUTH_MESSAGES.verifyFailed, AUTH_MESSAGES.missingCode);
    setSubmitting(true);
    setError("");
    try {
      const result = await attempt.attemptEmailAddressVerification({ code });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
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

  const linkHref = signUp ? signInHref : signUpHref;
  const footerRow = (
    <>
      {linkHref && !pendingVerification ? (
        <>
          <Text className="font-instrument-sans text-sm" style={textStyle("muted", colorScheme)}>
            {signUp ? "Already have an account?" : "Don't have an account?"}
          </Text>
          <Button
            testID={id(signUp ? "sign-in-link" : "sign-up-link")}
            variant="link"
            size="sm"
            fullWidth={false}
            onPress={() => router.push(linkHref)}
          >
            {signUp ? "Sign in" : "Sign up"}
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
        subtitle={AUTH_MESSAGES.newPasswordDescription}
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
          value={newPassword}
          placeholder={AUTH_MESSAGES.newPasswordLabel}
          onChangeText={setNewPassword}
        />
        <PasswordInput
          testID={id("confirm-password")}
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
          Use a different account
        </Button>
      </AuthScreen>
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
      title={title ?? (signUp ? "Create account" : "Welcome back")}
      subtitle={subtitle ?? (signUp ? "Sign up to get started" : "Sign in to continue")}
      header={header}
      footer={hasFooter ? footerRow : undefined}
    >
      {showGoogle ? (
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
        returnKeyType="next"
        value={email}
        placeholder="Email"
        onChangeText={setEmail}
      />
      <PasswordInput
        testID={id("password")}
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete={signUp ? "new-password" : "password"}
        textContentType={signUp ? "newPassword" : "password"}
        returnKeyType="go"
        value={password}
        placeholder="Password"
        onChangeText={setPassword}
        onSubmitEditing={() => void (signUp ? onSignUp() : onSignIn())}
      />
      <FieldError testID={id("error")} message={error} />
      <Button
        testID={id("submit")}
        loading={submitting}
        onPress={() => void (signUp ? onSignUp() : onSignIn())}
      >
        {signUp ? "Create account" : "Sign in"}
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

import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Button } from "../Button";
import { textStyle } from "../controlStyles";
import { Input } from "../Input";
import { toast } from "../toastStore";
import { useScheme } from "../useScheme";
import { AuthScreen, FieldError, OrDivider } from "./AuthScreen";
import { authErrorMessage } from "./authErrors";
import { SecondFactorScreen } from "./SecondFactorScreen";
import { useSecondFactor } from "./totp";
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
} as const;

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

  const onSignIn = async () => {
    const { isLoaded, signIn, setActive } = signInState;
    if (!isLoaded || !signIn || !setActive || submitting) return;
    if (!email || !password) return fail(AUTH_MESSAGES.signInFailed, AUTH_MESSAGES.missingFields);
    setSubmitting(true);
    setError("");
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === "complete" && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId });
        done();
      } else if (attempt.status === "needs_second_factor") {
        setPendingSecondFactor(true);
      } else {
        fail(AUTH_MESSAGES.signInFailed, AUTH_MESSAGES.needsAnotherStep);
      }
    } catch (caught) {
      fail(AUTH_MESSAGES.signInFailed, authErrorMessage(caught, AUTH_MESSAGES.invalidCredentials));
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

  if (pendingSecondFactor) {
    return (
      <SecondFactorScreen
        title={AUTH_MESSAGES.secondFactorTitle}
        description={AUTH_MESSAGES.secondFactorDescription}
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
      <Input
        testID={id("password")}
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoComplete={signUp ? "new-password" : "password"}
        textContentType={signUp ? "newPassword" : "password"}
        secureTextEntry
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

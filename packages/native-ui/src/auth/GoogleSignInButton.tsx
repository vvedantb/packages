import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { GoogleMark } from "../brand/GoogleMark";
import { Button, type ButtonProps } from "../Button";
import { toast } from "../toastStore";
import { authErrorMessage } from "./authErrors";

// Completes the Google browser session when the app reopens on the redirect.
WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_ERROR_MESSAGE = "Could not continue with Google";

export type AuthNavigationOptions = {
  /** Where to go after a session starts. Default `"/"`. */
  afterAuthHref?: string;
  /** Passed to `router.replace`, such as `{ withAnchor: true }`. */
  replaceOptions?: object;
  /** Called after a session starts, in place of `router.replace`. */
  onSuccess?: () => void;
};

export type GoogleSignInOptions = AuthNavigationOptions & {
  /** The app URL scheme, such as `"vibot"`, for the redirect `scheme://sso-callback`. */
  scheme: string;
  /** Default `"sso-callback"`. */
  redirectPath?: string;
  /** Called with a message for the user. Default: an error toast. */
  onError?: (message: string) => void;
};

/** Warms the Android custom tab while the screen is up, as the Expo guide suggests. */
export function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync().catch(() => {});
    return () => {
      void WebBrowser.coolDownAsync().catch(() => {});
    };
  }, []);
}

/** Starts the Google flow, sets the session and navigates. Returns `[start, busy]`. */
export function useGoogleSignIn({
  scheme,
  redirectPath = "sso-callback",
  afterAuthHref = "/",
  replaceOptions,
  onSuccess,
  onError,
}: GoogleSignInOptions): [() => Promise<void>, boolean] {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme, path: redirectPath }),
      });
      // No session: the user closed the browser, or more steps are needed.
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        if (onSuccess) onSuccess();
        else router.replace(afterAuthHref, replaceOptions);
      }
    } catch (error) {
      const message = authErrorMessage(error, GOOGLE_ERROR_MESSAGE);
      if (onError) onError(message);
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  return [start, busy];
}

export type GoogleSignInButtonProps = GoogleSignInOptions &
  Omit<ButtonProps, "onPress" | "children" | "leftIcon" | "loading"> & {
    /** Default "Continue with Google". */
    label?: string;
  };

/** An outline button with the Google mark that runs `useGoogleSignIn`. */
export function GoogleSignInButton({
  scheme,
  redirectPath,
  afterAuthHref,
  replaceOptions,
  onSuccess,
  onError,
  label = "Continue with Google",
  testID = "google-sign-in",
  variant = "outline",
  ...props
}: GoogleSignInButtonProps) {
  useWarmUpBrowser();
  const [start, busy] = useGoogleSignIn({ scheme, redirectPath, afterAuthHref, replaceOptions, onSuccess, onError });
  return (
    <Button
      {...props}
      testID={testID}
      variant={variant}
      leftIcon={<GoogleMark />}
      loading={busy}
      onPress={() => void start()}
    >
      {label}
    </Button>
  );
}

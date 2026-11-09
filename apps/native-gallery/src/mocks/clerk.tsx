// A stand-in for `@clerk/clerk-expo`, wired in by `metro.config.js`. The gallery
// has no Clerk keys and makes no network call. The hooks return enough for the
// native-ui auth screens to render and to take input. Nothing signs in.
import type { ReactNode } from "react";

export const ClerkProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const ClerkLoaded = ({ children }: { children: ReactNode }) => <>{children}</>;

export const useAuth = () => ({ isLoaded: true, isSignedIn: false, getToken: async () => null });

const reject = async () => {
  throw new Error("Mock Clerk: sign-in is not available in the gallery");
};

export const useSignIn = () => ({
  isLoaded: true,
  setActive: async () => undefined,
  signIn: { create: reject, prepareFirstFactor: reject, attemptFirstFactor: reject, prepareSecondFactor: reject, attemptSecondFactor: reject, resetPassword: reject },
});

export const useSignUp = () => ({
  isLoaded: true,
  setActive: async () => undefined,
  signUp: { create: reject, prepareEmailAddressVerification: reject, attemptEmailAddressVerification: reject },
});

export const useSSO = () => ({ startSSOFlow: reject });

export const isClerkAPIResponseError = () => false;

export type TokenCache = unknown;

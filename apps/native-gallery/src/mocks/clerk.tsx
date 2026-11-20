// A stand-in for `@clerk/expo` and `@clerk/expo/legacy`, wired in by `metro.config.js`. The gallery
// has no Clerk keys and makes no network call. The hooks return enough for the
// native-ui auth screens to render and to take input. Nothing signs in.
// The password reset runs end to end: any email gets a "code", `424242` is the
// right one, and the new password is accepted.
import type { ReactNode } from "react";

export const ClerkProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const ClerkLoaded = ({ children }: { children: ReactNode }) => <>{children}</>;

export const useAuth = () => ({ isLoaded: true, isSignedIn: false, getToken: async () => null });

const reject = async () => {
  throw new Error("Mock Clerk: sign-in is not available in the gallery");
};

const RESET_STRATEGY = "reset_password_email_code";
export const MOCK_RESET_CODE = "424242";

type MockParams = { strategy?: string; code?: string };

const create = async (params: MockParams) => {
  if (params.strategy !== RESET_STRATEGY) return reject();
  return { status: "needs_first_factor", createdSessionId: null };
};

const attemptFirstFactor = async (params: MockParams) => {
  if (params.strategy !== RESET_STRATEGY) return reject();
  if (params.code !== MOCK_RESET_CODE) {
    // The shape of an API error, which `authErrorMessage` reads.
    throw { errors: [{ code: "form_code_incorrect", message: "Incorrect code" }] };
  }
  return { status: "needs_new_password", createdSessionId: null };
};

const resetPassword = async () => ({ status: "complete", createdSessionId: "sess_mock" });

export const useSignIn = () => ({
  isLoaded: true,
  setActive: async () => undefined,
  signIn: { create, prepareFirstFactor: reject, attemptFirstFactor, prepareSecondFactor: reject, attemptSecondFactor: reject, resetPassword },
});

export const useSignUp = () => ({
  isLoaded: true,
  setActive: async () => undefined,
  signUp: { create: reject, prepareEmailAddressVerification: reject, attemptEmailAddressVerification: reject },
});

export const MOCK_CURRENT_PASSWORD = "correct-horse";

// The signed-in user: the current password is `correct-horse`, and deleting works.
const mockUser = {
  passwordEnabled: true,
  updatePassword: async (params: { currentPassword?: string }) => {
    if (params.currentPassword !== MOCK_CURRENT_PASSWORD) {
      throw { errors: [{ code: "form_password_incorrect", message: "Password is incorrect. Try again." }] };
    }
  },
  delete: async () => undefined,
};

export const useUser = () => ({ isLoaded: true as const, isSignedIn: true as const, user: mockUser });

export const useSSO = () => ({ startSSOFlow: reject });

export const isClerkAPIResponseError = () => false;

export type TokenCache = unknown;

// A stand-in for `@clerk/expo`, wired in by `metro.config.js`. The gallery
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

// The sign-in and sign-up calls of `@clerk/expo` 4 do not reject: they resolve with `{ error }`.
const ok = async () => ({ error: null });
const unavailable = async () => ({ error: new Error("Mock Clerk: sign-in is not available in the gallery") });

export const MOCK_RESET_CODE = "424242";

// One sign-in for the app, as in Clerk: the calls change it, and the screens read it after each call.
const signIn = {
  status: "needs_identifier",
  createdSessionId: null as string | null,
  supportedFirstFactors: [] as { strategy: string }[],
  supportedSecondFactors: [] as { strategy: string }[],
  // `create` with an identifier alone starts the password reset.
  create: async () => {
    signIn.status = "needs_first_factor";
    signIn.createdSessionId = null;
    return { error: null };
  },
  password: unavailable,
  emailCode: { sendCode: unavailable, verifyCode: unavailable },
  phoneCode: { sendCode: unavailable, verifyCode: unavailable },
  resetPasswordEmailCode: {
    sendCode: ok,
    verifyCode: async (params: { code: string }) => {
      if (params.code !== MOCK_RESET_CODE) {
        // The shape of an API error, which `authErrorMessage` reads.
        return { error: { errors: [{ code: "form_code_incorrect", message: "Incorrect code" }] } };
      }
      signIn.status = "needs_new_password";
      return { error: null };
    },
    submitPassword: async () => {
      signIn.status = "complete";
      signIn.createdSessionId = "sess_mock";
      return { error: null };
    },
  },
  mfa: {
    sendPhoneCode: unavailable,
    verifyPhoneCode: unavailable,
    sendEmailCode: unavailable,
    verifyEmailCode: unavailable,
    verifyTOTP: unavailable,
    verifyBackupCode: unavailable,
  },
  // Nothing signs in: the next reset starts from a new sign-in.
  finalize: async () => {
    signIn.status = "needs_identifier";
    signIn.createdSessionId = null;
    return { error: null };
  },
};

export const useSignIn = () => ({ errors: null, fetchStatus: "idle" as const, signIn });

const signUp = {
  status: "missing_requirements",
  createdSessionId: null as string | null,
  create: unavailable,
  password: unavailable,
  verifications: { sendEmailCode: unavailable, verifyEmailCode: unavailable },
  finalize: unavailable,
};

export const useSignUp = () => ({ errors: null, fetchStatus: "idle" as const, signUp });

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

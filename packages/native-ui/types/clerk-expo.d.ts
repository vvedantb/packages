/**
 * Stub for `@clerk/expo`, used only by `pnpm typecheck` (see
 * `peers.d.ts`). `pnpm typecheck:consumer` leaves it out and uses the real types.
 */

declare module "@clerk/expo" {
  import type * as React from "react";

  export interface TokenCache {
    getToken(key: string): Promise<string | undefined | null>;
    saveToken(key: string, token: string): Promise<void>;
    clearToken?(key: string): void | Promise<void>;
  }
  export const ClerkProvider: React.ComponentType<{
    publishableKey: string;
    tokenCache?: TokenCache;
    children?: React.ReactNode;
  }>;
  export const ClerkLoaded: React.ComponentType<{ children?: React.ReactNode }>;
  export function useAuth(options?: { treatPendingAsSignedOut?: boolean }): {
    isLoaded: boolean;
    isSignedIn: boolean | undefined;
    sessionId: string | null | undefined;
    getToken(options?: { template?: string; skipCache?: boolean }): Promise<string | null>;
    orgId?: string | null;
    orgRole?: string | null;
  };
  type SetActive = (params: { session: string | null }) => Promise<void>;
  export function useUser():
    | { isLoaded: false; isSignedIn: undefined; user: undefined }
    | { isLoaded: true; isSignedIn: false; user: null }
    | {
        isLoaded: true;
        isSignedIn: true;
        user: {
          passwordEnabled: boolean;
          updatePassword(params: {
            newPassword: string;
            currentPassword?: string;
            signOutOfOtherSessions?: boolean;
          }): Promise<unknown>;
          delete(): Promise<void>;
        };
      };
  export function useSSO(): {
    startSSOFlow(params: { strategy: string; redirectUrl?: string }): Promise<{
      createdSessionId: string | null;
      setActive?: SetActive;
    }>;
  };
  export function isClerkAPIResponseError(
    error: unknown,
  ): error is { errors: Array<{ code: string; message: string; longMessage?: string }> };

  /** What every call on the sign-in and sign-up resources resolves with. */
  type CallResult = Promise<{ error: unknown }>;
  // A type alias, as in Clerk: an interface is not assignable to an index signature.
  type FactorInfo = {
    strategy: string;
    emailAddressId?: string;
    phoneNumberId?: string;
    safeIdentifier?: string;
  };
  type CodeCalls = { verifyCode(params: { code: string }): CallResult };
  /** The Core 3 hooks: `{ errors, fetchStatus, signIn }`. The resource is defined before Clerk loads. */
  export function useSignIn(): {
    errors: unknown;
    fetchStatus: "idle" | "fetching";
    signIn: {
      readonly status: string;
      readonly createdSessionId: string | null;
      readonly supportedFirstFactors: FactorInfo[];
      readonly supportedSecondFactors: FactorInfo[];
      create(params: { identifier?: string }): CallResult;
      password(params: { identifier: string; password: string }): CallResult;
      emailCode: CodeCalls & { sendCode(params?: { emailAddressId?: string }): CallResult };
      phoneCode: CodeCalls & { sendCode(params?: { phoneNumberId: string }): CallResult };
      resetPasswordEmailCode: CodeCalls & {
        sendCode(): CallResult;
        submitPassword(params: { password: string; signOutOfOtherSessions?: boolean }): CallResult;
      };
      mfa: {
        sendPhoneCode(): CallResult;
        verifyPhoneCode(params: { code: string }): CallResult;
        sendEmailCode(): CallResult;
        verifyEmailCode(params: { code: string }): CallResult;
        verifyTOTP(params: { code: string }): CallResult;
        verifyBackupCode(params: { code: string }): CallResult;
      };
      finalize(): CallResult;
    };
  };
  export function useSignUp(): {
    errors: unknown;
    fetchStatus: "idle" | "fetching";
    signUp: {
      readonly status: string;
      readonly createdSessionId: string | null;
      password(params: { emailAddress: string; password: string }): CallResult;
      verifications: {
        sendEmailCode(): CallResult;
        verifyEmailCode(params: { code: string }): CallResult;
      };
      finalize(): CallResult;
    };
  };
}

/**
 * Stub for `@clerk/clerk-expo`, used only by `pnpm typecheck` (see
 * `peers.d.ts`). `pnpm typecheck:consumer` leaves it out and uses the real types.
 */

declare module "@clerk/clerk-expo" {
  import type * as React from "react";

  export interface TokenCache {
    getToken(key: string): Promise<string | undefined | null>;
    saveToken(key: string, token: string): Promise<void>;
    clearToken?(key: string): void | Promise<void>;
  }
  export const ClerkProvider: React.ComponentType<{
    publishableKey?: string;
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
  interface Attempt {
    status: string | null;
    createdSessionId: string | null;
    supportedFirstFactors?: Array<{ strategy: string; [key: string]: unknown }> | null;
    supportedSecondFactors?: SecondFactorInfo[] | null;
  }
  export interface SecondFactorInfo {
    strategy: string;
    emailAddressId?: string;
    phoneNumberId?: string;
    safeIdentifier?: string;
    [key: string]: unknown;
  }
  export function useSignIn():
    | { isLoaded: false; signIn: undefined; setActive: undefined }
    | {
        isLoaded: true;
        signIn: {
          create(params: { identifier: string; password?: string }): Promise<Attempt>;
          supportedFirstFactors: SecondFactorInfo[] | null;
          prepareFirstFactor(params: {
            strategy: "phone_code" | "email_code";
            phoneNumberId?: string;
            emailAddressId?: string;
          }): Promise<Attempt>;
          attemptFirstFactor(params: { strategy: "phone_code" | "email_code"; code: string }): Promise<Attempt>;
          supportedSecondFactors: SecondFactorInfo[] | null;
          prepareSecondFactor(params: {
            strategy: "phone_code" | "email_code";
            phoneNumberId?: string;
            emailAddressId?: string;
          }): Promise<Attempt>;
          attemptSecondFactor(params: {
            strategy: "totp" | "backup_code" | "phone_code" | "email_code";
            code: string;
          }): Promise<Attempt>;
          resetPassword(params: { password: string; signOutOfOtherSessions?: boolean }): Promise<Attempt>;
        };
        setActive: SetActive;
      };
  export function useSignUp():
    | { isLoaded: false; signUp: undefined; setActive: undefined }
    | {
        isLoaded: true;
        signUp: {
          create(params: { emailAddress: string; password?: string }): Promise<Attempt>;
          prepareEmailAddressVerification(params: { strategy: "email_code" }): Promise<unknown>;
          attemptEmailAddressVerification(params: { code: string }): Promise<Attempt>;
        };
        setActive: SetActive;
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
}

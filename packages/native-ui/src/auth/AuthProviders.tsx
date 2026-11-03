import type { ReactNode } from "react";
import { ClerkLoaded, ClerkProvider, useAuth as useClerkAuth, type TokenCache } from "@clerk/clerk-expo";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";

export type AuthProvidersProps = {
  children: ReactNode;
  /** The Clerk publishable key. The app reads it from its own config; this component does not check it. */
  publishableKey?: string;
  /** `tokenCache` from `@clerk/clerk-expo/token-cache`, so the session survives a restart. */
  tokenCache?: TokenCache;
  /** A Convex client. Without one, the children sit under Clerk only (vmem). */
  convex?: ConvexReactClient | null;
  /** `useAuth` from `@clerk/clerk-expo`, for `ConvexProviderWithClerk`. Default: the one this package imports. */
  useAuth?: typeof useClerkAuth;
  /** Wrap the children in `ClerkLoaded`, so they wait for the session. Default `true`. */
  loaded?: boolean;
  /**
   * Default `true`. `false` drops Clerk: the children sit under a plain
   * `ConvexProvider` (or nothing without `convex`), as the web
   * `ConvexClerkProvider` does for UI preview builds.
   */
  clerk?: boolean;
};

/**
 * The Clerk and Convex providers from the apps' root `_layout.tsx`:
 * `ClerkProvider` › `ConvexProviderWithClerk` (with `convex`) › `ClerkLoaded`
 * (with `loaded`) › children.
 */
export function AuthProviders({
  children,
  publishableKey,
  tokenCache,
  convex,
  useAuth = useClerkAuth,
  loaded = true,
  clerk = true,
}: AuthProvidersProps) {
  if (!clerk) {
    return convex ? <ConvexProvider client={convex}>{children}</ConvexProvider> : <>{children}</>;
  }
  const inner = loaded ? <ClerkLoaded>{children}</ClerkLoaded> : children;
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {convex ? (
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {inner}
        </ConvexProviderWithClerk>
      ) : (
        inner
      )}
    </ClerkProvider>
  );
}

import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

/** The two Clerk `useAuth` fields the hook reads. */
export type ClerkAuthSlice = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
};

export type StableAuthOptions = {
  /** How long a sign-in loss reads as "still loading". Default 2000 ms. */
  debounceMs?: number;
};

// Tracks sign-in during this session to detect stale deploy auth loss.
let wasEverSignedIn = false;

/**
 * Test-only. Clears the module-level "was ever signed in" flag so one test
 * cannot leak state into the next. Do not call from app code.
 */
export function resetStableAuthSession(): void {
  wasEverSignedIn = false;
}

/**
 * Build a `useAuth` wrapper that debounces a brief signed-in to signed-out
 * flicker (for example after a deploy) by reporting `isLoaded: false` for
 * `debounceMs`, so Convex does not cascade on a transient auth loss.
 */
export function createUseStableAuth<T extends ClerkAuthSlice>(
  useAuthHook: () => T,
  options: StableAuthOptions = {},
): () => T {
  const debounceMs = options.debounceMs ?? 2000;

  return function useStableAuth(): T {
    const auth = useAuthHook();
    const [overrideLoading, setOverrideLoading] = useState(false);

    useEffect(() => {
      if (auth.isSignedIn) {
        wasEverSignedIn = true;
        setOverrideLoading(false);
        return;
      }

      if (wasEverSignedIn && auth.isLoaded && !auth.isSignedIn) {
        setOverrideLoading(true);
        const timer = setTimeout(() => {
          wasEverSignedIn = false;
          setOverrideLoading(false);
        }, debounceMs);
        return () => clearTimeout(timer);
      }

      setOverrideLoading(false);
    }, [auth.isLoaded, auth.isSignedIn]);

    if (overrideLoading) {
      return { ...auth, isLoaded: false };
    }
    return auth;
  };
}

/** `useAuth` from `@clerk/clerk-react` with the 2000 ms debounce. */
export const useStableAuth: () => ReturnType<typeof useAuth> =
  createUseStableAuth(useAuth);

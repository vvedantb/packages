import { useConvexAuth, useMutation } from "convex/react";
import type { FunctionReference } from "convex/server";
import { useEffect } from "react";

/** A public mutation that takes no args, such as `api.users.ensureUserExists`. */
export type EnsureUserMutation = FunctionReference<"mutation", "public", Record<string, never>>;

/**
 * Call `mutation({})` each time Convex auth becomes authenticated, logging a
 * failure with `console.error`. Needs a Convex auth provider above it
 * (`ConvexClerkProvider` with Clerk on). Kept as an effect: it syncs the
 * server's users row with the sign-in state, and there is no render-time
 * alternative.
 */
export function useEnsureUser(mutation: EnsureUserMutation): void {
  const { isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(mutation);

  useEffect(() => {
    if (isAuthenticated) {
      ensureUser({}).catch(console.error);
    }
  }, [isAuthenticated, ensureUser]);
}

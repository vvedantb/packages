import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ComponentProps, ReactNode } from "react";

/** The `useAuth` hook `ConvexProviderWithClerk` takes (Clerk's, or a wrapper such as `useStableAuth`). */
export type ConvexClerkUseAuth = ComponentProps<typeof ConvexProviderWithClerk>["useAuth"];

export type ConvexClerkProviderProps = {
  /** No client (for example no Convex URL configured): children render without a provider. */
  client: ConvexReactClient | null | undefined;
  /** Default: `useAuth` from `@clerk/clerk-react`. */
  useAuth?: ConvexClerkUseAuth;
  /** `false` renders a plain `ConvexProvider` (no Clerk auth). Default `true`. */
  clerk?: boolean;
  children: ReactNode;
};

/**
 * The Convex provider for a Clerk app: `ConvexProviderWithClerk`, a plain
 * `ConvexProvider` when `clerk` is `false`, or just the children when there is
 * no client. Render it inside `ClerkProvider` unless `clerk` is `false`.
 */
export function ConvexClerkProvider({
  client,
  useAuth = useClerkAuth,
  clerk = true,
  children,
}: ConvexClerkProviderProps) {
  if (!client) return children;
  if (!clerk) return <ConvexProvider client={client}>{children}</ConvexProvider>;
  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}

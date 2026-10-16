export type ClerkClientEnv = {
  CLERK_SECRET_KEY?: string | undefined;
  CLERK_PUBLISHABLE_KEY?: string | undefined;
};

/**
 * Build a Clerk backend client from env. The factory is injected so this
 * package does not import `@clerk/backend`; pass its `createClerkClient`.
 * Throws when either key is missing.
 */
export function getClerkClient<T>(
  createClerkClient: (opts: { secretKey: string; publishableKey: string }) => T,
  env: ClerkClientEnv = process.env,
): T {
  const secretKey = env.CLERK_SECRET_KEY;
  const publishableKey = env.CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    const missing = [
      secretKey ? null : "CLERK_SECRET_KEY",
      publishableKey ? null : "CLERK_PUBLISHABLE_KEY",
    ].filter((name) => name !== null);
    throw new Error(`${missing.join(" and ")} is not set in Convex env`);
  }
  return createClerkClient({ secretKey, publishableKey });
}

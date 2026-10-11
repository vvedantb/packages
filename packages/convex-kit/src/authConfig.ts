export type ClerkAuthConfigEnv = { CLERK_FRONTEND_API_URL?: string | undefined };

/**
 * Convex `auth.config.ts` for Clerk. The domain comes from
 * `CLERK_FRONTEND_API_URL`; the application ID is always `"convex"`.
 *
 * ```ts
 * import { clerkAuthConfig } from "@vvedantb/convex-kit";
 * export default clerkAuthConfig();
 * ```
 */
export function clerkAuthConfig(
  env: ClerkAuthConfigEnv = process.env,
): {
  providers: Array<{ domain: string | undefined; applicationID: string }>;
} {
  return {
    providers: [
      {
        domain: env.CLERK_FRONTEND_API_URL,
        applicationID: "convex",
      },
    ],
  };
}

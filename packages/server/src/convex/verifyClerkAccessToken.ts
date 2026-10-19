import type { Thrown } from "../mcp/json.js";

/** Token types `@clerk/backend`'s `authenticateRequest` accepts. */
export type ClerkTokenType = "session_token" | "oauth_token" | "api_key" | "m2m_token";

/** The fields read from `state.toAuth()`. Clerk's auth objects match it structurally. */
export type ClerkAuthLike = {
  isAuthenticated: boolean;
  tokenType: string | null;
  userId?: string | null;
};

/** The fields read from `authenticateRequest`'s result. */
export type ClerkRequestStateLike<Auth extends ClerkAuthLike> =
  | { isAuthenticated: true; toAuth(): Auth }
  | { isAuthenticated: false; reason: string | null; message: string | null };

/**
 * The part of a `@clerk/backend` client this uses. A real `ClerkClient` fits
 * without a cast, so this package does not import `@clerk/backend`.
 */
export type ClerkLike<Auth extends ClerkAuthLike> = {
  authenticateRequest(
    request: Request,
    options: { acceptsToken: ClerkTokenType[] },
  ): Promise<ClerkRequestStateLike<Auth>>;
};

/** Why a token was rejected without throwing. */
export type ClerkVerifyRejection =
  /** `authenticateRequest` returned an unauthenticated state. */
  | { kind: "unauthenticated"; reason: string | null; message: string | null }
  /** `toAuth()` was not authenticated, or its token type is not accepted. */
  | { kind: "wrong-token"; tokenType: string | null }
  /** `toAuth().userId` is not a non-empty string. */
  | { kind: "no-user" };

export type VerifyClerkAccessTokenOptions = {
  /** Default `["oauth_token", "session_token"]`. Also the allowed `toAuth().tokenType` values. */
  acceptsToken?: ClerkTokenType[];
  /** Called once before returning `null` for a rejected token. Default: silent. */
  onReject?: (rejection: ClerkVerifyRejection) => void;
  /** Called with anything thrown (client factory, `Request`, Clerk) before returning `null`. Default: silent. */
  onError?: (error: Thrown) => void;
};

export type VerifiedClerkToken<Auth extends ClerkAuthLike> = {
  userId: string;
  tokenType: ClerkTokenType;
  /** `state.toAuth()`, for app-specific claims. */
  auth: Auth;
};

const DEFAULT_ACCEPTED: ClerkTokenType[] = ["oauth_token", "session_token"];

function acceptedType(
  accepted: readonly ClerkTokenType[],
  tokenType: string | null,
): ClerkTokenType | undefined {
  return accepted.find((type) => type === tokenType);
}

/**
 * Verify a bearer token with Clerk: `authenticateRequest` on a synthetic
 * `https://mcp.local/` request carrying `Authorization: Bearer <token>`, then
 * require an authenticated `toAuth()` with an accepted token type and a
 * non-empty `userId`. Returns `null` on any rejection and on any throw.
 *
 * Pass a factory (`() => getClerkClient(createClerkClient)`) to build the
 * client inside the same `try`, so missing env also yields `null` + `onError`.
 * Logs nothing by default; `consoleClerkVerifyLogger` has the usual messages.
 *
 * `auth` is typed `ClerkAuthLike` unless you pass `Auth` explicitly, e.g.
 * `verifyClerkAccessToken<SignedInAuthObject | AuthenticatedMachineObject<"oauth_token">>(...)`
 * (types from `@clerk/backend/internal`).
 * It is not inferred from the client: TypeScript would pick the last
 * `authenticateRequest` overload, which only covers session tokens.
 */
export async function verifyClerkAccessToken<Auth extends ClerkAuthLike = ClerkAuthLike>(
  clerk: ClerkLike<NoInfer<Auth>> | (() => ClerkLike<NoInfer<Auth>>),
  token: string,
  options: VerifyClerkAccessTokenOptions = {},
): Promise<VerifiedClerkToken<Auth> | null> {
  const accepted = options.acceptsToken ?? DEFAULT_ACCEPTED;
  try {
    const client = typeof clerk === "function" ? clerk() : clerk;
    const request = new Request("https://mcp.local/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const state = await client.authenticateRequest(request, { acceptsToken: [...accepted] });
    if (!state.isAuthenticated) {
      options.onReject?.({ kind: "unauthenticated", reason: state.reason, message: state.message });
      return null;
    }
    const auth = state.toAuth();
    const tokenType = auth.isAuthenticated ? acceptedType(accepted, auth.tokenType) : undefined;
    if (!tokenType) {
      options.onReject?.({ kind: "wrong-token", tokenType: auth.tokenType });
      return null;
    }
    if (typeof auth.userId !== "string" || auth.userId.length === 0) {
      options.onReject?.({ kind: "no-user" });
      return null;
    }
    return { userId: auth.userId, tokenType, auth };
  } catch (err) {
    options.onError?.(err);
    return null;
  }
}

/**
 * The console output most apps have today: unauthenticated states log
 * "[MCP][verifyAccessToken] authenticateRequest failed:" with reason and
 * message, throws log "[MCP][verifyAccessToken] threw:" with the error
 * message (or the raw value). Wrong token types and missing users are silent.
 */
export const consoleClerkVerifyLogger: Required<
  Pick<VerifyClerkAccessTokenOptions, "onReject" | "onError">
> = {
  onReject: (rejection) => {
    if (rejection.kind !== "unauthenticated") return;
    console.error(
      "[MCP][verifyAccessToken] authenticateRequest failed:",
      rejection.reason,
      rejection.message,
    );
  },
  onError: (err) => {
    console.error("[MCP][verifyAccessToken] threw:", err instanceof Error ? err.message : err);
  },
};

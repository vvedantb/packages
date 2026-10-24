/**
 * V8-safe verification of Clerk OAuth access tokens issued as JWTs (RFC 9068).
 * WebCrypto and `fetch` only: no Node built-ins, no `@clerk/backend`, so it
 * runs in a Convex `httpAction` on the default runtime without a Node action.
 */
import { base64UrlToBytes } from "../crypto/encoding.js";
import type { Thrown } from "../mcp/json.js";

/** Why a JWT was rejected without throwing. */
export type ClerkOAuthJwtRejection =
  | { kind: "malformed" }
  | { kind: "wrong-alg"; alg: unknown }
  | { kind: "wrong-typ"; typ: unknown }
  | { kind: "unknown-key"; kid: unknown }
  | { kind: "bad-signature" }
  | { kind: "wrong-issuer"; iss: unknown }
  | { kind: "expired" }
  | { kind: "not-yet-valid" }
  | { kind: "no-subject" };

export type VerifyClerkOAuthJwtOptions = {
  /** Clerk Frontend API URL, e.g. `https://clerk.example.com`. Must equal the token's `iss` (trailing slash ignored). */
  issuer: string;
  /** Default `${issuer}/.well-known/jwks.json`. */
  jwksUrl?: string;
  /** Default global `fetch`. */
  fetch?: typeof fetch;
  /** Default `Date.now`. */
  now?: () => number;
  /** Allowed clock difference for `exp` and `nbf`. Default 5000. */
  clockSkewMs?: number;
  /** Called once before returning `null` for a rejected token. Default: silent. */
  onReject?: (rejection: ClerkOAuthJwtRejection) => void;
  /** Called with anything thrown (JWKS fetch, WebCrypto) before returning `null`. Default: silent. */
  onError?: (error: Thrown) => void;
};

/** The verified token. `clerkUserId` is the `sub` claim. */
export type VerifiedClerkOAuthJwt = {
  clerkUserId: string;
  /** All payload claims, for app-specific use (e.g. `scope`, `client_id`). */
  claims: Record<string, unknown>;
};

/** How long a fetched JWKS is used before the next fetch. */
export const CLERK_JWKS_TTL_MS = 60 * 60 * 1000;
/** A key id missing from the cached JWKS triggers a refetch, at most this often. */
export const CLERK_JWKS_REFETCH_MIN_MS = 60 * 1000;

type Jwks = { fetchedAt: number; keys: Map<string, JsonWebKey> };

// Module scope: shared by every request in the same isolate.
const jwksCache = new Map<string, Jwks>();
const keyCache = new Map<string, Promise<CryptoKey>>();

/** Forget cached JWKS and imported keys (tests, or a forced key refresh). */
export function clearClerkJwksCache(): void {
  jwksCache.clear();
  keyCache.clear();
}

const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** True when the token has three non-empty base64url segments. Opaque tokens do not. */
export function looksLikeJwt(token: string): boolean {
  return JWT_SHAPE.test(token);
}

type JsonObject = Record<string, unknown>;

function decodeJson(part: string): JsonObject | null {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as JsonObject)
      : null;
  } catch {
    return null;
  }
}

const trimSlash = (url: string) => url.replace(/\/+$/, "");

async function loadJwks(url: string, fetchFn: typeof fetch, now: number): Promise<Jwks> {
  const response = await fetchFn(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`JWKS fetch failed: ${response.status}`);
  const body: unknown = await response.json();
  const list = (body as { keys?: unknown } | null)?.keys;
  if (!Array.isArray(list)) throw new Error("JWKS has no keys");
  const keys = new Map<string, JsonWebKey>();
  for (const jwk of list as (JsonWebKey & { kid?: string })[]) {
    if (typeof jwk.kid === "string") keys.set(jwk.kid, jwk);
  }
  const jwks = { fetchedAt: now, keys };
  jwksCache.set(url, jwks);
  return jwks;
}

async function findJwk(
  url: string,
  kid: string,
  fetchFn: typeof fetch,
  now: number,
): Promise<JsonWebKey | undefined> {
  let jwks = jwksCache.get(url);
  if (!jwks || now - jwks.fetchedAt > CLERK_JWKS_TTL_MS) jwks = await loadJwks(url, fetchFn, now);
  const found = jwks.keys.get(kid);
  if (found || now - jwks.fetchedAt < CLERK_JWKS_REFETCH_MIN_MS) return found;
  return (await loadJwks(url, fetchFn, now)).keys.get(kid);
}

function importKey(url: string, kid: string, jwk: JsonWebKey): Promise<CryptoKey> {
  const id = `${url}#${kid}#${jwk.n}`;
  let key = keyCache.get(id);
  if (!key) {
    key = crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    keyCache.set(id, key);
    key.catch(() => keyCache.delete(id));
  }
  return key;
}

/**
 * Verify a Clerk OAuth access token that is a JWT: RS256 signature against the
 * issuer's JWKS, `iss`, `exp`, `nbf`, header `typ` of `at+jwt` or
 * `application/at+jwt` (session tokens are rejected), and a non-empty `sub`.
 * Returns `null` on any rejection and on any throw. The JWKS is cached in
 * module scope for `CLERK_JWKS_TTL_MS`.
 */
export async function verifyClerkOAuthJwt(
  token: string,
  options: VerifyClerkOAuthJwtOptions,
): Promise<VerifiedClerkOAuthJwt | null> {
  const reject = (rejection: ClerkOAuthJwtRejection): null => {
    options.onReject?.(rejection);
    return null;
  };
  try {
    if (!looksLikeJwt(token)) return reject({ kind: "malformed" });
    const [headerPart, payloadPart, signaturePart] = token.split(".") as [string, string, string];
    const header = decodeJson(headerPart);
    const claims = decodeJson(payloadPart);
    if (!header || !claims) return reject({ kind: "malformed" });
    if (header.alg !== "RS256") return reject({ kind: "wrong-alg", alg: header.alg });
    const typ = typeof header.typ === "string" ? header.typ.toLowerCase() : header.typ;
    if (typ !== "at+jwt" && typ !== "application/at+jwt") return reject({ kind: "wrong-typ", typ: header.typ });
    if (typeof header.kid !== "string") return reject({ kind: "unknown-key", kid: header.kid });

    const issuer = trimSlash(options.issuer);
    const url = options.jwksUrl ?? `${issuer}/.well-known/jwks.json`;
    const now = (options.now ?? Date.now)();
    const jwk = await findJwk(url, header.kid, options.fetch ?? fetch, now);
    if (!jwk) return reject({ kind: "unknown-key", kid: header.kid });
    const key = await importKey(url, header.kid, jwk);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlToBytes(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    );
    if (!valid) return reject({ kind: "bad-signature" });

    if (typeof claims.iss !== "string" || trimSlash(claims.iss) !== issuer) {
      return reject({ kind: "wrong-issuer", iss: claims.iss });
    }
    const skew = options.clockSkewMs ?? 5000;
    if (typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp * 1000 + skew <= now) {
      return reject({ kind: "expired" });
    }
    if (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf * 1000 - skew > now)) {
      return reject({ kind: "not-yet-valid" });
    }
    if (typeof claims.sub !== "string" || claims.sub.length === 0) return reject({ kind: "no-subject" });
    return { clerkUserId: claims.sub, claims };
  } catch (err) {
    options.onError?.(err);
    return null;
  }
}

export type AuthenticateClerkBearerOptions = Omit<VerifyClerkOAuthJwtOptions, "onReject"> & {
  /** The bearer token, without the `Bearer ` prefix. */
  token: string;
  /**
   * Verifies a token that is not a JWT (an opaque OAuth token issued before the
   * switch to JWTs), usually `ctx.runAction(internal.mcp.nodeActions.verifyAccessToken, { token })`.
   * Returns `{ clerkUserId }`, or `{ userId }` as `verifyClerkAccessToken` does, or `null`.
   */
  verifyOpaque: (
    token: string,
  ) => Promise<{ clerkUserId: string } | { userId: string } | null | undefined>;
  /** Called for a rejected JWT. Default: silent. */
  onReject?: (rejection: ClerkOAuthJwtRejection) => void;
};

/**
 * One call for an `httpAction`: a JWT bearer is verified locally in V8 (no
 * Node action, no token cache); anything else goes to `verifyOpaque`. A JWT
 * that fails local verification is not retried with `verifyOpaque`.
 * Returns `{ clerkUserId }` or `null`.
 *
 * Clerk OAuth access tokens last 1 day
 * (https://clerk.com/docs/guides/configure/auth-strategies/oauth/how-clerk-implements-oauth),
 * so opaque tokens stop arriving about 1 day after the instance switched to JWTs.
 */
export async function authenticateClerkBearer(
  options: AuthenticateClerkBearerOptions,
): Promise<{ clerkUserId: string } | null> {
  const { token, verifyOpaque, ...jwtOptions } = options;
  if (looksLikeJwt(token)) {
    const verified = await verifyClerkOAuthJwt(token, jwtOptions);
    return verified ? { clerkUserId: verified.clerkUserId } : null;
  }
  const result = await verifyOpaque(token);
  if (!result) return null;
  const id = "clerkUserId" in result ? result.clerkUserId : result.userId;
  return typeof id === "string" && id.length > 0 ? { clerkUserId: id } : null;
}

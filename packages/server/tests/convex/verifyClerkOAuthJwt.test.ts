import { generateKeyPairSync, createSign, type KeyObject } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticateClerkBearer,
  clearClerkJwksCache,
  isOAuthAccessTokenJwt,
  verifyClerkOAuthJwt,
  type ClerkOAuthJwtRejection,
} from "@vvedantb/server";

const ISSUER = "https://clerk.example.test";
const NOW = 1_800_000_000_000;
const b64u = (value: string | Buffer) => Buffer.from(value).toString("base64url");

function keyPair() {
  return generateKeyPairSync("rsa", { modulusLength: 2048 });
}

const main = keyPair();
const other = keyPair();

function jwks(key: KeyObject, kid = "k1") {
  return { keys: [{ ...key.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" }] };
}

type SignOptions = {
  key?: KeyObject;
  header?: Record<string, unknown>;
  claims?: Record<string, unknown>;
};

function sign({ key = main.privateKey, header = {}, claims = {} }: SignOptions = {}): string {
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "at+jwt", kid: "k1", ...header }));
  const body = b64u(
    JSON.stringify({ iss: ISSUER, sub: "user_1", exp: NOW / 1000 + 3600, ...claims }),
  );
  const signature = createSign("RSA-SHA256").update(`${head}.${body}`).sign(key);
  return `${head}.${body}.${b64u(signature)}`;
}

function fakeFetch(body: unknown = jwks(main.publicKey)) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => Response.json(body));
}

async function verify(token: string, fetchFn = fakeFetch()) {
  const rejections: ClerkOAuthJwtRejection[] = [];
  const result = await verifyClerkOAuthJwt(token, {
    issuer: ISSUER,
    fetch: fetchFn,
    now: () => NOW,
    onReject: (r) => rejections.push(r),
  });
  return { result, rejections };
}

beforeEach(() => clearClerkJwksCache());

describe("verifyClerkOAuthJwt", () => {
  it("accepts a valid OAuth JWT", async () => {
    const { result } = await verify(sign({ claims: { scope: "mcp" } }));
    expect(result?.clerkUserId).toBe("user_1");
    expect(result?.claims.scope).toBe("mcp");
  });

  it("accepts application/at+jwt and a trailing slash on the token issuer", async () => {
    const token = sign({ header: { typ: "application/at+jwt" }, claims: { iss: `${ISSUER}/` } });
    expect((await verify(token)).result?.clerkUserId).toBe("user_1");
  });

  it("rejects an expired token, allowing 5 s of skew", async () => {
    const expired = await verify(sign({ claims: { exp: NOW / 1000 - 60 } }));
    expect(expired.result).toBeNull();
    expect(expired.rejections).toEqual([{ kind: "expired" }]);
    expect((await verify(sign({ claims: { exp: NOW / 1000 - 3 } }))).result).not.toBeNull();
  });

  it("rejects a token that is not valid yet", async () => {
    const { result, rejections } = await verify(sign({ claims: { nbf: NOW / 1000 + 60 } }));
    expect(result).toBeNull();
    expect(rejections).toEqual([{ kind: "not-yet-valid" }]);
  });

  it("rejects the wrong issuer", async () => {
    const { result, rejections } = await verify(sign({ claims: { iss: "https://evil.test" } }));
    expect(result).toBeNull();
    expect(rejections[0]?.kind).toBe("wrong-issuer");
  });

  it("rejects a bad signature", async () => {
    const { result, rejections } = await verify(sign({ key: other.privateKey }));
    expect(result).toBeNull();
    expect(rejections).toEqual([{ kind: "bad-signature" }]);
  });

  it("rejects a session JWT (wrong typ)", async () => {
    for (const typ of ["JWT", undefined]) {
      const { result, rejections } = await verify(sign({ header: { typ } }));
      expect(result).toBeNull();
      expect(rejections[0]?.kind).toBe("wrong-typ");
    }
  });

  it("rejects a missing or empty sub", async () => {
    for (const sub of [undefined, ""]) {
      const { result, rejections } = await verify(sign({ claims: { sub } }));
      expect(result).toBeNull();
      expect(rejections).toEqual([{ kind: "no-subject" }]);
    }
  });

  it("rejects alg none and HS256", async () => {
    for (const alg of ["none", "HS256"]) {
      expect((await verify(sign({ header: { alg } }))).rejections[0]?.kind).toBe("wrong-alg");
    }
  });

  it("rejects malformed tokens", async () => {
    for (const token of ["", "a.b", "a.b.c", "opaque", "!!.@@.##", `${b64u("[]")}.${b64u("{}")}.sig`]) {
      const { result } = await verify(token);
      expect(result).toBeNull();
    }
  });

  it("returns null and calls onError when the JWKS fetch fails", async () => {
    const onError = vi.fn();
    const result = await verifyClerkOAuthJwt(sign(), {
      issuer: ISSUER,
      now: () => NOW,
      fetch: async () => new Response("no", { status: 500 }),
      onError,
    });
    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("fetches the JWKS once for two verifies, from the issuer URL", async () => {
    const fetchFn = fakeFetch();
    await verify(sign(), fetchFn);
    await verify(sign(), fetchFn);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(fetchFn.mock.calls[0]?.[0]).toBe(`${ISSUER}/.well-known/jwks.json`);
  });

  it("refetches after the cache is cleared", async () => {
    const fetchFn = fakeFetch();
    await verify(sign(), fetchFn);
    clearClerkJwksCache();
    await verify(sign(), fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("refetches for an unknown kid after the minimum interval (key rotation)", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(Response.json(jwks(main.publicKey, "k1")))
      .mockResolvedValueOnce(Response.json(jwks(other.publicKey, "k2")));
    const options = { issuer: ISSUER, fetch: fetchFn };
    await verifyClerkOAuthJwt(sign(), { ...options, now: () => NOW });
    const rotated = sign({ key: other.privateKey, header: { kid: "k2" } });
    // Within the minimum interval: no refetch.
    expect(await verifyClerkOAuthJwt(rotated, { ...options, now: () => NOW + 1000 })).toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const later = await verifyClerkOAuthJwt(rotated, { ...options, now: () => NOW + 120_000 });
    expect(later?.clerkUserId).toBe("user_1");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("isOAuthAccessTokenJwt", () => {
  it("accepts at+jwt only", () => {
    expect(isOAuthAccessTokenJwt(sign())).toBe(true);
    expect(isOAuthAccessTokenJwt(sign({ header: { typ: "application/at+jwt" } }))).toBe(true);
    expect(isOAuthAccessTokenJwt(sign({ header: { typ: "JWT" } }))).toBe(false);
    expect(isOAuthAccessTokenJwt("oat_opaque_token")).toBe(false);
  });
});

describe("authenticateClerkBearer", () => {
  const base = () => ({ issuer: ISSUER, fetch: fakeFetch(), now: () => NOW });

  it("verifies an at+jwt locally without calling the fallback", async () => {
    const verifyFallback = vi.fn();
    const principal = await authenticateClerkBearer({ ...base(), token: sign(), verifyFallback });
    expect(principal).toEqual({ clerkUserId: "user_1" });
    expect(verifyFallback).not.toHaveBeenCalled();
  });

  it("verifies application/at+jwt locally, case-insensitive", async () => {
    const verifyFallback = vi.fn();
    const token = sign({ header: { typ: "Application/AT+JWT" } });
    expect(await authenticateClerkBearer({ ...base(), token, verifyFallback })).toEqual({ clerkUserId: "user_1" });
    expect(verifyFallback).not.toHaveBeenCalled();
  });

  it("does not fall back for an at+jwt that fails", async () => {
    const verifyFallback = vi.fn(async () => ({ clerkUserId: "user_2" }));
    const principal = await authenticateClerkBearer({
      ...base(),
      token: sign({ key: other.privateKey }),
      verifyFallback,
    });
    expect(principal).toBeNull();
    expect(verifyFallback).not.toHaveBeenCalled();
  });

  it("sends a session JWT (typ JWT) to the fallback, not local verification", async () => {
    const verifyFallback = vi.fn(async () => ({ clerkUserId: "user_2" }));
    const fetchFn = fakeFetch();
    const token = sign({ header: { typ: "JWT" } });
    const principal = await authenticateClerkBearer({ ...base(), fetch: fetchFn, token, verifyFallback });
    expect(principal).toEqual({ clerkUserId: "user_2" });
    expect(verifyFallback).toHaveBeenCalledWith(token);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends a JWT with no typ to the fallback", async () => {
    const verifyFallback = vi.fn(async () => ({ clerkUserId: "user_2" }));
    const token = sign({ header: { typ: undefined } });
    expect(await authenticateClerkBearer({ ...base(), token, verifyFallback })).toEqual({ clerkUserId: "user_2" });
    expect(verifyFallback).toHaveBeenCalledOnce();
  });

  it("sends a JWT-shaped token with an undecodable header to the fallback", async () => {
    const verifyFallback = vi.fn(async () => null);
    const token = `${b64u("not json")}.${b64u("{}")}.sig`;
    expect(await authenticateClerkBearer({ ...base(), token, verifyFallback })).toBeNull();
    expect(verifyFallback).toHaveBeenCalledWith(token);
  });

  it("sends an opaque token to the fallback and maps the result", async () => {
    const fetchFn = fakeFetch();
    const options = { ...base(), fetch: fetchFn, token: "oat_abc123" };
    const a = vi.fn(async () => ({ clerkUserId: "user_2" }));
    const b = vi.fn(async () => ({ userId: "user_3" }));
    const c = vi.fn(async () => null);
    expect(await authenticateClerkBearer({ ...options, verifyFallback: a })).toEqual({ clerkUserId: "user_2" });
    expect(await authenticateClerkBearer({ ...options, verifyFallback: b })).toEqual({ clerkUserId: "user_3" });
    expect(await authenticateClerkBearer({ ...options, verifyFallback: c })).toBeNull();
    expect(a).toHaveBeenCalledWith("oat_abc123");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("still accepts the deprecated verifyOpaque alias", async () => {
    const verifyOpaque = vi.fn(async () => ({ clerkUserId: "user_2" }));
    expect(await authenticateClerkBearer({ ...base(), token: "oat_abc123", verifyOpaque })).toEqual({ clerkUserId: "user_2" });
    const session = sign({ header: { typ: "JWT" } });
    expect(await authenticateClerkBearer({ ...base(), token: session, verifyOpaque })).toEqual({ clerkUserId: "user_2" });
    expect(verifyOpaque).toHaveBeenCalledTimes(2);
  });

  it("prefers verifyFallback when both are set", async () => {
    const verifyFallback = vi.fn(async () => ({ clerkUserId: "user_new" }));
    const verifyOpaque = vi.fn(async () => ({ clerkUserId: "user_old" }));
    const principal = await authenticateClerkBearer({ ...base(), token: "oat_abc123", verifyFallback, verifyOpaque });
    expect(principal).toEqual({ clerkUserId: "user_new" });
    expect(verifyOpaque).not.toHaveBeenCalled();
  });
});

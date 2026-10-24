import { generateKeyPairSync, createSign, type KeyObject } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticateClerkBearer,
  clearClerkJwksCache,
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

describe("authenticateClerkBearer", () => {
  it("verifies a JWT locally without calling verifyOpaque", async () => {
    const verifyOpaque = vi.fn();
    const principal = await authenticateClerkBearer({
      token: sign(),
      issuer: ISSUER,
      fetch: fakeFetch(),
      now: () => NOW,
      verifyOpaque,
    });
    expect(principal).toEqual({ clerkUserId: "user_1" });
    expect(verifyOpaque).not.toHaveBeenCalled();
  });

  it("does not fall back for a JWT that fails", async () => {
    const verifyOpaque = vi.fn(async () => ({ clerkUserId: "user_2" }));
    const principal = await authenticateClerkBearer({
      token: sign({ key: other.privateKey }),
      issuer: ISSUER,
      fetch: fakeFetch(),
      now: () => NOW,
      verifyOpaque,
    });
    expect(principal).toBeNull();
    expect(verifyOpaque).not.toHaveBeenCalled();
  });

  it("sends an opaque token to verifyOpaque and maps the result", async () => {
    const fetchFn = fakeFetch();
    const base = { issuer: ISSUER, fetch: fetchFn, now: () => NOW };
    const a = vi.fn(async () => ({ clerkUserId: "user_2" }));
    const b = vi.fn(async () => ({ userId: "user_3" }));
    const c = vi.fn(async () => null);
    expect(await authenticateClerkBearer({ ...base, token: "oat_abc123", verifyOpaque: a })).toEqual({ clerkUserId: "user_2" });
    expect(await authenticateClerkBearer({ ...base, token: "oat_abc123", verifyOpaque: b })).toEqual({ clerkUserId: "user_3" });
    expect(await authenticateClerkBearer({ ...base, token: "oat_abc123", verifyOpaque: c })).toBeNull();
    expect(a).toHaveBeenCalledWith("oat_abc123");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

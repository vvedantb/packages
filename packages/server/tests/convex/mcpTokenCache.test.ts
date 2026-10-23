import { defineTable, type RegisteredMutation, type RegisteredQuery } from "convex/server";
import { v } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticateWithTokenCache,
  createMcpTokenCacheFunctions,
  hashMcpToken,
  jwtExpiryMs,
  MCP_TOKEN_CACHE_PURGE_BATCH,
  MCP_TOKEN_CACHE_TABLE,
  MCP_TOKEN_CACHE_TTL_MS,
  mcpTokenCacheFields,
  mcpTokenCacheTable,
  sha256Hex,
  tokenCacheExpiresAt,
  type McpTokenCacheDoc,
  type McpTokenCacheGetDef,
  type McpTokenCacheMutationCtx,
  type McpTokenCachePrincipal,
  type McpTokenCachePurgeDef,
  type McpTokenCachePurgeRef,
  type McpTokenCachePutDef,
} from "@vvedantb/server";

// A fake Convex backend: the builders keep each handler, and the ctx serves the
// two cache indexes from an array (by_token_hash in insertion order, by_expires
// sorted by expiresAt). Ids are plain strings and index ranges plain records.

const ALICE = "clerk_user_alice";
const BOB = "clerk_user_bob";

type Bound = { field: string; eq?: string; lt?: number };
type Doc = McpTokenCacheDoc<string>;
type Table = typeof MCP_TOKEN_CACHE_TABLE;
type GetDef = McpTokenCacheGetDef<Table, string, Bound>;
type PutDef = McpTokenCachePutDef<Table, string, Bound>;
type PurgeDef = McpTokenCachePurgeDef<Table, string, Bound>;

const purgeRef: McpTokenCachePurgeRef = {
  _type: "mutation",
  _visibility: "internal",
  _args: {},
  _returnType: null,
  _componentPath: undefined,
};

function isPutDef(def: PutDef | PurgeDef): def is PutDef {
  return "tokenHash" in def.args;
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`${name} was not registered`);
  return value;
}

function createBackend(rows: Doc[] = []) {
  let nextId = rows.length;
  const writes: Array<{ op: "insert" | "patch" | "delete"; id: string }> = [];
  const scheduled: Array<{ delayMs: number; fn: McpTokenCachePurgeRef; args: object }> = [];
  const ctx: McpTokenCacheMutationCtx<Table, string, Bound> = {
    db: {
      query(table: string) {
        expect(table).toBe(MCP_TOKEN_CACHE_TABLE);
        return {
          withIndex(
            index: string,
            range: (q: { eq(field: string, value: string): Bound; lt(field: string, value: number): Bound }) => Bound,
          ) {
            const bound = range({ eq: (field, eq) => ({ field, eq }), lt: (field, lt) => ({ field, lt }) });
            const found =
              index === "by_token_hash"
                ? rows.filter((row) => bound.field === "tokenHash" && row.tokenHash === bound.eq)
                : rows
                    .filter((row) => bound.field === "expiresAt" && bound.lt !== undefined && row.expiresAt < bound.lt)
                    .sort((a, b) => a.expiresAt - b.expiresAt);
            return { first: async () => found[0] ?? null, take: async (n: number) => found.slice(0, n) };
          },
        };
      },
      insert: async (table, value) => {
        expect(table).toBe(MCP_TOKEN_CACHE_TABLE);
        const id = `id_${nextId++}`;
        rows.push({ ...value, _id: id, _creationTime: Date.now() });
        writes.push({ op: "insert", id });
        return id;
      },
      patch: async (id, value) => {
        const row = required(
          rows.find((doc) => doc._id === id),
          id,
        );
        Object.assign(row, value);
        writes.push({ op: "patch", id });
      },
      delete: async (id) => {
        rows.splice(
          rows.findIndex((doc) => doc._id === id),
          1,
        );
        writes.push({ op: "delete", id });
      },
    },
    scheduler: {
      runAfter: async (delayMs, fn, args) => {
        scheduled.push({ delayMs, fn, args });
        return "scheduled_1";
      },
    },
  };

  const registeredQuery: RegisteredQuery<"internal", { tokenHash: string }, Promise<null>> = {
    isConvexFunction: true,
    isQuery: true,
    isInternal: true,
    _visibility: "internal",
  };
  const registeredMutation: RegisteredMutation<"internal", Record<string, never>, Promise<null>> = {
    isConvexFunction: true,
    isMutation: true,
    isInternal: true,
    _visibility: "internal",
  };
  let getDef: GetDef | undefined;
  let putDef: PutDef | undefined;
  let purgeDef: PurgeDef | undefined;
  function internalMutation(def: PutDef): typeof registeredMutation;
  function internalMutation(def: PurgeDef): typeof registeredMutation;
  function internalMutation(def: PutDef | PurgeDef): typeof registeredMutation {
    if (isPutDef(def)) putDef = def;
    else purgeDef = def;
    return registeredMutation;
  }
  const registered = createMcpTokenCacheFunctions<Table, string, Bound>({
    v,
    internalQuery: (def) => {
      getDef = def;
      return registeredQuery;
    },
    internalMutation,
    purgeSelf: () => purgeRef,
  });

  const get = required(getDef, "getInternal");
  const put = required(putDef, "putInternal");
  const purge = required(purgeDef, "purgeExpired");
  return {
    rows,
    writes,
    scheduled,
    registered,
    defs: { get, put, purge },
    get: (tokenHash: string) => get.handler(ctx, { tokenHash }),
    put: (row: { tokenHash: string; clerkUserId: string; expiresAt: number }) => put.handler(ctx, row),
    purge: () => purge.handler(ctx, {}),
  };
}

type Backend = ReturnType<typeof createBackend>;

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jwtWithPayload(payload: object): string {
  return [base64Url(JSON.stringify({ alg: "RS256" })), base64Url(JSON.stringify(payload)), "signature"].join(".");
}

function jwtWithExp(expSeconds: number): string {
  return jwtWithPayload({ sub: ALICE, exp: expSeconds });
}

function verifier(result: McpTokenCachePrincipal | null) {
  return vi.fn((_token: string) => Promise.resolve(result));
}

function authenticate(backend: Backend, token: string, verify: ReturnType<typeof verifier>) {
  return authenticateWithTokenCache({ token, get: backend.get, put: backend.put, verify });
}

function spyConsole() {
  return {
    log: vi.spyOn(console, "log").mockImplementation(() => undefined),
    warn: vi.spyOn(console, "warn").mockImplementation(() => undefined),
  };
}

let spies: ReturnType<typeof spyConsole>;

beforeEach(() => {
  spies = spyConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("authenticateWithTokenCache", () => {
  it("verifies on a miss, then serves the cached principal without verify", async () => {
    const backend = createBackend();
    const verify = verifier({ clerkUserId: ALICE });

    expect(await authenticate(backend, "oat_one", verify)).toEqual({ clerkUserId: ALICE });
    expect(await authenticate(backend, "oat_one", verify)).toEqual({ clerkUserId: ALICE });
    expect(verify).toHaveBeenCalledTimes(1);
    expect(spies.log.mock.calls).toEqual([
      ["[MCP][auth]", expect.stringMatching(/^\{"authCached":false,"authMs":\d+\}$/)],
      ["[MCP][auth]", expect.stringMatching(/^\{"authCached":true,"authMs":\d+\}$/)],
    ]);
  });

  it("a hit returns { clerkUserId } only", async () => {
    const backend = createBackend();
    const verify = vi.fn(async () => ({ clerkUserId: ALICE, scopes: ["read"] }));
    const args = { token: "oat_rich", get: backend.get, put: backend.put, verify };
    expect(await authenticateWithTokenCache(args)).toEqual({ clerkUserId: ALICE, scopes: ["read"] });
    expect(await authenticateWithTokenCache(args)).toEqual({ clerkUserId: ALICE });
  });

  it("stores the SHA-256 of the token, never the token", async () => {
    const backend = createBackend();
    const token = "oat_secret_value";
    await authenticate(backend, token, verifier({ clerkUserId: ALICE }));
    expect(backend.rows).toHaveLength(1);
    expect(backend.rows[0]?.tokenHash).toBe(await sha256Hex(token));
    expect(await hashMcpToken(token)).toBe(await sha256Hex(token));
    expect(JSON.stringify(backend.rows)).not.toContain(token);
  });

  it("does not cache a failed verification", async () => {
    const backend = createBackend();
    const verify = verifier(null);

    expect(await authenticate(backend, "oat_bad", verify)).toBeNull();
    expect(await authenticate(backend, "oat_bad", verify)).toBeNull();
    expect(verify).toHaveBeenCalledTimes(2);
    expect(backend.rows).toHaveLength(0);
  });

  it("verifies again once the cached row has expired", async () => {
    const backend = createBackend();
    const verify = verifier({ clerkUserId: ALICE });
    await authenticate(backend, "oat_two", verify);
    for (const row of backend.rows) row.expiresAt = Date.now() - 1;

    await authenticate(backend, "oat_two", verify);
    expect(verify).toHaveBeenCalledTimes(2);
    expect(backend.rows).toHaveLength(1);
    expect(backend.rows[0]?.expiresAt).toBeGreaterThan(Date.now());
  });

  it("treats expiresAt equal to now as expired", async () => {
    const backend = createBackend();
    const now = 1_700_000_000_000;
    const verify = verifier({ clerkUserId: ALICE });
    backend.rows.push({ _id: "id_x", _creationTime: 0, tokenHash: await sha256Hex("oat_edge"), clerkUserId: ALICE, expiresAt: now });
    await authenticateWithTokenCache({ token: "oat_edge", get: backend.get, put: backend.put, verify, now: () => now });
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it("keys on the token: another token is a miss", async () => {
    const backend = createBackend();
    const verify = verifier({ clerkUserId: ALICE });
    await authenticate(backend, "oat_a", verify);
    await authenticate(backend, "oat_b", verify);
    expect(verify).toHaveBeenCalledTimes(2);
  });

  it("does not cache a JWT that is already expired", async () => {
    const backend = createBackend();
    const token = jwtWithExp(Math.floor(Date.now() / 1000) - 10);
    expect(await authenticate(backend, token, verifier({ clerkUserId: ALICE }))).toEqual({ clerkUserId: ALICE });
    expect(backend.rows).toHaveLength(0);
  });

  it("caps the stored expiry at the JWT exp", async () => {
    const backend = createBackend();
    const now = 1_700_000_000_000;
    const exp = Math.floor(now / 1000) + 60;
    await authenticateWithTokenCache({
      token: jwtWithExp(exp),
      get: backend.get,
      put: backend.put,
      verify: verifier({ clerkUserId: ALICE }),
      now: () => now,
    });
    expect(backend.rows[0]?.expiresAt).toBe(exp * 1000);
  });

  it("swallows a failed cache write with a warning", async () => {
    const verify = verifier({ clerkUserId: ALICE });
    const result = await authenticateWithTokenCache({
      token: "oat_three",
      get: async () => null,
      put: async () => {
        throw new Error("write conflict");
      },
      verify,
    });
    expect(result).toEqual({ clerkUserId: ALICE });
    expect(spies.warn).toHaveBeenCalledWith("[MCP][auth] token cache write failed:", "write conflict");
  });

  it("does not swallow a failed cache read or verify", async () => {
    const backend = createBackend();
    const get = async () => {
      throw new Error("read failed");
    };
    await expect(
      authenticateWithTokenCache({ token: "t", get, put: backend.put, verify: verifier({ clerkUserId: ALICE }) }),
    ).rejects.toThrow("read failed");
    const verify = vi.fn(async () => {
      throw new Error("clerk down");
    });
    await expect(authenticateWithTokenCache({ token: "t", get: backend.get, put: backend.put, verify })).rejects.toThrow(
      "clerk down",
    );
  });
});

describe("tokenCacheExpiresAt", () => {
  const now = 1_700_000_000_000;

  it("uses the TTL for an opaque token", () => {
    expect(MCP_TOKEN_CACHE_TTL_MS).toBe(300_000);
    expect(jwtExpiryMs("oat_opaque")).toBeNull();
    expect(tokenCacheExpiresAt("oat_opaque", now)).toBe(now + MCP_TOKEN_CACHE_TTL_MS);
  });

  it("caps the TTL at a JWT exp", () => {
    const exp = Math.floor(now / 1000) + 60;
    expect(jwtExpiryMs(jwtWithExp(exp))).toBe(exp * 1000);
    expect(tokenCacheExpiresAt(jwtWithExp(exp), now)).toBe(exp * 1000);
  });

  it("keeps the TTL when the JWT outlives it", () => {
    const exp = Math.floor(now / 1000) + 3600;
    expect(tokenCacheExpiresAt(jwtWithExp(exp), now)).toBe(now + MCP_TOKEN_CACHE_TTL_MS);
  });

  it("is null for a JWT that is expired or expires now", () => {
    expect(tokenCacheExpiresAt(jwtWithExp(Math.floor(now / 1000) - 1), now)).toBeNull();
    expect(tokenCacheExpiresAt(jwtWithExp(now / 1000), now)).toBeNull();
  });

  it("treats an unreadable payload or a non-number exp as opaque", () => {
    for (const token of [
      "a.not-json.c",
      "a.b",
      "a.b.c.d",
      jwtWithPayload({ sub: ALICE }),
      jwtWithPayload({ exp: "1700000000" }),
      `x.${base64Url("null")}.y`,
      `x.${base64Url("1e999")}.y`,
    ]) {
      expect(jwtExpiryMs(token), token).toBeNull();
      expect(tokenCacheExpiresAt(token, now), token).toBe(now + MCP_TOKEN_CACHE_TTL_MS);
    }
  });
});

describe("mcpTokenCache schema", () => {
  it("defines the fields and both indexes", () => {
    expect(Object.keys(mcpTokenCacheFields(v))).toEqual(["tokenHash", "clerkUserId", "expiresAt"]);
    expect(mcpTokenCacheTable(defineTable, v)[" indexes"]()).toEqual([
      { indexDescriptor: "by_token_hash", fields: ["tokenHash"] },
      { indexDescriptor: "by_expires", fields: ["expiresAt"] },
    ]);
  });
});

describe("createMcpTokenCacheFunctions", () => {
  it("registers the reference's validators", () => {
    const { defs, registered } = createBackend();
    expect(registered.getInternal.isQuery).toBe(true);
    expect(registered.putInternal.isMutation && registered.purgeExpired.isMutation).toBe(true);
    expect(defs.get.args).toEqual({ tokenHash: v.string() });
    expect(defs.get.returns).toEqual(v.union(v.object({ clerkUserId: v.string(), expiresAt: v.number() }), v.null()));
    expect(defs.put.args).toEqual({ tokenHash: v.string(), clerkUserId: v.string(), expiresAt: v.number() });
    expect(defs.put.returns).toEqual(v.null());
    expect(defs.purge.args).toEqual({});
    expect(defs.purge.returns).toEqual(v.number());
  });

  it("getInternal returns the row without checking expiry", async () => {
    const backend = createBackend();
    expect(await backend.get("missing")).toBeNull();
    await backend.put({ tokenHash: "h", clerkUserId: ALICE, expiresAt: 1 });
    expect(await backend.get("h")).toEqual({ clerkUserId: ALICE, expiresAt: 1 });
  });

  it("putInternal inserts, then patches only for another user or a later expiry", async () => {
    const backend = createBackend();
    await backend.put({ tokenHash: "h", clerkUserId: ALICE, expiresAt: 2_000 });
    expect(backend.writes.map((write) => write.op)).toEqual(["insert"]);

    // same user, same or earlier expiry: no write
    await backend.put({ tokenHash: "h", clerkUserId: ALICE, expiresAt: 2_000 });
    await backend.put({ tokenHash: "h", clerkUserId: ALICE, expiresAt: 1_000 });
    expect(backend.writes).toHaveLength(1);

    await backend.put({ tokenHash: "h", clerkUserId: ALICE, expiresAt: 3_000 });
    expect(await backend.get("h")).toEqual({ clerkUserId: ALICE, expiresAt: 3_000 });

    // another user patches even to an earlier expiry
    await backend.put({ tokenHash: "h", clerkUserId: BOB, expiresAt: 500 });
    expect(await backend.get("h")).toEqual({ clerkUserId: BOB, expiresAt: 500 });
    expect(backend.writes.map((write) => write.op)).toEqual(["insert", "patch", "patch"]);
    expect(backend.rows).toHaveLength(1);
  });

  it("purgeExpired drops expired rows only", async () => {
    const backend = createBackend();
    await backend.put({ tokenHash: "old", clerkUserId: ALICE, expiresAt: Date.now() - 1 });
    await backend.put({ tokenHash: "live", clerkUserId: ALICE, expiresAt: Date.now() + 60_000 });
    expect(await backend.purge()).toBe(1);
    expect(backend.rows.map((row) => row.tokenHash)).toEqual(["live"]);
    expect(backend.scheduled).toEqual([]);
  });

  it("purgeExpired deletes in batches and reschedules itself after a full batch", async () => {
    const expired = (index: number): Doc => ({
      _id: `old_${index}`,
      _creationTime: 0,
      tokenHash: `h${index}`,
      clerkUserId: ALICE,
      expiresAt: Date.now() - 1_000 - index,
    });
    const total = MCP_TOKEN_CACHE_PURGE_BATCH + 20;
    const backend = createBackend(Array.from({ length: total }, (_, index) => expired(index)));

    expect(MCP_TOKEN_CACHE_PURGE_BATCH).toBe(500);
    expect(await backend.purge()).toBe(MCP_TOKEN_CACHE_PURGE_BATCH);
    expect(backend.rows).toHaveLength(20);
    expect(backend.scheduled).toEqual([{ delayMs: 0, fn: purgeRef, args: {} }]);

    // the rescheduled run takes the rest and stops
    expect(await backend.purge()).toBe(20);
    expect(backend.rows).toHaveLength(0);
    expect(backend.scheduled).toHaveLength(1);
  });
});

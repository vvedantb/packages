/**
 * A cache of verified MCP bearer tokens, so most requests skip the verify
 * step (for Clerk: a network call, often from a cold Node action). Rows hold
 * the SHA-256 of the token, never the token. Only successful verifications
 * are cached; a revoked token keeps working until its row expires (at most
 * `MCP_TOKEN_CACHE_TTL_MS`).
 *
 * The package cannot own a Convex table and never imports `convex` at
 * runtime, so the app defines the table in its own schema and passes in `v`
 * and its function builders.
 */
import type {
  defineTable as convexDefineTable,
  FunctionReference,
  IndexRange,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server";
import type { v as convexV, GenericId, Validator } from "convex/values";
import { base64UrlToBytes } from "../crypto/encoding.js";
import { sha256Hex } from "../crypto/sha256.js";

export const MCP_TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
/** Rows `purgeExpired` deletes per run; a full batch schedules another run. */
export const MCP_TOKEN_CACHE_PURGE_BATCH = 500;
/** The default table name. */
export const MCP_TOKEN_CACHE_TABLE = "mcpTokenCache";
export const MCP_TOKEN_CACHE_HASH_INDEX = "by_token_hash";
export const MCP_TOKEN_CACHE_EXPIRES_INDEX = "by_expires";

/** What a cache hit returns. */
export type McpTokenCachePrincipal = { clerkUserId: string };

/** A cached verification, as `getInternal` returns it. */
export type McpTokenCacheEntry = { clerkUserId: string; expiresAt: number };

/** A row to write, as `putInternal` takes it. */
export type McpTokenCacheRow = McpTokenCacheEntry & { tokenHash: string };

type ConvexV = typeof convexV;

/** `exp` of a JWT in ms, or null for an opaque token or an unreadable payload. */
export function jwtExpiryMs(token: string): number | null {
  const [, payloadPart, ...rest] = token.split(".");
  if (payloadPart === undefined || rest.length !== 1) return null;
  try {
    const payload: unknown = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart)));
    if (typeof payload !== "object" || payload === null || !("exp" in payload)) return null;
    return typeof payload.exp === "number" && Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** min(now + TTL, token expiry); null when the token is already expired. */
export function tokenCacheExpiresAt(token: string, nowMs: number): number | null {
  const ttlEnd = nowMs + MCP_TOKEN_CACHE_TTL_MS;
  const expiry = jwtExpiryMs(token);
  if (expiry === null) return ttlEnd;
  return expiry > nowMs ? Math.min(ttlEnd, expiry) : null;
}

/** The cache key: SHA-256 of the token, as lowercase hex. */
export function hashMcpToken(token: string): Promise<string> {
  return sha256Hex(token);
}

/**
 * The table's fields: `tokenHash`, `clerkUserId` (strings) and `expiresAt` (number).
 *
 * Do not import in `convex/schema.ts` (NoImportModuleInSchema). Use in tests to
 * check your local table matches. See `docs/convex.md`.
 */
export function mcpTokenCacheFields(v: ConvexV) {
  return { tokenHash: v.string(), clerkUserId: v.string(), expiresAt: v.number() };
}

/**
 * The cache table with both indexes (`by_token_hash`, `by_expires`).
 *
 * @deprecated Do not call in `convex/schema.ts`: a schema cannot import the
 * package (NoImportModuleInSchema). Define the table locally and use this in
 * tests to check your local table matches. See `docs/convex.md`.
 */
export function mcpTokenCacheTable(defineTable: typeof convexDefineTable, v: ConvexV) {
  return defineTable(mcpTokenCacheFields(v))
    .index(MCP_TOKEN_CACHE_HASH_INDEX, ["tokenHash"])
    .index(MCP_TOKEN_CACHE_EXPIRES_INDEX, ["expiresAt"]);
}

export type AuthenticateWithTokenCacheOptions<Principal extends McpTokenCachePrincipal> = {
  token: string;
  /** For example `(tokenHash) => ctx.runQuery(internal.mcp.tokenCache.getInternal, { tokenHash })`. */
  get: (tokenHash: string) => Promise<McpTokenCacheEntry | null>;
  /** For example `(row) => ctx.runMutation(internal.mcp.tokenCache.putInternal, row)`. */
  put: (row: McpTokenCacheRow) => Promise<unknown>;
  /** The real verification, run on a miss. */
  verify: (token: string) => Promise<Principal | null>;
  /** Clock in ms. Default `Date.now`. */
  now?: () => number;
};

/**
 * Cache lookup, then `verify` on a miss. A null from `verify` is returned
 * as is and never cached, so invalid tokens behave exactly as before. A hit
 * returns `{ clerkUserId }` only; a failed cache write is logged and ignored.
 *
 * @deprecated Since 0.8.0. Clerk OAuth access tokens are JWTs now; use
 * `authenticateClerkBearer`, which verifies them in V8 without this cache.
 * Remove the cache from apps once old opaque tokens expire (Clerk OAuth access
 * tokens last 1 day, so about 1 day after the switch to JWTs).
 */
export async function authenticateWithTokenCache<Principal extends McpTokenCachePrincipal>(
  options: AuthenticateWithTokenCacheOptions<Principal>,
): Promise<Principal | McpTokenCachePrincipal | null> {
  const { token, get, put, verify, now = Date.now } = options;
  const startedAt = now();
  const tokenHash = await hashMcpToken(token);
  const cached = await get(tokenHash);
  if (cached !== null && cached.expiresAt > now()) {
    logAuth(true, now() - startedAt);
    return { clerkUserId: cached.clerkUserId };
  }
  const verified = await verify(token);
  logAuth(false, now() - startedAt);
  if (verified === null) return null;
  const expiresAt = tokenCacheExpiresAt(token, now());
  if (expiresAt !== null) {
    try {
      await put({ tokenHash, clerkUserId: verified.clerkUserId, expiresAt });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      console.warn("[MCP][auth] token cache write failed:", message);
    }
  }
  return verified;
}

function logAuth(cached: boolean, authMs: number): void {
  console.log("[MCP][auth]", JSON.stringify({ authCached: cached, authMs }));
}

// Structural ctx types: the parts of a Convex `QueryCtx` / `MutationCtx` the
// handlers use. A real ctx for a schema with the cache table fits them with the
// default `Id` and `Range`; a test fake can pass its own.

/** A cache table document. */
export type McpTokenCacheDoc<Id> = McpTokenCacheRow & { _id: Id; _creationTime: number };

type TokenCacheQuery<Id, Range> = {
  withIndex(
    index: typeof MCP_TOKEN_CACHE_HASH_INDEX,
    range: (q: { eq(field: "tokenHash", value: string): Range }) => Range,
  ): { first(): Promise<McpTokenCacheDoc<Id> | null> };
  withIndex(
    index: typeof MCP_TOKEN_CACHE_EXPIRES_INDEX,
    range: (q: { lt(field: "expiresAt", value: number): Range }) => Range,
  ): { take(n: number): Promise<McpTokenCacheDoc<Id>[]> };
};

export type McpTokenCacheQueryCtx<Table extends string, Id = GenericId<Table>, Range = IndexRange> = {
  db: { query(table: Table): TokenCacheQuery<Id, Range> };
};

export type McpTokenCacheMutationCtx<Table extends string, Id = GenericId<Table>, Range = IndexRange> = {
  db: {
    query(table: Table): TokenCacheQuery<Id, Range>;
    insert(table: Table, value: McpTokenCacheRow): Promise<Id>;
    patch(id: Id, value: McpTokenCacheEntry): Promise<void>;
    delete(id: Id): Promise<void>;
  };
  scheduler: {
    runAfter(delayMs: number, fn: McpTokenCachePurgeRef, args: Record<string, never>): Promise<unknown>;
  };
};

/**
 * `internal.<module>.purgeExpired`, which `purgeExpired` schedules to finish a
 * large purge. Annotate the `purgeSelf` thunk with it: an unannotated thunk
 * makes `internal` refer to itself (TS7022).
 */
export type McpTokenCachePurgeRef = FunctionReference<"mutation", "internal", Record<string, never>>;

type TokenHashArgs = { tokenHash: string };
type NoArgs = Record<string, never>;

/** What `getInternal` passes to `internalQuery`. */
export type McpTokenCacheGetDef<Table extends string, Id = GenericId<Table>, Range = IndexRange> = {
  args: { tokenHash: Validator<string, "required", string> };
  returns: Validator<McpTokenCacheEntry | null, "required", string>;
  handler: (ctx: McpTokenCacheQueryCtx<Table, Id, Range>, args: TokenHashArgs) => Promise<McpTokenCacheEntry | null>;
};

/** What `putInternal` passes to `internalMutation`. */
export type McpTokenCachePutDef<Table extends string, Id = GenericId<Table>, Range = IndexRange> = {
  args: {
    tokenHash: Validator<string, "required", string>;
    clerkUserId: Validator<string, "required", string>;
    expiresAt: Validator<number, "required", string>;
  };
  returns: Validator<null, "required", string>;
  handler: (ctx: McpTokenCacheMutationCtx<Table, Id, Range>, args: McpTokenCacheRow) => Promise<null>;
};

/** What `purgeExpired` passes to `internalMutation`. */
export type McpTokenCachePurgeDef<Table extends string, Id = GenericId<Table>, Range = IndexRange> = {
  args: NoArgs;
  returns: Validator<number, "required", string>;
  handler: (ctx: McpTokenCacheMutationCtx<Table, Id, Range>, args: NoArgs) => Promise<number>;
};

/** The app's `internalQuery`, narrowed to the one call made here. */
export type McpTokenCacheQueryBuilder<Table extends string, Id = GenericId<Table>, Range = IndexRange> = (
  def: McpTokenCacheGetDef<Table, Id, Range>,
) => RegisteredQuery<"internal", TokenHashArgs, Promise<McpTokenCacheEntry | null>>;

/** The app's `internalMutation`, narrowed to the two calls made here. */
export type McpTokenCacheMutationBuilder<Table extends string, Id = GenericId<Table>, Range = IndexRange> = ((
  def: McpTokenCachePutDef<Table, Id, Range>,
) => RegisteredMutation<"internal", McpTokenCacheRow, Promise<null>>) &
  ((def: McpTokenCachePurgeDef<Table, Id, Range>) => RegisteredMutation<"internal", NoArgs, Promise<number>>);

export type McpTokenCacheFunctionsConfig<Table extends string, Id = GenericId<Table>, Range = IndexRange> = {
  v: ConvexV;
  internalQuery: McpTokenCacheQueryBuilder<NoInfer<Table>, NoInfer<Id>, NoInfer<Range>>;
  internalMutation: McpTokenCacheMutationBuilder<NoInfer<Table>, NoInfer<Id>, NoInfer<Range>>;
  /** The cache table. Default `"mcpTokenCache"`. */
  tableName?: Table;
  /** This module's `purgeExpired`: `(): McpTokenCachePurgeRef => internal.mcp.tokenCache.purgeExpired`. */
  purgeSelf: () => McpTokenCachePurgeRef;
};

/**
 * The cache's internal functions. Export all three from one module, here
 * `convex/mcp/tokenCache.ts`:
 *
 * ```ts
 * export const { getInternal, putInternal, purgeExpired } = createMcpTokenCacheFunctions({
 *   v,
 *   internalQuery,
 *   internalMutation,
 *   purgeSelf: (): McpTokenCachePurgeRef => internal.mcp.tokenCache.purgeExpired,
 * });
 * ```
 *
 * @deprecated Since 0.8.0. Clerk OAuth access tokens are JWTs now; use
 * `authenticateClerkBearer`, which verifies them in V8 without this cache.
 * Remove the cache from apps once old opaque tokens expire (Clerk OAuth access
 * tokens last 1 day, so about 1 day after the switch to JWTs).
 */
export function createMcpTokenCacheFunctions<
  Table extends string = typeof MCP_TOKEN_CACHE_TABLE,
  Id = GenericId<Table>,
  Range = IndexRange,
>(config: McpTokenCacheFunctionsConfig<Table, Id, Range>) {
  return buildMcpTokenCacheFunctions(config);
}

// Typed for any table name, so the default name needs no cast; `Table` only checks the app's builders.
function buildMcpTokenCacheFunctions<Id, Range>(config: McpTokenCacheFunctionsConfig<string, Id, Range>) {
  const { v, internalQuery, internalMutation, purgeSelf } = config;
  const table = config.tableName ?? MCP_TOKEN_CACHE_TABLE;

  const getInternal = internalQuery({
    args: { tokenHash: v.string() },
    returns: v.union(v.object({ clerkUserId: v.string(), expiresAt: v.number() }), v.null()),
    // expiry is checked by the caller, so this query stays cacheable
    handler: async (ctx, { tokenHash }) => {
      const row = await ctx.db
        .query(table)
        .withIndex(MCP_TOKEN_CACHE_HASH_INDEX, (q) => q.eq("tokenHash", tokenHash))
        .first();
      return row === null ? null : { clerkUserId: row.clerkUserId, expiresAt: row.expiresAt };
    },
  });

  const putInternal = internalMutation({
    args: mcpTokenCacheFields(v),
    returns: v.null(),
    handler: async (ctx, args) => {
      const row = await ctx.db
        .query(table)
        .withIndex(MCP_TOKEN_CACHE_HASH_INDEX, (q) => q.eq("tokenHash", args.tokenHash))
        .first();
      if (row === null) {
        await ctx.db.insert(table, args);
      } else if (row.clerkUserId !== args.clerkUserId || row.expiresAt < args.expiresAt) {
        await ctx.db.patch(row._id, { clerkUserId: args.clerkUserId, expiresAt: args.expiresAt });
      }
      return null;
    },
  });

  const purgeExpired = internalMutation({
    args: {},
    returns: v.number(),
    handler: async (ctx) => {
      const rows = await ctx.db
        .query(table)
        .withIndex(MCP_TOKEN_CACHE_EXPIRES_INDEX, (q) => q.lt("expiresAt", Date.now()))
        .take(MCP_TOKEN_CACHE_PURGE_BATCH);
      for (const row of rows) await ctx.db.delete(row._id);
      if (rows.length === MCP_TOKEN_CACHE_PURGE_BATCH) {
        await ctx.scheduler.runAfter(0, purgeSelf(), {});
      }
      return rows.length;
    },
  });

  return { getInternal, putInternal, purgeExpired };
}

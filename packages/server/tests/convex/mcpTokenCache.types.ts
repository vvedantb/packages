import type { RegisteredMutation, RegisteredQuery } from "convex/server";
import { v } from "convex/values";
import { expectTypeOf } from "vitest";
import {
  authenticateWithTokenCache,
  createMcpTokenCacheFunctions,
  type McpTokenCacheEntry,
  type McpTokenCachePrincipal,
} from "@vvedantb/server";
import { internal } from "./mcpTokenCacheApp/_generated/api.js";
import { internalMutation, internalQuery, type ActionCtx } from "./mcpTokenCacheApp/_generated/server.js";
import * as tokenCache from "./mcpTokenCacheApp/mcp/tokenCache.js";

// Type-only checks, run by `pnpm typecheck` (not vitest: the builders and ctx are declared, not built).
// The app in ./mcpTokenCacheApp mirrors `convex/` with codegen output, so `internal.*` is typed from the factory.
declare const actionCtx: ActionCtx;

export async function mcpTokenCacheTypeChecks(): Promise<void> {
  // the factory returns real registered functions
  {
    expectTypeOf(tokenCache.getInternal).toEqualTypeOf<
      RegisteredQuery<"internal", { tokenHash: string }, Promise<McpTokenCacheEntry | null>>
    >();
    expectTypeOf(tokenCache.putInternal).toEqualTypeOf<
      RegisteredMutation<"internal", { tokenHash: string; clerkUserId: string; expiresAt: number }, Promise<null>>
    >();
    expectTypeOf(tokenCache.purgeExpired).toEqualTypeOf<
      RegisteredMutation<"internal", Record<string, never>, Promise<number>>
    >();
  }

  // internal.* stays typed, for the default and a custom table name
  {
    expectTypeOf(
      actionCtx.runQuery(internal.mcp.tokenCache.getInternal, { tokenHash: "h" }),
    ).resolves.toEqualTypeOf<McpTokenCacheEntry | null>();
    expectTypeOf(
      actionCtx.runMutation(internal.mcp.tokenCache.putInternal, { tokenHash: "h", clerkUserId: "u", expiresAt: 1 }),
    ).resolves.toEqualTypeOf<null>();
    expectTypeOf(actionCtx.runMutation(internal.mcp.tokenCache.purgeExpired, {})).resolves.toEqualTypeOf<number>();
    expectTypeOf(
      actionCtx.runQuery(internal.mcp.authCache.getInternal, { tokenHash: "h" }),
    ).resolves.toEqualTypeOf<McpTokenCacheEntry | null>();
    // @ts-expect-error tokenHash is required
    void actionCtx.runQuery(internal.mcp.tokenCache.getInternal, {});
  }

  // authenticateWithTokenCache wires to the internal functions with no cast
  {
    const principal = await authenticateWithTokenCache({
      token: "oat_1",
      get: (tokenHash) => actionCtx.runQuery(internal.mcp.tokenCache.getInternal, { tokenHash }),
      put: (row) => actionCtx.runMutation(internal.mcp.tokenCache.putInternal, row),
      verify: async () => ({ clerkUserId: "u", scopes: ["read"] }),
    });
    expectTypeOf(principal).toEqualTypeOf<
      { clerkUserId: string; scopes: string[] } | McpTokenCachePrincipal | null
    >();
  }

  // rejects a table the schema does not have, or one without the cache indexes
  {
    const purgeSelf = () => internal.mcp.tokenCache.purgeExpired;
    // @ts-expect-error no such table
    createMcpTokenCacheFunctions({ v, internalQuery, internalMutation, tableName: "tokens", purgeSelf });
    // @ts-expect-error users has no by_token_hash index
    createMcpTokenCacheFunctions({ v, internalQuery, internalMutation, tableName: "users", purgeSelf });
  }
}

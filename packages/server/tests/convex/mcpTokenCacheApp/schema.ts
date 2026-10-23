import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// A Convex app shaped like `convex/`, for the type checks in ../mcpTokenCache.types.ts.
// The cache table is defined locally, as in an app: a schema cannot import the package
// (NoImportModuleInSchema). ../mcpTokenCache.test.ts checks it matches `mcpTokenCacheFields`.
const mcpTokenCacheFields = { tokenHash: v.string(), clerkUserId: v.string(), expiresAt: v.number() };

function mcpTokenCacheTable() {
  return defineTable(mcpTokenCacheFields).index("by_token_hash", ["tokenHash"]).index("by_expires", ["expiresAt"]);
}

export default defineSchema({
  users: defineTable({ clerkId: v.string() }).index("by_clerk_id", ["clerkId"]),
  mcpTokenCache: mcpTokenCacheTable(),
  // the same table under another name
  authCache: mcpTokenCacheTable(),
});

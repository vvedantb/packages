import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { mcpTokenCacheFields, mcpTokenCacheTable } from "@vvedantb/server";

// A Convex app shaped like `convex/`, for the type checks in ../mcpTokenCache.types.ts.
export default defineSchema({
  users: defineTable({ clerkId: v.string() }).index("by_clerk_id", ["clerkId"]),
  mcpTokenCache: mcpTokenCacheTable(defineTable, v),
  // the fields under another table name, with the same indexes
  authCache: defineTable(mcpTokenCacheFields(v))
    .index("by_token_hash", ["tokenHash"])
    .index("by_expires", ["expiresAt"]),
});

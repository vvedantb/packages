import { v } from "convex/values";
import { createMcpTokenCacheFunctions, type McpTokenCachePurgeRef } from "@vvedantb/server";
import { internal } from "../_generated/api.js";
import { internalMutation, internalQuery } from "../_generated/server.js";

export const { getInternal, putInternal, purgeExpired } = createMcpTokenCacheFunctions({
  v,
  internalQuery,
  internalMutation,
  tableName: "authCache",
  purgeSelf: (): McpTokenCachePurgeRef => internal.mcp.authCache.purgeExpired,
});

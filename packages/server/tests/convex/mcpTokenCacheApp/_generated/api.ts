import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as mcp_authCache from "../mcp/authCache.js";
import type * as mcp_tokenCache from "../mcp/tokenCache.js";

// What `convex codegen` declares in _generated/api.d.ts.
declare const fullApi: ApiFromModules<{
  "mcp/authCache": typeof mcp_authCache;
  "mcp/tokenCache": typeof mcp_tokenCache;
}>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<"query" | "mutation" | "action", "internal">>;

import { mcpCorsHeaders } from "../convex/index";

export type HeaderMap = Record<string, string>;

/**
 * CORS headers for every response.
 * - `false` (default): no CORS headers, like app-a and app-c.
 * - a header map: sent as-is, like app-b and app-d (see `mcpCors`).
 * - a function: computed per request, e.g. to reflect `Origin` like app-e.
 */
export type CorsOption = false | HeaderMap | ((request: Request) => HeaderMap);

/**
 * server/convex's `mcpCorsHeaders(origin)` with `overrides` applied on top.
 * app-b: `mcpCors({ "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version", "Access-Control-Max-Age": "86400" })`.
 */
export function mcpCors(overrides: HeaderMap = {}, origin?: string): HeaderMap {
  return { ...mcpCorsHeaders(origin), ...overrides };
}

export function resolveCors(cors: CorsOption | undefined, request: Request): HeaderMap {
  if (!cors) return {};
  return typeof cors === "function" ? cors(request) : cors;
}

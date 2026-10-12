import { mcpCorsHeaders } from "@vvedantb/convex-kit";

export type HeaderMap = Record<string, string>;

/**
 * CORS headers for every response.
 * - `false` (default): no CORS headers, like vmem and verve.
 * - a header map: sent as-is, like vibot and velth (see `mcpCors`).
 * - a function: computed per request, e.g. to reflect `Origin` like vhub.
 */
export type CorsOption = false | HeaderMap | ((request: Request) => HeaderMap);

/**
 * convex-kit's `mcpCorsHeaders(origin)` with `overrides` applied on top.
 * vibot: `mcpCors({ "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version", "Access-Control-Max-Age": "86400" })`.
 */
export function mcpCors(overrides: HeaderMap = {}, origin?: string): HeaderMap {
  return { ...mcpCorsHeaders(origin), ...overrides };
}

export function resolveCors(cors: CorsOption | undefined, request: Request): HeaderMap {
  if (!cors) return {};
  return typeof cors === "function" ? cors(request) : cors;
}

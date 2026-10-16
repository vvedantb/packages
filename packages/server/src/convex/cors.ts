/** CORS headers for stateless MCP HTTP handlers. */
export function mcpCorsHeaders(origin = "*"): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Allow-Credentials": "false",
  };
}

/** Response for an `OPTIONS` preflight request: 204 with CORS headers. */
export function corsPreflight(origin?: string): Response {
  return new Response(null, { status: 204, headers: mcpCorsHeaders(origin) });
}

export type JsonWithCorsInit = {
  status?: number;
  origin?: string;
  extraHeaders?: Record<string, string>;
};

/** JSON response with CORS headers. `extraHeaders` win over the CORS defaults. */
export function jsonWithCors(
  body: unknown,
  init: JsonWithCorsInit = {},
): Response {
  return Response.json(body, {
    status: init.status ?? 200,
    headers: { ...mcpCorsHeaders(init.origin), ...init.extraHeaders },
  });
}

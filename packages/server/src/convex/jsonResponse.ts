import type { JsonInput } from "../mcp/json.js";

/**
 * `JSON.stringify(data)` with `Content-Type: application/json`;
 * `extraHeaders` are spread after it, so they can override it.
 */
export function jsonResponse(
  data: JsonInput,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

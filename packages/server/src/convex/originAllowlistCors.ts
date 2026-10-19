export type OriginAllowlistCors = {
  /**
   * Headers for a normal response. `Access-Control-Allow-Origin` is the
   * origin when allowed and `""` otherwise.
   */
  headers(origin: string): Record<string, string>;
  /**
   * Headers for an `OPTIONS` preflight: adds `Access-Control-Max-Age: 86400`
   * and omits `Access-Control-Allow-Origin` unless the origin is allowed.
   */
  preflightHeaders(origin: string): Record<string, string>;
};

const ALLOW_METHODS = "GET,POST,PUT,DELETE,OPTIONS";
const ALLOW_HEADERS = "Content-Type,Authorization,X-Requested-With";

/**
 * CORS with credentials for browser clients on a fixed list of origins.
 * Origins match exactly (`allowedOrigins.includes(origin)`). Pass
 * `request.headers.get("origin") ?? ""`.
 */
export function createOriginAllowlistCors(
  allowedOrigins: readonly string[],
): OriginAllowlistCors {
  return {
    headers: (origin) => ({
      "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "",
      "Access-Control-Allow-Methods": ALLOW_METHODS,
      "Access-Control-Allow-Headers": ALLOW_HEADERS,
      "Access-Control-Allow-Credentials": "true",
    }),
    preflightHeaders: (origin) => {
      const headers: Record<string, string> = {
        "Access-Control-Allow-Methods": ALLOW_METHODS,
        "Access-Control-Allow-Headers": ALLOW_HEADERS,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      };
      if (allowedOrigins.includes(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
      }
      return headers;
    },
  };
}

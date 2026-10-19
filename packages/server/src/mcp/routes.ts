/** Methods `registerMcpRoutes` registers. */
export type McpRouteMethod = "GET" | "POST" | "DELETE" | "OPTIONS";

export type McpRouteSpec<Handler> = { path: string; method: McpRouteMethod; handler: Handler };

/**
 * The part of a Convex `httpRouter()` this uses. Typed structurally so the
 * package does not depend on `convex`; `Handler` is inferred from the router.
 */
export type McpRouter<Handler> = { route(spec: McpRouteSpec<Handler>): void };

/** One MCP endpoint and the well-known routes suffixed with its path. */
export type McpEndpointRoutes<Handler> = {
  /** Default `/mcp`. */
  path?: string;
  /** `POST`, `GET` and `DELETE` on `path`. */
  handler: Handler;
  /** `OPTIONS` on `path`. Not registered when omitted. */
  options?: Handler;
  /** `GET /.well-known/oauth-protected-resource<path>` (RFC 9728 path form). Not registered when omitted. */
  protectedResourceMetadata?: Handler;
  /** `GET /.well-known/oauth-authorization-server<path>` (RFC 8414 path form). Not registered when omitted. */
  authorizationServerMetadata?: Handler;
};

export type McpRoutesConfig<Handler> = {
  /** `GET /.well-known/oauth-authorization-server`. */
  authorizationServerMetadata: Handler;
  /** `GET /.well-known/oauth-protected-resource`. */
  protectedResourceMetadata: Handler;
  /** MCP endpoints, usually one at `/mcp`. */
  endpoints: readonly McpEndpointRoutes<Handler>[];
  /** Token proxy: `POST <path>`, plus `OPTIONS <path>` when `options` is set. */
  tokenProxy?: { path: string; handler: Handler; options?: Handler };
  /** `GET <path>`, default `/health`. */
  health?: { path?: string; handler: Handler };
};

const AUTHORIZATION_SERVER = "/.well-known/oauth-authorization-server";
const PROTECTED_RESOURCE = "/.well-known/oauth-protected-resource";
const ENDPOINT_METHODS: readonly McpRouteMethod[] = ["POST", "GET", "DELETE"];

/**
 * Register the MCP route block on a Convex `httpRouter()`. Only what the
 * config names is registered; Convex matches exact paths regardless of
 * registration order and throws on a duplicate path and method.
 */
export function registerMcpRoutes<Handler>(
  http: McpRouter<Handler>,
  config: McpRoutesConfig<Handler>,
): void {
  const get = (path: string, handler: Handler) => http.route({ path, method: "GET", handler });

  get(AUTHORIZATION_SERVER, config.authorizationServerMetadata);
  get(PROTECTED_RESOURCE, config.protectedResourceMetadata);

  for (const endpoint of config.endpoints) {
    const path = endpoint.path ?? "/mcp";
    if (endpoint.authorizationServerMetadata) {
      get(`${AUTHORIZATION_SERVER}${path}`, endpoint.authorizationServerMetadata);
    }
    if (endpoint.protectedResourceMetadata) {
      get(`${PROTECTED_RESOURCE}${path}`, endpoint.protectedResourceMetadata);
    }
    for (const method of ENDPOINT_METHODS) {
      http.route({ path, method, handler: endpoint.handler });
    }
    if (endpoint.options) http.route({ path, method: "OPTIONS", handler: endpoint.options });
  }

  if (config.tokenProxy) {
    const { path, handler, options } = config.tokenProxy;
    http.route({ path, method: "POST", handler });
    if (options) http.route({ path, method: "OPTIONS", handler: options });
  }

  if (config.health) get(config.health.path ?? "/health", config.health.handler);
}

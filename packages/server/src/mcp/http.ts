import { extractBearerToken } from "../convex/index.js";
import { resolveCors, type CorsOption, type HeaderMap } from "./cors.js";
import type { JsonValue, Thrown } from "./json.js";
import type { RpcResult } from "./jsonRpc.js";

/** A Convex `httpAction` body: `httpAction(handler)`. */
export type HttpHandler<Ctx> = (ctx: Ctx, request: Request) => Promise<Response>;

/** Default `WWW-Authenticate` resource metadata path. */
export const PROTECTED_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

/** Response messages. Defaults are the strings every app sends today. */
export type McpHttpMessages = {
  missingToken: string;
  invalidToken: string;
  methodNotAllowed: string;
  invalidJson: string;
};

export const DEFAULT_MCP_HTTP_MESSAGES: McpHttpMessages = {
  missingToken: "Missing Authorization header",
  invalidToken: "Invalid or expired token",
  methodNotAllowed: "Method not supported in stateless mode",
  invalidJson: "Invalid JSON body",
};

export type McpHttpLogEvent =
  | { type: "auth-failed" }
  | { type: "authenticate-threw"; error: Thrown }
  | { type: "invalid-json"; error: Thrown };

export type McpHttpLogger = (event: McpHttpLogEvent) => void;

/**
 * Logs with the app-a strings: "[MCP][mcpHandler] token verification failed"
 * and "[MCP][mcpHandler] failed to parse JSON body:". app-c logs only the
 * first (`log: (e) => e.type === "auth-failed" && consoleMcpLogger(e)`);
 * app-b and app-d log nothing (`log: false`).
 */
export const consoleMcpLogger: McpHttpLogger = (event) => {
  switch (event.type) {
    case "auth-failed":
      console.error("[MCP][mcpHandler] token verification failed");
      return;
    case "authenticate-threw":
      console.error("[MCP][mcpHandler] authenticate threw:", event.error);
      return;
    case "invalid-json":
      console.error("[MCP][mcpHandler] failed to parse JSON body:", event.error);
      return;
  }
};

export type AuthenticateArgs<Ctx, Scope extends string> = {
  /** Bearer token from the `Authorization` header (never empty). */
  token: string;
  request: Request;
  ctx: Ctx;
  scope: Scope | undefined;
};

export type HandleRpcArgs<Principal, Ctx, Scope extends string> = {
  principal: Principal;
  /** JSON-RPC body text: re-encoded (`body: "json"`) or as received (`body: "text"`). */
  body: string;
  /** The parsed body. */
  json: JsonValue;
  request: Request;
  ctx: Ctx;
  scope: Scope | undefined;
};

export type McpHttpHandlerConfig<Principal, Ctx, Scope extends string = string> = {
  /**
   * Verify the bearer token. Return the principal, or `null` to answer 401
   * "Invalid or expired token". Authorisation (Pro claims, legacy JWTs, API
   * key scopes, user lookup) belongs here, in the app.
   */
  authenticate: (args: AuthenticateArgs<Ctx, Scope>) => Promise<Principal | null>;
  /**
   * Run the JSON-RPC request. Either the app's own (for example an
   * internalAction that runs the MCP SDK) or `createMcpDispatcher(...).handleRpc`.
   * The result is sent with `Content-Type: application/json` plus CORS.
   */
  handleRpc: (args: HandleRpcArgs<Principal, Ctx, Scope>) => Promise<RpcResult>;
  /** Opaque value passed to `authenticate` and `handleRpc` (app-a: "personal" | "team"). */
  scope?: Scope;
  /** Path for `WWW-Authenticate: Bearer resource_metadata="<origin><path>"`. Default `/.well-known/oauth-protected-resource`. */
  resourceMetadataPath?: string;
  /** Full resource metadata URL. Overrides `resourceMetadataPath`. */
  resourceMetadataUrl?: (request: Request) => string;
  /** Methods answered 405 (stateless server). Default `["GET", "DELETE"]`. */
  rejectMethods?: readonly string[];
  /** When to reject those methods. Default `"after-auth"` (all four apps); app-e checks before auth. */
  methodCheck?: "after-auth" | "before-auth";
  /**
   * `"json"` (default): `JSON.stringify(await request.json())`, like app-a, app-b, app-c.
   * `"text"`: raw text, checked with `JSON.parse`, like app-d.
   */
  body?: "json" | "text";
  /** CORS on every response. Default none. With CORS set, `OPTIONS` returns a 204 preflight. */
  cors?: CorsOption;
  /** Extra headers on every response (after CORS). */
  headers?: HeaderMap;
  messages?: Partial<McpHttpMessages>;
  /** Log hook. Default `consoleMcpLogger`; `false` for none. */
  log?: McpHttpLogger | false;
  /**
   * When `authenticate` throws. `"throw"` (default, as the apps today): the
   * error escapes, so Convex answers 500. `"unauthorized"`: log
   * `authenticate-threw` and answer 401 "Invalid or expired token".
   */
  onAuthenticateError?: "throw" | "unauthorized";
};

/**
 * Build the `/mcp` handler: bearer check, `authenticate`, method check,
 * body parsing, then `handleRpc`.
 *
 * ```ts
 * export const mcpHandler = httpAction(
 *   createMcpHttpHandler<Credentials, ActionCtx>({
 *     authenticate: ({ ctx, token }) => ctx.runAction(internal.mcp.nodeActions.verifyAccessToken, { token }),
 *     handleRpc: ({ ctx, principal, body }) => ctx.runAction(internal.mcp.nodeActions.handleMcpRequest, { clerkUserId: principal.clerkUserId, body }),
 *   }),
 * );
 * ```
 */
export function createMcpHttpHandler<Principal, Ctx, Scope extends string = string>(
  config: McpHttpHandlerConfig<Principal, Ctx, Scope>,
): HttpHandler<Ctx> {
  const messages = { ...DEFAULT_MCP_HTTP_MESSAGES, ...config.messages };
  const rejectMethods = config.rejectMethods ?? ["GET", "DELETE"];
  const methodCheck = config.methodCheck ?? "after-auth";
  const bodyMode = config.body ?? "json";
  const log = config.log === false ? undefined : (config.log ?? consoleMcpLogger);
  const onAuthenticateError = config.onAuthenticateError ?? "throw";
  const scope = config.scope;

  return async (ctx, request) => {
    const baseHeaders = {
      ...resolveCors(config.cors, request),
      ...config.headers,
    };
    const json = (body: { error: string }, status: number, extra: HeaderMap = {}) =>
      Response.json(body, {
        status,
        headers: { "Content-Type": "application/json", ...baseHeaders, ...extra },
      });
    const resourceMetadataUrl = config.resourceMetadataUrl
      ? config.resourceMetadataUrl(request)
      : `${new URL(request.url).origin}${config.resourceMetadataPath ?? PROTECTED_RESOURCE_METADATA_PATH}`;
    const unauthorized = (message: string) =>
      json({ error: message }, 401, {
        "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
      });
    const rejectsMethod = () => rejectMethods.includes(request.method);
    const methodNotAllowed = () => json({ error: messages.methodNotAllowed }, 405);

    if (request.method === "OPTIONS" && config.cors) {
      return new Response(null, { status: 204, headers: baseHeaders });
    }
    if (methodCheck === "before-auth" && rejectsMethod()) {
      return methodNotAllowed();
    }

    const token = extractBearerToken(request.headers.get("Authorization"));
    if (!token) return unauthorized(messages.missingToken);

    let principal: Principal | null;
    try {
      principal = await config.authenticate({ token, request, ctx, scope });
    } catch (error) {
      if (onAuthenticateError === "throw") throw error;
      log?.({ type: "authenticate-threw", error });
      principal = null;
    }
    if (principal === null || principal === undefined) {
      log?.({ type: "auth-failed" });
      return unauthorized(messages.invalidToken);
    }

    if (methodCheck === "after-auth" && rejectsMethod()) {
      return methodNotAllowed();
    }

    let body: string;
    let parsed: JsonValue;
    try {
      if (bodyMode === "text") {
        body = await request.text();
        parsed = JSON.parse(body);
      } else {
        parsed = await request.json();
        body = JSON.stringify(parsed);
      }
    } catch (error) {
      log?.({ type: "invalid-json", error });
      return json({ error: messages.invalidJson }, 400);
    }

    const result = await config.handleRpc({
      principal,
      body,
      json: parsed,
      request,
      ctx,
      scope,
    });
    return new Response(result.body, {
      status: result.status,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  };
}

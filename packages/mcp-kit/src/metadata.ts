import type { EnvSource } from "@vvedantb/convex-kit";
import { resolveCors, type CorsOption, type HeaderMap } from "./cors.js";
import { readEnvUrl, type EnvUrl } from "./env.js";
import type { HttpHandler } from "./http.js";
import type { JsonInput } from "./json.js";

type CommonOptions = {
  /** CORS on every response. Default none. */
  cors?: CorsOption;
  /** Extra headers on every response (after CORS). */
  headers?: HeaderMap;
  /** Env source, read on each request. Default `process.env`. */
  env?: EnvSource;
};

function headersFor(options: CommonOptions, request: Request): HeaderMap {
  return { ...resolveCors(options.cors, request), ...options.headers };
}

export type AuthorizationServerMetadataProxyOptions = CommonOptions & {
  /** Issuer URL env var. Default `CLERK_FRONTEND_API_URL`. */
  issuer?: EnvUrl;
  /**
   * How the upstream body is returned on 200:
   * - `"json"` (default): `Response.json(await res.json())`, like vmem and vhub.
   * - `"text"`: `await res.text()` as `application/json`, like verve and velth.
   * - `"stream"`: `res.body` streamed as `application/json`, like vibot.
   */
  forward?: "json" | "text" | "stream";
  /** Fetch implementation. Default the global `fetch` at request time. */
  fetch?: (url: string) => Promise<Response>;
};

/**
 * `GET /.well-known/oauth-authorization-server`: proxy
 * `<issuer>/.well-known/oauth-authorization-server`. On a non-2xx upstream,
 * 502 `{"error":"Failed to fetch authorization server metadata"}`.
 */
export function createAuthorizationServerMetadataProxy(
  options: AuthorizationServerMetadataProxyOptions = {},
): HttpHandler<object> {
  const forward = options.forward ?? "json";
  return async (_ctx, request) => {
    const issuer = readEnvUrl(options.issuer ?? "CLERK_FRONTEND_API_URL", options.env);
    const url = `${issuer}/.well-known/oauth-authorization-server`;
    const res = await (options.fetch ? options.fetch(url) : fetch(url));
    const headers = headersFor(options, request);
    if (!res.ok) {
      return Response.json(
        { error: "Failed to fetch authorization server metadata" },
        { status: 502, headers: { "Content-Type": "application/json", ...headers } },
      );
    }
    if (forward === "json") {
      const metadata: JsonInput = await res.json();
      return Response.json(metadata, {
        headers: { "Content-Type": "application/json", ...headers },
      });
    }
    const body = forward === "text" ? await res.text() : res.body;
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json", ...headers },
    });
  };
}

export type ProtectedResourceMetadataOptions = CommonOptions & {
  /** Resource path on this origin. Default `/mcp` (vmem team: `/mcp/team`). */
  resourcePath?: string;
  /** Authorization server URL env var. Default `CLERK_FRONTEND_API_URL`. */
  authorizationServer?: EnvUrl;
  /** `resource_documentation` URL env var. Default `WEB_APP_URL`. */
  documentation?: EnvUrl;
};

/**
 * `GET /.well-known/oauth-protected-resource[/...]`:
 * `{ resource, authorization_servers: [issuer], bearer_methods_supported: ["header"], resource_documentation }`.
 * Env is read on each request, issuer first, so a missing var throws like the apps.
 */
export function createProtectedResourceMetadata(
  options: ProtectedResourceMetadataOptions = {},
): HttpHandler<object> {
  const resourcePath = options.resourcePath ?? "/mcp";
  return async (_ctx, request) => {
    const origin = new URL(request.url).origin;
    return Response.json(
      {
        resource: `${origin}${resourcePath}`,
        authorization_servers: [
          readEnvUrl(options.authorizationServer ?? "CLERK_FRONTEND_API_URL", options.env),
        ],
        bearer_methods_supported: ["header"],
        resource_documentation: readEnvUrl(options.documentation ?? "WEB_APP_URL", options.env),
      },
      { headers: { "Content-Type": "application/json", ...headersFor(options, request) } },
    );
  };
}

export type HealthOptions = Omit<CommonOptions, "env"> & {
  /** Body. Default `{ status: "ok" }`. vhub: `{ status: "ok", service: "vhub" }`. */
  body?: JsonInput;
};

/** `GET /health`: 200 JSON, `{"status":"ok"}` by default. */
export function createHealthHandler(options: HealthOptions = {}): HttpHandler<object> {
  const body = options.body ?? { status: "ok" };
  return async (_ctx, request) =>
    Response.json(body, {
      headers: { "Content-Type": "application/json", ...headersFor(options, request) },
    });
}

export type OptionsHandlerOptions = {
  cors: CorsOption;
  headers?: HeaderMap;
};

/** `OPTIONS` preflight: 204, no body, CORS headers only. */
export function createOptionsHandler(options: OptionsHandlerOptions): HttpHandler<object> {
  return async (_ctx, request) =>
    new Response(null, { status: 204, headers: headersFor(options, request) });
}

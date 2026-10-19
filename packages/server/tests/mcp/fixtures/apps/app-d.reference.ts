// Reference port of app-d packages/backend/convex/mcp/native.ts (origin/main,
// read 2026-10-12). Code is verbatim except: `httpAction(...)` is dropped,
// `ctx.runAction(internal.mcp.nodeActions.X, args)` is `ctx.deps.X(args)`,
// and `legacyRefreshToken` (stays in app-d) is left out.
import {
  extractBearerToken,
  jsonWithCors,
  mcpCorsHeaders,
  requiredEnvUrl,
} from "@vvedantb/server";
import type { AppCtx } from "./types.js";

export type AppDCredentials = { clerkUserId: string };
export type AppDRpcArgs = { clerkUserId: string; body: string };
type ActionCtx = AppCtx<AppDCredentials, AppDRpcArgs>;

const MCP_CORS_EXTRAS = {
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Session-Id",
};

const MCP_CORS = { ...mcpCorsHeaders(), ...MCP_CORS_EXTRAS };

function json(data: object, status: number, extra?: Record<string, string>) {
  return jsonWithCors(data, {
    status,
    extraHeaders: { ...MCP_CORS_EXTRAS, ...extra },
  });
}

function requiredEnvUrlWithFallback(name: string, fallbackName: string) {
  const useFallback = !process.env[name] && !!process.env[fallbackName];
  return requiredEnvUrl(useFallback ? fallbackName : name);
}

function getClerkFrontendApiUrl(): string {
  return requiredEnvUrlWithFallback(
    "CLERK_FRONTEND_API_URL",
    "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
  );
}

export const options = async () => {
  return new Response(null, { status: 204, headers: MCP_CORS });
};

export const oauthMetadata = async () => {
  const res = await fetch(
    `${getClerkFrontendApiUrl()}/.well-known/oauth-authorization-server`,
  );
  if (!res.ok) {
    return json(
      { error: "Failed to fetch authorization server metadata" },
      502,
    );
  }
  return new Response(await res.text(), {
    status: 200,
    headers: { "Content-Type": "application/json", ...MCP_CORS },
  });
};

export const protectedResourceMetadata = async (_ctx: object, request: Request) => {
  const baseUrl = new URL(request.url).origin;
  return json(
    {
      resource: `${baseUrl}/mcp`,
      authorization_servers: [getClerkFrontendApiUrl()],
      bearer_methods_supported: ["header"],
      resource_documentation: requiredEnvUrlWithFallback(
        "WEB_APP_URL",
        "SITE_URL",
      ),
    },
    200,
  );
};

export const mcpHandler = async (ctx: ActionCtx, request: Request) => {
  const baseUrl = new URL(request.url).origin;
  const resourceMetadataUrl = `${baseUrl}/.well-known/oauth-protected-resource`;
  const unauthorized = (message: string) =>
    json({ error: message }, 401, {
      "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
    });

  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) {
    return unauthorized("Missing Authorization header");
  }

  const credentials = await ctx.deps.verifyAccessToken({ token });
  if (!credentials) {
    return unauthorized("Invalid or expired token");
  }

  if (request.method === "GET" || request.method === "DELETE") {
    return json({ error: "Method not supported in stateless mode" }, 405);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
    JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const result = await ctx.deps.handleMcpRequest({
    clerkUserId: credentials.clerkUserId,
    body: rawBody,
  });

  return new Response(result.body, {
    status: result.status,
    headers: { "Content-Type": "application/json", ...MCP_CORS },
  });
};

export const health = async () => {
  return json({ status: "ok" }, 200);
};

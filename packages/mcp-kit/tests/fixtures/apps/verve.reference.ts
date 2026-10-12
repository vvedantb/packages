// Reference port of verve packages/backend/convex/mcp/native.ts (origin/main,
// read 2026-10-12). Code is verbatim except: `httpAction(...)` is dropped and
// `ctx.runAction(internal.mcp.nodeActions.X, args)` is `ctx.deps.X(args)`.
import { extractBearerToken, requiredEnvUrl } from "@vvedantb/convex-kit";
import type { AppCtx } from "./types.js";

export type VerveCredentials = { clerkUserId: string };
export type VerveRpcArgs = { clerkUserId: string; body: string };
type ActionCtx = AppCtx<VerveCredentials, VerveRpcArgs>;

function requiredEnvUrlWithFallback(name: string, fallbackName: string) {
  return requiredEnvUrl(process.env[name] ? name : fallbackName);
}

function requestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

function getClerkFrontendApiUrl(): string {
  return requiredEnvUrlWithFallback(
    "CLERK_FRONTEND_API_URL",
    "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
  );
}

export const oauthMetadata = async () => {
  const res = await fetch(
    `${getClerkFrontendApiUrl()}/.well-known/oauth-authorization-server`,
  );
  if (!res.ok) {
    return Response.json(
      { error: "Failed to fetch authorization server metadata" },
      { status: 502 },
    );
  }
  return new Response(await res.text(), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const protectedResourceMetadata = async (_ctx: object, request: Request) => {
  const baseUrl = requestOrigin(request);
  return Response.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [getClerkFrontendApiUrl()],
    bearer_methods_supported: ["header"],
    resource_documentation: requiredEnvUrlWithFallback(
      "WEB_APP_URL",
      "SITE_URL",
    ),
  });
};

function unauthorized(message: string, resourceMetadataUrl: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
    },
  });
}

export const mcpHandler = async (ctx: ActionCtx, request: Request) => {
  const resourceMetadataUrl = `${requestOrigin(request)}/.well-known/oauth-protected-resource`;

  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) {
    return unauthorized("Missing Authorization header", resourceMetadataUrl);
  }

  const credentials = await ctx.deps.verifyAccessToken({ token });

  if (!credentials) {
    console.error("[MCP][mcpHandler] token verification failed");
    return unauthorized("Invalid or expired token", resourceMetadataUrl);
  }

  if (request.method === "GET" || request.method === "DELETE") {
    return Response.json(
      { error: "Method not supported in stateless mode" },
      { status: 405 },
    );
  }

  let body: string;
  try {
    body = JSON.stringify(await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await ctx.deps.handleMcpRequest({
    clerkUserId: credentials.clerkUserId,
    body,
  });

  return new Response(result.body, {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
};

export const health = async () => {
  return Response.json({ status: "ok" });
};

// Reference port of vmem packages/backend/convex/mcp/native.ts (origin/main,
// read 2026-10-12). Code is verbatim except: `httpAction(...)` is dropped and
// `ctx.runAction(internal.mcp.nodeActions.X, args)` is `ctx.deps.X(args)`.
import { extractBearerToken, requiredEnvUrl } from "@vvedantb/convex-kit";
import type { AppCtx } from "./types.js";

export type VmemCredentials = { clerkUserId: string };
export type VmemRpcArgs = { clerkUserId: string; body: string; scope: "personal" | "team" };
type ActionCtx = AppCtx<VmemCredentials, VmemRpcArgs>;

function requestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

export const oauthMetadata = async () => {
  const clerkFrontendApiUrl = requiredEnvUrl("CLERK_FRONTEND_API_URL");
  const res = await fetch(
    `${clerkFrontendApiUrl}/.well-known/oauth-authorization-server`,
  );
  if (!res.ok) {
    return Response.json(
      { error: "Failed to fetch authorization server metadata" },
      { status: 502 },
    );
  }
  const metadata: object = await res.json();
  return Response.json(metadata);
};

function createProtectedResourceMetadataAction(
  resourcePath: "/mcp" | "/mcp/team",
) {
  return async (_ctx: object, request: Request) => {
    const baseUrl = requestOrigin(request);
    return Response.json({
      resource: `${baseUrl}${resourcePath}`,
      authorization_servers: [requiredEnvUrl("CLERK_FRONTEND_API_URL")],
      bearer_methods_supported: ["header"],
      resource_documentation: requiredEnvUrl("WEB_APP_URL"),
    });
  };
}

export const protectedResourceMetadata =
  createProtectedResourceMetadataAction("/mcp");
export const protectedResourceMetadataTeam =
  createProtectedResourceMetadataAction("/mcp/team");

function unauthorized(message: string, resourceMetadataUrl: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
    },
  });
}

async function runMcpEndpoint(
  ctx: ActionCtx,
  request: Request,
  scope: "personal" | "team",
): Promise<Response> {
  const baseUrl = requestOrigin(request);
  const resourceMetadataUrl =
    scope === "team"
      ? `${baseUrl}/.well-known/oauth-protected-resource/mcp/team`
      : `${baseUrl}/.well-known/oauth-protected-resource`;

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

  let body: object | string | number | boolean | null;
  try {
    body = await request.json();
  } catch (err) {
    console.error("[MCP][mcpHandler] failed to parse JSON body:", err);
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await ctx.deps.handleMcpRequest({
    clerkUserId: credentials.clerkUserId,
    body: JSON.stringify(body),
    scope,
  });

  return new Response(result.body, {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const mcpHandler = async (ctx: ActionCtx, request: Request) => {
  return runMcpEndpoint(ctx, request, "personal");
};

export const mcpTeamHandler = async (ctx: ActionCtx, request: Request) => {
  return runMcpEndpoint(ctx, request, "team");
};

export const health = async () => {
  return Response.json({ status: "ok" });
};

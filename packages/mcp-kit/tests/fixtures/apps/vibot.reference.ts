// Reference port of vibot packages/backend/convex/mcp/native.ts (origin/main,
// read 2026-10-12). Code is verbatim except: `httpAction(...)` is dropped and
// `ctx.runAction(internal.mcp.nodeActions.X, args)` is `ctx.deps.X(args)`.
import {
  corsPreflight,
  extractBearerToken,
  jsonWithCors,
  mcpCorsHeaders,
  requiredEnvUrl,
} from "@vvedantb/convex-kit";
import type { AppCtx } from "./types.js";

export type VibotCredentials = { clerkUserId: string; isPro: boolean };
export type VibotRpcArgs = { clerkUserId: string; isPro: boolean; body: string };
type ActionCtx = AppCtx<VibotCredentials, VibotRpcArgs>;

function clerkFrontendApiUrl(): string {
  return requiredEnvUrl("CLERK_FRONTEND_API_URL", {
    CLERK_FRONTEND_API_URL:
      process.env.CLERK_FRONTEND_API_URL ??
      process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL,
  });
}

function requestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

// Kit CORS plus the headers MCP clients need that the kit does not send.
const MCP_CORS_OVERRIDES: Record<string, string> = {
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

function corsHeaders(): Record<string, string> {
  return { ...mcpCorsHeaders(), ...MCP_CORS_OVERRIDES };
}

export const oauthMetadata = async () => {
  const res = await fetch(
    `${clerkFrontendApiUrl()}/.well-known/oauth-authorization-server`,
  );
  if (!res.ok) {
    return jsonWithCors(
      { error: "Failed to fetch authorization server metadata" },
      { status: 502, extraHeaders: MCP_CORS_OVERRIDES },
    );
  }
  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
};

export const protectedResourceMetadata = async (_ctx: object, request: Request) => {
  const baseUrl = requestOrigin(request);
  return jsonWithCors(
    {
      resource: `${baseUrl}/mcp`,
      authorization_servers: [clerkFrontendApiUrl()],
      bearer_methods_supported: ["header"],
      resource_documentation: requiredEnvUrl("WEB_APP_URL"),
    },
    { extraHeaders: MCP_CORS_OVERRIDES },
  );
};

export const mcpOptions = async () => {
  const response = corsPreflight();
  for (const [name, value] of Object.entries(MCP_CORS_OVERRIDES)) {
    response.headers.set(name, value);
  }
  return response;
};

function unauthorized(message: string, resourceMetadataUrl: string): Response {
  return jsonWithCors(
    { error: message },
    {
      status: 401,
      extraHeaders: {
        "WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
        ...MCP_CORS_OVERRIDES,
      },
    },
  );
}

export const mcpHandler = async (ctx: ActionCtx, request: Request) => {
  return runMcpEndpoint(ctx, request);
};

async function runMcpEndpoint(
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const resourceMetadataUrl = `${requestOrigin(request)}/.well-known/oauth-protected-resource`;

  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) {
    return unauthorized("Missing Authorization header", resourceMetadataUrl);
  }

  const credentials = await ctx.deps.verifyAccessToken({ token });

  if (!credentials) {
    return unauthorized("Invalid or expired token", resourceMetadataUrl);
  }

  if (request.method === "GET" || request.method === "DELETE") {
    return jsonWithCors(
      { error: "Method not supported in stateless mode" },
      { status: 405, extraHeaders: MCP_CORS_OVERRIDES },
    );
  }

  let body: object | string | number | boolean | null = null;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(
      { error: "Invalid JSON body" },
      { status: 400, extraHeaders: MCP_CORS_OVERRIDES },
    );
  }

  const result = await ctx.deps.handleMcpRequest({
    clerkUserId: credentials.clerkUserId,
    isPro: credentials.isPro,
    body: JSON.stringify(body),
  });

  return new Response(result.body, {
    status: result.status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

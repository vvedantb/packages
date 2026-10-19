import { httpAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { z } from "zod";
import {
  createAuthorizationServerMetadataProxy,
  createHealthHandler,
  createMcpHttpHandler,
  createOptionsHandler,
  createProtectedResourceMetadata,
  mcpCors,
  readEnvUrl,
  type EnvUrl,
} from "@vvedantb/server";

const cors = mcpCors({
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Session-Id",
});
const clerk: EnvUrl = { name: "CLERK_FRONTEND_API_URL", fallback: "NEXT_PUBLIC_CLERK_FRONTEND_API_URL" };

function json(data: object, status: number) {
  return Response.json(data, { status, headers: cors });
}

export const options = httpAction(createOptionsHandler({ cors }));
export const oauthMetadata = httpAction(
  createAuthorizationServerMetadataProxy({ issuer: clerk, forward: "text", cors }),
);
export const protectedResourceMetadata = httpAction(
  createProtectedResourceMetadata({
    authorizationServer: clerk,
    documentation: { name: "WEB_APP_URL", fallback: "SITE_URL" },
    cors,
  }),
);

const refreshBodySchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string(),
  client_id: z.string(),
});

async function readTokenBody(
  request: Request,
): Promise<Record<string, string>> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await request.text());
    const formBody: Record<string, string> = {};
    for (const [key, value] of params) {
      formBody[key] = value;
    }
    return formBody;
  }

  const parsed = z
    .record(z.string(), z.string())
    .safeParse(await request.json());
  if (!parsed.success) {
    throw new Error("Invalid request body");
  }
  return parsed.data;
}

export const legacyRefreshToken = httpAction(async (ctx, request) => {
  let body: Record<string, string>;
  try {
    body = await readTokenBody(request);
  } catch {
    return json(
      { error: "invalid_request", error_description: "Invalid request body" },
      400,
    );
  }

  const parsed = refreshBodySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: "unsupported_grant_type",
        error_description: `Only refresh_token is supported here. Authorize via ${readEnvUrl(clerk)}`,
      },
      400,
    );
  }

  const result = await ctx.runAction(internal.mcp.nodeActions.refreshToken, {
    refreshToken: parsed.data.refresh_token,
    clientId: parsed.data.client_id,
  });
  if (!result.success) {
    return json(
      { error: "invalid_grant", error_description: result.error },
      400,
    );
  }
  return json(result.tokens, 200);
});

export const mcpHandler = httpAction(
  createMcpHttpHandler<{ clerkUserId: string }, ActionCtx>({
    cors,
    body: "text",
    log: false,
    authenticate: ({ ctx, token }) =>
      ctx.runAction(internal.mcp.nodeActions.verifyAccessToken, { token }),
    handleRpc: ({ ctx, principal, body }) =>
      ctx.runAction(internal.mcp.nodeActions.handleMcpRequest, {
        clerkUserId: principal.clerkUserId,
        body,
      }),
  }),
);

export const health = httpAction(createHealthHandler({ cors }));

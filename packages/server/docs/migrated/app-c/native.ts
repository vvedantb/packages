import { httpAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  consoleMcpLogger,
  createAuthorizationServerMetadataProxy,
  createHealthHandler,
  createMcpHttpHandler,
  createProtectedResourceMetadata,
  type EnvUrl,
} from "@vvedantb/server/mcp";

const clerk: EnvUrl = {
  name: "CLERK_FRONTEND_API_URL",
  fallback: "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
  fallbackMode: "prefer-primary",
};

export const oauthMetadata = httpAction(
  createAuthorizationServerMetadataProxy({ issuer: clerk, forward: "text" }),
);
export const protectedResourceMetadata = httpAction(
  createProtectedResourceMetadata({
    authorizationServer: clerk,
    documentation: { name: "WEB_APP_URL", fallback: "SITE_URL", fallbackMode: "prefer-primary" },
  }),
);

export const mcpHandler = httpAction(
  createMcpHttpHandler<{ clerkUserId: string }, ActionCtx>({
    log: (event) => {
      if (event.type === "auth-failed") consoleMcpLogger(event);
    },
    authenticate: ({ ctx, token }) =>
      ctx.runAction(internal.mcp.nodeActions.verifyAccessToken, { token }),
    handleRpc: ({ ctx, principal, body }) =>
      ctx.runAction(internal.mcp.nodeActions.handleMcpRequest, {
        clerkUserId: principal.clerkUserId,
        body,
      }),
  }),
);

export const health = httpAction(createHealthHandler());

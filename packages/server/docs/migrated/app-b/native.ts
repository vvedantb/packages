import { httpAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  createAuthorizationServerMetadataProxy,
  createMcpHttpHandler,
  createOptionsHandler,
  createProtectedResourceMetadata,
  mcpCors,
  type EnvUrl,
} from "@vvedantb/server";

// Kit CORS plus the headers MCP clients need that the kit does not send.
const cors = mcpCors({
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
});
const clerk: EnvUrl = {
  name: "CLERK_FRONTEND_API_URL",
  fallback: "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
  fallbackMode: "nullish",
};

export const oauthMetadata = httpAction(
  createAuthorizationServerMetadataProxy({ issuer: clerk, forward: "stream", cors }),
);
export const protectedResourceMetadata = httpAction(
  createProtectedResourceMetadata({ authorizationServer: clerk, cors }),
);
export const mcpOptions = httpAction(createOptionsHandler({ cors }));

export const mcpHandler = httpAction(
  createMcpHttpHandler<{ clerkUserId: string; isPro: boolean }, ActionCtx>({
    cors,
    log: false,
    authenticate: ({ ctx, token }) =>
      ctx.runAction(internal.mcp.nodeActions.verifyAccessToken, { token }),
    handleRpc: ({ ctx, principal, body }) =>
      ctx.runAction(internal.mcp.nodeActions.handleMcpRequest, {
        clerkUserId: principal.clerkUserId,
        isPro: principal.isPro,
        body,
      }),
  }),
);

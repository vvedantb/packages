// vibot's native.ts rebuilt on @vvedantb/mcp-kit. In the app, wrap each export
// in httpAction(...) and call ctx.runAction(internal.mcp.nodeActions.*).
import {
  createAuthorizationServerMetadataProxy,
  createMcpHttpHandler,
  createOptionsHandler,
  createProtectedResourceMetadata,
  mcpCors,
  type EnvUrl,
} from "../../../src/index.js";
import type { AppCtx } from "./types.js";
import type { VibotCredentials, VibotRpcArgs } from "./vibot.reference.js";

type ActionCtx = AppCtx<VibotCredentials, VibotRpcArgs>;

const cors = mcpCors({
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
});
const clerk: EnvUrl = {
  name: "CLERK_FRONTEND_API_URL",
  fallback: "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
  fallbackMode: "nullish",
};

export const oauthMetadata = createAuthorizationServerMetadataProxy({
  issuer: clerk,
  forward: "stream",
  cors,
});
export const protectedResourceMetadata = createProtectedResourceMetadata({
  authorizationServer: clerk,
  cors,
});
export const mcpOptions = createOptionsHandler({ cors });

export const mcpHandler = createMcpHttpHandler<VibotCredentials, ActionCtx>({
  cors,
  log: false,
  authenticate: ({ ctx, token }) => ctx.deps.verifyAccessToken({ token }),
  handleRpc: ({ ctx, principal, body }) =>
    ctx.deps.handleMcpRequest({
      clerkUserId: principal.clerkUserId,
      isPro: principal.isPro,
      body,
    }),
});

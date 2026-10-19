// app-d's native.ts rebuilt on @vvedantb/server (legacyRefreshToken stays in
// the app). In the app, wrap each export in httpAction(...) and call
// ctx.runAction(internal.mcp.nodeActions.*).
import {
  createAuthorizationServerMetadataProxy,
  createHealthHandler,
  createMcpHttpHandler,
  createOptionsHandler,
  createProtectedResourceMetadata,
  mcpCors,
  type EnvUrl,
} from "../../../../src/mcp/index.js";
import type { AppCtx } from "./types.js";
import type { AppDCredentials, AppDRpcArgs } from "./app-d.reference.js";

type ActionCtx = AppCtx<AppDCredentials, AppDRpcArgs>;

export const cors = mcpCors({
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, MCP-Session-Id",
});
const clerk: EnvUrl = {
  name: "CLERK_FRONTEND_API_URL",
  fallback: "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
};

export const options = createOptionsHandler({ cors });
export const oauthMetadata = createAuthorizationServerMetadataProxy({
  issuer: clerk,
  forward: "text",
  cors,
});
export const protectedResourceMetadata = createProtectedResourceMetadata({
  authorizationServer: clerk,
  documentation: { name: "WEB_APP_URL", fallback: "SITE_URL" },
  cors,
});

export const mcpHandler = createMcpHttpHandler<AppDCredentials, ActionCtx>({
  cors,
  body: "text",
  log: false,
  authenticate: ({ ctx, token }) => ctx.deps.verifyAccessToken({ token }),
  handleRpc: ({ ctx, principal, body }) =>
    ctx.deps.handleMcpRequest({ clerkUserId: principal.clerkUserId, body }),
});

export const health = createHealthHandler({ cors });

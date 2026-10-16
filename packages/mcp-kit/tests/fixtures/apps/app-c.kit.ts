// app-c's native.ts rebuilt on @vvedantb/mcp-kit. In the app, wrap each export
// in httpAction(...) and call ctx.runAction(internal.mcp.nodeActions.*).
import {
  consoleMcpLogger,
  createAuthorizationServerMetadataProxy,
  createHealthHandler,
  createMcpHttpHandler,
  createProtectedResourceMetadata,
  type EnvUrl,
} from "../../../src/index.js";
import type { AppCtx } from "./types.js";
import type { AppCCredentials, AppCRpcArgs } from "./app-c.reference.js";

type ActionCtx = AppCtx<AppCCredentials, AppCRpcArgs>;

const clerk: EnvUrl = {
  name: "CLERK_FRONTEND_API_URL",
  fallback: "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
  fallbackMode: "prefer-primary",
};

export const oauthMetadata = createAuthorizationServerMetadataProxy({
  issuer: clerk,
  forward: "text",
});
export const protectedResourceMetadata = createProtectedResourceMetadata({
  authorizationServer: clerk,
  documentation: { name: "WEB_APP_URL", fallback: "SITE_URL", fallbackMode: "prefer-primary" },
});

export const mcpHandler = createMcpHttpHandler<AppCCredentials, ActionCtx>({
  log: (event) => {
    if (event.type === "auth-failed") consoleMcpLogger(event);
  },
  authenticate: ({ ctx, token }) => ctx.deps.verifyAccessToken({ token }),
  handleRpc: ({ ctx, principal, body }) =>
    ctx.deps.handleMcpRequest({ clerkUserId: principal.clerkUserId, body }),
});

export const health = createHealthHandler();

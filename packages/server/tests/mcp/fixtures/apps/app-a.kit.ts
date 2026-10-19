// app-a's native.ts rebuilt on @vvedantb/server. In the app, wrap each export
// in httpAction(...) and call ctx.runAction(internal.mcp.nodeActions.*).
import {
  createAuthorizationServerMetadataProxy,
  createHealthHandler,
  createMcpHttpHandler,
  createProtectedResourceMetadata,
} from "../../../../src/mcp/index.js";
import type { AppCtx } from "./types.js";
import type { AppACredentials, AppARpcArgs } from "./app-a.reference.js";

type ActionCtx = AppCtx<AppACredentials, AppARpcArgs>;
type McpScope = "personal" | "team";

export const oauthMetadata = createAuthorizationServerMetadataProxy();
export const protectedResourceMetadata = createProtectedResourceMetadata();
export const protectedResourceMetadataTeam = createProtectedResourceMetadata({
  resourcePath: "/mcp/team",
});

function mcpEndpoint(scope: McpScope) {
  return createMcpHttpHandler<AppACredentials, ActionCtx, McpScope>({
    scope,
    resourceMetadataPath:
      scope === "team" ? "/.well-known/oauth-protected-resource/mcp/team" : undefined,
    authenticate: ({ ctx, token }) => ctx.deps.verifyAccessToken({ token }),
    handleRpc: ({ ctx, principal, body }) =>
      ctx.deps.handleMcpRequest({ clerkUserId: principal.clerkUserId, body, scope }),
  });
}

export const mcpHandler = mcpEndpoint("personal");
export const mcpTeamHandler = mcpEndpoint("team");
export const health = createHealthHandler();

// vmem's native.ts rebuilt on @vvedantb/mcp-kit. In the app, wrap each export
// in httpAction(...) and call ctx.runAction(internal.mcp.nodeActions.*).
import {
  createAuthorizationServerMetadataProxy,
  createHealthHandler,
  createMcpHttpHandler,
  createProtectedResourceMetadata,
} from "../../../src/index.js";
import type { AppCtx } from "./types.js";
import type { VmemCredentials, VmemRpcArgs } from "./vmem.reference.js";

type ActionCtx = AppCtx<VmemCredentials, VmemRpcArgs>;
type McpScope = "personal" | "team";

export const oauthMetadata = createAuthorizationServerMetadataProxy();
export const protectedResourceMetadata = createProtectedResourceMetadata();
export const protectedResourceMetadataTeam = createProtectedResourceMetadata({
  resourcePath: "/mcp/team",
});

function mcpEndpoint(scope: McpScope) {
  return createMcpHttpHandler<VmemCredentials, ActionCtx, McpScope>({
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

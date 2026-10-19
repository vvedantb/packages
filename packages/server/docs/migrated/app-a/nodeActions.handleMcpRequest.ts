import { runSdkMcpRequest } from "@vvedantb/server";

export const handleMcpRequest = internalAction({
  args: { clerkUserId: v.string(), body: v.string(), scope: mcpScopeValidator },
  returns: v.object({ status: v.number(), body: v.string() }),
  handler: async (ctx, { clerkUserId, body, scope }) =>
    runSdkMcpRequest({
      body,
      url: scope === "team" ? "http://localhost/mcp/team" : "http://localhost/mcp",
      Transport: WebStandardStreamableHTTPServerTransport,
      createServer: async () => {
        const server = new McpServer(mcpServerInfo(scope));
        registerTools(server, clerkUserId, ctx, scope);
        registerMemoryGraphApp(server, clerkUserId, ctx, scope);
        await registerResources(server, clerkUserId, ctx, scope);
        return server;
      },
    }),
});

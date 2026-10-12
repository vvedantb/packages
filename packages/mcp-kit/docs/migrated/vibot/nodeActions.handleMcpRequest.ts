import { runSdkMcpRequest } from "@vvedantb/mcp-kit";

export const handleMcpRequest = internalAction({
  args: { clerkUserId: v.string(), isPro: v.boolean(), body: v.string() },
  returns: v.object({ status: v.number(), body: v.string() }),
  handler: async (ctx, { clerkUserId, isPro, body }) =>
    runSdkMcpRequest({
      body,
      Transport: WebStandardStreamableHTTPServerTransport,
      createServer: () => {
        const server = new McpServer(
          defineMcpServerInfo({ name: "vibot-mcp", version: MCP_SERVER_VERSION }),
        );
        registerTools(server, clerkUserId, ctx, isPro);
        return server;
      },
    }),
});

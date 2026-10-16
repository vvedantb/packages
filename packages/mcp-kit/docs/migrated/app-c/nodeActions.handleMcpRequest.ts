import { runSdkMcpRequest } from "@vvedantb/mcp-kit";

export const handleMcpRequest = internalAction({
  args: { clerkUserId: v.string(), body: v.string() },
  returns: v.object({ status: v.number(), body: v.string() }),
  handler: async (ctx, { clerkUserId, body }) =>
    runSdkMcpRequest({
      body,
      Transport: WebStandardStreamableHTTPServerTransport,
      createServer: () => {
        const server = new McpServer(
          defineMcpServerInfo({ name: "app-c-mcp", version: MCP_SERVER_VERSION }),
        );
        registerTools(server, { clerkUserId }, ctx);
        return server;
      },
    }),
});

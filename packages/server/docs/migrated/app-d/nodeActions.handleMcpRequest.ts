import { runSdkMcpRequest } from "@vvedantb/server";

export const handleMcpRequest = internalAction({
  args: { clerkUserId: v.string(), body: v.string() },
  returns: v.object({ status: v.number(), body: v.string() }),
  handler: async (ctx, { clerkUserId, body }) =>
    runSdkMcpRequest({
      body,
      parsedBody: false,
      Transport: WebStandardStreamableHTTPServerTransport,
      createServer: () => {
        const server = new McpServer(defineMcpServerInfo({ name: "app-d-mcp", version: "1.2.0" }));
        registerTools(server, clerkUserId, ctx);
        return server;
      },
    }),
});

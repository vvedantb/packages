import { mcpInternalError, type RpcResult } from "./jsonRpc.js";
import type { JsonValue, Thrown } from "./json.js";

/** The part of `WebStandardStreamableHTTPServerTransport` this helper uses. */
export type SdkTransportLike = {
  handleRequest(request: Request, options?: { parsedBody?: JsonValue }): Promise<Response>;
};

/** The part of `McpServer` this helper uses. */
export type SdkServerLike<Transport> = { connect(transport: Transport): Promise<void> };

export type RunSdkMcpRequestOptions<Transport extends SdkTransportLike> = {
  /**
   * Build a fresh, fully registered `McpServer` (one per request, as
   * stateless mode needs). Called inside the error boundary, after the body
   * is parsed, so a registration error also becomes the 500 result.
   */
  createServer: () => NoInfer<SdkServerLike<Transport>> | Promise<NoInfer<SdkServerLike<Transport>>>;
  /** `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js`. */
  Transport: new (options: { sessionIdGenerator: undefined; enableJsonResponse: boolean }) => Transport;
  /** JSON-RPC body text from `createMcpHttpHandler`. */
  body: string;
  /** URL of the synthetic request. Default `http://localhost/mcp` (vmem team: `http://localhost/mcp/team`). */
  url?: string;
  /**
   * Pass `JSON.parse(body)` as `parsedBody`, like vmem, vibot and verve
   * (default `true`). velth passes nothing and lets the transport read the body.
   */
  parsedBody?: boolean;
  /** Called with the error before the 500 result. Default logs "[MCP][handleMcpRequest] threw:". */
  onError?: (message: string, error: Thrown) => void;
};

/**
 * The body of the apps' `handleMcpRequest` internalAction: connect a
 * stateless JSON-response transport, post the body, return
 * `{ status, body }`; on a throw, 500 with a JSON-RPC -32603 error.
 * The kit does not import the SDK; pass its classes in.
 *
 * ```ts
 * // nodeActions.ts ("use node")
 * return runSdkMcpRequest({
 *   body,
 *   Transport: WebStandardStreamableHTTPServerTransport,
 *   createServer: () => {
 *     const server = new McpServer(serverInfo);
 *     registerTools(server, clerkUserId, ctx);
 *     return server;
 *   },
 * });
 * ```
 */
export async function runSdkMcpRequest<Transport extends SdkTransportLike>(
  options: RunSdkMcpRequestOptions<Transport>,
): Promise<RpcResult> {
  try {
    const parsedBody: JsonValue | undefined =
      options.parsedBody === false ? undefined : JSON.parse(options.body);
    const server = await options.createServer();
    const transport = new options.Transport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    const request = new Request(options.url ?? "http://localhost/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: options.body,
    });
    const response =
      parsedBody === undefined
        ? await transport.handleRequest(request)
        : await transport.handleRequest(request, { parsedBody });
    return { status: response.status, body: await response.text() };
  } catch (err) {
    const result = mcpInternalError(err);
    const message = err instanceof Error ? err.message : "Internal server error";
    if (options.onError) options.onError(message, err);
    else console.error("[MCP][handleMcpRequest] threw:", message, err);
    return result;
  }
}

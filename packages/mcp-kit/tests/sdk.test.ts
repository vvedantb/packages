import { describe, expect, it, vi } from "vitest";
import { mcpInternalError, runSdkMcpRequest, type JsonValue } from "../src/index.js";

type Seen = { options: object; url: string; headers: Record<string, string>; body: string; parsedBody?: JsonValue };

function fakeSdk(reply: () => Response) {
  const seen: Seen[] = [];
  class Transport {
    constructor(readonly options: { sessionIdGenerator: undefined; enableJsonResponse: boolean }) {}
    async handleRequest(request: Request, extra?: { parsedBody?: JsonValue }) {
      seen.push({
        options: this.options,
        url: request.url,
        headers: Object.fromEntries(request.headers),
        body: await request.text(),
        ...(extra ? { parsedBody: extra.parsedBody } : {}),
      });
      return reply();
    }
  }
  const connect = vi.fn(async (_t: Transport) => {});
  return { Transport, seen, server: { connect } };
}

describe("runSdkMcpRequest", () => {
  it("posts the body to a stateless JSON transport and returns status and text", async () => {
    const sdk = fakeSdk(() => new Response('{"result":{}}', { status: 200 }));
    const result = await runSdkMcpRequest({ body: '{"id":1}', Transport: sdk.Transport, createServer: () => sdk.server });
    expect(result).toEqual({ status: 200, body: '{"result":{}}' });
    expect(sdk.server.connect).toHaveBeenCalledTimes(1);
    expect(sdk.seen).toEqual([
      {
        options: { sessionIdGenerator: undefined, enableJsonResponse: true },
        url: "http://localhost/mcp",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: '{"id":1}',
        parsedBody: { id: 1 },
      },
    ]);
  });

  it("can skip parsedBody (app-d) and use another URL (app-a team)", async () => {
    const sdk = fakeSdk(() => new Response(null, { status: 202 }));
    const result = await runSdkMcpRequest({
      body: "{}",
      url: "http://localhost/mcp/team",
      parsedBody: false,
      Transport: sdk.Transport,
      createServer: async () => sdk.server,
    });
    expect(result).toEqual({ status: 202, body: "" });
    expect(sdk.seen[0]?.url).toBe("http://localhost/mcp/team");
    expect(sdk.seen[0] && "parsedBody" in sdk.seen[0]).toBe(false);
  });

  it("returns the apps' 500 JSON-RPC body and logs like the apps when anything throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const sdk = fakeSdk(() => new Response(""));
    const err = new Error("register failed");
    const result = await runSdkMcpRequest({
      body: "{}",
      Transport: sdk.Transport,
      createServer: () => {
        throw err;
      },
    });
    expect(result).toEqual({
      status: 500,
      body: '{"jsonrpc":"2.0","error":{"code":-32603,"message":"register failed"},"id":null}',
    });
    expect(spy).toHaveBeenCalledWith("[MCP][handleMcpRequest] threw:", "register failed", err);
    spy.mockRestore();
  });

  it("maps bad JSON in parsedBody mode to 500 (as the apps' JSON.parse inside try) and uses onError", async () => {
    const onError = vi.fn();
    const sdk = fakeSdk(() => new Response(""));
    const result = await runSdkMcpRequest({ body: "{x", Transport: sdk.Transport, createServer: () => sdk.server, onError });
    expect(result.status).toBe(500);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(sdk.server.connect).not.toHaveBeenCalled();
  });

  it("mcpInternalError uses a generic message for non-Errors", () => {
    expect(mcpInternalError("x")).toEqual({
      status: 500,
      body: '{"jsonrpc":"2.0","error":{"code":-32603,"message":"Internal server error"},"id":null}',
    });
  });
});

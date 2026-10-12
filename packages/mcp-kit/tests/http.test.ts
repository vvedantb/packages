import { describe, expect, it, vi } from "vitest";
import { createMcpHttpHandler, mcpCors, type McpHttpHandlerConfig, type McpHttpLogEvent } from "../src/index.js";

type Principal = { userId: string };
type Ctx = { tag: string };

const CTX: Ctx = { tag: "ctx" };
const URL_BASE = "https://site.test";

function handler(overrides: Partial<McpHttpHandlerConfig<Principal, Ctx, "personal" | "team">> = {}) {
  const authenticate = vi.fn(async ({ token }: { token: string }) => (token === "good" ? { userId: "u1" } : null));
  const handleRpc = vi.fn(async () => ({ status: 200, body: '{"ok":true}' }));
  const logs: McpHttpLogEvent[] = [];
  const h = createMcpHttpHandler<Principal, Ctx, "personal" | "team">({
    authenticate,
    handleRpc,
    log: (event) => logs.push(event),
    ...overrides,
  });
  return { h, authenticate, handleRpc, logs };
}

function req(method: string, init: { token?: string; body?: string; headers?: Record<string, string> } = {}) {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  return new Request(`${URL_BASE}/mcp`, {
    method,
    headers,
    body: method === "POST" || method === "PUT" ? (init.body ?? "{}") : undefined,
  });
}

async function read(res: Response) {
  return { status: res.status, headers: Object.fromEntries(res.headers), body: await res.text() };
}

describe("createMcpHttpHandler: auth", () => {
  it("401s a missing token before calling authenticate", async () => {
    const { h, authenticate } = handler();
    expect(await read(await h(CTX, req("POST")))).toEqual({
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": `Bearer resource_metadata="${URL_BASE}/.well-known/oauth-protected-resource"`,
      },
      body: '{"error":"Missing Authorization header"}',
    });
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("treats a non-bearer scheme or extra parts as missing", async () => {
    const { h } = handler();
    for (const value of ["Basic abc", "Bearer a b", "Bearer", "bearer good"]) {
      const res = await h(CTX, req("POST", { headers: { Authorization: value } }));
      const body = await res.text();
      if (value === "bearer good") expect(res.status).toBe(200);
      else expect(body).toBe('{"error":"Missing Authorization header"}');
    }
  });

  it("401s when authenticate returns null and logs auth-failed", async () => {
    const { h, logs } = handler();
    const res = await h(CTX, req("POST", { token: "bad" }));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('{"error":"Invalid or expired token"}');
    expect(logs).toEqual([{ type: "auth-failed" }]);
  });

  it("uses the scope's resource metadata path and URL builder", async () => {
    const team = handler({ resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp/team" });
    expect((await team.h(CTX, req("POST"))).headers.get("WWW-Authenticate")).toBe(
      `Bearer resource_metadata="${URL_BASE}/.well-known/oauth-protected-resource/mcp/team"`,
    );
    const custom = handler({ resourceMetadataUrl: () => "https://meta.test/x" });
    expect((await custom.h(CTX, req("POST"))).headers.get("WWW-Authenticate")).toBe(
      'Bearer resource_metadata="https://meta.test/x"',
    );
  });

  it("passes token, request, ctx and scope to authenticate, and principal to handleRpc", async () => {
    const { h, authenticate, handleRpc } = handler({ scope: "team" });
    const request = req("POST", { token: "good", body: '{"a": 1}' });
    await h(CTX, request);
    expect(authenticate).toHaveBeenCalledWith({ token: "good", request, ctx: CTX, scope: "team" });
    expect(handleRpc).toHaveBeenCalledWith({
      principal: { userId: "u1" },
      body: '{"a":1}',
      json: { a: 1 },
      request,
      ctx: CTX,
      scope: "team",
    });
  });

  it("rethrows a throwing authenticate by default", async () => {
    const { h } = handler({ authenticate: async () => { throw new Error("down"); } });
    await expect(h(CTX, req("POST", { token: "x" }))).rejects.toThrow("down");
  });

  it("can map a throwing authenticate to 401", async () => {
    const { h, logs } = handler({
      authenticate: async () => { throw new Error("down"); },
      onAuthenticateError: "unauthorized",
    });
    const res = await h(CTX, req("POST", { token: "x" }));
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('{"error":"Invalid or expired token"}');
    expect(logs.map((l) => l.type)).toEqual(["authenticate-threw", "auth-failed"]);
  });

  it("uses custom messages", async () => {
    const { h } = handler({ messages: { missingToken: "No token", methodNotAllowed: "Nope" } });
    expect(await (await h(CTX, req("POST"))).text()).toBe('{"error":"No token"}');
    expect(await (await h(CTX, req("GET", { token: "good" }))).text()).toBe('{"error":"Nope"}');
  });
});

describe("createMcpHttpHandler: methods and body", () => {
  it("405s GET and DELETE after auth by default", async () => {
    const { h, authenticate } = handler();
    for (const method of ["GET", "DELETE"]) {
      const res = await h(CTX, req(method, { token: "good" }));
      expect(await read(res)).toEqual({
        status: 405,
        headers: { "content-type": "application/json" },
        body: '{"error":"Method not supported in stateless mode"}',
      });
    }
    expect(authenticate).toHaveBeenCalledTimes(2);
    expect((await h(CTX, req("GET"))).status).toBe(401);
  });

  it("can reject methods before auth (vhub order) and take a custom list", async () => {
    const { h, authenticate } = handler({ methodCheck: "before-auth", rejectMethods: ["GET", "PUT"] });
    expect((await h(CTX, req("GET"))).status).toBe(405);
    expect((await h(CTX, req("PUT"))).status).toBe(405);
    expect((await h(CTX, req("DELETE", { token: "good" }))).status).toBe(400);
    expect(authenticate).toHaveBeenCalledTimes(1);
  });

  it("400s invalid JSON in both body modes and logs it", async () => {
    const modes: Array<"json" | "text"> = ["json", "text"];
    for (const body of modes) {
      const { h, logs, handleRpc } = handler({ body });
      const res = await h(CTX, req("POST", { token: "good", body: "{nope" }));
      expect(await read(res)).toEqual({
        status: 400,
        headers: { "content-type": "application/json" },
        body: '{"error":"Invalid JSON body"}',
      });
      expect(logs.map((l) => l.type)).toEqual(["invalid-json"]);
      expect(handleRpc).not.toHaveBeenCalled();
    }
  });

  it("re-encodes in json mode and forwards raw text in text mode", async () => {
    const raw = '{ "jsonrpc": "2.0",  "id": 1 }';
    const json = handler();
    await json.h(CTX, req("POST", { token: "good", body: raw }));
    expect(json.handleRpc.mock.calls[0]).toMatchObject([{ body: '{"jsonrpc":"2.0","id":1}' }]);
    const text = handler({ body: "text" });
    await text.h(CTX, req("POST", { token: "good", body: raw }));
    expect(text.handleRpc.mock.calls[0]).toMatchObject([{ body: raw, json: { jsonrpc: "2.0", id: 1 } }]);
  });

  it("returns the RPC status and body with JSON content type, CORS and extra headers", async () => {
    const { h } = handler({
      cors: { "Access-Control-Allow-Origin": "*" },
      headers: { "X-Extra": "1" },
      handleRpc: async () => ({ status: 202, body: "" }),
    });
    expect(await read(await h(CTX, req("POST", { token: "good" })))).toEqual({
      status: 202,
      headers: { "access-control-allow-origin": "*", "content-type": "application/json", "x-extra": "1" },
      body: "",
    });
  });

  it("computes CORS per request when given a function (vhub reflects Origin)", async () => {
    const { h } = handler({
      cors: (request) => ({ "Access-Control-Allow-Origin": request.headers.get("Origin") ?? "*" }),
    });
    const res = await h(CTX, req("POST", { headers: { Origin: "https://o.test" } }));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://o.test");
  });

  it("answers OPTIONS with a 204 preflight only when CORS is set", async () => {
    const withCors = handler({ cors: mcpCors() });
    const res = await withCors.h(CTX, req("OPTIONS"));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(res.headers.get("Content-Type")).toBeNull();
    expect(withCors.authenticate).not.toHaveBeenCalled();
    const noCors = handler();
    expect((await noCors.h(CTX, req("OPTIONS"))).status).toBe(401);
  });

  it("logs to console.error by default and not at all with log: false", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const authenticate = async () => null;
    const handleRpc = async () => ({ status: 200, body: "" });
    await createMcpHttpHandler<Principal, Ctx>({ authenticate, handleRpc })(CTX, req("POST", { token: "x" }));
    expect(spy).toHaveBeenCalledWith("[MCP][mcpHandler] token verification failed");
    spy.mockClear();
    await createMcpHttpHandler<Principal, Ctx>({ authenticate, handleRpc, log: false })(CTX, req("POST", { token: "x" }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

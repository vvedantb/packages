import { describe, expect, it } from "vitest";
import { mcpCors } from "../src/index.js";
import { cors as velthCors } from "./fixtures/apps/velth.kit.js";
import * as vibotKit from "./fixtures/apps/vibot.kit.js";
import * as vmemKit from "./fixtures/apps/vmem.kit.js";

// Exact header maps each app sends today (lower-cased, as `Headers` exposes them).
const VIBOT_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "access-control-allow-credentials": "false",
  "access-control-max-age": "86400",
};
const VELTH_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "access-control-allow-headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
  "access-control-allow-credentials": "false",
  "access-control-expose-headers": "WWW-Authenticate, MCP-Session-Id",
};

const headersOf = (res: Response) => Object.fromEntries(res.headers);

describe("mcpCors", () => {
  it("is convex-kit's mcpCorsHeaders when no overrides are given", () => {
    expect(mcpCors()).toEqual({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Credentials": "false",
    });
    expect(mcpCors({}, "https://a.test")["Access-Control-Allow-Origin"]).toBe("https://a.test");
  });

  it("velth config equals the velth header map", () => {
    expect(Object.fromEntries(new Headers(velthCors))).toEqual(VELTH_CORS);
  });
});

describe("CORS per app, exact header maps", () => {
  it("vmem sends no CORS headers", async () => {
    const req = new Request("https://x.test/mcp", { method: "POST" });
    expect(headersOf(await vmemKit.mcpHandler({ deps: { verifyAccessToken: async () => null, handleMcpRequest: async () => ({ status: 200, body: "" }) } }, req))).toEqual({
      "content-type": "application/json",
      "www-authenticate": 'Bearer resource_metadata="https://x.test/.well-known/oauth-protected-resource"',
    });
  });

  it("vibot preflight", async () => {
    const res = await vibotKit.mcpOptions({}, new Request("https://x.test/mcp", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(headersOf(res)).toEqual(VIBOT_CORS);
  });

  it("vibot 401", async () => {
    const res = await vibotKit.mcpHandler(
      { deps: { verifyAccessToken: async () => null, handleMcpRequest: async () => ({ status: 200, body: "" }) } },
      new Request("https://x.test/mcp", { method: "POST" }),
    );
    expect(headersOf(res)).toEqual({
      ...VIBOT_CORS,
      "content-type": "application/json",
      "www-authenticate": 'Bearer resource_metadata="https://x.test/.well-known/oauth-protected-resource"',
    });
  });
});

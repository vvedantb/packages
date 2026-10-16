import { describe, expect, it } from "vitest";
import { mcpCors } from "../../src/mcp/index.js";
import { cors as appDCors } from "./fixtures/apps/app-d.kit.js";
import * as appBKit from "./fixtures/apps/app-b.kit.js";
import * as appAKit from "./fixtures/apps/app-a.kit.js";

// Exact header maps each app sends today (lower-cased, as `Headers` exposes them).
const APP_B_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "access-control-allow-credentials": "false",
  "access-control-max-age": "86400",
};
const APP_D_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "access-control-allow-headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
  "access-control-allow-credentials": "false",
  "access-control-expose-headers": "WWW-Authenticate, MCP-Session-Id",
};

const headersOf = (res: Response) => Object.fromEntries(res.headers);

describe("mcpCors", () => {
  it("is server/convex's mcpCorsHeaders when no overrides are given", () => {
    expect(mcpCors()).toEqual({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Credentials": "false",
    });
    expect(mcpCors({}, "https://a.test")["Access-Control-Allow-Origin"]).toBe("https://a.test");
  });

  it("app-d config equals the app-d header map", () => {
    expect(Object.fromEntries(new Headers(appDCors))).toEqual(APP_D_CORS);
  });
});

describe("CORS per app, exact header maps", () => {
  it("app-a sends no CORS headers", async () => {
    const req = new Request("https://x.test/mcp", { method: "POST" });
    expect(headersOf(await appAKit.mcpHandler({ deps: { verifyAccessToken: async () => null, handleMcpRequest: async () => ({ status: 200, body: "" }) } }, req))).toEqual({
      "content-type": "application/json",
      "www-authenticate": 'Bearer resource_metadata="https://x.test/.well-known/oauth-protected-resource"',
    });
  });

  it("app-b preflight", async () => {
    const res = await appBKit.mcpOptions({}, new Request("https://x.test/mcp", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(headersOf(res)).toEqual(APP_B_CORS);
  });

  it("app-b 401", async () => {
    const res = await appBKit.mcpHandler(
      { deps: { verifyAccessToken: async () => null, handleMcpRequest: async () => ({ status: 200, body: "" }) } },
      new Request("https://x.test/mcp", { method: "POST" }),
    );
    expect(headersOf(res)).toEqual({
      ...APP_B_CORS,
      "content-type": "application/json",
      "www-authenticate": 'Bearer resource_metadata="https://x.test/.well-known/oauth-protected-resource"',
    });
  });
});

// Each app's MCP route block from its convex/http.ts today (other routes
// omitted), against registerMcpRoutes with the equivalent config. Handlers are
// the export names, so path, method and handler must all match.
import { describe, expect, it } from "vitest";
import { registerMcpRoutes, type McpRouteSpec, type McpRoutesConfig } from "@vvedantb/server";

type Route = McpRouteSpec<string>;

function fakeRouter() {
  const routes: Route[] = [];
  return {
    routes,
    route(spec: Route) {
      // Convex throws on a duplicate path and method; so does the fake.
      if (routes.some((r) => r.path === spec.path && r.method === spec.method)) {
        throw new Error(`Path '${spec.path}' for method ${spec.method} already in use`);
      }
      routes.push(spec);
    },
  };
}

function key(route: Route): string {
  return `${route.method} ${route.path} -> ${route.handler}`;
}

function table(config: McpRoutesConfig<string>): string[] {
  const http = fakeRouter();
  registerMcpRoutes(http, config);
  return http.routes.map(key).sort();
}

function expected(routes: [string, Route["method"], string][]): string[] {
  return routes.map(([path, method, handler]) => key({ path, method, handler })).sort();
}

const APPS: { app: string; today: [string, Route["method"], string][]; config: McpRoutesConfig<string> }[] = [
  {
    app: "app-a",
    today: [
      ["/.well-known/oauth-authorization-server", "GET", "oauthMetadata"],
      ["/.well-known/oauth-protected-resource", "GET", "protectedResourceMetadata"],
      ["/.well-known/oauth-protected-resource/mcp/team", "GET", "protectedResourceMetadataTeam"],
      ["/mcp", "POST", "mcpHandler"],
      ["/mcp", "GET", "mcpHandler"],
      ["/mcp", "DELETE", "mcpHandler"],
      ["/mcp/team", "POST", "mcpTeamHandler"],
      ["/mcp/team", "GET", "mcpTeamHandler"],
      ["/mcp/team", "DELETE", "mcpTeamHandler"],
      ["/health", "GET", "mcpHealth"],
    ],
    config: {
      authorizationServerMetadata: "oauthMetadata",
      protectedResourceMetadata: "protectedResourceMetadata",
      endpoints: [
        { handler: "mcpHandler" },
        {
          path: "/mcp/team",
          handler: "mcpTeamHandler",
          protectedResourceMetadata: "protectedResourceMetadataTeam",
        },
      ],
      health: { handler: "mcpHealth" },
    },
  },
  {
    app: "app-b",
    today: [
      ["/.well-known/oauth-authorization-server", "GET", "oauthMetadata"],
      ["/.well-known/oauth-protected-resource", "GET", "protectedResourceMetadata"],
      ["/.well-known/oauth-protected-resource/mcp", "GET", "protectedResourceMetadata"],
      ["/mcp", "GET", "mcpHandler"],
      ["/mcp", "POST", "mcpHandler"],
      ["/mcp", "DELETE", "mcpHandler"],
      ["/mcp", "OPTIONS", "mcpOptions"],
    ],
    config: {
      authorizationServerMetadata: "oauthMetadata",
      protectedResourceMetadata: "protectedResourceMetadata",
      endpoints: [
        { handler: "mcpHandler", options: "mcpOptions", protectedResourceMetadata: "protectedResourceMetadata" },
      ],
    },
  },
  {
    app: "app-c",
    today: [
      ["/.well-known/oauth-authorization-server", "GET", "oauthMetadata"],
      ["/.well-known/oauth-protected-resource", "GET", "protectedResourceMetadata"],
      ["/mcp", "POST", "mcpHandler"],
      ["/mcp", "GET", "mcpHandler"],
      ["/mcp", "DELETE", "mcpHandler"],
      ["/health", "GET", "health"],
    ],
    config: {
      authorizationServerMetadata: "oauthMetadata",
      protectedResourceMetadata: "protectedResourceMetadata",
      endpoints: [{ handler: "mcpHandler" }],
      health: { handler: "health" },
    },
  },
  {
    app: "app-d",
    today: [
      ["/.well-known/oauth-authorization-server", "GET", "oauthMetadata"],
      ["/.well-known/oauth-authorization-server/mcp", "GET", "oauthMetadata"],
      ["/.well-known/oauth-protected-resource", "GET", "protectedResourceMetadata"],
      ["/.well-known/oauth-protected-resource/mcp", "GET", "protectedResourceMetadata"],
      ["/mcp/oauth/token", "OPTIONS", "options"],
      ["/mcp/oauth/token", "POST", "legacyRefreshToken"],
      ["/mcp", "OPTIONS", "options"],
      ["/mcp", "GET", "mcpHandler"],
      ["/mcp", "POST", "mcpHandler"],
      ["/mcp", "DELETE", "mcpHandler"],
      ["/mcp/health", "GET", "health"],
    ],
    config: {
      authorizationServerMetadata: "oauthMetadata",
      protectedResourceMetadata: "protectedResourceMetadata",
      endpoints: [
        {
          handler: "mcpHandler",
          options: "options",
          authorizationServerMetadata: "oauthMetadata",
          protectedResourceMetadata: "protectedResourceMetadata",
        },
      ],
      tokenProxy: { path: "/mcp/oauth/token", handler: "legacyRefreshToken", options: "options" },
      health: { path: "/mcp/health", handler: "health" },
    },
  },
  {
    app: "app-e",
    today: [
      ["/.well-known/oauth-authorization-server", "GET", "oauthMetadata"],
      ["/.well-known/oauth-protected-resource", "GET", "protectedResourceMetadata"],
      ["/mcp", "OPTIONS", "optionsHandler"],
      ["/mcp", "GET", "mcpHandler"],
      ["/mcp", "POST", "mcpHandler"],
      ["/mcp", "DELETE", "mcpHandler"],
      ["/health", "GET", "health"],
    ],
    config: {
      authorizationServerMetadata: "oauthMetadata",
      protectedResourceMetadata: "protectedResourceMetadata",
      endpoints: [{ handler: "mcpHandler", options: "optionsHandler" }],
      health: { handler: "health" },
    },
  },
];

describe("registerMcpRoutes reproduces each app's route block", () => {
  it.each(APPS)("$app", ({ today, config }) => {
    expect(table(config)).toEqual(expected(today));
  });
});

describe("registerMcpRoutes", () => {
  it("registers only the two well-known routes and POST/GET/DELETE /mcp for a minimal config", () => {
    const http = fakeRouter();
    registerMcpRoutes(http, {
      authorizationServerMetadata: "as",
      protectedResourceMetadata: "pr",
      endpoints: [{ handler: "mcp" }],
    });
    expect(http.routes).toEqual([
      { path: "/.well-known/oauth-authorization-server", method: "GET", handler: "as" },
      { path: "/.well-known/oauth-protected-resource", method: "GET", handler: "pr" },
      { path: "/mcp", method: "POST", handler: "mcp" },
      { path: "/mcp", method: "GET", handler: "mcp" },
      { path: "/mcp", method: "DELETE", handler: "mcp" },
    ]);
  });

  it("registers a token proxy without OPTIONS when options is omitted", () => {
    expect(
      table({
        authorizationServerMetadata: "as",
        protectedResourceMetadata: "pr",
        endpoints: [],
        tokenProxy: { path: "/token", handler: "token" },
      }),
    ).toEqual(
      expected([
        ["/.well-known/oauth-authorization-server", "GET", "as"],
        ["/.well-known/oauth-protected-resource", "GET", "pr"],
        ["/token", "POST", "token"],
      ]),
    );
  });

  it("lets the router reject a duplicate path and method", () => {
    expect(() =>
      registerMcpRoutes(fakeRouter(), {
        authorizationServerMetadata: "as",
        protectedResourceMetadata: "pr",
        endpoints: [{ handler: "a" }, { handler: "b" }],
      }),
    ).toThrow("Path '/mcp' for method POST already in use");
  });
});

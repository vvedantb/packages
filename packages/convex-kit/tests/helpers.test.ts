import { describe, expect, it, vi } from "vitest";
import {
  assertMcpTools,
  clerkAuthConfig,
  corsPreflight,
  defineMcpServerInfo,
  expectMcpToolCount,
  getClerkClient,
  jsonWithCors,
  mcpCorsHeaders,
  requiredEnv,
  requiredEnvUrl,
} from "../src/index.js";

describe("clerkAuthConfig", () => {
  it("uses CLERK_FRONTEND_API_URL and the convex application ID", () => {
    expect(
      clerkAuthConfig({ CLERK_FRONTEND_API_URL: "https://clerk.example.test" }),
    ).toEqual({
      providers: [
        { domain: "https://clerk.example.test", applicationID: "convex" },
      ],
    });
  });

  it("ignores the legacy issuer variable", () => {
    const config = clerkAuthConfig({});
    expect(config.providers[0]?.domain).toBeUndefined();
  });
});

describe("getClerkClient", () => {
  it("passes both keys to the injected factory and returns its result", () => {
    const factory = vi.fn((opts: { secretKey: string; publishableKey: string }) => ({
      ...opts,
    }));
    const client = getClerkClient(factory, {
      CLERK_SECRET_KEY: "sk",
      CLERK_PUBLISHABLE_KEY: "pk",
    });
    expect(factory).toHaveBeenCalledWith({ secretKey: "sk", publishableKey: "pk" });
    expect(client).toEqual({ secretKey: "sk", publishableKey: "pk" });
  });

  it("throws naming the missing key, without calling the factory", () => {
    const factory = vi.fn(() => ({}));
    expect(() => getClerkClient(factory, { CLERK_PUBLISHABLE_KEY: "pk" })).toThrow(
      "CLERK_SECRET_KEY is not set",
    );
    expect(() => getClerkClient(factory, {})).toThrow(
      "CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY",
    );
    expect(factory).not.toHaveBeenCalled();
  });
});

describe("env helpers", () => {
  it("requiredEnv returns the value or throws", () => {
    expect(requiredEnv("A", { A: "x" })).toBe("x");
    expect(() => requiredEnv("A", {})).toThrow("A is not set in Convex env");
    expect(() => requiredEnv("A", { A: "" })).toThrow("A is not set");
  });

  it("requiredEnvUrl strips one trailing slash", () => {
    expect(requiredEnvUrl("U", { U: "https://a.test/" })).toBe("https://a.test");
    expect(requiredEnvUrl("U", { U: "https://a.test" })).toBe("https://a.test");
    expect(() => requiredEnvUrl("U", {})).toThrow("U is not set");
  });
});

describe("CORS helpers", () => {
  it("mcpCorsHeaders defaults to any origin and no credentials", () => {
    expect(mcpCorsHeaders()).toEqual({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Credentials": "false",
    });
    expect(mcpCorsHeaders("https://a.test")["Access-Control-Allow-Origin"]).toBe(
      "https://a.test",
    );
  });

  it("corsPreflight returns 204 with CORS headers and no body", async () => {
    const res = corsPreflight("https://a.test");
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://a.test");
    expect(await res.text()).toBe("");
  });

  it("jsonWithCors sets status, body, CORS and extra headers", async () => {
    const res = jsonWithCors(
      { ok: true },
      { status: 401, extraHeaders: { "WWW-Authenticate": "Bearer" } },
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("jsonWithCors defaults to 200", () => {
    expect(jsonWithCors({}).status).toBe(200);
  });
});

describe("defineMcpServerInfo", () => {
  it("returns the caller's name and version", () => {
    expect(defineMcpServerInfo({ name: "app-mcp", version: "1.2.3" })).toEqual({
      name: "app-mcp",
      version: "1.2.3",
    });
  });

  it("rejects empty values", () => {
    expect(() => defineMcpServerInfo({ name: "", version: "1" })).toThrow("name");
    expect(() => defineMcpServerInfo({ name: "a", version: "" })).toThrow("version");
  });
});

describe("MCP tool test helpers", () => {
  it("expectMcpToolCount passes on a match and lists names on failure", () => {
    expect(() => expectMcpToolCount(["a", "b"], 2)).not.toThrow();
    expect(() => expectMcpToolCount(["a", "b"], 3)).toThrow(
      "Expected 3 MCP tools but found 2: a, b",
    );
  });

  it("assertMcpTools ignores order and duplicates", () => {
    expect(() => assertMcpTools(["b", "a", "a"], ["a", "b"])).not.toThrow();
  });

  it("assertMcpTools names missing and unexpected tools", () => {
    expect(() => assertMcpTools(["a", "c"], ["a", "b"])).toThrow(
      /Missing: b\. Unexpected: c\./,
    );
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { must } from "./helpers.js";
import { z } from "zod";
import { z as z3 } from "zod3";
import {
  createMcpDispatcher,
  defineTool,
  negotiateProtocolVersion,
  parseRpcBody,
  toolTextResult,
  type JsonValue,
  type McpTool,
  type ToolContext,
} from "../src/index.js";

type P = { userId: string };
type Ctx = { tag: string };
type SdkFixture = {
  sdkVersion: string;
  zodVersion: string;
  serverInfo: { name: string; version: string };
  exchanges: Record<string, { request: string; response: { status: number | string; body: string | null } }>;
};

const APPS: ReadonlyArray<"app-a" | "app-b" | "app-c" | "app-d"> = ["app-a", "app-b", "app-c", "app-d"];
const load = (app: string): SdkFixture =>
  JSON.parse(readFileSync(new URL(`./fixtures/sdk/${app}.sdk.json`, import.meta.url), "utf8"));

/** The two tools scripts/capture-sdk-fixtures.mjs registers, for the zod major the app's SDK used. */
function fixtureTools(zodMajor: 3 | 4): McpTool<P, Ctx>[] {
  const fails = defineTool({
    name: "fails",
    description: "Always throws.",
    inputSchema: z.object({}),
    handler: async (): Promise<never> => { throw new Error("boom"); },
  });
  const handler = async ({ text }: { text: string }, _c: ToolContext<P, Ctx>) => toolTextResult(text);
  const echo =
    zodMajor === 4
      ? defineTool({
          name: "echo",
          description: "Echo the text back.",
          inputSchema: z.object({ text: z.string().describe("Text to echo") }),
          annotations: { readOnlyHint: true },
          handler,
        })
      : defineTool({
          name: "echo",
          description: "Echo the text back.",
          inputSchema: z3.object({ text: z3.string().describe("Text to echo") }),
          jsonSchema: {},
          annotations: { readOnlyHint: true },
          handler,
        });
  return [echo, fails];
}

async function run(fixture: SdkFixture, zodMajor: 3 | 4, body: string) {
  const dispatcher = createMcpDispatcher<P, Ctx>({ serverInfo: fixture.serverInfo, tools: fixtureTools(zodMajor) });
  const parsed = parseRpcBody(body);
  if (!parsed.ok) return parsed.result;
  return dispatcher.handleRpc({ principal: { userId: "u" }, ctx: { tag: "c" }, json: parsed.json, scope: undefined });
}

/**
 * Exchanges where the pure dispatcher is protocol-equivalent but not
 * byte-identical to the SDK. Everything else must match byte for byte.
 */
const DIFFERENCES: Record<string, string> = {
  toolsList: "SDK adds execution.taskSupport and (zod 3) uses zod-to-json-schema",
  invalidRequest: "SDK answers -32700 'Parse error: Invalid JSON-RPC message'; the kit answers -32600 'Invalid Request'",
};

describe.each(APPS)("pure dispatcher vs SDK capture (%s)", (app) => {
  const fixture = load(app);
  const zodMajor = fixture.zodVersion.startsWith("4") ? 4 : 3;
  const names = Object.keys(fixture.exchanges).filter((name) => !(name in DIFFERENCES));

  it.each(names)("%s is byte-identical", async (name) => {
    const exchange = must(fixture.exchanges[name]);
    // SDK 1.29 (app-a) dumps raw zod 3 issues; 1.30+ formats "<message> at <path>", as the kit does.
    if (name === "toolsCallInvalidArgs" && fixture.sdkVersion === "1.29.0") {
      expect((await run(fixture, zodMajor, exchange.request)).body).toBe(
        must(load("app-b").exchanges[name]).response.body?.replace("app-b", app),
      );
      return;
    }
    // In parsedBody mode the apps' JSON.parse throws first, so the SDK never sees bad JSON.
    if (exchange.response.body === null) return;
    expect(await run(fixture, zodMajor, exchange.request)).toEqual(exchange.response);
  });

  it("tools/list matches except the documented fields", async () => {
    const toolsList = must(fixture.exchanges.toolsList);
    const sdk = JSON.parse(must(toolsList.response.body));
    const kit = JSON.parse((await run(fixture, zodMajor, toolsList.request)).body);
    const strip = (tool: { [k: string]: JsonValue }) => {
      const { execution: _execution, inputSchema: _schema, ...rest } = tool;
      return rest;
    };
    expect(kit.result.tools.map(strip)).toEqual(sdk.result.tools.map(strip));
    if (zodMajor === 4) {
      expect(kit.result.tools.map((t: { inputSchema: JsonValue }) => t.inputSchema)).toEqual(
        sdk.result.tools.map((t: { inputSchema: JsonValue }) => t.inputSchema),
      );
    }
  });

  it("invalid request: documented difference", async () => {
    const exchange = must(fixture.exchanges.invalidRequest);
    expect(exchange.response).toEqual({
      status: 400,
      body: '{"jsonrpc":"2.0","error":{"code":-32700,"message":"Parse error: Invalid JSON-RPC message"},"id":null}',
    });
    expect(await run(fixture, zodMajor, exchange.request)).toEqual({
      status: 400,
      body: '{"jsonrpc":"2.0","error":{"code":-32600,"message":"Invalid Request"},"id":null}',
    });
  });
});

describe("createMcpDispatcher options", () => {
  const base = { serverInfo: { name: "s", version: "1" }, tools: fixtureTools(4) };
  const call = (dispatcher: ReturnType<typeof createMcpDispatcher<P, Ctx, "personal" | "team">>, json: JsonValue, scope?: "personal" | "team") =>
    dispatcher.handleRpc({ principal: { userId: "u" }, ctx: { tag: "c" }, json, scope });

  it("configures protocol versions, capabilities, instructions and per-scope serverInfo", async () => {
    const dispatcher = createMcpDispatcher<P, Ctx, "personal" | "team">({
      ...base,
      serverInfo: (scope) => ({ name: scope === "team" ? "app-a-mcp-team" : "app-a-mcp", version: "2.0.0" }),
      protocol: { versions: ["2025-06-18", "2025-03-26"], fallback: "2025-03-26" },
      capabilities: { tools: {} },
      instructions: "Be nice.",
    });
    const res = await call(dispatcher, { jsonrpc: "2.0", id: "a", method: "initialize", params: { protocolVersion: "2024-11-05" } }, "team");
    expect(JSON.parse(res.body)).toEqual({
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "app-a-mcp-team", version: "2.0.0" },
        instructions: "Be nice.",
      },
      jsonrpc: "2.0",
      id: "a",
    });
  });

  it("hides scoped tools from other scopes in list and call", async () => {
    const teamTool = defineTool<object, P, Ctx, "personal" | "team">({
      name: "team_tool",
      description: "t",
      scopes: ["team"],
      inputSchema: z.object({}),
      handler: async () => toolTextResult("ok"),
    });
    const dispatcher = createMcpDispatcher<P, Ctx, "personal" | "team">({ ...base, tools: [teamTool] });
    const list = await call(dispatcher, { jsonrpc: "2.0", id: 1, method: "tools/list" }, "personal");
    expect(JSON.parse(list.body).result.tools).toEqual([]);
    const denied = await call(dispatcher, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "team_tool" } }, "personal");
    expect(JSON.parse(denied.body).result.content[0].text).toBe("MCP error -32602: Tool team_tool not found");
    const ok = await call(dispatcher, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "team_tool" } }, "team");
    expect(JSON.parse(ok.body).result).toEqual(toolTextResult("ok"));
  });

  it("passes principal, ctx and scope to tools", async () => {
    const seen: Array<ToolContext<P, Ctx, "personal" | "team">> = [];
    const spy = defineTool<object, P, Ctx, "personal" | "team">({
      name: "spy",
      description: "s",
      inputSchema: z.object({}),
      handler: async (_args, context) => {
        seen.push(context);
        return toolTextResult("");
      },
    });
    const dispatcher = createMcpDispatcher<P, Ctx, "personal" | "team">({ ...base, tools: [spy] });
    await call(dispatcher, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "spy" } }, "team");
    expect(seen).toEqual([{ principal: { userId: "u" }, ctx: { tag: "c" }, scope: "team" }]);
  });

  it("answers 202 for an all-notification batch and rejects empty or malformed batches", async () => {
    const dispatcher = createMcpDispatcher<P, Ctx, "personal" | "team">(base);
    expect(await call(dispatcher, [{ jsonrpc: "2.0", method: "notifications/initialized" }])).toEqual({ status: 202, body: "" });
    const mixed = await call(dispatcher, [
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 1, method: "ping" },
    ]);
    expect(mixed).toEqual({ status: 200, body: '[{"result":{},"jsonrpc":"2.0","id":1}]' });
    for (const bad of [[], [{ jsonrpc: "2.0", id: 1, method: "ping" }, 5], { jsonrpc: "1.0", id: 1, method: "ping" }, { jsonrpc: "2.0", id: {}, method: "ping" }]) {
      expect((await call(dispatcher, bad)).status).toBe(400);
    }
  });

  it("rejects duplicate tool names at creation", () => {
    const [echo] = fixtureTools(4);
    expect(() => createMcpDispatcher<P, Ctx>({ ...base, tools: [must(echo), must(echo)] })).toThrow("Duplicate MCP tool name");
  });
});

describe("negotiateProtocolVersion", () => {
  it("echoes supported versions and falls back to the newest by default", () => {
    expect(negotiateProtocolVersion("2024-11-05")).toBe("2024-11-05");
    expect(negotiateProtocolVersion("1999-01-01")).toBe("2025-11-25");
    expect(negotiateProtocolVersion(undefined)).toBe("2025-11-25");
    expect(negotiateProtocolVersion(5)).toBe("2025-11-25");
  });

  it("supports app-e's list with a 2025-03-26 fallback", () => {
    const appE = { versions: ["2025-06-18", "2025-03-26", "2024-11-05"], fallback: "2025-03-26" };
    expect(negotiateProtocolVersion("2025-06-18", appE)).toBe("2025-06-18");
    expect(negotiateProtocolVersion("2025-11-25", appE)).toBe("2025-03-26");
    expect(() => negotiateProtocolVersion("x", { versions: [] })).toThrow("at least one version");
  });
});

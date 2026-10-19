import { assertMcpTools, expectMcpToolCount } from "@vvedantb/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { z as z3 } from "zod3";
import {
  assertUniqueToolNames,
  createToolRegistry,
  defineTool,
  formatIssues,
  runTool,
  toolErrorResult,
  toolJsonResult,
  toolsToList,
  toolTextResult,
  type ToolContext,
} from "../../src/mcp/index.js";

type P = { userId: string };
type C = { tag: string };
type Scope = "personal" | "team";
const context: ToolContext<P, C, Scope> = { principal: { userId: "u1" }, ctx: { tag: "c" }, scope: "personal" };

const echo = defineTool({
  name: "echo",
  description: "Echo.",
  inputSchema: z.object({ text: z.string().describe("Text"), times: z.number().int().default(1) }),
  annotations: { readOnlyHint: true },
  handler: async ({ text, times }, { principal }: ToolContext<P, C, Scope>) =>
    toolTextResult(`${principal.userId}:${text.repeat(times)}`),
});

describe("result helpers", () => {
  it("shape results like the apps", () => {
    expect(toolTextResult("hi")).toEqual({ content: [{ type: "text", text: "hi" }] });
    expect(toolJsonResult({ a: 1 })).toEqual({ content: [{ type: "text", text: '{\n  "a": 1\n}' }] });
    expect(toolErrorResult("no")).toEqual({ content: [{ type: "text", text: "no" }], isError: true });
  });

  it("runTool returns JSON, labels errors and rejects undefined", async () => {
    expect(await runTool(async () => [1])).toEqual(toolJsonResult([1]));
    expect(await runTool(async () => { throw new Error("x"); }, { errorLabel: "Files get failed" })).toEqual(
      toolErrorResult("Files get failed: x"),
    );
    expect(await runTool(async () => { throw "s"; })).toEqual(toolErrorResult("Tool failed"));
    expect(await runTool(async () => undefined)).toEqual(toolErrorResult("Result is not JSON"));
  });
});

describe("defineTool", () => {
  it("validates with zod 4 and passes principal and parsed defaults", async () => {
    expect(await echo.call({ text: "a" }, context)).toEqual(toolTextResult("u1:a"));
    expect(await echo.call({ text: "a", times: 2 }, context)).toEqual(toolTextResult("u1:aa"));
  });

  it("shapes invalid args like MCP SDK 1.30+", async () => {
    expect(await echo.call({ text: 42 }, context)).toEqual(
      toolErrorResult(
        "MCP error -32602: Input validation error: Invalid arguments for tool echo: Invalid input: expected string, received number at text",
      ),
    );
  });

  it("works with zod 3 schemas", async () => {
    const tool = defineTool({
      name: "z3",
      description: "d",
      inputSchema: z3.object({ n: z3.number() }),
      jsonSchema: { type: "object", properties: { n: { type: "number" } } },
      handler: async ({ n }, _c: ToolContext<P, C>) => toolJsonResult({ n }),
    });
    expect(await tool.call({ n: 1 }, context)).toEqual(toolJsonResult({ n: 1 }));
    expect(await tool.call({ n: "x" }, context)).toEqual(
      toolErrorResult(
        "MCP error -32602: Input validation error: Invalid arguments for tool z3: Expected number, received string at n",
      ),
    );
    expect(tool.inputJsonSchema()).toEqual({ type: "object", properties: { n: { type: "number" } } });
  });

  it("turns a handler throw into an isError result", async () => {
    const tool = defineTool({
      name: "boom",
      description: "d",
      inputSchema: z.object({}),
      handler: async () => { throw new Error("boom"); },
    });
    expect(await tool.call({}, context)).toEqual(toolErrorResult("boom"));
  });

  it("accepts a raw JSON Schema with parseArgs", async () => {
    const tool = defineTool({
      name: "raw",
      description: "d",
      inputSchema: { type: "object", properties: { id: { type: "string" } } },
      parseArgs: (args) => {
        if (typeof args.id !== "string") throw new Error("Expected string at id");
        return { id: args.id };
      },
      handler: async ({ id }, _c: ToolContext<P, C>) => toolTextResult(id),
    });
    expect(await tool.call({ id: "x" }, context)).toEqual(toolTextResult("x"));
    expect((await tool.call({}, context)).isError).toBe(true);
    expect(tool.inputJsonSchema()).toEqual({ type: "object", properties: { id: { type: "string" } } });
  });

  it("rejects an empty name", () => {
    expect(() =>
      defineTool({ name: "", description: "", inputSchema: z.object({}), handler: async () => toolTextResult("") }),
    ).toThrow("must not be empty");
  });
});

describe("JSON Schema for tools/list", () => {
  it("uses zod 4's toJSONSchema (draft-7, input), like the SDK", () => {
    expect(echo.inputJsonSchema()).toEqual({
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        text: { type: "string", description: "Text" },
        times: { type: "integer", default: 1, minimum: -9007199254740991, maximum: 9007199254740991 },
      },
      required: ["text"],
    });
  });

  it("uses an injected converter for zod 3, and throws without one", () => {
    const tool = defineTool({
      name: "z3",
      description: "d",
      inputSchema: z3.object({ n: z3.number() }),
      handler: async () => toolTextResult(""),
    });
    expect(tool.inputJsonSchema(() => ({ type: "object", converted: true }))).toEqual({
      type: "object",
      converted: true,
    });
    expect(() => tool.inputJsonSchema()).toThrow("pass jsonSchema or a toJsonSchema converter");
  });

  it("formatIssues joins issues with dot paths", () => {
    expect(
      formatIssues([
        { path: [], message: "Bad" },
        { path: ["a", 0, "b"], message: "Worse" },
      ]),
    ).toBe("Bad\nWorse at a[0].b");
  });
});

describe("registry", () => {
  const teamOnly = defineTool<{ q?: string }, P, C, Scope>({
    name: "team_only",
    description: (scope) => `Search ${scope} memories.`,
    scopes: ["team"],
    inputSchema: z.object({ q: z.string().optional() }),
    handler: async () => toolTextResult("t"),
  });

  it("asserts unique names", () => {
    expect(() => assertUniqueToolNames([echo, echo])).toThrow("Duplicate MCP tool name: echo");
    expect(() => createToolRegistry([echo, echo])).toThrow("Duplicate MCP tool name: echo");
  });

  it("filters by scope (app-a scopes) and works with server/convex test helpers", () => {
    const registry = createToolRegistry<P, C, Scope>([echo, teamOnly]);
    assertMcpTools(registry.names("personal"), ["echo"]);
    assertMcpTools(registry.names("team"), ["echo", "team_only"]);
    expectMcpToolCount(registry.names(), 1);
    expect(registry.find("team_only", "personal")).toBeUndefined();
    expect(registry.find("team_only", "team")).toBe(teamOnly);
  });

  it("lists tools with scope-aware descriptions and annotations", () => {
    const list = toolsToList<P, C, Scope>([echo, teamOnly], { scope: "team" });
    expect(list.map((t) => t.name)).toEqual(["echo", "team_only"]);
    expect(list[0]?.annotations).toEqual({ readOnlyHint: true });
    expect(list[1]?.description).toBe("Search team memories.");
    expect("annotations" in (list[1] ?? {})).toBe(false);
  });
});

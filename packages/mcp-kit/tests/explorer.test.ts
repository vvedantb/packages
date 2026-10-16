import { assertMcpTools } from "@vvedantb/convex-kit";
import { describe, expect, it, vi } from "vitest";
import { must } from "./helpers.js";
import {
  createExplorerTools,
  createMcpDispatcher,
  toolErrorResult,
  toolJsonResult,
  toolTextResult,
  type ExplorerOperation,
  type JsonInput,
  type JsonObject,
  type McpTool,
  type ToolContext,
} from "../src/index.js";

type P = { clerkUserId: string };
type Ctx = { tag: string };
const PRINCIPAL = { clerkUserId: "user_1", secret: Symbol("opaque") };
const context: ToolContext<P, Ctx> = { principal: PRINCIPAL, ctx: { tag: "c" }, scope: undefined };

function setup(overrides: Partial<Parameters<typeof createExplorerTools<P, Ctx>>[0]> = {}) {
  const calls: Array<{ op: ExplorerOperation; context: ToolContext<P, Ctx> }> = [];
  const execute = vi.fn(async (op: ExplorerOperation, ctx: ToolContext<P, Ctx>): Promise<JsonInput | null> => {
    calls.push({ op, context: ctx });
    if (op.kind === "list_tables") return [{ name: "projects", scope: "Your projects only" }];
    if (op.kind === "query_table" && op.table === "denied") return null;
    if (op.kind === "count_table" && op.table === "boom") throw new Error("Convex said no");
    if (op.kind === "count_table") return { count: 3, truncated: false };
    return { page: [], isDone: true };
  });
  const tools = createExplorerTools<P, Ctx>({
    tables: ["projects", "denied", "boom", { name: "readings", fields: ["value", "type"] }],
    execute,
    ...overrides,
  });
  const byName = (name: string): McpTool<P, Ctx> => {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`no ${name}`);
    return tool;
  };
  const call = (name: string, args: JsonObject) => byName(name).call(args, context);
  return { tools, execute, calls, call };
}

describe("createExplorerTools: creation", () => {
  it("throws without an executor or tables", () => {
    // @ts-expect-error execute is required
    expect(() => createExplorerTools({ tables: [] })).toThrow("execute is required");
    // @ts-expect-error tables is required
    expect(() => createExplorerTools({ execute: async () => null })).toThrow("tables is required");
    expect(() => createExplorerTools({ tables: [], execute: async () => null, limits: { default: 10, max: 5 } })).toThrow(
      "limits",
    );
  });

  it("creates the four tools, plus run_query with a callback, with custom names", () => {
    assertMcpTools(setup().tools.map((t) => t.name), ["list_tables", "query_table", "count_table", "get_document"]);
    const withRun = setup({ runQuery: async () => toolTextResult(""), names: { listTables: "tables" } });
    assertMcpTools(withRun.tools.map((t) => t.name), ["tables", "query_table", "count_table", "get_document", "run_query"]);
    const noDoc = setup({ features: { getDocument: false } });
    expect(noDoc.tools.map((t) => t.name)).not.toContain("get_document");
  });

  it("marks the tools read-only and lists through the dispatcher", async () => {
    const { tools } = setup({ descriptions: { queryTable: "Read rows." } });
    const dispatcher = createMcpDispatcher<P, Ctx>({ serverInfo: { name: "s", version: "1" }, tools });
    const res = await dispatcher.handleRpc({ principal: PRINCIPAL, ctx: { tag: "c" }, scope: undefined, json: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
    const listed = JSON.parse(res.body).result.tools;
    expect(listed[1]).toEqual({
      name: "query_table",
      description: "Read rows.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name from list_tables" },
          order: { type: "string", enum: ["asc", "desc"], default: "desc", description: "Sort order by creation time" },
          limit: { type: "number", default: 100, maximum: 1000, description: "Max documents to return (default 100, max 1000)" },
        },
        required: ["table"],
      },
    });
  });
});

describe("createExplorerTools: validation before the executor", () => {
  it("normalises query_table defaults and clamps limits", async () => {
    const { call, calls } = setup();
    await call("query_table", { table: "projects" });
    await call("query_table", { table: "projects", order: "asc", limit: 5000 });
    await call("query_table", { table: "projects", limit: -3 });
    await call("query_table", { table: "projects", limit: 7.9 });
    expect(calls.map((c) => c.op)).toEqual([
      { kind: "query_table", table: "projects", order: "desc", limit: 100, cursor: null, filters: null },
      { kind: "query_table", table: "projects", order: "asc", limit: 1000, cursor: null, filters: null },
      { kind: "query_table", table: "projects", order: "desc", limit: 1, cursor: null, filters: null },
      { kind: "query_table", table: "projects", order: "desc", limit: 7, cursor: null, filters: null },
    ]);
  });

  it("uses configured limits (app-d: default 50, max 200)", async () => {
    const { call, calls } = setup({ limits: { default: 50, max: 200 } });
    await call("query_table", { table: "projects" });
    await call("query_table", { table: "projects", limit: 999 });
    expect(calls.map((c) => c.op.kind === "query_table" && c.op.limit)).toEqual([50, 200]);
  });

  it("never passes an unknown or malformed table to the executor", async () => {
    const { call, execute } = setup();
    for (const table of ["users", "projects; drop", "../x", "", "__proto__", "constructor"]) {
      expect(await call("query_table", { table })).toEqual(
        toolErrorResult(`Access denied: table "${table}" is not available via MCP.`),
      );
      expect(await call("count_table", { table })).toEqual(
        toolErrorResult(`Access denied: table "${table}" is not available via MCP.`),
      );
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("supports a predicate catalog (app-c deny-list) and still checks the name shape", async () => {
    const execute = vi.fn(async () => 1);
    const tools = createExplorerTools<P, Ctx>({ tables: (t) => t !== "waitlist", execute });
    const count = must(tools.find((t) => t.name === "count_table"));
    expect((await count.call({ table: "waitlist" }, context)).isError).toBe(true);
    expect((await count.call({ table: "bad-name" }, context)).isError).toBe(true);
    expect(await count.call({ table: "pages" }, context)).toEqual(toolJsonResult(1));
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("rejects bad argument types as validation errors", async () => {
    const { call, execute } = setup();
    expect(await call("query_table", { table: 5 })).toEqual(
      toolErrorResult("MCP error -32602: Input validation error: Invalid arguments for tool query_table: Expected string at table"),
    );
    expect((await call("query_table", { table: "projects", order: "up" })).isError).toBe(true);
    expect((await call("query_table", { table: "projects", limit: "10" })).isError).toBe(true);
    expect((await call("count_table", {})).content[0]).toEqual({
      type: "text",
      text: "MCP error -32602: Input validation error: Invalid arguments for tool count_table: Required at table",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("only passes cursor and filters when enabled, and checks field names", async () => {
    const off = setup();
    await off.call("query_table", { table: "projects", cursor: "c1", eq: { a: 1 } });
    expect(off.calls[0]?.op).toMatchObject({ cursor: null, filters: null });

    const on = setup({ features: { cursor: true, filters: true } });
    await on.call("query_table", { table: "readings", cursor: "c1", eq: { type: "glucose" }, gte: { value: 4 } });
    expect(on.calls[0]?.op).toEqual({
      kind: "query_table",
      table: "readings",
      order: "desc",
      limit: 100,
      cursor: "c1",
      filters: { eq: { type: "glucose" }, gte: { value: 4 } },
    });
    expect(await on.call("count_table", { table: "readings", eq: { userId: "other" } })).toEqual(
      toolErrorResult('Unknown field "userId" on table "readings".'),
    );
    expect(await on.call("count_table", { table: "projects", eq: { "a.b": 1 } })).toEqual(
      toolErrorResult('Invalid field name "a.b".'),
    );
    expect((await on.call("count_table", { table: "projects", gte: { x: "1" } })).isError).toBe(true);
    expect((await on.call("count_table", { table: "projects", eq: { x: [1] } })).isError).toBe(true);
    await on.call("count_table", { table: "readings", lte: { _creationTime: 5 } });
    expect(on.calls).toHaveLength(2);
  });

  it("checks get_document ids", async () => {
    const { call, execute } = setup({ messages: { invalidId: "Invalid document ID format." } });
    expect(await call("get_document", { id: "abc/../x" })).toEqual(toolErrorResult("Invalid document ID format."));
    expect(execute).not.toHaveBeenCalled();
    await call("get_document", { id: "j572abc123" });
    expect(execute).toHaveBeenCalledWith({ kind: "get_document", id: "j572abc123" }, context);
  });
});

describe("createExplorerTools: executor results", () => {
  it("passes the principal through untouched (same object)", async () => {
    const { call, calls } = setup();
    await call("list_tables", {});
    expect(calls[0]?.context.principal).toBe(PRINCIPAL);
  });

  it("formats objects as pretty JSON and strings as-is", async () => {
    const { call } = setup();
    expect(await call("list_tables", {})).toEqual(toolJsonResult([{ name: "projects", scope: "Your projects only" }]));
    const text = createExplorerTools<P, Ctx>({ tables: ["t"], execute: async () => '{"table":"t","count":1}' });
    expect(await must(text[2]).call({ table: "t" }, context)).toEqual(toolTextResult('{"table":"t","count":1}'));
  });

  it("maps null to the denied message and throws to an error result", async () => {
    const { call } = setup();
    expect(await call("query_table", { table: "denied" })).toEqual(
      toolErrorResult('Cannot query table "denied". Use list_tables.'),
    );
    expect(await call("count_table", { table: "boom" })).toEqual(toolErrorResult("Convex said no"));
    const custom = setup({
      messages: { denied: (op) => `no ${op.kind}`, unknownTable: (t, tool) => `unknown ${t} in ${tool}` },
    });
    expect(await custom.call("query_table", { table: "denied" })).toEqual(toolErrorResult("no query_table"));
    expect(await custom.call("query_table", { table: "x" })).toEqual(toolErrorResult("unknown x in query_table"));
    expect(await custom.call("count_table", { table: "x" })).toEqual(toolErrorResult("unknown x in count_table"));
  });
});

describe("createExplorerTools: run_query", () => {
  it("validates code and passes it with the principal; the kit does not evaluate it", async () => {
    const runQuery = vi.fn(async () => toolJsonResult({ result: 1 }));
    const { call } = setup({ runQuery });
    expect(await call("run_query", { code: "return 1;" })).toEqual(toolJsonResult({ result: 1 }));
    expect(runQuery).toHaveBeenCalledWith({ code: "return 1;" }, context);
    expect((await call("run_query", {})).isError).toBe(true);
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it("checks app-d-style tables against the catalog before the callback", async () => {
    const runQuery = vi.fn(async () => toolTextResult("ok"));
    const { call } = setup({ runQuery, features: { runQueryTables: true } });
    expect(await call("run_query", { code: "x", tables: ["projects", "users"] })).toEqual(
      toolErrorResult('Access denied: table "users" is not available via MCP.'),
    );
    expect((await call("run_query", { code: "x", tables: "projects" })).isError).toBe(true);
    expect(runQuery).not.toHaveBeenCalled();
    await call("run_query", { code: "x", tables: ["projects"], limitPerTable: 20 });
    expect(runQuery).toHaveBeenCalledWith({ code: "x", tables: ["projects"], limitPerTable: 20 }, context);
  });

  it("ignores tables and limitPerTable unless enabled", async () => {
    const runQuery = vi.fn(async () => toolTextResult("ok"));
    const { call } = setup({ runQuery });
    await call("run_query", { code: "x", tables: ["users"] });
    expect(runQuery).toHaveBeenCalledWith({ code: "x" }, context);
  });
});

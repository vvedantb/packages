import { isJsonObject, type JsonInput, type JsonObject, type JsonValue } from "./json.js";
import {
  defineTool,
  toolErrorResult,
  toolJsonResult,
  toolTextResult,
  type JsonSchemaObject,
  type McpTool,
  type ToolContext,
  type ToolResult,
} from "./tools.js";

/** A table the explorer tools may read. `fields`, when given, limits filter field names. */
export type TableEntry = { name: string; fields?: ReadonlyArray<string | { name: string }> } & object;

/**
 * Tables the tools accept: a fixed list (vibot, velth), or a predicate for
 * catalogs read at runtime (verve: a deny-list). Names must also match
 * `^[A-Za-z_][A-Za-z0-9_]*$`.
 */
export type TableCatalog = ReadonlyArray<string | TableEntry> | ((table: string) => boolean);

export type FilterValue = string | number | boolean | null;

/** Top-level field filters (velth `eq` / `gte` / `lte`). */
export type ExplorerFilters = {
  eq?: Record<string, FilterValue>;
  gte?: Record<string, number>;
  lte?: Record<string, number>;
};

/** A validated request for the app's executor. Table names are already checked against the catalog. */
export type ExplorerOperation =
  | { kind: "list_tables" }
  | {
      kind: "query_table";
      table: string;
      order: "asc" | "desc";
      limit: number;
      /** `null` unless `features.cursor` is on and the caller sent one. */
      cursor: string | null;
      /** `null` unless `features.filters` is on and the caller sent some. */
      filters: ExplorerFilters | null;
    }
  | { kind: "count_table"; table: string; filters: ExplorerFilters | null }
  | { kind: "get_document"; id: string };

/** Validated `run_query` arguments. `tables` is set only with `features.runQueryTables`. */
export type RunQueryArgs = { code: string; tables?: string[]; limitPerTable?: number };

export type ExplorerToolKey = "listTables" | "queryTable" | "countTable" | "getDocument" | "runQuery";

export type ExplorerToolsConfig<Principal, Ctx, Scope extends string = string> = {
  tables: TableCatalog;
  /**
   * Run a validated operation for `context.principal`. The executor MUST
   * enforce per-user scoping; the kit only checks names and limits. Return
   * the payload (a string is sent as-is, anything else as pretty JSON) or
   * `null` to deny. A throw becomes an `isError` result with its message.
   */
  execute: (op: ExplorerOperation, context: ToolContext<Principal, Ctx, Scope>) => Promise<JsonInput | null>;
  /** Optional `run_query`. The kit validates arguments only; evaluation and scoping are the app's. */
  runQuery?: (args: RunQueryArgs, context: ToolContext<Principal, Ctx, Scope>) => Promise<ToolResult>;
  /** `limit` default and maximum for query_table. Default 100 and 1000 (vibot, verve; velth: 50 and 200). */
  limits?: { default?: number; max?: number };
  features?: {
    /** `cursor` argument on query_table (vibot). Default false. */
    cursor?: boolean;
    /** `eq` / `gte` / `lte` on query_table and count_table (velth). Default false. */
    filters?: boolean;
    /** get_document tool. Default true. */
    getDocument?: boolean;
    /** `tables` and `limitPerTable` on run_query (velth). Default false. */
    runQueryTables?: boolean;
  };
  names?: Partial<Record<ExplorerToolKey, string>>;
  descriptions?: Partial<Record<ExplorerToolKey, string>>;
  messages?: {
    /**
     * Unknown or malformed table, per tool. Default verve's
     * "Access denied: table "<t>" is not available via MCP.".
     */
    unknownTable?: (table: string, tool: "query_table" | "count_table" | "run_query") => string;
    /** Executor returned `null`. Default vibot's "Cannot query table "<t>". Use list_tables." and similar. */
    denied?: (op: ExplorerOperation) => string;
    /** get_document id is not `^[a-zA-Z0-9_]+$`. Default verve's text. */
    invalidId?: string;
  };
  /** Scopes the tools are on (vmem-style). Omit for all. */
  scopes?: readonly Scope[];
};

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DOCUMENT_ID = /^[a-zA-Z0-9_]+$/;
const SYSTEM_FIELDS = ["_id", "_creationTime"];

const DEFAULT_NAMES: Record<ExplorerToolKey, string> = {
  listTables: "list_tables",
  queryTable: "query_table",
  countTable: "count_table",
  getDocument: "get_document",
  runQuery: "run_query",
};

const DEFAULT_DESCRIPTIONS: Record<ExplorerToolKey, string> = {
  listTables: "List the tables you can query.",
  queryTable: "Read a page of documents from a table, scoped to your user.",
  countTable: "Count documents you can access in a table.",
  getDocument:
    "Get a single document by Convex id. Returns null when it is missing or outside your scope.",
  runQuery: "Run read-only query code against your scoped data.",
};

function defaultDenied(op: ExplorerOperation): string {
  switch (op.kind) {
    case "query_table":
      return `Cannot query table "${op.table}". Use list_tables.`;
    case "count_table":
      return `Cannot count table "${op.table}".`;
    case "get_document":
      return "Document not found or not accessible.";
    case "list_tables":
      return "Cannot list tables.";
  }
}

function toResult(value: JsonInput): ToolResult {
  return typeof value === "string" ? toolTextResult(value) : toolJsonResult(value);
}

class ArgError extends Error {}

function optionalString(args: JsonObject, key: string): string | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new ArgError(`Expected string at ${key}`);
  return value;
}

function requiredString(args: JsonObject, key: string): string {
  const value = optionalString(args, key);
  if (value === undefined) throw new ArgError(`Required at ${key}`);
  return value;
}

function optionalNumber(args: JsonObject, key: string): number | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number") throw new ArgError(`Expected number at ${key}`);
  return value;
}

function fieldMap<V extends FilterValue>(
  value: JsonValue | undefined,
  key: string,
  accept: (v: JsonValue) => v is V,
  expected: string,
): Record<string, V> | undefined {
  if (value === undefined) return undefined;
  if (!isJsonObject(value)) throw new ArgError(`Expected object at ${key}`);
  const out: Record<string, V> = {};
  for (const [field, fieldValue] of Object.entries(value)) {
    if (!accept(fieldValue)) throw new ArgError(`Expected ${expected} at ${key}.${field}`);
    out[field] = fieldValue;
  }
  return out;
}

const isFilterValue = (v: JsonValue): v is FilterValue =>
  v === null || typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v));
const isFiniteNumber = (v: JsonValue): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * list_tables, query_table, count_table, get_document and (with `runQuery`)
 * run_query, backed by the app's user-scoped `execute` callback. Arguments
 * and table names are checked before the callback runs, so a table outside
 * the catalog never reaches it. The kit never reads the database.
 */
export function createExplorerTools<Principal, Ctx, Scope extends string = string>(
  config: ExplorerToolsConfig<Principal, Ctx, Scope>,
): McpTool<Principal, Ctx, Scope>[] {
  if (typeof config.execute !== "function") {
    throw new Error("createExplorerTools: execute is required (a user-scoped executor)");
  }
  if (typeof config.tables !== "function" && !Array.isArray(config.tables)) {
    throw new Error("createExplorerTools: tables is required");
  }
  if (config.runQuery !== undefined && typeof config.runQuery !== "function") {
    throw new Error("createExplorerTools: runQuery must be a function");
  }
  const { execute, runQuery, tables, scopes } = config;
  const defaultLimit = config.limits?.default ?? 100;
  const maxLimit = config.limits?.max ?? 1000;
  if (!(defaultLimit >= 1 && maxLimit >= defaultLimit)) {
    throw new Error("createExplorerTools: limits need 1 <= default <= max");
  }
  const features = config.features ?? {};
  const names = { ...DEFAULT_NAMES, ...config.names };
  const descriptions = { ...DEFAULT_DESCRIPTIONS, ...config.descriptions };
  const unknownTable =
    config.messages?.unknownTable ??
    ((table: string, _tool: "query_table" | "count_table" | "run_query") =>
      `Access denied: table "${table}" is not available via MCP.`);
  const denied = config.messages?.denied ?? defaultDenied;
  const invalidId = config.messages?.invalidId ?? "Invalid document ID format. IDs should be alphanumeric.";

  const entries = typeof tables === "function" ? null : tables.map((t) => (typeof t === "string" ? { name: t } : t));
  const entryFor = (table: string): TableEntry | null => {
    if (!IDENTIFIER.test(table)) return null;
    if (typeof tables === "function") return tables(table) ? { name: table } : null;
    return entries?.find((entry) => entry.name === table) ?? null;
  };

  const checkFields = (entry: TableEntry, filters: ExplorerFilters): string | null => {
    const allowed = entry.fields?.map((f) => (typeof f === "string" ? f : f.name));
    for (const map of [filters.eq, filters.gte, filters.lte]) {
      for (const field of Object.keys(map ?? {})) {
        if (!IDENTIFIER.test(field)) return `Invalid field name "${field}".`;
        if (allowed && !allowed.includes(field) && !SYSTEM_FIELDS.includes(field)) {
          return `Unknown field "${field}" on table "${entry.name}".`;
        }
      }
    }
    return null;
  };

  const parseFilters = (args: JsonObject): ExplorerFilters | null => {
    if (!features.filters) return null;
    const filters: ExplorerFilters = {};
    const eq = fieldMap(args.eq, "eq", isFilterValue, "string, number, boolean or null");
    const gte = fieldMap(args.gte, "gte", isFiniteNumber, "number");
    const lte = fieldMap(args.lte, "lte", isFiniteNumber, "number");
    if (eq) filters.eq = eq;
    if (gte) filters.gte = gte;
    if (lte) filters.lte = lte;
    return eq || gte || lte ? filters : null;
  };

  const run = async (op: ExplorerOperation, context: ToolContext<Principal, Ctx, Scope>) => {
    const value = await execute(op, context);
    return value === null ? toolErrorResult(denied(op)) : toResult(value);
  };

  const tableProperty = { type: "string", description: "Table name from list_tables" };
  const filterProperties = features.filters
    ? {
        eq: {
          type: "object",
          additionalProperties: { type: ["string", "number", "boolean", "null"] },
          description: "Top-level fields that must equal these values",
        },
        gte: { type: "object", additionalProperties: { type: "number" }, description: "Top-level fields >= these numbers" },
        lte: { type: "object", additionalProperties: { type: "number" }, description: "Top-level fields <= these numbers" },
      }
    : {};
  const common = { annotations: { readOnlyHint: true }, scopes };
  const tools: McpTool<Principal, Ctx, Scope>[] = [];

  tools.push(
    defineTool<Record<string, never>, Principal, Ctx, Scope>({
      ...common,
      name: names.listTables,
      description: descriptions.listTables,
      inputSchema: { type: "object", properties: {} },
      parseArgs: () => ({}),
      handler: (_args, context) => run({ kind: "list_tables" }, context),
    }),
  );

  type QueryArgs = Extract<ExplorerOperation, { kind: "query_table" }>;
  const queryProperties: JsonSchemaObject = {
    type: "object",
    properties: {
      table: tableProperty,
      order: { type: "string", enum: ["asc", "desc"], default: "desc", description: "Sort order by creation time" },
      limit: {
        type: "number",
        default: defaultLimit,
        maximum: maxLimit,
        description: `Max documents to return (default ${defaultLimit}, max ${maxLimit})`,
      },
      ...(features.cursor
        ? { cursor: { type: "string", description: "Pagination cursor from a previous query" } }
        : {}),
      ...filterProperties,
    },
    required: ["table"],
  };
  tools.push(
    defineTool<QueryArgs, Principal, Ctx, Scope>({
      ...common,
      name: names.queryTable,
      description: descriptions.queryTable,
      inputSchema: queryProperties,
      parseArgs: (args) => {
        const order = optionalString(args, "order") ?? "desc";
        if (order !== "asc" && order !== "desc") throw new ArgError('Expected "asc" or "desc" at order');
        const rawLimit = optionalNumber(args, "limit");
        const limit =
          rawLimit === undefined || !Number.isFinite(rawLimit)
            ? defaultLimit
            : Math.min(Math.max(1, Math.floor(rawLimit)), maxLimit);
        const cursor = features.cursor ? (optionalString(args, "cursor") ?? null) : null;
        return {
          kind: "query_table",
          table: requiredString(args, "table"),
          order,
          limit,
          cursor,
          filters: parseFilters(args),
        };
      },
      handler: async (op, context) => {
        const entry = entryFor(op.table);
        if (!entry) return toolErrorResult(unknownTable(op.table, op.kind));
        const fieldError = op.filters ? checkFields(entry, op.filters) : null;
        if (fieldError) return toolErrorResult(fieldError);
        return run(op, context);
      },
    }),
  );

  type CountArgs = Extract<ExplorerOperation, { kind: "count_table" }>;
  tools.push(
    defineTool<CountArgs, Principal, Ctx, Scope>({
      ...common,
      name: names.countTable,
      description: descriptions.countTable,
      inputSchema: { type: "object", properties: { table: tableProperty, ...filterProperties }, required: ["table"] },
      parseArgs: (args) => ({ kind: "count_table", table: requiredString(args, "table"), filters: parseFilters(args) }),
      handler: async (op, context) => {
        const entry = entryFor(op.table);
        if (!entry) return toolErrorResult(unknownTable(op.table, op.kind));
        const fieldError = op.filters ? checkFields(entry, op.filters) : null;
        if (fieldError) return toolErrorResult(fieldError);
        return run(op, context);
      },
    }),
  );

  if (features.getDocument ?? true) {
    tools.push(
      defineTool<{ id: string }, Principal, Ctx, Scope>({
        ...common,
        name: names.getDocument,
        description: descriptions.getDocument,
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", description: "Convex document id" } },
          required: ["id"],
        },
        parseArgs: (args) => ({ id: requiredString(args, "id") }),
        handler: async ({ id }, context) => {
          if (!DOCUMENT_ID.test(id)) return toolErrorResult(invalidId);
          return run({ kind: "get_document", id }, context);
        },
      }),
    );
  }

  if (runQuery) {
    tools.push(
      defineTool<RunQueryArgs, Principal, Ctx, Scope>({
        ...common,
        name: names.runQuery,
        description: descriptions.runQuery,
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string", description: "Handler body. Must return a value." },
            ...(features.runQueryTables
              ? {
                  tables: { type: "array", items: { type: "string" }, description: "Tables to load" },
                  limitPerTable: { type: "number", description: "Rows to load per table" },
                }
              : {}),
          },
          required: ["code"],
        },
        parseArgs: (args) => {
          const parsed: RunQueryArgs = { code: requiredString(args, "code") };
          if (!features.runQueryTables) return parsed;
          const rawTables = args.tables;
          if (rawTables !== undefined) {
            if (!Array.isArray(rawTables)) throw new ArgError("Expected array at tables");
            parsed.tables = rawTables.map((t, i) => {
              if (typeof t !== "string") throw new ArgError(`Expected string at tables[${i}]`);
              return t;
            });
          }
          const limitPerTable = optionalNumber(args, "limitPerTable");
          if (limitPerTable !== undefined) {
            if (!Number.isFinite(limitPerTable)) throw new ArgError("Expected finite number at limitPerTable");
            parsed.limitPerTable = limitPerTable;
          }
          return parsed;
        },
        handler: async (args, context) => {
          const missing = args.tables?.find((table) => !entryFor(table));
          if (missing !== undefined) return toolErrorResult(unknownTable(missing, "run_query"));
          return runQuery(args, context);
        },
      }),
    );
  }

  return tools;
}

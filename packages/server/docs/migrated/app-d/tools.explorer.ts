import { createExplorerTools } from "@vvedantb/server/mcp";

const BLOCKED_TABLES = [
  "waitlist",
  "userMigrations",
  "mcpAuthCodes",
  "mcpClientRegistrations",
  "postUpvotes",
  "commentUpvotes",
];

const explorerTools = createExplorerTools<string, ActionCtx>({
  tables: QUERYABLE_TABLES,
  limits: { default: 50, max: MAX_QUERY_LIMIT },
  features: { filters: true, runQueryTables: true },
  descriptions: {
    listTables:
      "List tables you can query, with access rules, fields, and indexes. Private health tables are always limited to your rows.",
    queryTable:
      "Read a page of documents from a table you can access. Owner tables are forced to your userId. Optional eq/gte/lte filter top-level fields.",
    countTable:
      "Count documents you can see in a table. Same access rules as query_table. Counts above 1000 are capped.",
    getDocument:
      "Load one document by id. Returns null if it does not exist or you cannot access it. Other users only expose a public display name.",
    runQuery: `Run a read-only JavaScript function body against a snapshot of tables you can access. This is for joins, aggregations, and filters.

The function receives:
- data: { ${QUERYABLE_TABLES.join(", ")} } — arrays of documents already scoped to you
- user: your redacted profile

Example: "return data.readings.filter(r => r.type === 'glucose').length;"

Writes are impossible: the snapshot is a copy. Other users' private health data is never loaded.`,
  },
  messages: { unknownTable: (table) => JSON.stringify({ error: `Table "${table}" is not queryable` }) },
  execute: async (op, { principal: clerkUserId, ctx }) => {
    switch (op.kind) {
      case "list_tables":
        return JSON.stringify({ tables: TABLE_CATALOG, queryable: QUERYABLE_TABLES, blocked: BLOCKED_TABLES }, null, 2);
      case "query_table":
        return ctx.runQuery(internal.mcp.queries.queryTable, {
          clerkUserId, table: op.table, limit: op.limit, order: op.order, ...op.filters,
        });
      case "count_table":
        return ctx.runQuery(internal.mcp.queries.countTable, { clerkUserId, table: op.table, ...op.filters });
      case "get_document":
        return ctx.runQuery(internal.mcp.queries.getDocument, { clerkUserId, id: op.id });
    }
  },
  runQuery: async ({ code, tables, limitPerTable }, { principal: clerkUserId, ctx }) => {
    const profile = await ctx.runQuery(internal.mcp.queries.whoami, { clerkUserId });
    if (!profile) return errorResult("User not found");
    const loaded: string = await ctx.runQuery(internal.mcp.queries.loadSnapshot, {
      clerkUserId, tables: tables ?? [], limitPerTable,
    });
    const envelope = parseObject(loaded);
    if (!envelope) return errorResult("Failed to load snapshot");
    const error = readString(envelope, "error");
    if (error) return errorResult(error);
    const snapshotValue = Reflect.get(envelope, "snapshot");
    if (snapshotValue === null || typeof snapshotValue !== "object") {
      return errorResult("Failed to load snapshot");
    }
    const result = runScopedScript(code, toSnapshot(snapshotValue), profile);
    if (!result.ok) return errorResult(result.error);
    return textResult(result.json);
  },
});

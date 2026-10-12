import { createExplorerTools } from "@vvedantb/mcp-kit";

const explorerTools = createExplorerTools<string, ActionCtx>({
  tables: TABLE_CATALOG,
  features: { cursor: true },
  descriptions: {
    listTables: "List Vibot Convex tables you can query, with the access scope for each.",
    queryTable: "Read a page of documents from a table, scoped to your user.",
    getDocument:
      "Get a single document by Convex id if you are allowed to read it. Returns null when the document is missing or outside your scope.",
    countTable: "Count documents you can access in a table (capped at 10000).",
    runQuery: `Run arbitrary read-only Convex query code against Vibot's database, scoped to your user.

Provide the body of an async handler. These bindings are already in scope:
- userId - your Convex users table id
- clerkUserId - your Clerk user id
- ctx.db.query("table") / ctx.db.get(id) — wrapped so other users' private rows are stripped

Denied tables (userMigrations) throw.
Public catalogues (models, skill catalogue, news, published announcements) are readable.
characters/agents tables still exist for historical rows you own or that are public.

Example: "return await ctx.db.query('projects').collect();"`,
  },
  messages: {
    unknownTable: (table, tool) =>
      tool === "count_table" ? `Cannot count table "${table}".` : `Cannot query table "${table}". Use list_tables.`,
    invalidId: "Invalid document ID format.",
  },
  execute: async (op, { principal: clerkUserId, ctx }) => {
    if (op.kind === "list_tables") return ctx.runQuery(internal.mcp.queries.listAccessibleTables, {});
    const { userId } = await mcpGetContext(ctx, clerkUserId);
    switch (op.kind) {
      case "query_table": {
        const result = await ctx.runQuery(internal.mcp.queries.queryAccessibleTable, {
          userId, table: op.table, order: op.order, numItems: op.limit, cursor: op.cursor,
        });
        if (!result) return null;
        return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor, count: result.page.length };
      }
      case "count_table":
        return ctx.runQuery(internal.mcp.queries.countAccessibleTable, { userId, table: op.table });
      case "get_document":
        return (await ctx.runQuery(internal.mcp.queries.getAccessibleDocument, { userId, id: op.id })) ?? { document: null };
    }
  },
  runQuery: async ({ code }, { principal: clerkUserId, ctx }) => {
    const { userId } = await mcpGetContext(ctx, clerkUserId);
    const result = await ctx.runAction(internal.mcp.nodeActions.runTestQuery, { userId, clerkUserId, code });
    if (!result.ok) return errorResult(result.error);
    if (result.logLines.length > 0) return textResult({ result: result.value, logLines: result.logLines });
    return textResult({ result: result.value });
  },
});

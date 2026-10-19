import { createExplorerTools } from "@vvedantb/server";

const explorerTools = createExplorerTools<string, ActionCtx>({
  tables: isTableAllowed,
  descriptions: {
    listTables:
      "List user-queryable tables in the app-c Convex database with field definitions, indexes, and inferred shapes.",
    queryTable:
      "Read documents from a Convex table scoped to your user. Returns up to `limit` rows ordered by creation time.",
    getDocument:
      "Get a single document by Convex document ID. Returns null if the document does not exist or you do not have access.",
    countTable: "Count documents in a table scoped to your user.",
    runQuery: `Run arbitrary read-only Convex query code against your scoped app-c data.

Provide the body of an async handler function. Available bindings:
- ctx.db.query("tableName") — query a table
- ctx.db.get(id) — get a document by ID
- __mcpUserId — your app-c userId (use to filter user-owned rows)
- __mcpClerkUserId — your Clerk user ID

Reads are enforced to your rows: ctx.db.get returns null for others' documents, and query results are filtered to yours. Prefer indexes on userId. Example:
"const pages = await ctx.db.query('pages').withIndex('by_user_id', q => q.eq('userId', __mcpUserId)).collect(); return pages.length;"`,
  },
  execute: async (op, { principal: clerkUserId, ctx }) => {
    if (op.kind === "list_tables") return ctx.runAction(internal.mcp.nodeActions.listTables, {});
    const userId = await resolveUserId(ctx, clerkUserId);
    switch (op.kind) {
      case "query_table": {
        const page = await ctx.runQuery(internal.mcp.queries.queryTable, {
          userId, clerkUserId, table: op.table, order: op.order, limit: op.limit,
        });
        return { page, isDone: true, count: page.length };
      }
      case "count_table":
        return { table: op.table, count: await ctx.runQuery(internal.mcp.queries.countTable, { userId, clerkUserId, table: op.table }) };
      case "get_document":
        return { document: await ctx.runQuery(internal.mcp.queries.getDocument, { userId, clerkUserId, id: op.id }) };
    }
  },
  runQuery: async ({ code }, { principal: clerkUserId, ctx }) => {
    const userId = await resolveUserId(ctx, clerkUserId);
    const result = await ctx.runAction(internal.mcp.nodeActions.runTestQuery, { clerkUserId, userId, code });
    if (!result.ok) return errorResult(result.error);
    return textResult({ result: result.value, logLines: result.logLines });
  },
});

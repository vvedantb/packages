/**
 * A tiny client for a Convex deployment's admin HTTP API, used by each app's
 * MCP "run query" tool. It takes the deployment's cloud URL and an admin (or
 * deploy) key as arguments and reads no environment variables, so the app owns
 * where those come from (its own `*_DEPLOY_KEY` env var, a bootstrap fetch, a
 * cache). No `convex` or `zod` import: the responses are parsed at the boundary
 * here, the same way `expoPush` and `clerkBilling` parse theirs.
 *
 * - `runTestFunction` POSTs a bundled query source to `/api/run_test_function`
 *   with the admin key in the body. This is how `run_query` MCP tools execute
 *   ad-hoc read-only queries against the deployment.
 * - `listTables` reads `/api/shapes2` (inferred shapes) and the
 *   `_system/frontend/getSchemas` query (the declared schema) and merges them.
 *
 * `formatConvexQueryError` (in `convexQueryLimits`) turns a thrown resource
 * limit message into user-facing MCP error text.
 */

/** A JSON value, as Convex's HTTP API returns it. */
export type ConvexJsonValue =
  | string
  | number
  | boolean
  | null
  | ConvexJsonValue[]
  | { [key: string]: ConvexJsonValue };

/** The result of a successful `run_test_function` call. */
export type ConvexTestFunctionResult = {
  value: ConvexJsonValue;
  logLines: string[];
};

/** One table, merging its declared schema and inferred shape (either may be `null`). */
export type ConvexTableInfo = {
  name: string;
  declaredSchema: ConvexJsonValue | null;
  inferredShape: ConvexJsonValue | null;
};

export type ConvexAdminClientConfig = {
  /** The deployment's `.convex.cloud` URL, with no trailing slash. */
  cloudUrl: string;
  /** The admin or deploy key. Sent in the body of `run_test_function` and as the `Convex` auth header elsewhere. */
  adminKey: string;
  /** The `fetch` to use. Defaults to `globalThis.fetch`. */
  fetch?: typeof globalThis.fetch;
};

export type RunTestFunctionOptions = {
  /** Args passed to the bundled function. Default `{}`. */
  args?: Record<string, ConvexJsonValue>;
  /**
   * The bundle path reported to Convex. Default `"testQuery.js"`. Only affects
   * stack traces in error messages.
   */
  path?: string;
};

export type ListTablesOptions = {
  /**
   * Return `true` to leave a table out of the result. Default: hide nothing.
   * Apps pass their own predicate (for example hiding `_`-prefixed system
   * tables, or an app's internal tables).
   */
  hideTable?: (name: string) => boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The `.convex.cloud` URL for a `.convex.site` URL. Only a hosted URL has the
 * substring to replace; a self-hosted `host:port` site URL is returned
 * unchanged (and such a deployment should pass its cloud URL directly).
 */
export function convexSiteToCloudUrl(siteUrl: string): string {
  return siteUrl.replace(".convex.site", ".convex.cloud");
}

/**
 * Parse a Convex HTTP API response of the `{ status, ... }` shape. Throws
 * `Error(errorMessage)` on an error status, so callers can map the message
 * (for example through `formatConvexQueryError`).
 */
export function parseConvexApiResponse(json: unknown): ConvexTestFunctionResult {
  if (!isRecord(json)) {
    throw new Error("Unexpected Convex response: not an object");
  }
  if (json.status === "error") {
    const message = typeof json.errorMessage === "string" ? json.errorMessage : "Convex error";
    throw new Error(message);
  }
  if (json.status !== "success") {
    throw new Error(`Unexpected Convex response status: ${String(json.status)}`);
  }
  const logLines =
    Array.isArray(json.logLines) && json.logLines.every((line) => typeof line === "string")
      ? json.logLines
      : [];
  return { value: json.value as ConvexJsonValue, logLines };
}

function wrapTestQuerySource(source: string): string {
  return source;
}

/** Build a client bound to one deployment's cloud URL and admin key. */
export function createConvexAdminClient(config: ConvexAdminClientConfig) {
  const doFetch = config.fetch ?? globalThis.fetch;
  const base = config.cloudUrl.replace(/\/$/, "");

  function convexAuthHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Convex ${config.adminKey}`,
    };
  }

  async function post(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
    const response = await doFetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    return response.json();
  }

  /**
   * Run a bundled query source through `/api/run_test_function`. `source` is a
   * complete Convex module whose default export is a query (the MCP tools wrap
   * the user's code in such a module). Returns the query's value and log lines;
   * throws `Error(errorMessage)` when the query errors.
   */
  async function runTestFunction(
    source: string,
    options: RunTestFunctionOptions = {},
  ): Promise<ConvexTestFunctionResult> {
    const json = await post(
      `${base}/api/run_test_function`,
      { "Content-Type": "application/json" },
      {
        adminKey: config.adminKey,
        args: options.args ?? {},
        bundle: { path: options.path ?? "testQuery.js", source: wrapTestQuerySource(source) },
        format: "convex_encoded_json",
      },
    );
    return parseConvexApiResponse(json);
  }

  /**
   * Run one deployment function through `/api/query` with the admin auth
   * header. Used for `_system` queries like `getSchemas`; returns the value.
   */
  async function runSystemQuery(
    path: string,
    args: Record<string, ConvexJsonValue> = {},
  ): Promise<ConvexJsonValue> {
    const json = await post(`${base}/api/query`, convexAuthHeaders(), { path, args, format: "json" });
    return parseConvexApiResponse(json).value;
  }

  /** The inferred shapes map from `/api/shapes2`, keyed by table name. */
  async function getShapes(): Promise<Record<string, ConvexJsonValue>> {
    const response = await doFetch(`${base}/api/shapes2`, { headers: convexAuthHeaders() });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const json: unknown = await response.json();
    if (!isRecord(json)) return {};
    const shapes: Record<string, ConvexJsonValue> = {};
    for (const [name, shape] of Object.entries(json)) {
      shapes[name] = shape as ConvexJsonValue;
    }
    return shapes;
  }

  function declaredSchemaByTable(active: unknown): Record<string, ConvexJsonValue> {
    if (typeof active !== "string") return {};
    let parsed: unknown;
    try {
      parsed = JSON.parse(active);
    } catch {
      return {};
    }
    if (!isRecord(parsed) || !Array.isArray(parsed.tables)) return {};
    const byTable: Record<string, ConvexJsonValue> = {};
    for (const table of parsed.tables) {
      if (isRecord(table) && typeof table.tableName === "string") {
        byTable[table.tableName] = table as ConvexJsonValue;
      }
    }
    return byTable;
  }

  /**
   * Merge the inferred shapes (`/api/shapes2`) and the declared schema
   * (`_system/frontend/getSchemas`) into one sorted list of tables. Each table
   * carries both, either of which may be `null`. Pass `hideTable` to drop
   * tables (system tables, app internals).
   */
  async function listTables(options: ListTablesOptions = {}): Promise<ConvexTableInfo[]> {
    const shapes = await getShapes();
    const schemas = await runSystemQuery("_system/frontend/getSchemas");
    const active = isRecord(schemas) ? schemas.active : null;
    const declared = declaredSchemaByTable(active);

    const names = new Set([...Object.keys(shapes), ...Object.keys(declared)]);
    const hideTable = options.hideTable ?? (() => false);
    return Array.from(names)
      .sort()
      .filter((name) => !hideTable(name))
      .map((name) => ({
        name,
        declaredSchema: declared[name] ?? null,
        inferredShape: shapes[name] ?? null,
      }));
  }

  return { runTestFunction, runSystemQuery, getShapes, listTables };
}

export type ConvexAdminClient = ReturnType<typeof createConvexAdminClient>;

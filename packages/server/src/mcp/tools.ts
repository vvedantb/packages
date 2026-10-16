import { errorMessage, type JsonInput, type JsonObject, type JsonValue } from "./json.js";
import { JSON_RPC_ERROR } from "./jsonRpc.js";

export type ToolContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string }
  | { type: "audio"; data: string; mimeType: string };

/** An MCP `tools/call` result. */
export type ToolResult = {
  content: ToolContent[];
  isError?: boolean;
  structuredContent?: { [key: string]: JsonInput };
};

/** `{ content: [{ type: "text", text }] }` (app-d `textResult`). */
export function toolTextResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

/** Pretty JSON text, `JSON.stringify(data, null, 2)` (app-b and app-c `textResult`). */
export function toolJsonResult(data: JsonInput): ToolResult {
  return toolTextResult(JSON.stringify(data, null, 2));
}

/** `{ content: [{ type: "text", text: message }], isError: true }` (every app's `errorResult`). */
export function toolErrorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/**
 * Run `fn` and return its value as pretty JSON, or its error as an error
 * result. `errorLabel` prefixes the message (app-a: "Files get failed: ...").
 * A value with no JSON form becomes "Result is not JSON" (app-d `jsonTool`).
 */
export async function runTool(
  fn: () => Promise<JsonInput | undefined>,
  options: { errorLabel?: string } = {},
): Promise<ToolResult> {
  const label = (message: string) =>
    options.errorLabel ? `${options.errorLabel}: ${message}` : message;
  try {
    const text = JSON.stringify(await fn(), null, 2);
    // JSON.stringify returns undefined for undefined, functions and symbols.
    if (typeof text !== "string") return toolErrorResult(label("Result is not JSON"));
    return toolTextResult(text);
  } catch (err) {
    return toolErrorResult(label(err instanceof Error ? err.message : "Tool failed"));
  }
}

/** MCP tool annotations (hints only). */
export type ToolAnnotations = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
};

type Issue = { path: ReadonlyArray<PropertyKey>; message: string };

/**
 * The part of a zod schema (3.25+ or 4) the kit uses. The kit never imports
 * zod; any object with this shape works.
 */
export type ZodLikeSchema<Out> = {
  safeParse(data: JsonValue): { success: true; data: Out } | { success: false; error: { issues: ReadonlyArray<Issue> } };
  /** Present on zod 4 schemas. Used for `tools/list` when no converter is given. */
  toJSONSchema?(params: { target: "draft-7"; io: "input" }): object;
};

/** A raw JSON Schema object (`{ type: "object", properties: {...} }`). Args are not validated unless `parseArgs` is given. */
export type JsonSchemaObject = { type: "object"; properties?: object; required?: readonly string[] } & object;

/**
 * Turn a zod schema into JSON Schema for `tools/list`. Needed for zod 3,
 * whose schemas have no `toJSONSchema()`:
 * `(schema) => (schema instanceof ZodType ? zodToJsonSchema(schema) : {})`.
 */
export type JsonSchemaConverter = (schema: ZodLikeSchema<object>) => object;

/** What a tool handler receives besides its arguments. */
export type ToolContext<Principal, Ctx, Scope extends string = string> = {
  principal: Principal;
  ctx: Ctx;
  scope: Scope | undefined;
};

type ToolMeta<Scope extends string> = {
  name: string;
  title?: string;
  /** A string, or a function of the scope (app-a: personal vs team wording). */
  description: string | ((scope: Scope | undefined) => string);
  annotations?: ToolAnnotations;
  /** Scopes the tool is listed and callable on. Omit for all (app-a `scopes`). */
  scopes?: readonly Scope[];
};

export type ZodToolDefinition<Args extends object, Principal, Ctx, Scope extends string> = ToolMeta<Scope> & {
  inputSchema: ZodLikeSchema<Args>;
  /** JSON Schema for `tools/list`. Overrides any converter. */
  jsonSchema?: object;
  handler: (args: Args, context: ToolContext<Principal, Ctx, Scope>) => Promise<ToolResult>;
};

export type JsonSchemaToolDefinition<Args extends object, Principal, Ctx, Scope extends string> = ToolMeta<Scope> & {
  inputSchema: JsonSchemaObject;
  /** Validate and normalise raw arguments. Throw to reject; the message becomes the validation error. */
  parseArgs: (args: JsonObject) => Args;
  handler: (args: Args, context: ToolContext<Principal, Ctx, Scope>) => Promise<ToolResult>;
};

/** A defined tool. Arguments are validated inside `call`. */
export type McpTool<Principal, Ctx, Scope extends string = string> = {
  readonly name: string;
  readonly title?: string;
  readonly description: string | ((scope: Scope | undefined) => string);
  readonly annotations?: ToolAnnotations;
  /** Scopes the tool is on (typed as `Scope[]` in `defineTool`; plain strings here so unscoped tools fit any registry). */
  readonly scopes?: readonly string[];
  /** JSON Schema for `tools/list`. */
  inputJsonSchema(convert?: JsonSchemaConverter): object;
  /**
   * Validate `args`, run the handler, and shape errors like the MCP SDK:
   * invalid args become an `isError` result starting
   * "MCP error -32602: Input validation error: Invalid arguments for tool <name>: ",
   * a thrown error becomes an `isError` result with its message.
   */
  call(args: JsonObject, context: ToolContext<Principal, Ctx, Scope>): Promise<ToolResult>;
};

function dotPath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) return "object root";
  return path.reduce<string>((acc, seg, index) => {
    if (index === 0) return String(seg);
    if (typeof seg === "number") return `${acc}[${seg}]`;
    return `${acc}.${String(seg)}`;
  }, "");
}

/** Format zod issues like MCP SDK 1.30+: "<message> at <path>", one per line. */
export function formatIssues(issues: ReadonlyArray<Issue>): string {
  return issues
    .map((issue) => (issue.path.length ? `${issue.message} at ${dotPath(issue.path)}` : issue.message))
    .join("\n");
}

export function invalidArgumentsResult(toolName: string, detail: string): ToolResult {
  return toolErrorResult(
    `MCP error ${JSON_RPC_ERROR.invalidParams}: Input validation error: Invalid arguments for tool ${toolName}: ${detail}`,
  );
}

type ParsedArgs<Args> = { ok: true; args: Args } | { ok: false; detail: string };

function isZodTool<Args extends object, Principal, Ctx, Scope extends string>(
  definition: ZodToolDefinition<Args, Principal, Ctx, Scope> | JsonSchemaToolDefinition<Args, Principal, Ctx, Scope>,
): definition is ZodToolDefinition<Args, Principal, Ctx, Scope> {
  return "safeParse" in definition.inputSchema;
}

/**
 * Define a tool with a zod object schema (3.25+ or 4) or a raw JSON Schema
 * plus `parseArgs`. Type the handler's second parameter to fix
 * `Principal` and `Ctx`:
 *
 * ```ts
 * defineTool({
 *   name: "search",
 *   description: "Search your notes.",
 *   inputSchema: z.object({ query: z.string() }),
 *   handler: async ({ query }, { principal, ctx }: ToolContext<Principal, ActionCtx>) =>
 *     toolJsonResult(await ctx.runQuery(internal.search, { userId: principal.userId, query })),
 * });
 * ```
 */
export function defineTool<Args extends object, Principal, Ctx, Scope extends string = string>(
  definition:
    | ZodToolDefinition<Args, Principal, Ctx, Scope>
    | JsonSchemaToolDefinition<Args, Principal, Ctx, Scope>,
): McpTool<Principal, Ctx, Scope> {
  if (!definition.name) throw new Error("MCP tool name must not be empty");

  const parse = (raw: JsonObject): ParsedArgs<Args> => {
    if (isZodTool(definition)) {
      const result = definition.inputSchema.safeParse(raw);
      return result.success
        ? { ok: true, args: result.data }
        : { ok: false, detail: formatIssues(result.error.issues) };
    }
    try {
      return { ok: true, args: definition.parseArgs(raw) };
    } catch (err) {
      return { ok: false, detail: errorMessage(err) };
    }
  };

  return {
    name: definition.name,
    title: definition.title,
    description: definition.description,
    annotations: definition.annotations,
    scopes: definition.scopes,
    inputJsonSchema(convert) {
      if (!isZodTool(definition)) return definition.inputSchema;
      if (definition.jsonSchema) return definition.jsonSchema;
      if (convert) return convert(definition.inputSchema);
      if (definition.inputSchema.toJSONSchema) {
        return definition.inputSchema.toJSONSchema({ target: "draft-7", io: "input" });
      }
      throw new Error(
        `MCP tool ${definition.name}: schema has no toJSONSchema(); pass jsonSchema or a toJsonSchema converter (zod 3)`,
      );
    },
    async call(args, context) {
      const parsed = parse(args);
      if (!parsed.ok) return invalidArgumentsResult(definition.name, parsed.detail);
      try {
        return await definition.handler(parsed.args, context);
      } catch (err) {
        return toolErrorResult(errorMessage(err));
      }
    },
  };
}

/** A `tools/list` entry. */
export type ToolListEntry = {
  name: string;
  title?: string;
  description: string;
  inputSchema: object;
  annotations?: ToolAnnotations;
};

function availableIn(tool: { scopes?: readonly string[] }, scope: string | undefined): boolean {
  return !tool.scopes || (scope !== undefined && tool.scopes.includes(scope));
}

/** Throw when two tools share a name. */
export function assertUniqueToolNames(tools: ReadonlyArray<{ name: string }>): void {
  const seen = new Set<string>();
  for (const tool of tools) {
    if (seen.has(tool.name)) throw new Error(`Duplicate MCP tool name: ${tool.name}`);
    seen.add(tool.name);
  }
}

export type ToolsToListOptions<Scope extends string> = {
  /** Keep only tools available on this scope. Tools without `scopes` are always kept. */
  scope?: Scope;
  /** zod to JSON Schema converter for schemas without `toJSONSchema()` (zod 3). */
  toJsonSchema?: JsonSchemaConverter;
};

/** Build the `tools/list` result array, in definition order. */
export function toolsToList<Principal, Ctx, Scope extends string>(
  tools: ReadonlyArray<McpTool<Principal, Ctx, Scope>>,
  options: ToolsToListOptions<Scope> = {},
): ToolListEntry[] {
  return tools
    .filter((tool) => availableIn(tool, options.scope))
    .map((tool) => {
      const entry: ToolListEntry = {
        name: tool.name,
        description: typeof tool.description === "function" ? tool.description(options.scope) : tool.description,
        inputSchema: tool.inputJsonSchema(options.toJsonSchema),
      };
      if (tool.title !== undefined) entry.title = tool.title;
      if (tool.annotations !== undefined) entry.annotations = tool.annotations;
      return entry;
    });
}

export type ToolRegistry<Principal, Ctx, Scope extends string> = {
  readonly tools: ReadonlyArray<McpTool<Principal, Ctx, Scope>>;
  /** Tools on a scope (all tools without `scopes`, plus those listing it). */
  forScope(scope: Scope | undefined): ReadonlyArray<McpTool<Principal, Ctx, Scope>>;
  /** Names on a scope, for `assertMcpTools` from server/convex. */
  names(scope?: Scope): string[];
  /** The tool with this name on this scope, or `undefined`. */
  find(name: string, scope: Scope | undefined): McpTool<Principal, Ctx, Scope> | undefined;
  list(options?: ToolsToListOptions<Scope>): ToolListEntry[];
};

/** A tool list with a name-uniqueness check (throws at creation) and scope filtering. */
export function createToolRegistry<Principal, Ctx, Scope extends string = string>(
  tools: ReadonlyArray<McpTool<Principal, Ctx, Scope>>,
): ToolRegistry<Principal, Ctx, Scope> {
  assertUniqueToolNames(tools);
  const forScope = (scope: Scope | undefined) => tools.filter((tool) => availableIn(tool, scope));
  return {
    tools,
    forScope,
    names: (scope) => forScope(scope).map((tool) => tool.name),
    find: (name, scope) => forScope(scope).find((tool) => tool.name === name),
    list: (options) => toolsToList(tools, options),
  };
}

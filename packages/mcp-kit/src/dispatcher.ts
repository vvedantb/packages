import type { McpServerInfo } from "@vvedantb/convex-kit";
import type { HandleRpcArgs } from "./http.js";
import { isJsonObject, type JsonObject, type JsonValue } from "./json.js";
import {
  JSON_RPC_ERROR,
  negotiateProtocolVersion,
  rpcError,
  rpcResult,
  type JsonRpcFailure,
  type JsonRpcId,
  type JsonRpcSuccess,
  type ProtocolVersionOptions,
  type RpcResult,
} from "./jsonRpc.js";
import {
  createToolRegistry,
  toolErrorResult,
  type JsonSchemaConverter,
  type McpTool,
  type ToolContext,
} from "./tools.js";

export type McpDispatcherConfig<Principal, Ctx, Scope extends string = string> = {
  /** `serverInfo` in the initialize result (convex-kit `defineMcpServerInfo`), or a function of the scope (vmem). */
  serverInfo: McpServerInfo | ((scope: Scope | undefined) => McpServerInfo);
  /** Tools. Names must be unique (checked at creation). */
  tools: ReadonlyArray<McpTool<Principal, Ctx, Scope>>;
  /** Supported protocol versions and fallback. Default: the SDK 1.29 to 1.32 list, fallback "2025-11-25". */
  protocol?: ProtocolVersionOptions;
  /** `capabilities` in the initialize result. Default `{ tools: { listChanged: true } }`, as `McpServer` sends. */
  capabilities?: JsonObject;
  /** `instructions` in the initialize result. Omitted by default. */
  instructions?: string;
  /** zod to JSON Schema converter for zod 3 schemas. */
  toJsonSchema?: JsonSchemaConverter;
};

export type McpDispatcher<Principal, Ctx, Scope extends string = string> = {
  /** Same contract as `createMcpHttpHandler`'s `handleRpc`. */
  handleRpc(args: Pick<HandleRpcArgs<Principal, Ctx, Scope>, "principal" | "json" | "ctx" | "scope">): Promise<RpcResult>;
};

type Message = { id: JsonRpcId | undefined; method: string; params: JsonObject };

function readMessage(value: JsonValue): Message | null {
  if (!isJsonObject(value) || value.jsonrpc !== "2.0" || typeof value.method !== "string") return null;
  const id = value.id;
  if (id !== undefined && id !== null && typeof id !== "string" && typeof id !== "number") return null;
  const params = value.params;
  if (params !== undefined && !isJsonObject(params)) return null;
  return { id, method: value.method, params: params ?? {} };
}

function stringOrUndefined(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * A self-contained MCP JSON-RPC server for stateless HTTP: no SDK, no Node
 * APIs. Handles initialize, ping, tools/list, tools/call, notifications
 * (202, empty body) and batches. Other methods get -32601. Output follows
 * MCP SDK 1.30+ with `enableJsonResponse: true`; see the README for the
 * exact differences.
 */
export function createMcpDispatcher<Principal, Ctx, Scope extends string = string>(
  config: McpDispatcherConfig<Principal, Ctx, Scope>,
): McpDispatcher<Principal, Ctx, Scope> {
  const registry = createToolRegistry(config.tools);
  const capabilities = config.capabilities ?? { tools: { listChanged: true } };

  async function answer(
    message: Message,
    context: ToolContext<Principal, Ctx, Scope>,
  ): Promise<JsonRpcSuccess | JsonRpcFailure> {
    const id = message.id ?? null;
    switch (message.method) {
      case "initialize": {
        const serverInfo =
          typeof config.serverInfo === "function" ? config.serverInfo(context.scope) : config.serverInfo;
        return rpcResult(id, {
          protocolVersion: negotiateProtocolVersion(message.params.protocolVersion, config.protocol),
          capabilities,
          serverInfo,
          ...(config.instructions === undefined ? {} : { instructions: config.instructions }),
        });
      }
      case "ping":
        return rpcResult(id, {});
      case "tools/list":
        return rpcResult(id, {
          tools: registry.list({ scope: context.scope, toJsonSchema: config.toJsonSchema }),
        });
      case "tools/call": {
        const name = stringOrUndefined(message.params.name) ?? "";
        const tool = registry.find(name, context.scope);
        if (!tool) {
          return rpcResult(id, toolErrorResult(`MCP error ${JSON_RPC_ERROR.invalidParams}: Tool ${name} not found`));
        }
        const args = message.params.arguments;
        return rpcResult(id, await tool.call(isJsonObject(args) ? args : {}, context));
      }
      default:
        return rpcError(id, JSON_RPC_ERROR.methodNotFound, "Method not found");
    }
  }

  return {
    async handleRpc({ principal, json, ctx, scope }) {
      const context: ToolContext<Principal, Ctx, Scope> = { principal, ctx, scope };
      const batch = Array.isArray(json);
      const items = batch ? json : [json];
      const messages = items.map(readMessage);
      if (items.length === 0 || messages.some((message) => message === null)) {
        return {
          status: 400,
          body: JSON.stringify({
            jsonrpc: "2.0",
            error: { code: JSON_RPC_ERROR.invalidRequest, message: "Invalid Request" },
            id: null,
          }),
        };
      }
      const responses: Array<JsonRpcSuccess | JsonRpcFailure> = [];
      for (const message of messages) {
        // Notifications (no id) get no response, as in JSON-RPC 2.0.
        if (message && message.id !== undefined) responses.push(await answer(message, context));
      }
      if (responses.length === 0) return { status: 202, body: "" };
      return { status: 200, body: JSON.stringify(batch ? responses : responses[0]) };
    },
  };
}

/** Parse a JSON-RPC body string for `handleRpc`. Returns the SDK's 400 -32700 result on bad JSON. */
export function parseRpcBody(body: string): { ok: true; json: JsonValue } | { ok: false; result: RpcResult } {
  try {
    return { ok: true, json: JSON.parse(body) };
  } catch {
    return {
      ok: false,
      result: {
        status: 400,
        body: JSON.stringify({
          jsonrpc: "2.0",
          error: { code: JSON_RPC_ERROR.parseError, message: "Parse error: Invalid JSON" },
          id: null,
        }),
      },
    };
  }
}

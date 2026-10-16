import type { JsonValue, Thrown } from "./json.js";

export type JsonRpcId = string | number | null;

/** JSON-RPC 2.0 error codes used by MCP. */
export const JSON_RPC_ERROR: {
  readonly parseError: -32700;
  readonly invalidRequest: -32600;
  readonly methodNotFound: -32601;
  readonly invalidParams: -32602;
  readonly internalError: -32603;
} = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
};

/** A JSON-RPC 2.0 success response. */
export type JsonRpcSuccess = { result: JsonValue | object; jsonrpc: "2.0"; id: JsonRpcId };

/** A JSON-RPC 2.0 error response. */
export type JsonRpcFailure = { jsonrpc: "2.0"; id: JsonRpcId; error: { code: number; message: string } };

/**
 * What `handleRpc` returns: an HTTP status and the response body text.
 * Same shape as the apps' `handleMcpRequest` internalAction result.
 */
export type RpcResult = { status: number; body: string };

/**
 * The 500 body the apps' `handleMcpRequest` returns when it throws:
 * `{"jsonrpc":"2.0","error":{"code":-32603,"message":...},"id":null}`.
 * The message is `err.message`, or "Internal server error" for non-Errors.
 */
export function mcpInternalError(err: Thrown): RpcResult {
  const message = err instanceof Error ? err.message : "Internal server error";
  return {
    status: 500,
    body: JSON.stringify({
      jsonrpc: "2.0",
      error: { code: JSON_RPC_ERROR.internalError, message },
      id: null,
    }),
  };
}

/** Success response. Key order matches the MCP SDK: result, jsonrpc, id. */
export function rpcResult(id: JsonRpcId, result: JsonValue | object): JsonRpcSuccess {
  return { result, jsonrpc: "2.0", id };
}

/** Error response. Key order matches the MCP SDK: jsonrpc, id, error. */
export function rpcError(id: JsonRpcId, code: number, message: string): JsonRpcFailure {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Protocol versions the MCP SDK 1.29.0 to 1.32.1 accept (the versions the
 * apps lock today), newest first. `SUPPORTED_PROTOCOL_VERSIONS` in the SDK's
 * `types.js`.
 */
export const SDK_PROTOCOL_VERSIONS: readonly string[] = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
];

export type ProtocolVersionOptions = {
  /** Versions the server accepts. Default `SDK_PROTOCOL_VERSIONS`. */
  versions?: readonly string[];
  /** Answer for an unsupported or missing request. Default `versions[0]`, like the SDK. */
  fallback?: string;
};

/**
 * Echo the client's version when supported, else the fallback. The SDK
 * falls back to its latest version; app-e's gateway falls back to
 * "2025-03-26" (`{ versions: ["2025-06-18", "2025-03-26", "2024-11-05"], fallback: "2025-03-26" }`).
 */
export function negotiateProtocolVersion(
  requested: JsonValue | undefined,
  options: ProtocolVersionOptions = {},
): string {
  const versions = options.versions ?? SDK_PROTOCOL_VERSIONS;
  if (typeof requested === "string" && versions.includes(requested)) {
    return requested;
  }
  const fallback = options.fallback ?? versions[0];
  if (fallback === undefined) {
    throw new Error("negotiateProtocolVersion needs at least one version");
  }
  return fallback;
}

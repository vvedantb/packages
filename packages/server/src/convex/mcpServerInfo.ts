export type McpServerInfo = { name: string; version: string };

/** Build the MCP `serverInfo` object. The caller owns the name and version. */
export function defineMcpServerInfo(options: McpServerInfo): McpServerInfo {
  if (!options.name) throw new Error("MCP server name must not be empty");
  if (!options.version) throw new Error("MCP server version must not be empty");
  return { name: options.name, version: options.version };
}

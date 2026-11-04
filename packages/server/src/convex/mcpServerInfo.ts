/** An icon in MCP `serverInfo.icons` (MCP 2025-11-25 `Implementation.icons`). */
export type McpServerIcon = {
  /** Icon URL, for example an absolute https URL to the app's public icon. */
  src: string;
  mimeType?: string;
  /** For example `["48x48"]` or `["any"]`. */
  sizes?: string[];
  theme?: "light" | "dark";
};

export type McpServerInfo = {
  name: string;
  version: string;
  title?: string;
  websiteUrl?: string;
  icons?: McpServerIcon[];
};

/**
 * Build the MCP `serverInfo` object. The caller owns every value. Optional
 * fields appear only when passed, so `{ name, version }` gives exactly that.
 */
export function defineMcpServerInfo(options: McpServerInfo): McpServerInfo {
  if (!options.name) throw new Error("MCP server name must not be empty");
  if (!options.version) throw new Error("MCP server version must not be empty");
  const info: McpServerInfo = { name: options.name, version: options.version };
  if (options.title !== undefined) info.title = options.title;
  if (options.websiteUrl !== undefined) info.websiteUrl = options.websiteUrl;
  if (options.icons !== undefined) {
    info.icons = options.icons.map((icon, i) => {
      if (!icon.src) throw new Error(`MCP server icon ${i} src must not be empty`);
      return { ...icon };
    });
  }
  return info;
}

#!/usr/bin/env node
// Capture what @modelcontextprotocol/sdk returns for a fixed set of JSON-RPC
// requests, using the same stateless set-up the apps use in nodeActions.ts:
// a fresh McpServer per request, WebStandardStreamableHTTPServerTransport with
// sessionIdGenerator undefined and enableJsonResponse true.
//
// Usage:
//   node scripts/capture-sdk-fixtures.mjs <sdk-package-dir> <server-name> <server-version> <parsed-body:yes|no> <out.json>
//
// The SDK and zod are loaded from <sdk-package-dir>, read-only. Nothing is installed.

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

const [sdkDir, serverName, serverVersion, parsedBodyArg, outFile] =
  process.argv.slice(2);
if (!sdkDir || !serverName || !serverVersion || !parsedBodyArg || !outFile) {
  console.error(
    "usage: capture-sdk-fixtures.mjs <sdk-dir> <name> <version> <yes|no> <out.json>",
  );
  process.exit(1);
}

const sdkPkg = JSON.parse(
  (await import("node:fs")).readFileSync(join(sdkDir, "package.json"), "utf8"),
);
const requireFromSdk = createRequire(join(sdkDir, "package.json"));
const zodEntry = requireFromSdk.resolve("zod");
const zodPkgDir = zodEntry.slice(0, zodEntry.lastIndexOf("/node_modules/zod/") + "/node_modules/zod/".length);
const zodPkg = JSON.parse(
  (await import("node:fs")).readFileSync(join(zodPkgDir, "package.json"), "utf8"),
);
const { z } = await import(pathToFileURL(zodEntry).href);
const { McpServer } = await import(
  pathToFileURL(join(sdkDir, "dist/esm/server/mcp.js")).href
);
const { WebStandardStreamableHTTPServerTransport } = await import(
  pathToFileURL(join(sdkDir, "dist/esm/server/webStandardStreamableHttp.js"))
    .href
);

const passParsedBody = parsedBodyArg === "yes";

function buildServer() {
  const server = new McpServer({ name: serverName, version: serverVersion });
  server.registerTool(
    "echo",
    {
      description: "Echo the text back.",
      inputSchema: { text: z.string().describe("Text to echo") },
      annotations: { readOnlyHint: true },
    },
    async ({ text }) => ({ content: [{ type: "text", text }] }),
  );
  server.registerTool(
    "fails",
    { description: "Always throws.", inputSchema: {} },
    async () => {
      throw new Error("boom");
    },
  );
  return server;
}

async function run(body) {
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const req = new Request("http://localhost/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body,
  });
  let response;
  if (passParsedBody) {
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return { status: "n/a (JSON.parse throws before the transport)", body: null };
    }
    response = await transport.handleRequest(req, { parsedBody });
  } else {
    response = await transport.handleRequest(req);
  }
  return { status: response.status, body: await response.text() };
}

const requests = {
  initialize: {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "fixture-client", version: "1.0.0" },
    },
  },
  initializeLatest: {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "fixture-client", version: "1.0.0" },
    },
  },
  initializeUnsupportedVersion: {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "1999-01-01",
      capabilities: {},
      clientInfo: { name: "fixture-client", version: "1.0.0" },
    },
  },
  initialized: { jsonrpc: "2.0", method: "notifications/initialized" },
  ping: { jsonrpc: "2.0", id: 2, method: "ping" },
  toolsList: { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} },
  toolsCallOk: {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "echo", arguments: { text: "hi" } },
  },
  toolsCallThrows: {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "fails", arguments: {} },
  },
  toolsCallInvalidArgs: {
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: { name: "echo", arguments: { text: 42 } },
  },
  toolsCallUnknown: {
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: { name: "nope", arguments: {} },
  },
  resourcesList: { jsonrpc: "2.0", id: 8, method: "resources/list" },
  unknownMethod: { jsonrpc: "2.0", id: 9, method: "foo/bar" },
  invalidRequest: { jsonrpc: "2.0", id: 10 },
  batch: [
    { jsonrpc: "2.0", id: 11, method: "ping" },
    { jsonrpc: "2.0", id: 12, method: "ping" },
  ],
};

const exchanges = {};
for (const [name, request] of Object.entries(requests)) {
  const body = JSON.stringify(request);
  exchanges[name] = { request: body, response: await run(body) };
}
exchanges.parseError = {
  request: "{not json",
  response: await run("{not json"),
};

const out = {
  $source: `Captured from @modelcontextprotocol/sdk ${sdkPkg.version} (zod ${zodPkg.version}) by packages/mcp-kit/scripts/capture-sdk-fixtures.mjs; stateless transport, enableJsonResponse true, parsedBody ${passParsedBody ? "passed" : "not passed"}.`,
  sdkVersion: sdkPkg.version,
  zodVersion: zodPkg.version,
  serverInfo: { name: serverName, version: serverVersion },
  exchanges,
};
writeFileSync(outFile, `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote ${outFile}`);

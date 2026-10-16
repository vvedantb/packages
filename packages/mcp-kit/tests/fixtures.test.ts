// Replays realistic JSON-RPC exchanges per app (tests/fixtures/<app>.json)
// through that app's kit config (tests/fixtures/apps/<app>.kit.ts).
//
// Mode A, "SDK path": handleMcpRequest returns what the app's MCP SDK version
// returned for the same body (tests/fixtures/sdk/<app>.sdk.json, captured by
// scripts/capture-sdk-fixtures.mjs). This is today's architecture.
// Mode B, "pure dispatcher": handleMcpRequest runs createMcpDispatcher with
// the same tools instead, and must give the same HTTP response.
// "synthesised" exchanges come from native.ts, not from the SDK.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { must } from "./helpers.js";
import { z } from "zod";
import {
  createMcpDispatcher,
  defineTool,
  parseRpcBody,
  toolTextResult,
  type HeaderMap,
  type JsonValue,
  type RpcResult,
} from "../src/index.js";
import type { AppCtx, Handler } from "./fixtures/apps/types.js";
import * as appAKit from "./fixtures/apps/app-a.kit.js";
import * as appBKit from "./fixtures/apps/app-b.kit.js";
import * as appCKit from "./fixtures/apps/app-c.kit.js";
import * as appDKit from "./fixtures/apps/app-d.kit.js";

const ORIGIN = "https://happy-otter-123.convex.site";

type Exchange = {
  name: string;
  origin: string;
  token: string | null;
  method: string;
  request?: JsonValue;
  sdkExchange?: string;
  expect?: { status: number; body: string; wwwAuthenticate?: string };
};
type AppFixture = {
  $source: string;
  sdkCapture: string;
  bodyMode: "json" | "text";
  cors: HeaderMap;
  endpoints: Array<{ path: string; handler: string; serverInfo: { name: string; version: string }; exchanges: Exchange[] }>;
};
type SdkCapture = { exchanges: Record<string, { response: { status: number; body: string } }> };

const readJson = (path: string) => JSON.parse(readFileSync(new URL(`./fixtures/${path}`, import.meta.url), "utf8"));

/** app-b: Clerk verifies the token; isPro comes from the JWT payload claims. */
function appBVerifier(token: string): { clerkUserId: string; isPro: boolean } | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return { clerkUserId: claims.sub, isPro: String(claims.pla ?? "").includes("pro") };
}

/** Stand-ins for each app's verifyAccessToken. The real checks stay in the apps. */
const VERIFIERS: Record<string, (token: string) => object | null> = {
  "app-a": (token) => (token === "good" ? { clerkUserId: "user_1" } : null),
  "app-c": (token) => (token === "good" ? { clerkUserId: "user_1" } : null),
  "app-b": (token) => appBVerifier(token),
  // app-d: legacy app-d-issued JWTs (here "legacy:<sub>") first, else Clerk.
  "app-d": (token) => {
    if (token.startsWith("legacy:")) return { clerkUserId: token.slice("legacy:".length) };
    return token === "oat_clerk_token" ? { clerkUserId: "user_clerk_alice" } : null;
  },
};

const HANDLERS: Record<string, Record<string, Handler<object, object>>> = {
  "app-a": { mcpHandler: appAKit.mcpHandler, mcpTeamHandler: appAKit.mcpTeamHandler },
  "app-b": { mcpHandler: appBKit.mcpHandler },
  "app-c": { mcpHandler: appCKit.mcpHandler },
  "app-d": { mcpHandler: appDKit.mcpHandler },
};

/** The pure-dispatcher version of the capture script's tools. */
function dispatcherFor(serverInfo: { name: string; version: string }) {
  return createMcpDispatcher<object, object>({
    serverInfo,
    tools: [
      defineTool({
        name: "echo",
        description: "Echo the text back.",
        inputSchema: z.object({ text: z.string().describe("Text to echo") }),
        annotations: { readOnlyHint: true },
        handler: async ({ text }) => toolTextResult(text),
      }),
      defineTool({
        name: "fails",
        description: "Always throws.",
        inputSchema: z.object({}),
        handler: async () => {
          throw new Error("boom");
        },
      }),
    ],
  });
}

function requestFor(path: string, exchange: Exchange): Request {
  const headers = new Headers({ "Content-Type": "application/json", Accept: "application/json, text/event-stream" });
  if (exchange.token) headers.set("Authorization", `Bearer ${exchange.token}`);
  const body =
    exchange.method !== "POST"
      ? undefined
      : typeof exchange.request === "string"
        ? exchange.request
        : JSON.stringify(exchange.request, null, 2);
  return new Request(`${ORIGIN}${path}`, { method: exchange.method, headers, body });
}

describe.each(["app-a", "app-b", "app-c", "app-d"])("%s fixtures", (app) => {
  const fixture: AppFixture = readJson(`${app}.json`);
  const sdk: SdkCapture = readJson(fixture.sdkCapture);
  const verify = must(VERIFIERS[app]);

  describe.each(fixture.endpoints)("$path", (endpoint) => {
    const handler = must(must(HANDLERS[app])[endpoint.handler]);

    async function replay(exchange: Exchange, mode: "sdk" | "dispatcher") {
      const forwarded: Array<{ args: object; body: string }> = [];
      const ctx: AppCtx<object, { body: string }> = {
        deps: {
          verifyAccessToken: async ({ token }) => verify(token),
          async handleMcpRequest(args): Promise<RpcResult> {
            forwarded.push({ args, body: args.body });
            if (mode === "dispatcher") {
              const parsed = parseRpcBody(args.body);
              if (!parsed.ok) return parsed.result;
              return dispatcherFor(endpoint.serverInfo).handleRpc({
                principal: args,
                ctx: {},
                scope: undefined,
                json: parsed.json,
              });
            }
            const captured = sdk.exchanges[exchange.sdkExchange ?? ""]?.response;
            if (!captured) throw new Error(`no SDK capture for ${exchange.name}`);
            return {
              status: captured.status,
              // The capture used one serverInfo per app; app-a team renames it, as mcpServerInfo("team") does.
              body: captured.body.replace(/"serverInfo":\{[^}]*\}/, `"serverInfo":${JSON.stringify(endpoint.serverInfo)}`),
            };
          },
        },
      };
      const res = await handler(ctx, requestFor(endpoint.path, exchange));
      return {
        status: res.status,
        headers: Object.fromEntries(res.headers),
        body: await res.text(),
        forwarded,
      };
    }

    const sdkExchanges = endpoint.exchanges.filter((e) => e.sdkExchange);
    const synthesised = endpoint.exchanges.filter((e) => !e.sdkExchange);

    it.each(sdkExchanges)("SDK path: $name", async (exchange) => {
      const result = await replay(exchange, "sdk");
      const captured = must(sdk.exchanges[must(exchange.sdkExchange)]).response;
      expect(result.status).toBe(captured.status);
      expect(result.headers).toEqual({ "content-type": "application/json", ...fixture.cors });
      if (endpoint.path === "/mcp") expect(result.body).toBe(captured.body);
      // json mode re-encodes the pretty request; text mode (app-d) forwards it untouched.
      const sent = JSON.stringify(exchange.request, null, 2);
      expect(result.forwarded.map((f) => f.body)).toEqual([
        fixture.bodyMode === "text" ? sent : JSON.stringify(exchange.request),
      ]);
      expect(result.forwarded[0]?.args).toMatchObject({ clerkUserId: expect.any(String) });
    });

    it.each(sdkExchanges.filter((e) => e.sdkExchange !== "toolsList"))(
      "pure dispatcher gives the same HTTP response: $name",
      async (exchange) => {
        const viaSdk = await replay(exchange, "sdk");
        const viaDispatcher = await replay(exchange, "dispatcher");
        // app-a's SDK 1.29.0 formats validation errors differently; none of these exchanges hit that path.
        expect(viaDispatcher).toEqual(viaSdk);
      },
    );

    it.each(synthesised)("HTTP layer: $name", async (exchange) => {
      const result = await replay(exchange, "sdk");
      const expected = must(exchange.expect);
      expect(result.status).toBe(expected.status);
      expect(result.body).toBe(expected.body);
      expect(result.headers).toEqual({
        "content-type": "application/json",
        ...fixture.cors,
        ...(expected.wwwAuthenticate ? { "www-authenticate": `Bearer resource_metadata="${expected.wwwAuthenticate}"` } : {}),
      });
      expect(result.forwarded).toEqual([]);
    });
  });
});

describe("app-specific principal data", () => {
  it("app-b passes isPro from the token claims", async () => {
    const fixture: AppFixture = readJson("app-b.json");
    const exchange = must(must(fixture.endpoints[0]).exchanges[0]);
    const seen: object[] = [];
    await appBKit.mcpHandler(
      {
        deps: {
          verifyAccessToken: async ({ token }) => appBVerifier(token),
          handleMcpRequest: async (args) => {
            seen.push(args);
            return { status: 200, body: "{}" };
          },
        },
      },
      requestFor("/mcp", exchange),
    );
    expect(seen).toMatchObject([{ clerkUserId: "user_pro", isPro: true }]);
  });

  it("app-d accepts a legacy token through the same path", async () => {
    const fixture: AppFixture = readJson("app-d.json");
    const legacy = must(fixture.endpoints[0]).exchanges.find((e) => e.token?.startsWith("legacy:"));
    expect(legacy?.sdkExchange).toBe("toolsList");
  });
});

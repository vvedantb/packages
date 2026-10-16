// Differential tests: each app's current native.ts (ported verbatim under
// tests/fixtures/apps/*.reference.ts) against the same endpoints rebuilt on
// the kit (tests/fixtures/apps/*.kit.ts). Same request, same env, same fake
// verifier and RPC result: status, every header and the body must match, and
// so must console.error calls and the arguments passed to handleMcpRequest.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { must } from "./helpers.js";
import type { RpcResult } from "../../src/mcp/index.js";
import type { AppCtx, Handler } from "./fixtures/apps/types.js";
import * as appARef from "./fixtures/apps/app-a.reference.js";
import * as appAKit from "./fixtures/apps/app-a.kit.js";
import * as appBRef from "./fixtures/apps/app-b.reference.js";
import * as appBKit from "./fixtures/apps/app-b.kit.js";
import * as appCRef from "./fixtures/apps/app-c.reference.js";
import * as appCKit from "./fixtures/apps/app-c.kit.js";
import * as appDRef from "./fixtures/apps/app-d.reference.js";
import * as appDKit from "./fixtures/apps/app-d.kit.js";

const ORIGIN = "https://happy-otter-123.convex.site";
const CLERK = "https://clerk.example.test";
const WEB = "https://app.example.test";

type Snapshot = {
  status: number | "threw";
  headers: Record<string, string>;
  body: string;
  rpcArgs: string[];
  logs: string[];
};

type Scenario = {
  name: string;
  method: string;
  token?: string | null;
  authorization?: string;
  body?: string;
  rpc?: RpcResult;
};

const INITIALIZE = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } },
});

const SCENARIOS: Scenario[] = [
  { name: "no Authorization header", method: "POST", body: INITIALIZE },
  { name: "non-bearer Authorization", method: "POST", authorization: "Basic abc", body: INITIALIZE },
  { name: "bearer with extra parts", method: "POST", authorization: "Bearer a b", body: INITIALIZE },
  { name: "token rejected", method: "POST", token: "bad", body: INITIALIZE },
  { name: "GET with valid token", method: "GET", token: "good" },
  { name: "DELETE with valid token", method: "DELETE", token: "good" },
  { name: "GET without token", method: "GET" },
  { name: "invalid JSON", method: "POST", token: "good", body: "{not json" },
  { name: "empty body", method: "POST", token: "good", body: "" },
  {
    name: "initialize",
    method: "POST",
    token: "good",
    body: INITIALIZE,
    rpc: { status: 200, body: '{"result":{},"jsonrpc":"2.0","id":1}' },
  },
  {
    name: "whitespace in body (re-encoded vs raw)",
    method: "POST",
    token: "good",
    body: '{ "jsonrpc": "2.0",\n  "id": 2, "method": "ping" }',
    rpc: { status: 200, body: '{"result":{},"jsonrpc":"2.0","id":2}' },
  },
  {
    name: "notification (202, empty body)",
    method: "POST",
    token: "good",
    body: '{"jsonrpc":"2.0","method":"notifications/initialized"}',
    rpc: { status: 202, body: "" },
  },
  {
    name: "handleMcpRequest internal error",
    method: "POST",
    token: "good",
    body: INITIALIZE,
    rpc: {
      status: 500,
      body: '{"jsonrpc":"2.0","error":{"code":-32603,"message":"boom"},"id":null}',
    },
  },
  { name: "verifier throws", method: "POST", token: "throw", body: INITIALIZE },
];

function makeCtx<C>(credentials: C, scenario: Scenario, rpcArgs: string[]): AppCtx<C, object> {
  return {
    deps: {
      async verifyAccessToken({ token }) {
        if (token === "throw") throw new Error("runAction failed");
        return token === "good" ? credentials : null;
      },
      async handleMcpRequest(args) {
        rpcArgs.push(JSON.stringify(args));
        return scenario.rpc ?? { status: 200, body: "{}" };
      },
    },
  };
}

function makeRequest(path: string, scenario: Scenario): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (scenario.authorization) headers.set("Authorization", scenario.authorization);
  else if (scenario.token) headers.set("Authorization", `Bearer ${scenario.token}`);
  return new Request(`${ORIGIN}${path}`, {
    method: scenario.method,
    headers,
    body: scenario.method === "POST" ? (scenario.body ?? "") : undefined,
  });
}

async function snapshot(run: (rpcArgs: string[]) => Promise<Response>): Promise<Snapshot> {
  const logs: string[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
    logs.push(args.map((a) => (a instanceof Error ? `${a.name}` : String(a))).join(" "));
  });
  const rpcArgs: string[] = [];
  try {
    const res = await run(rpcArgs);
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      body: await res.text(),
      rpcArgs,
      logs,
    };
  } catch (err) {
    return {
      status: "threw",
      headers: {},
      body: err instanceof Error ? err.message : String(err),
      rpcArgs,
      logs,
    };
  } finally {
    spy.mockRestore();
  }
}

async function compare<C>(
  ref: Handler<C, object>,
  kit: Handler<C, object>,
  credentials: C,
  path: string,
  scenario: Scenario,
): Promise<Snapshot> {
  const a = await snapshot((rpcArgs) => ref(makeCtx(credentials, scenario, rpcArgs), makeRequest(path, scenario)));
  const b = await snapshot((rpcArgs) => kit(makeCtx(credentials, scenario, rpcArgs), makeRequest(path, scenario)));
  expect(b).toEqual(a);
  return a;
}

type MetaHandler = (ctx: object, request: Request) => Promise<Response>;

async function compareMeta(ref: MetaHandler, kit: MetaHandler, path: string): Promise<Snapshot> {
  const request = () => new Request(`${ORIGIN}${path}`);
  const a = await snapshot(() => ref({}, request()));
  const b = await snapshot(() => kit({}, request()));
  expect(b).toEqual(a);
  return a;
}

const ENV_CASES: Array<{ name: string; env: Record<string, string> }> = [
  { name: "primary vars set", env: { CLERK_FRONTEND_API_URL: `${CLERK}/`, WEB_APP_URL: WEB } },
  {
    name: "only fallbacks set",
    env: { NEXT_PUBLIC_CLERK_FRONTEND_API_URL: CLERK, SITE_URL: `${WEB}/` },
  },
  {
    name: "empty primaries, fallbacks set",
    env: {
      CLERK_FRONTEND_API_URL: "",
      NEXT_PUBLIC_CLERK_FRONTEND_API_URL: CLERK,
      WEB_APP_URL: "",
      SITE_URL: WEB,
    },
  },
  { name: "nothing set", env: {} },
  { name: "only documentation set", env: { WEB_APP_URL: WEB } },
];

const ENV_NAMES = ["CLERK_FRONTEND_API_URL", "NEXT_PUBLIC_CLERK_FRONTEND_API_URL", "WEB_APP_URL", "SITE_URL"];

function useEnv(env: Record<string, string>) {
  for (const name of ENV_NAMES) vi.stubEnv(name, env[name]);
}

const AS_METADATA = { issuer: CLERK, authorization_endpoint: `${CLERK}/oauth/authorize` };

function stubFetch(ok: boolean) {
  const mock = vi.fn(async () =>
    ok
      ? new Response(`${JSON.stringify(AS_METADATA, null, 1)}\n`, {
          headers: { "Content-Type": "application/json" },
        })
      : new Response("nope", { status: 500 }),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}

beforeEach(() => useEnv({ CLERK_FRONTEND_API_URL: CLERK, WEB_APP_URL: WEB }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

type AppCase = {
  app: string;
  credentials: object;
  mcp: Array<{ path: string; ref: Handler<object, object>; kit: Handler<object, object> }>;
  metadata: Array<{ path: string; ref: MetaHandler; kit: MetaHandler }>;
  oauth: { ref: MetaHandler; kit: MetaHandler };
  health?: { ref: MetaHandler; kit: MetaHandler };
  options?: { ref: MetaHandler; kit: MetaHandler };
};

const APPS: AppCase[] = [
  {
    app: "app-a",
    credentials: { clerkUserId: "user_1" },
    mcp: [
      { path: "/mcp", ref: appARef.mcpHandler, kit: appAKit.mcpHandler },
      { path: "/mcp/team", ref: appARef.mcpTeamHandler, kit: appAKit.mcpTeamHandler },
    ],
    metadata: [
      { path: "/.well-known/oauth-protected-resource", ref: appARef.protectedResourceMetadata, kit: appAKit.protectedResourceMetadata },
      {
        path: "/.well-known/oauth-protected-resource/mcp/team",
        ref: appARef.protectedResourceMetadataTeam,
        kit: appAKit.protectedResourceMetadataTeam,
      },
    ],
    oauth: { ref: appARef.oauthMetadata, kit: appAKit.oauthMetadata },
    health: { ref: appARef.health, kit: appAKit.health },
  },
  {
    app: "app-b",
    credentials: { clerkUserId: "user_1", isPro: true },
    mcp: [{ path: "/mcp", ref: appBRef.mcpHandler, kit: appBKit.mcpHandler }],
    metadata: [
      { path: "/.well-known/oauth-protected-resource", ref: appBRef.protectedResourceMetadata, kit: appBKit.protectedResourceMetadata },
      { path: "/.well-known/oauth-protected-resource/mcp", ref: appBRef.protectedResourceMetadata, kit: appBKit.protectedResourceMetadata },
    ],
    oauth: { ref: appBRef.oauthMetadata, kit: appBKit.oauthMetadata },
    options: { ref: appBRef.mcpOptions, kit: appBKit.mcpOptions },
  },
  {
    app: "app-c",
    credentials: { clerkUserId: "user_1" },
    mcp: [{ path: "/mcp", ref: appCRef.mcpHandler, kit: appCKit.mcpHandler }],
    metadata: [
      { path: "/.well-known/oauth-protected-resource", ref: appCRef.protectedResourceMetadata, kit: appCKit.protectedResourceMetadata },
    ],
    oauth: { ref: appCRef.oauthMetadata, kit: appCKit.oauthMetadata },
    health: { ref: appCRef.health, kit: appCKit.health },
  },
  {
    app: "app-d",
    credentials: { clerkUserId: "user_1" },
    mcp: [{ path: "/mcp", ref: appDRef.mcpHandler, kit: appDKit.mcpHandler }],
    metadata: [
      { path: "/.well-known/oauth-protected-resource", ref: appDRef.protectedResourceMetadata, kit: appDKit.protectedResourceMetadata },
      { path: "/.well-known/oauth-protected-resource/mcp", ref: appDRef.protectedResourceMetadata, kit: appDKit.protectedResourceMetadata },
    ],
    oauth: { ref: appDRef.oauthMetadata, kit: appDKit.oauthMetadata },
    health: { ref: appDRef.health, kit: appDKit.health },
    options: { ref: appDRef.options, kit: appDKit.options },
  },
];

describe.each(APPS)("$app: kit output equals today's native.ts", (app) => {
  describe.each(app.mcp)("$path", ({ path, ref, kit }) => {
    it.each(SCENARIOS)("$name", async (scenario) => {
      await compare(ref, kit, app.credentials, path, scenario);
    });
  });

  describe.each(ENV_CASES)("metadata with $name", ({ env }) => {
    it.each(app.metadata)("protected resource metadata at $path", async ({ path, ref, kit }) => {
      useEnv(env);
      await compareMeta(ref, kit, path);
    });

    it.each([true, false])("authorization server proxy (upstream ok: %s)", async (ok) => {
      useEnv(env);
      const fetchMock = stubFetch(ok);
      const result = await compareMeta(app.oauth.ref, app.oauth.kit, "/.well-known/oauth-authorization-server");
      for (const call of fetchMock.mock.calls) {
        expect(call).toEqual([expect.stringMatching(/\/\.well-known\/oauth-authorization-server$/)]);
      }
      if (result.status !== "threw") expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  it.runIf(app.health)("health", async () => {
    if (app.health) await compareMeta(app.health.ref, app.health.kit, "/health");
  });

  it.runIf(app.options)("OPTIONS preflight, both from the options handler and the /mcp handler", async () => {
    if (!app.options) return;
    const preflight = await compareMeta(app.options.ref, app.options.kit, "/mcp");
    expect(preflight.status).toBe(204);
    const viaMcp = await snapshot(() =>
      must(app.mcp[0]).kit({ deps: makeCtx(app.credentials, must(SCENARIOS[0]), []).deps }, new Request(`${ORIGIN}/mcp`, { method: "OPTIONS" })),
    );
    expect(viaMcp).toEqual(preflight);
  });
});

describe("parity spot checks (what the shared matrix asserts)", () => {
  it("app-a team 401 points at the team metadata path", async () => {
    const snap = await compare(appARef.mcpTeamHandler, appAKit.mcpTeamHandler, { clerkUserId: "u" }, "/mcp/team", must(SCENARIOS[0]));
    expect(snap.status).toBe(401);
    expect(snap.headers["www-authenticate"]).toBe(
      `Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/mcp/team"`,
    );
    expect(snap.body).toBe('{"error":"Missing Authorization header"}');
  });

  it("app-a passes the scope and the re-encoded body", async () => {
    const snap = await compare(appARef.mcpTeamHandler, appAKit.mcpTeamHandler, { clerkUserId: "u" }, "/mcp/team", must(SCENARIOS[10]));
    expect(snap.rpcArgs).toEqual([
      JSON.stringify({ clerkUserId: "u", body: '{"jsonrpc":"2.0","id":2,"method":"ping"}', scope: "team" }),
    ]);
  });

  it("app-d forwards the raw body text", async () => {
    const snap = await compare(appDRef.mcpHandler, appDKit.mcpHandler, { clerkUserId: "u" }, "/mcp", must(SCENARIOS[10]));
    expect(snap.rpcArgs).toEqual([
      JSON.stringify({ clerkUserId: "u", body: '{ "jsonrpc": "2.0",\n  "id": 2, "method": "ping" }' }),
    ]);
  });

  it("app-b passes isPro", async () => {
    const snap = await compare(appBRef.mcpHandler, appBKit.mcpHandler, { clerkUserId: "u", isPro: false }, "/mcp", must(SCENARIOS[9]));
    expect(JSON.parse(must(snap.rpcArgs[0]))).toMatchObject({ clerkUserId: "u", isPro: false });
  });

  it("app-a and app-c log a failed verification; app-b and app-d do not", async () => {
    const appa = await compare(appARef.mcpHandler, appAKit.mcpHandler, { clerkUserId: "u" }, "/mcp", must(SCENARIOS[3]));
    const appc = await compare(appCRef.mcpHandler, appCKit.mcpHandler, { clerkUserId: "u" }, "/mcp", must(SCENARIOS[3]));
    const appb = await compare(appBRef.mcpHandler, appBKit.mcpHandler, { clerkUserId: "u", isPro: true }, "/mcp", must(SCENARIOS[3]));
    expect(appa.logs).toEqual(["[MCP][mcpHandler] token verification failed"]);
    expect(appc.logs).toEqual(["[MCP][mcpHandler] token verification failed"]);
    expect(appb.logs).toEqual([]);
  });

  it("app-a logs a JSON parse failure; app-c does not", async () => {
    const appa = await compare(appARef.mcpHandler, appAKit.mcpHandler, { clerkUserId: "u" }, "/mcp", must(SCENARIOS[7]));
    const appc = await compare(appCRef.mcpHandler, appCKit.mcpHandler, { clerkUserId: "u" }, "/mcp", must(SCENARIOS[7]));
    expect(appa.logs).toEqual(["[MCP][mcpHandler] failed to parse JSON body: SyntaxError"]);
    expect(appc.logs).toEqual([]);
  });

  it("a throwing verifier escapes (Convex answers 500), as today", async () => {
    const snap = await compare(appCRef.mcpHandler, appCKit.mcpHandler, { clerkUserId: "u" }, "/mcp", must(SCENARIOS[13]));
    expect(snap).toMatchObject({ status: "threw", body: "runAction failed" });
  });

  it("env fallback rules differ only when vars are missing or empty", async () => {
    useEnv({});
    const appc = await compareMeta(appCRef.protectedResourceMetadata, appCKit.protectedResourceMetadata, "/x");
    const appd = await compareMeta(appDRef.protectedResourceMetadata, appDKit.protectedResourceMetadata, "/x");
    const appb = await compareMeta(appBRef.protectedResourceMetadata, appBKit.protectedResourceMetadata, "/x");
    expect(appc.body).toBe("NEXT_PUBLIC_CLERK_FRONTEND_API_URL is not set in Convex env");
    expect(appd.body).toBe("CLERK_FRONTEND_API_URL is not set in Convex env");
    expect(appb.body).toBe("CLERK_FRONTEND_API_URL is not set in Convex env");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAuthorizationServerMetadataProxy,
  createHealthHandler,
  createOptionsHandler,
  createProtectedResourceMetadata,
  readEnvUrl,
} from "../../src/mcp/index.js";

const CLERK = "https://clerk.example.test";
const META = { issuer: CLERK, registration_endpoint: `${CLERK}/oauth/register` };
const UPSTREAM_TEXT = '{\n  "issuer": "https://clerk.example.test"\n}';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const get = (path = "/.well-known/oauth-authorization-server") => new Request(`https://site.test${path}`);

describe("createAuthorizationServerMetadataProxy", () => {
  const env = { CLERK_FRONTEND_API_URL: `${CLERK}/` };

  it("fetches <issuer>/.well-known/oauth-authorization-server with the global fetch", async () => {
    const fetchMock = vi.fn(async () => Response.json(META));
    vi.stubGlobal("fetch", fetchMock);
    const res = await createAuthorizationServerMetadataProxy({ env })({}, get());
    expect(fetchMock).toHaveBeenCalledWith(`${CLERK}/.well-known/oauth-authorization-server`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(META);
  });

  it("json mode re-encodes, text mode forwards the text, stream mode forwards the stream", async () => {
    const upstream = async () => new Response(UPSTREAM_TEXT);
    const json = await createAuthorizationServerMetadataProxy({ env, fetch: upstream })({}, get());
    expect(await json.text()).toBe('{"issuer":"https://clerk.example.test"}');
    const text = await createAuthorizationServerMetadataProxy({ env, fetch: upstream, forward: "text" })({}, get());
    expect(await text.text()).toBe(UPSTREAM_TEXT);
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(UPSTREAM_TEXT));
        c.close();
      },
    });
    const stream = await createAuthorizationServerMetadataProxy({
      env,
      forward: "stream",
      fetch: async () => new Response(body),
    })({}, get());
    expect(stream.body).toBe(body);
    expect(await stream.text()).toBe(UPSTREAM_TEXT);
    for (const res of [json, text, stream]) expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("502s with the apps' body when upstream fails, with CORS", async () => {
    const res = await createAuthorizationServerMetadataProxy({
      env,
      cors: { "Access-Control-Allow-Origin": "*" },
      fetch: async () => new Response("x", { status: 404 }),
    })({}, get());
    expect(res.status).toBe(502);
    expect(Object.fromEntries(res.headers)).toEqual({
      "access-control-allow-origin": "*",
      "content-type": "application/json",
    });
    expect(await res.text()).toBe('{"error":"Failed to fetch authorization server metadata"}');
  });

  it("throws when the issuer env var is missing", async () => {
    await expect(createAuthorizationServerMetadataProxy({ env: {} })({}, get())).rejects.toThrow(
      "CLERK_FRONTEND_API_URL is not set in Convex env",
    );
  });
});

describe("createProtectedResourceMetadata", () => {
  const env = { CLERK_FRONTEND_API_URL: CLERK, WEB_APP_URL: "https://app.test/" };

  it("returns the four fields in the apps' order", async () => {
    const res = await createProtectedResourceMetadata({ env })({}, get("/.well-known/oauth-protected-resource"));
    expect(await res.text()).toBe(
      '{"resource":"https://site.test/mcp","authorization_servers":["https://clerk.example.test"],"bearer_methods_supported":["header"],"resource_documentation":"https://app.test"}',
    );
    expect(Object.fromEntries(res.headers)).toEqual({ "content-type": "application/json" });
  });

  it("supports the app-a team resource path", async () => {
    const res = await createProtectedResourceMetadata({ env, resourcePath: "/mcp/team" })({}, get());
    expect((await res.json()).resource).toBe("https://site.test/mcp/team");
  });

  it("reads documentation with a fallback", async () => {
    const res = await createProtectedResourceMetadata({
      env: { CLERK_FRONTEND_API_URL: CLERK, SITE_URL: "https://site-url.test" },
      documentation: { name: "WEB_APP_URL", fallback: "SITE_URL" },
    })({}, get());
    expect((await res.json()).resource_documentation).toBe("https://site-url.test");
  });

  it("reads process.env at request time by default", async () => {
    const handler = createProtectedResourceMetadata();
    vi.stubEnv("CLERK_FRONTEND_API_URL", "https://late.test");
    vi.stubEnv("WEB_APP_URL", "https://web.test");
    expect((await (await handler({}, get())).json()).authorization_servers).toEqual(["https://late.test"]);
  });
});

describe("readEnvUrl fallback modes", () => {
  const src = (fallbackMode: "fallback-if-set" | "prefer-primary" | "nullish") => ({
    name: "A",
    fallback: "B",
    fallbackMode,
  });

  it("all modes use the primary when set and strip one slash", () => {
    const modes: Array<"fallback-if-set" | "prefer-primary" | "nullish"> = ["fallback-if-set", "prefer-primary", "nullish"];
    for (const mode of modes) {
      expect(readEnvUrl(src(mode), { A: "https://a.test/", B: "https://b.test" })).toBe("https://a.test");
      expect(readEnvUrl(src(mode), { B: "https://b.test" })).toBe("https://b.test");
    }
  });

  it("differ on an empty primary and on the error name", () => {
    expect(readEnvUrl(src("fallback-if-set"), { A: "", B: "https://b.test" })).toBe("https://b.test");
    expect(readEnvUrl(src("prefer-primary"), { A: "", B: "https://b.test" })).toBe("https://b.test");
    expect(() => readEnvUrl(src("nullish"), { A: "", B: "https://b.test" })).toThrow("A is not set");
    expect(() => readEnvUrl(src("fallback-if-set"), {})).toThrow("A is not set");
    expect(() => readEnvUrl(src("prefer-primary"), {})).toThrow("B is not set");
    expect(() => readEnvUrl(src("nullish"), {})).toThrow("A is not set");
  });

  it("defaults to fallback-if-set; a plain string has no fallback", () => {
    expect(readEnvUrl({ name: "A", fallback: "B" }, { B: "https://b.test" })).toBe("https://b.test");
    expect(() => readEnvUrl("A", { B: "https://b.test" })).toThrow("A is not set in Convex env");
  });
});

describe("createHealthHandler and createOptionsHandler", () => {
  it("health returns {status:ok} by default and a custom body", async () => {
    const res = await createHealthHandler()({}, get("/health"));
    expect(await res.text()).toBe('{"status":"ok"}');
    const appE = await createHealthHandler({ body: { status: "ok", service: "app-e" } })({}, get("/health"));
    expect(await appE.text()).toBe('{"status":"ok","service":"app-e"}');
  });

  it("options returns 204 with only the CORS headers", async () => {
    const res = await createOptionsHandler({ cors: { "Access-Control-Allow-Origin": "*" } })({}, get());
    expect(res.status).toBe(204);
    expect(Object.fromEntries(res.headers)).toEqual({ "access-control-allow-origin": "*" });
  });
});

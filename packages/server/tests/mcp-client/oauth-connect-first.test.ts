// Ported from the connect-first app's provider tests: sign-in connects an MCP client first, any provider can save a client.
import { auth, UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { describe, expect, it } from "vitest";
import { authorizeMcpServer, createMcpOAuthProvider, hasMcpOAuthTokens, revokeMcpOAuth, type McpOAuthState } from "@vvedantb/server";
import { AS, MCP_URL, REDIRECT, asMetadata, connectAs, connectFirst, fakeFetch, json, memoryStorage } from "./helpers.js";

describe("MCP OAuth sign-in (connect first)", () => {
  it("goes from 401 to discovery, registration, PKCE authorisation and the token exchange", async () => {
    const storage = memoryStorage();
    const opened: URL[] = [];
    const provider = createMcpOAuthProvider({ ...connectFirst, storage, redirectUrl: REDIRECT, redirectToAuthorization: (url) => void opened.push(url) });
    const { fetchFn, calls } = fakeFetch({
      [`POST ${MCP_URL}`]: () =>
        new Response("", { status: 401, headers: { "www-authenticate": `Bearer resource_metadata="https://mcp.example.test/.well-known/oauth-protected-resource/mcp"` } }),
      "GET https://mcp.example.test/.well-known/oauth-protected-resource/mcp": () =>
        json({ resource: MCP_URL, authorization_servers: [AS], scopes_supported: ["openid"] }),
      [`GET ${AS}/.well-known/oauth-authorization-server`]: () => json(asMetadata),
      [`GET ${AS}/.well-known/openid-configuration`]: () => json(asMetadata),
      [`POST ${AS}/register`]: (call) => json({ ...JSON.parse(call.body), client_id: "client-1" }, 201),
      [`POST ${AS}/token`]: () => json({ access_token: "access-1", token_type: "Bearer", refresh_token: "refresh-1", expires_in: 3600 }),
    });

    // The redirect arrives only after the browser opened, as it does for a person.
    const code = new Promise<string>((resolve) => {
      const wait = setInterval(() => {
        if (opened.length > 0) {
          clearInterval(wait);
          resolve("code-1");
        }
      }, 5);
    });
    await authorizeMcpServer({ url: MCP_URL, provider, code, fetch: fetchFn, connectAs });

    const registration = calls.find((call) => call.url === `${AS}/register`);
    const registered: object = JSON.parse(registration?.body ?? "{}");
    expect(registered).toMatchObject({
      client_name: "Example Assistant",
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
    // No `scope` option: the provider sends none of its own (the SDK may add the server's scopes_supported).
    expect(provider.clientMetadata).not.toHaveProperty("scope");

    const authorizeUrl = opened[0];
    expect(authorizeUrl && authorizeUrl.origin + authorizeUrl.pathname).toBe(`${AS}/authorize`);
    expect(authorizeUrl?.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorizeUrl?.searchParams.get("code_challenge")).toBeTruthy();
    expect(authorizeUrl?.searchParams.get("redirect_uri")).toBe(REDIRECT);
    expect(authorizeUrl?.searchParams.get("client_id")).toBe("client-1");
    expect(authorizeUrl?.searchParams.get("state")).toBe(provider.pendingState);

    const token = new URLSearchParams(calls.find((call) => call.url === `${AS}/token`)?.body);
    expect(token.get("grant_type")).toBe("authorization_code");
    expect(token.get("code")).toBe("code-1");
    expect(token.get("code_verifier")).toBeTruthy();
    expect(token.get("redirect_uri")).toBe(REDIRECT);

    expect(storage.state()?.tokens).toMatchObject({ access_token: "access-1", refresh_token: "refresh-1" });
    // stampObtainedAt: false keeps the tokens as the server sent them.
    expect(storage.state()?.tokens).not.toHaveProperty("obtained_at");
    expect(storage.state()?.clientInformation?.client_id).toBe("client-1");
    expect(storage.state()?.clientInformation?.issuer).toBe(AS);
    expect(storage.state()?.tokens?.issuer).toBe(AS);
    expect(hasMcpOAuthTokens(storage.state())).toBe(true);
  });

  it("registers and signs in a second server through the same flow", async () => {
    const other = "https://other.example.test/mcp";
    const storage = memoryStorage();
    const provider = createMcpOAuthProvider({ ...connectFirst, storage, redirectUrl: REDIRECT, redirectToAuthorization: () => undefined });
    const { fetchFn, calls } = fakeFetch({
      [`POST ${other}`]: () =>
        new Response("", { status: 401, headers: { "www-authenticate": `Bearer resource_metadata="https://other.example.test/.well-known/oauth-protected-resource"` } }),
      "GET https://other.example.test/.well-known/oauth-protected-resource": () => json({ resource: other, authorization_servers: ["https://other.example.test"] }),
      "GET https://other.example.test/.well-known/oauth-authorization-server": () =>
        json({
          ...asMetadata,
          issuer: "https://other.example.test",
          authorization_endpoint: "https://other.example.test/authorize",
          token_endpoint: "https://other.example.test/token",
          registration_endpoint: "https://other.example.test/mcp/oauth/register",
        }),
      "POST https://other.example.test/mcp/oauth/register": (call) => json({ ...JSON.parse(call.body), client_id: "other-client" }, 201),
      "POST https://other.example.test/token": () => json({ access_token: "other-access", token_type: "Bearer", refresh_token: "other-refresh" }),
    });

    await authorizeMcpServer({ url: other, provider, code: Promise.resolve("code-other"), fetch: fetchFn, connectAs });

    expect(calls.some((call) => call.url === "https://other.example.test/mcp/oauth/register")).toBe(true);
    expect(storage.state()?.clientInformation?.client_id).toBe("other-client");
    expect(storage.state()?.tokens).toMatchObject({ access_token: "other-access", refresh_token: "other-refresh" });
    expect(hasMcpOAuthTokens(storage.state())).toBe(true);
  });

  it("resolves at once for a server that needs no sign-in", async () => {
    const provider = createMcpOAuthProvider({ ...connectFirst, storage: memoryStorage(), redirectUrl: REDIRECT, redirectToAuthorization: () => undefined });
    const { fetchFn, calls } = fakeFetch({
      [`POST ${MCP_URL}`]: (call) => {
        const message: { id?: number; method: string } = JSON.parse(call.body);
        if (message.method !== "initialize") return new Response(null, { status: 202 });
        return json({
          jsonrpc: "2.0",
          id: message.id,
          result: { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "open", version: "1.0.0" } },
        });
      },
    });
    let codeAwaited = false;
    const code = new Promise<string>(() => undefined).finally(() => (codeAwaited = true));
    await authorizeMcpServer({ url: MCP_URL, provider, code, fetch: fetchFn, connectAs });
    expect(codeAwaited).toBe(false);
    expect(calls.some((call) => call.url.includes("well-known"))).toBe(false);
  });

  it("refreshes with the saved refresh token and saves the new access token", async () => {
    const storage = memoryStorage({
      tokens: { access_token: "old", token_type: "Bearer", refresh_token: "refresh-1" },
      clientInformation: { client_id: "client-1", issuer: AS },
    });
    const provider = createMcpOAuthProvider({ ...connectFirst, storage });
    const { fetchFn, calls } = fakeFetch({
      "GET https://mcp.example.test/.well-known/oauth-protected-resource/mcp": () => json({ resource: MCP_URL, authorization_servers: [AS] }),
      [`GET ${AS}/.well-known/oauth-authorization-server`]: () => json(asMetadata),
      [`POST ${AS}/token`]: () => json({ access_token: "new", token_type: "Bearer", expires_in: 3600 }),
    });

    await expect(auth(provider, { serverUrl: MCP_URL, fetchFn })).resolves.toBe("AUTHORIZED");

    const token = new URLSearchParams(calls.find((call) => call.url === `${AS}/token`)?.body);
    expect(token.get("grant_type")).toBe("refresh_token");
    expect(token.get("refresh_token")).toBe("refresh-1");
    expect(storage.state()?.tokens?.access_token).toBe("new");
    // The server sent no new refresh token: the old one stays.
    expect(storage.state()?.tokens?.refresh_token).toBe("refresh-1");
  });

  it("does not throw when optional metadata is missing", async () => {
    const storage = memoryStorage({ clientInformation: { client_id: "client-1", redirect_uris: [REDIRECT], issuer: "https://mcp.example.test" } });
    const opened: URL[] = [];
    const provider = createMcpOAuthProvider({ ...connectFirst, storage, redirectUrl: REDIRECT, redirectToAuthorization: (url) => void opened.push(url) });
    // Without protected resource metadata the SDK uses the MCP origin as the authorization server, so the saved client is bound to it.
    // No protected resource metadata (404), no scopes, no registration endpoint, no PKCE list, no grant types.
    const minimal = { issuer: AS, authorization_endpoint: `${AS}/authorize`, token_endpoint: `${AS}/token`, response_types_supported: ["code"] };
    const { fetchFn } = fakeFetch({
      [`GET ${AS}/.well-known/oauth-authorization-server`]: () => json(minimal),
      "GET https://mcp.example.test/.well-known/oauth-authorization-server": () => json(minimal),
    });

    await expect(auth(provider, { serverUrl: MCP_URL, fetchFn })).resolves.toBe("REDIRECT");
    expect(opened[0]?.searchParams.get("code_challenge")).toBeTruthy();
    expect(opened[0]?.searchParams.has("scope")).toBe(false);
  });
});

describe("non-interactive provider (clientRegistration: always)", () => {
  it("never opens a browser, and a 401 does not hit the saveable-client error", async () => {
    const storage = memoryStorage();
    const provider = createMcpOAuthProvider({ ...connectFirst, storage });
    expect(provider.saveClientInformation).toBeDefined();
    // Rejects (0.1.0 of the standalone package threw synchronously) with the SDK's own UnauthorizedError.
    const refused = provider.redirectToAuthorization(new URL(`${AS}/authorize`));
    await expect(refused).rejects.toThrow(/Connectors/);
    await expect(refused).rejects.toBeInstanceOf(UnauthorizedError);
    const { fetchFn, calls } = fakeFetch({
      "GET https://mcp.example.test/.well-known/oauth-protected-resource/mcp": () => json({ resource: MCP_URL, authorization_servers: [AS] }),
      [`GET ${AS}/.well-known/oauth-authorization-server`]: () => json(asMetadata),
      [`POST ${AS}/register`]: (call) => json({ ...JSON.parse(call.body), client_id: "client-1" }, 201),
    });
    const failure = await auth(provider, { serverUrl: MCP_URL, fetchFn }).then(String, String);
    expect(failure).toMatch(/Connectors/);
    expect(failure).not.toMatch(/saveable/);
    expect(calls.some((call) => call.url.endsWith("/token"))).toBe(false);
  });

  it("registers again when the saved client used another loopback port", async () => {
    const storage = memoryStorage({ clientInformation: { client_id: "client-1", redirect_uris: ["http://127.0.0.1:1111/callback"] } });
    expect(createMcpOAuthProvider({ ...connectFirst, storage, redirectUrl: REDIRECT, redirectToAuthorization: () => undefined }).clientInformation()).toBeUndefined();
    expect((await createMcpOAuthProvider({ ...connectFirst, storage }).clientInformation())?.client_id).toBe("client-1");
  });
});

describe("credentials", () => {
  it("clears tokens, client or everything on request", () => {
    const full = (): McpOAuthState => ({
      tokens: { access_token: "a", token_type: "Bearer" },
      clientInformation: { client_id: "c" },
    });
    const storage = memoryStorage(full());
    const provider = createMcpOAuthProvider({ ...connectFirst, storage });
    void provider.invalidateCredentials?.("tokens");
    expect(storage.state()).toMatchObject({ clientInformation: { client_id: "c" } });
    expect(storage.state()?.tokens).toBeUndefined();
    void provider.invalidateCredentials?.("all");
    expect(storage.state()).toBeUndefined();
  });
});

describe("revokeMcpOAuth", () => {
  const state: McpOAuthState = {
    tokens: { access_token: "AT", refresh_token: "RT", token_type: "Bearer", issuer: AS },
    clientInformation: { client_id: "client-1", issuer: AS },
  };
  const metadataRoute = (extra: Record<string, string>) => ({ [`GET ${AS}/.well-known/oauth-authorization-server`]: () => json({ ...asMetadata, ...extra }) });

  it("posts the refresh and access tokens to the advertised revocation_endpoint", async () => {
    const { fetchFn, calls } = fakeFetch({ ...metadataRoute({ revocation_endpoint: `${AS}/revoke` }), [`POST ${AS}/revoke`]: () => new Response(null, { status: 200 }) });
    await expect(revokeMcpOAuth({ url: MCP_URL, state, fetch: fetchFn })).resolves.toBe(true);
    const posts = calls.filter((call) => call.method === "POST").map((call) => new URLSearchParams(call.body));
    expect(posts.map((body) => [body.get("token"), body.get("token_type_hint"), body.get("client_id")])).toEqual([
      ["RT", "refresh_token", "client-1"],
      ["AT", "access_token", "client-1"],
    ]);
  });

  it("sends client_secret when the client has one", async () => {
    const { fetchFn, calls } = fakeFetch({ ...metadataRoute({ revocation_endpoint: `${AS}/revoke` }), [`POST ${AS}/revoke`]: () => new Response(null, { status: 200 }) });
    const withSecret: McpOAuthState = { ...state, clientInformation: { client_id: "client-1", client_secret: "s3", issuer: AS } };
    await expect(revokeMcpOAuth({ url: MCP_URL, state: withSecret, fetch: fetchFn })).resolves.toBe(true);
    expect(calls.filter((call) => call.method === "POST").map((call) => new URLSearchParams(call.body).get("client_secret"))).toEqual(["s3", "s3"]);
  });

  it("discovers the authorization server from the MCP server when no issuer is stored", async () => {
    const { fetchFn, calls } = fakeFetch({
      "GET https://mcp.example.test/.well-known/oauth-protected-resource/mcp": () => json({ resource: MCP_URL, authorization_servers: [AS] }),
      ...metadataRoute({ revocation_endpoint: `${AS}/revoke` }),
      [`POST ${AS}/revoke`]: () => new Response(null, { status: 200 }),
    });
    const noIssuer: McpOAuthState = { tokens: { access_token: "AT", token_type: "Bearer" }, clientInformation: { client_id: "client-1" } };
    await expect(revokeMcpOAuth({ url: MCP_URL, state: noIssuer, fetch: fetchFn })).resolves.toBe(true);
    expect(calls.filter((call) => call.method === "POST").map((call) => new URLSearchParams(call.body).get("token"))).toEqual(["AT"]);
  });

  it("skips when the server advertises no revocation_endpoint, or nobody is signed in", async () => {
    const { fetchFn, calls } = fakeFetch(metadataRoute({}));
    await expect(revokeMcpOAuth({ url: MCP_URL, state, fetch: fetchFn })).resolves.toBe(false);
    expect(calls.some((call) => call.method === "POST")).toBe(false);
    const none = fakeFetch({});
    await expect(revokeMcpOAuth({ url: MCP_URL, state: undefined, fetch: none.fetchFn })).resolves.toBe(false);
    expect(none.calls).toEqual([]);
  });

  it("never throws when revocation fails with a 500 or a network error", async () => {
    const failing = fakeFetch({ ...metadataRoute({ revocation_endpoint: `${AS}/revoke` }), [`POST ${AS}/revoke`]: () => new Response("down", { status: 500 }) });
    await expect(revokeMcpOAuth({ url: MCP_URL, state, fetch: failing.fetchFn })).resolves.toBe(false);
    const offline = async (): Promise<Response> => Promise.reject(new Error("offline"));
    await expect(revokeMcpOAuth({ url: MCP_URL, state, fetch: offline })).resolves.toBe(false);
  });
});

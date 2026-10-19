// Ported from the direct-auth app's provider tests: scoped client, `obtained_at` stamping, registration only when interactive.
import { describe, expect, it } from "vitest";
import { createMcpOAuthProvider, hasMcpOAuthTokens, isAccessTokenExpiring, type McpOAuthState } from "@vvedantb/server";
import { AS, MCP_URL, asMetadata, directAuth, fakeFetch, json, memoryStorage } from "./helpers.js";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";

const tokens = { access_token: "a", token_type: "Bearer", refresh_token: "r" };

describe("OAuth provider storage (direct auth)", () => {
  it("saves and loads tokens and stamps when they were obtained", async () => {
    const storage = memoryStorage();
    const provider = createMcpOAuthProvider({ ...directAuth, storage, now: () => 5000 });
    await provider.saveTokens(tokens);
    expect((await provider.tokens())?.access_token).toBe("a");
    expect(storage.state()?.tokens?.obtained_at).toBe(5000);
    expect(hasMcpOAuthTokens(storage.state())).toBe(true);
  });

  it("stamps with Date.now when no clock is given", async () => {
    const storage = memoryStorage();
    const before = Date.now();
    await createMcpOAuthProvider({ ...directAuth, storage }).saveTokens(tokens);
    expect(storage.state()?.tokens?.obtained_at).toBeGreaterThanOrEqual(before);
  });

  it("registers under the client name with PKCE-friendly public client settings and the scope", () => {
    const provider = createMcpOAuthProvider({
      ...directAuth,
      storage: memoryStorage(),
      redirectUrl: "http://127.0.0.1:1111/callback",
      redirectToAuthorization: () => undefined,
    });
    expect(provider.clientMetadata).toEqual({
      client_name: "Example Recorder",
      redirect_uris: ["http://127.0.0.1:1111/callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "openid profile email",
    });
  });

  it("drops client information registered for another redirect", async () => {
    const storage = memoryStorage({
      clientInformation: { client_id: "c", redirect_uris: ["http://127.0.0.1:1111/callback"] },
    });
    const same = createMcpOAuthProvider({ ...directAuth, storage, redirectUrl: "http://127.0.0.1:1111/callback", redirectToAuthorization: () => undefined });
    expect((await same.clientInformation())?.client_id).toBe("c");
    const other = createMcpOAuthProvider({ ...directAuth, storage, redirectUrl: "http://127.0.0.1:2222/callback", redirectToAuthorization: () => undefined });
    expect(await other.clientInformation()).toBeUndefined();
  });

  it("keeps stored client information for a refresh-only provider", async () => {
    const storage = memoryStorage({
      clientInformation: { client_id: "c", redirect_uris: ["http://127.0.0.1:1/callback"] },
    });
    const provider = createMcpOAuthProvider({ ...directAuth, storage });
    expect((await provider.clientInformation())?.client_id).toBe("c");
    // Rejects (0.1.0 of the standalone package threw synchronously).
    await expect(provider.redirectToAuthorization(new URL("https://x.test"))).rejects.toThrow(/settings window/);
  });

  it("clears by scope", async () => {
    const storage = memoryStorage({ tokens, clientInformation: { client_id: "c" } });
    const provider = createMcpOAuthProvider({ ...directAuth, storage });
    await provider.invalidateCredentials?.("tokens");
    expect(storage.state()?.tokens).toBeUndefined();
    expect(storage.state()?.clientInformation?.client_id).toBe("c");
    await provider.invalidateCredentials?.("all");
    expect(storage.state()).toBeUndefined();
  });
});

describe("non-interactive provider (clientRegistration: interactive)", () => {
  it("cannot save a client, so a 401 stops before any registration request", async () => {
    const provider = createMcpOAuthProvider({ ...directAuth, storage: memoryStorage() });
    expect(provider.saveClientInformation).toBeUndefined();
    const { fetchFn, calls } = fakeFetch({
      "GET https://mcp.example.test/.well-known/oauth-protected-resource/mcp": () => json({ resource: MCP_URL, authorization_servers: [AS] }),
      [`GET ${AS}/.well-known/oauth-authorization-server`]: () => json(asMetadata),
      [`POST ${AS}/register`]: (call) => json({ ...JSON.parse(call.body), client_id: "client-1" }, 201),
    });
    await expect(auth(provider, { serverUrl: MCP_URL, fetchFn })).rejects.toThrow();
    expect(calls.some((call) => call.url === `${AS}/register`)).toBe(false);
  });

  it("an interactive provider keeps the redirect it registered with when the server echoes none", () => {
    const storage = memoryStorage();
    const redirectUrl = "http://127.0.0.1:3333/callback";
    const provider = createMcpOAuthProvider({ ...directAuth, storage, redirectUrl, redirectToAuthorization: () => undefined });
    void provider.saveClientInformation?.({ client_id: "c", issuer: AS });
    expect(storage.state()?.clientInformation).toEqual({ client_id: "c", issuer: AS, redirect_uris: [redirectUrl] });
  });
});

describe("isAccessTokenExpiring", () => {
  const state = (expiresIn: number): McpOAuthState => ({
    tokens: { ...tokens, expires_in: expiresIn, obtained_at: 0 },
  });
  it("is true within two minutes of expiry", () => {
    expect(isAccessTokenExpiring(state(3600), 3_000_000)).toBe(false);
    expect(isAccessTokenExpiring(state(3600), 3_500_000)).toBe(true);
  });
  it("treats unknown expiry as live", () => {
    expect(isAccessTokenExpiring({ tokens }, 9e12)).toBe(false);
    expect(isAccessTokenExpiring(undefined, 9e12)).toBe(false);
  });
});

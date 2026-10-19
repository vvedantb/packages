// End-to-end over real HTTP, ported from the direct-auth app's sign-in service tests: loopback redirect,
// sign-in, refresh and revocation against a fake MCP host and authorization server.
import { createServer, type IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import {
  authorizeMcpServer,
  createMcpOAuthProvider,
  hasMcpOAuthTokens,
  isAccessTokenExpiring,
  refreshMcpOAuth,
  revokeMcpOAuth,
  startLoopback,
} from "@vvedantb/server";
import { connectAs, connectFirst, directAuth, memoryStorage } from "./helpers.js";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += String(chunk)));
    req.on("end", () => resolve(body));
  });
}

type Registered = { client_name?: string; redirect_uris?: string[]; scope?: string };

async function startFakeServer() {
  const seen: { registered: Registered[]; tokenBodies: URLSearchParams[]; revoked: string[]; authorizeScopes: (string | null)[] } = {
    registered: [],
    tokenBodies: [],
    revoked: [],
    authorizeScopes: [],
  };
  let base = "";
  let issued = 0;
  const server = createServer((req, res) => {
    void readBody(req).then((body) => {
      const send = (status: number, json: object, headers: Record<string, string> = {}) => {
        res.writeHead(status, { "content-type": "application/json", ...headers });
        res.end(JSON.stringify(json));
      };
      const path = req.url?.split("?")[0] ?? "";
      if (path === "/mcp") {
        send(401, {}, { "www-authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/mcp"` });
      } else if (path.startsWith("/.well-known/oauth-protected-resource")) {
        send(200, { resource: `${base}/mcp`, authorization_servers: [base] });
      } else if (path.startsWith("/.well-known/oauth-authorization-server")) {
        send(200, {
          issuer: base,
          authorization_endpoint: `${base}/authorize`,
          token_endpoint: `${base}/token`,
          registration_endpoint: `${base}/register`,
          revocation_endpoint: `${base}/revoke`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["none"],
        });
      } else if (path === "/register") {
        const client: Registered = JSON.parse(body);
        seen.registered.push(client);
        send(201, { ...client, client_id: "client-1" });
      } else if (path === "/token") {
        seen.tokenBodies.push(new URLSearchParams(body));
        issued += 1;
        send(200, { access_token: `access-${String(issued)}`, token_type: "Bearer", expires_in: 3600, refresh_token: `refresh-${String(issued)}` });
      } else if (path === "/revoke") {
        seen.revoked.push(new URLSearchParams(body).get("token") ?? "");
        send(200, {});
      } else {
        send(404, {});
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no port");
  base = `http://127.0.0.1:${String(address.port)}`;
  return { base, seen, close: () => server.close() };
}

/** Stands in for the system browser: follows the authorization URL's redirect back to the loopback. */
function fakeBrowser(scopes: (string | null)[]) {
  return async (url: URL): Promise<void> => {
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("response_type")).toBe("code");
    scopes.push(url.searchParams.get("scope"));
    const redirect = new URL(url.searchParams.get("redirect_uri") ?? "");
    expect(redirect.hostname).toBe("127.0.0.1");
    redirect.searchParams.set("code", "auth-code");
    redirect.searchParams.set("state", url.searchParams.get("state") ?? "");
    void fetch(redirect);
  };
}

for (const [label, preset, connect] of [
  ["direct auth", directAuth, undefined],
  ["connect first", connectFirst, connectAs],
] as const) {
  describe(`sign-in flow (${label})`, () => {
    it("signs in with code and PKCE, refreshes an expiring token, then revokes both tokens", async () => {
      const fake = await startFakeServer();
      const loopback = await startLoopback();
      try {
        const storage = memoryStorage();
        let now = 1_000_000;
        const provider = createMcpOAuthProvider({
          ...preset,
          storage,
          redirectUrl: loopback.redirectUrl,
          redirectToAuthorization: fakeBrowser(fake.seen.authorizeScopes),
          now: () => now,
        });
        const code = loopback.waitForCode(() => provider.pendingState);
        await authorizeMcpServer({ url: `${fake.base}/mcp`, provider, code, connectAs: connect });

        expect(hasMcpOAuthTokens(storage.state())).toBe(true);
        expect(storage.state()?.tokens?.access_token).toBe("access-1");
        expect(fake.seen.registered[0]?.client_name).toBe(preset.clientName);
        expect(fake.seen.registered[0]?.redirect_uris).toEqual([loopback.redirectUrl]);
        const exchange = fake.seen.tokenBodies[0];
        expect(exchange?.get("grant_type")).toBe("authorization_code");
        expect(exchange?.get("code")).toBe("auth-code");
        expect(exchange?.get("code_verifier")).toBeTruthy();
        expect(exchange?.get("resource")).toBe(`${fake.base}/mcp`);

        if (preset === directAuth) {
          expect(fake.seen.registered[0]?.scope).toBe(directAuth.scope);
          expect(fake.seen.authorizeScopes).toEqual([directAuth.scope]);
          expect(storage.state()?.tokens?.obtained_at).toBe(1_000_000);
          now += 3600_000;
          expect(isAccessTokenExpiring(storage.state(), now)).toBe(true);
          const refresher = createMcpOAuthProvider({ ...preset, storage, now: () => now });
          await expect(refreshMcpOAuth({ url: `${fake.base}/mcp`, provider: refresher })).resolves.toBe(true);
          const refresh = fake.seen.tokenBodies[1];
          expect(refresh?.get("grant_type")).toBe("refresh_token");
          expect(refresh?.get("refresh_token")).toBe("refresh-1");
          expect(storage.state()?.tokens?.access_token).toBe("access-2");
        } else {
          expect(fake.seen.registered[0]).not.toHaveProperty("scope");
          expect(storage.state()?.tokens).not.toHaveProperty("obtained_at");
        }

        const tokens = storage.state()?.tokens;
        await expect(revokeMcpOAuth({ url: `${fake.base}/mcp`, state: storage.state() })).resolves.toBe(true);
        expect(fake.seen.revoked.sort()).toEqual([tokens?.access_token, tokens?.refresh_token].sort());
      } finally {
        loopback.close();
        fake.close();
      }
    });

    it("fails sign-in when the browser sends back a wrong state and then cancels", async () => {
      const fake = await startFakeServer();
      const loopback = await startLoopback();
      try {
        const storage = memoryStorage();
        const provider = createMcpOAuthProvider({
          ...preset,
          storage,
          redirectUrl: loopback.redirectUrl,
          redirectToAuthorization: async (url) => {
            const redirect = new URL(url.searchParams.get("redirect_uri") ?? "");
            redirect.searchParams.set("code", "x");
            redirect.searchParams.set("state", "forged");
            expect((await fetch(redirect)).status).toBe(400);
            // The user gives up: the real redirect has `error`.
            const cancel = new URL(redirect);
            cancel.searchParams.delete("code");
            cancel.searchParams.set("error", "access_denied");
            cancel.searchParams.set("state", url.searchParams.get("state") ?? "");
            void fetch(cancel);
          },
        });
        const code = loopback.waitForCode(() => provider.pendingState);
        await expect(authorizeMcpServer({ url: `${fake.base}/mcp`, provider, code, connectAs: connect })).rejects.toThrow(/cancelled/);
        expect(hasMcpOAuthTokens(storage.state())).toBe(false);
      } finally {
        loopback.close();
        fake.close();
      }
    });
  });
}

describe("refreshMcpOAuth", () => {
  it("returns false instead of throwing when nothing can be refreshed", async () => {
    const offline = async (): Promise<Response> => Promise.reject(new Error("offline"));
    const provider = createMcpOAuthProvider({ ...directAuth, storage: memoryStorage() });
    await expect(refreshMcpOAuth({ url: "https://mcp.example.test/mcp", provider, fetch: offline })).resolves.toBe(false);
  });
});

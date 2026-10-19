import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type { FetchLike } from "@modelcontextprotocol/sdk/shared/transport.js";
import { randomToken } from "../crypto/random.js";
import type { McpOAuthState } from "./state.js";

// MCP authorization (OAuth 2.1 with PKCE and dynamic client registration) for desktop apps. No Electron imports:
// the app supplies the storage, the redirect and the browser.

// The SDK is an optional peer, imported on first use and never at module load, so the package root stays loadable
// in Convex's V8 runtime without it. Each import() is awaited directly in a try block (not inside Promise.all):
// esbuild (Convex, Electron main) and Metro then treat a missing SDK as optional, and still bundle it when it is
// installed. tests-node/bundle.mjs checks this with Convex's esbuild.
const SDK_MISSING = "The MCP client OAuth helpers need the @modelcontextprotocol/sdk package";

async function loadSdkAuth() {
  try {
    return await import("@modelcontextprotocol/sdk/client/auth.js");
  } catch (error) {
    throw new Error(SDK_MISSING, { cause: error });
  }
}

async function loadSdkClient() {
  try {
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    return { Client, StreamableHTTPClientTransport };
  } catch (error) {
    throw new Error(SDK_MISSING, { cause: error });
  }
}

export type McpOAuthStorage = {
  load: () => McpOAuthState | undefined;
  /** undefined clears everything for the server. */
  save: (state: McpOAuthState | undefined) => void;
};

export type McpOAuthProviderOptions = {
  storage: McpOAuthStorage;
  /** `client_name` sent with dynamic client registration. */
  clientName: string;
  /** `scope` sent with registration and, by `authorizeMcpServer` without `connectAs`, with the authorization request. Default: none. */
  scope?: string;
  /** Where the browser comes back to. Set only for the interactive sign-in: without it the provider never starts one. */
  redirectUrl?: string;
  /** Opens the authorization URL. Required with redirectUrl. */
  redirectToAuthorization?: (url: URL) => void | Promise<void>;
  /** Message of the UnauthorizedError thrown when a non-interactive provider would need a browser. */
  signInRequiredMessage?: string;
  /**
   * When the provider can save a registered client.
   * - `"interactive"` (default): only with redirectUrl and redirectToAuthorization, so a non-interactive 401 stops before any registration request.
   * - `"always"`: also when not interactive, so the SDK never throws for want of somewhere to keep the result.
   */
  clientRegistration?: "interactive" | "always";
  /** Stamp `obtained_at` (from `now`) on saved tokens, for `isAccessTokenExpiring`. Default true. */
  stampObtainedAt?: boolean;
  now?: () => number;
};

// The SDK reads "no redirect URL" as a client-credentials flow, so a provider that only refreshes still needs one. It is never sent anywhere.
const REFRESH_ONLY_REDIRECT = "http://127.0.0.1/callback";

const DEFAULT_SIGN_IN_REQUIRED = "Sign-in required";

export type McpOAuthProvider = OAuthClientProvider & {
  /** The `state` sent with the latest authorization request, for the redirect handler to check. */
  readonly pendingState: string | undefined;
};

/** True when tokens are stored, so the server counts as signed in. */
export function hasMcpOAuthTokens(state: McpOAuthState | undefined): boolean {
  return Boolean(state?.tokens?.access_token);
}

const EXPIRY_SKEW_MS = 2 * 60_000;

/** True when the access token has expired or will within two minutes. Unknown expiry (or no `obtained_at`) counts as live. */
export function isAccessTokenExpiring(state: McpOAuthState | undefined, now: number): boolean {
  const tokens = state?.tokens;
  if (!tokens) return false;
  const { expires_in: expiresIn, obtained_at: obtainedAt } = tokens;
  if (expiresIn === undefined || obtainedAt === undefined) return false;
  return now >= obtainedAt + expiresIn * 1000 - EXPIRY_SKEW_MS;
}

/**
 * An OAuthClientProvider over injected storage. Interactive (redirectUrl set): may register a client and open the browser.
 * Not interactive: only uses what is stored (and refreshes it), so a 401 that needs a new sign-in fails fast and never opens a browser.
 */
export function createMcpOAuthProvider(options: McpOAuthProviderOptions): McpOAuthProvider {
  const { storage, clientName, scope, redirectUrl, redirectToAuthorization } = options;
  const now = options.now ?? Date.now;
  const stampObtainedAt = options.stampObtainedAt ?? true;
  const signInRequiredMessage = options.signInRequiredMessage ?? DEFAULT_SIGN_IN_REQUIRED;
  const interactive = Boolean(redirectUrl && redirectToAuthorization);
  let verifier: string | undefined;
  let pendingState: string | undefined;

  const update = (patch: Partial<McpOAuthState>): void => storage.save({ ...storage.load(), ...patch });

  const provider: McpOAuthProvider = {
    get redirectUrl() {
      return redirectUrl ?? REFRESH_ONLY_REDIRECT;
    },
    get clientMetadata() {
      return {
        client_name: clientName,
        redirect_uris: redirectUrl ? [redirectUrl] : [],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        ...(scope === undefined ? {} : { scope }),
      };
    },
    get pendingState() {
      return pendingState;
    },
    state() {
      pendingState = randomToken(16, "base64url");
      return pendingState;
    },
    clientInformation() {
      const saved = storage.load()?.clientInformation;
      // The loopback port changes on every sign-in, so a client registered for another redirect cannot be reused.
      if (interactive && redirectUrl && saved?.redirect_uris && !saved.redirect_uris.includes(redirectUrl)) return undefined;
      return saved;
    },
    tokens() {
      return storage.load()?.tokens;
    },
    saveTokens(tokens) {
      update({ tokens: stampObtainedAt ? { ...tokens, obtained_at: now() } : tokens });
    },
    saveCodeVerifier(value) {
      verifier = value;
    },
    codeVerifier() {
      if (!verifier) throw new Error("No code verifier saved");
      return verifier;
    },
    redirectToAuthorization(url) {
      // Rejects rather than throws: the SDK's UnauthorizedError class is only reachable once the SDK is loaded.
      // The SDK awaits this call, so its flows see the same error either way.
      if (!interactive || !redirectToAuthorization) {
        return loadSdkAuth().then(({ UnauthorizedError }) => {
          throw new UnauthorizedError(signInRequiredMessage);
        });
      }
      return redirectToAuthorization(url);
    },
    invalidateCredentials(scope) {
      if (scope === "all") storage.save(undefined);
      else if (scope === "tokens") update({ tokens: undefined });
      else if (scope === "client") update({ clientInformation: undefined });
      else if (scope === "verifier") verifier = undefined;
    },
  };
  // Without this the SDK cannot register a client, so a 401 stops before any registration request.
  if (interactive || options.clientRegistration === "always") {
    provider.saveClientInformation = (info) => {
      const registered = "redirect_uris" in info ? info.redirect_uris : undefined;
      update({ clientInformation: { ...info, redirect_uris: registered ?? (redirectUrl ? [redirectUrl] : undefined) } });
    };
  }
  return provider;
}

/** The MCP client identity `authorizeMcpServer` connects with. */
export type McpClientInfo = { name: string; version: string };

/**
 * Signs in. Resolves once tokens are saved. `code` is awaited only when the server needs a sign-in.
 * - Without `connectAs`: runs the SDK `auth` flow directly (with the provider's `scope`). The SDK finds the protected resource
 *   metadata (RFC 9728) and the authorization server, registers a client and calls redirectToAuthorization. Then `code` is exchanged.
 * - With `connectAs`: connects an MCP client first. A server that needs no sign-in resolves at once; on 401 the transport runs the
 *   same discovery (resource metadata from WWW-Authenticate or the well-known URL), then `code` is exchanged by `finishAuth`.
 */
export async function authorizeMcpServer(args: {
  url: string;
  provider: McpOAuthProvider;
  /** The authorization code from the redirect. Created before the browser opens; it may reject (cancelled, timed out). */
  code: Promise<string>;
  fetch?: FetchLike;
  connectAs?: McpClientInfo;
}): Promise<void> {
  // A rejection that arrives before we await it must not surface as unhandled.
  args.code.catch(() => undefined);
  if (args.connectAs) return connectThenAuthorize({ ...args, connectAs: args.connectAs });
  const { auth } = await loadSdkAuth();
  const options = { serverUrl: args.url, scope: args.provider.clientMetadata.scope, fetchFn: args.fetch };
  const first = await auth(args.provider, options);
  if (first === "AUTHORIZED") return;
  const authorizationCode = await args.code;
  const second = await auth(args.provider, { ...options, authorizationCode });
  if (second !== "AUTHORIZED") throw new Error("Sign-in did not finish");
}

async function connectThenAuthorize(args: {
  url: string;
  provider: McpOAuthProvider;
  code: Promise<string>;
  fetch?: FetchLike;
  connectAs: McpClientInfo;
}): Promise<void> {
  const [{ UnauthorizedError }, { Client, StreamableHTTPClientTransport }] = await Promise.all([loadSdkAuth(), loadSdkClient()]);
  const client = new Client(args.connectAs);
  const transport = new StreamableHTTPClientTransport(new URL(args.url), { authProvider: args.provider, fetch: args.fetch });
  try {
    await client.connect(transport);
    return;
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) throw error;
  } finally {
    await client.close().catch(() => undefined);
  }
  await transport.finishAuth(await args.code);
}

/**
 * Refreshes the access token with the stored refresh token. Never opens a browser. Returns false when the
 * refresh did not work (the SDK has then cleared tokens that the server rejected).
 */
export async function refreshMcpOAuth(args: { url: string; provider: McpOAuthProvider; fetch?: FetchLike }): Promise<boolean> {
  try {
    const { auth } = await loadSdkAuth();
    const result = await auth(args.provider, { serverUrl: args.url, fetchFn: args.fetch });
    return result === "AUTHORIZED";
  } catch {
    return false;
  }
}

// Sign out waits for this at most: a slow authorization server must not hold it up.
const REVOKE_TIMEOUT_MS = 3000;

/**
 * Best-effort token revocation (RFC 7009) before the local tokens are cleared. Only when the authorization server advertises a
 * `revocation_endpoint`. Never opens a browser and never throws: a missing endpoint, a network error or a 4xx/5xx is ignored.
 * Returns true when at least one token was revoked.
 */
export async function revokeMcpOAuth(args: { url: string; state: McpOAuthState | undefined; fetch?: FetchLike }): Promise<boolean> {
  const { tokens, clientInformation } = args.state ?? {};
  if (!tokens?.access_token) return false;
  const signal = AbortSignal.timeout(REVOKE_TIMEOUT_MS);
  const fetchFn: FetchLike = (input, init) => (args.fetch ?? fetch)(input, { ...init, signal });
  try {
    const { discoverAuthorizationServerMetadata, discoverOAuthServerInfo } = await loadSdkAuth();
    // The stored issuer is the server the tokens came from; without one, discover it from the MCP server.
    const issuer = tokens.issuer ?? clientInformation?.issuer;
    const metadata = issuer
      ? await discoverAuthorizationServerMetadata(issuer, { fetchFn })
      : (await discoverOAuthServerInfo(args.url, { fetchFn })).authorizationServerMetadata;
    // The OpenID metadata type has no field for it, though a server may send one.
    const endpoint =
      metadata && "revocation_endpoint" in metadata && typeof metadata.revocation_endpoint === "string"
        ? metadata.revocation_endpoint
        : undefined;
    if (!endpoint) return false;
    const revoke = async (token: string, hint: string): Promise<boolean> => {
      const body = new URLSearchParams({ token, token_type_hint: hint });
      if (clientInformation?.client_id) body.set("client_id", clientInformation.client_id);
      if (clientInformation?.client_secret) body.set("client_secret", clientInformation.client_secret);
      const response = await fetchFn(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      return response.ok;
    };
    // The refresh token first: revoking it may also end the access token, and it is the longer-lived one.
    const outcomes = await Promise.all(
      [...(tokens.refresh_token ? [revoke(tokens.refresh_token, "refresh_token")] : []), revoke(tokens.access_token, "access_token")].map(
        (work) => work.catch(() => false),
      ),
    );
    return outcomes.some(Boolean);
  } catch {
    return false;
  }
}

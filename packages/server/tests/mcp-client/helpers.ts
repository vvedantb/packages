import type { McpOAuthProviderOptions, McpOAuthState, McpOAuthStorage } from "@vvedantb/server";

export const MCP_URL = "https://mcp.example.test/mcp";
export const AS = "https://auth.example.test";
export const REDIRECT = "http://127.0.0.1:51234/callback";

/**
 * The two option sets the package was extracted from.
 * - `directAuth`: scoped, stamps `obtained_at`, registers a client only when interactive.
 * - `connectFirst`: no scope, no stamp, can register a client when not interactive; sign-in connects an MCP client first.
 */
export const directAuth = {
  clientName: "Example Recorder",
  scope: "openid profile email",
  signInRequiredMessage: "Sign in from the settings window",
} satisfies Partial<McpOAuthProviderOptions>;

export const connectFirst = {
  clientName: "Example Assistant",
  signInRequiredMessage: "Sign in from the Connectors tab",
  clientRegistration: "always",
  stampObtainedAt: false,
} satisfies Partial<McpOAuthProviderOptions>;

export const connectAs = { name: "example-assistant", version: "1.0.0" };

export const json = (body: object, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export function memoryStorage(initial?: McpOAuthState): McpOAuthStorage & { state: () => McpOAuthState | undefined } {
  let current = initial;
  return { load: () => current, save: (next) => void (current = next), state: () => current };
}

export type Call = { method: string; url: string; body: string };

/** A fetch that records every call and answers from `routes` (keyed "METHOD url"). Unknown routes are 404. */
export function fakeFetch(routes: Record<string, (call: Call) => Response>) {
  const calls: Call[] = [];
  const fetchFn = async (input: string | URL, init?: RequestInit): Promise<Response> => {
    const call = { method: init?.method ?? "GET", url: String(input), body: init?.body ? String(init.body) : "" };
    calls.push(call);
    return routes[`${call.method} ${call.url}`]?.(call) ?? new Response("not found", { status: 404 });
  };
  return { fetchFn, calls };
}

export const asMetadata = {
  issuer: AS,
  authorization_endpoint: `${AS}/authorize`,
  token_endpoint: `${AS}/token`,
  registration_endpoint: `${AS}/register`,
  response_types_supported: ["code"],
  code_challenge_methods_supported: ["S256"],
};

// Type-only: the app passes its own `z`, so the schema composes with the app's
// other schemas and zod stays an optional peer (3.25+ or 4).
import type { z } from "zod";

export type McpOAuthTokens = {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  /** Stamped by the SDK: the authorization server these tokens came from. */
  issuer?: string;
  /** Stamped by the provider when the tokens are saved (`stampObtainedAt`), because `expires_in` is relative. */
  obtained_at?: number;
  [key: string]: unknown;
};

export type McpOAuthClientInformation = {
  client_id: string;
  client_secret?: string;
  redirect_uris?: string[];
  /** Stamped by the SDK: the authorization server this client was registered with. */
  issuer?: string;
  [key: string]: unknown;
};

/** Who signed in, if the app keeps it next to the tokens. The provider never reads or writes it. */
export type McpOAuthIdentity = {
  email?: string;
  name?: string;
};

/** What is kept per server. Tokens and client carry the `issuer` they belong to, so a changed authorization server never reuses them. */
export type McpOAuthState = {
  tokens?: McpOAuthTokens;
  clientInformation?: McpOAuthClientInformation;
  identity?: McpOAuthIdentity;
};

/**
 * The zod schema for `McpOAuthState`, built with the app's `z`. Tokens and
 * client information keep unknown keys (passthrough); the top level and
 * `identity` strip them.
 */
export function createMcpOAuthStateSchema(zod: typeof z): z.ZodType<McpOAuthState> {
  return zod.object({
    tokens: zod
      .object({
        access_token: zod.string(),
        token_type: zod.string(),
        refresh_token: zod.string().optional(),
        expires_in: zod.number().optional(),
        scope: zod.string().optional(),
        id_token: zod.string().optional(),
        issuer: zod.string().optional(),
        obtained_at: zod.number().optional(),
      })
      .passthrough()
      .optional(),
    clientInformation: zod
      .object({
        client_id: zod.string(),
        client_secret: zod.string().optional(),
        redirect_uris: zod.array(zod.string()).optional(),
        issuer: zod.string().optional(),
      })
      .passthrough()
      .optional(),
    identity: zod.object({ email: zod.string().optional(), name: zod.string().optional() }).optional(),
  });
}

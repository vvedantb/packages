# Changelog

## 0.1.0

- First release, one root export. Node-side MCP client OAuth (2.1, PKCE, dynamic client registration) for desktop apps:
  - `createMcpOAuthStateSchema(z)`, with the types `McpOAuthState`, `McpOAuthTokens`, `McpOAuthClientInformation` and `McpOAuthIdentity`.
  - `hasMcpOAuthTokens(state)` and `isAccessTokenExpiring(state, now)`.
  - `createMcpOAuthProvider(options)`. Options: `clientName`, `scope`, `redirectUrl`, `redirectToAuthorization`, `signInRequiredMessage`, `clientRegistration`, `stampObtainedAt` and `now`.
  - `authorizeMcpServer({ url, provider, code, fetch?, connectAs? })`, `refreshMcpOAuth({ url, provider, fetch? })` and `revokeMcpOAuth({ url, state, fetch? })`.
  - `startLoopback({ title?, messages? })`, `LOOPBACK_PATH` and `LOOPBACK_TIMEOUT_MS`.
- Peers: `@modelcontextprotocol/sdk` `^1.29.0` is required. `zod` (3.25+ or 4) is optional and is needed only for `createMcpOAuthStateSchema`.

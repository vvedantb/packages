# @vvedantb/mcp-client

Node-side MCP client OAuth for desktop apps, from one root import (`.` only). It covers OAuth 2.1 with PKCE and dynamic client registration against a remote MCP server. Pieces: an `OAuthClientProvider` over storage you supply, sign-in, refresh, best-effort revocation, and a one-shot loopback redirect server on `127.0.0.1`. It has no Electron imports: the app supplies the storage, the redirect and the browser. Compiled ESM with types. Node 20 or later.

## Install

```sh
npm install @vvedantb/mcp-client @modelcontextprotocol/sdk
```

| Peer | Range | Notes |
| --- | --- | --- |
| `@modelcontextprotocol/sdk` | `^1.29.0` | Required. From SDK 1.31.0, the SDK stamps `issuer` on saved tokens and clients. With an older SDK, `revokeMcpOAuth` finds the authorization server again from the MCP server. |
| `zod` | `^3.25.0 \|\| ^4.0.0` | Optional. Needed only for `createMcpOAuthStateSchema`, which takes your `z`. |

## State and storage

```ts
import { z } from "zod";
import { createMcpOAuthStateSchema, type McpOAuthState } from "@vvedantb/mcp-client";

export const mcpOAuthStateSchema = createMcpOAuthStateSchema(z);
const settings = z.object({ oauth: mcpOAuthStateSchema.optional() }); // composes with your own schemas
```

- `McpOAuthState` is `{ tokens?, clientInformation?, identity? }`.
- `tokens` and `clientInformation` keep unknown keys (passthrough). The top level and `identity` strip them.
- `tokens.obtained_at` (milliseconds) is stamped by the provider when `stampObtainedAt` is on.
- `issuer` is stamped by the SDK (1.31.0 or later).
- `identity` (`email`, `name`) is for the app to fill in. The provider never reads or writes it, but keeps it when it updates the state.

`McpOAuthStorage` is `{ load(): McpOAuthState | undefined; save(state: McpOAuthState | undefined): void }`. `save(undefined)` clears everything. Encrypt the state at rest in the app.

`hasMcpOAuthTokens(state)` is true when an access token is stored. `isAccessTokenExpiring(state, now)` is true from two minutes before expiry. If `expires_in` or `obtained_at` is missing, it is false.

## Provider

```ts
const provider = createMcpOAuthProvider({
  storage,
  clientName: "My App",
  redirectUrl: loopback.redirectUrl,          // interactive only
  redirectToAuthorization: (url) => shell.openExternal(url.href),
});
```

| Option | Default | Meaning |
| --- | --- | --- |
| `storage` | (required) | `McpOAuthStorage`. |
| `clientName` | (required) | `client_name` for dynamic registration. |
| `scope` | none | Added to the client metadata. `authorizeMcpServer` without `connectAs` also sends it with the authorization request. |
| `redirectUrl`, `redirectToAuthorization` | none | Set both for the interactive sign-in. Without them the provider only uses and refreshes what is stored. It never opens a browser: `redirectToAuthorization` throws `UnauthorizedError(signInRequiredMessage)`. |
| `signInRequiredMessage` | `"Sign-in required"` | The message of that error. Tell the user where to sign in. |
| `clientRegistration` | `"interactive"` | `"interactive"`: `saveClientInformation` exists only on an interactive provider, so a non-interactive 401 stops before any registration request. `"always"`: every provider can save a client, so the SDK never throws for want of somewhere to keep it. |
| `stampObtainedAt` | `true` | Stamp `obtained_at` on saved tokens, for `isAccessTokenExpiring`. |
| `now` | `Date.now` | Clock for `obtained_at`. |

- The redirect URI is registered as given.
- A saved client registered for another loopback port is ignored by an interactive provider, so a new one is registered.
- `provider.pendingState` is the `state` of the latest authorization request, for the loopback to check.
- `invalidateCredentials` clears `"all"`, `"tokens"`, `"client"` or `"verifier"`.

## Sign in, refresh, revoke

```ts
const loopback = await startLoopback({ title: "My App", messages: { success: "You can close this window and go back to My App." } });
try {
  const provider = createMcpOAuthProvider({ storage, clientName: "My App", redirectUrl: loopback.redirectUrl, redirectToAuthorization });
  const code = loopback.waitForCode(() => provider.pendingState);
  await authorizeMcpServer({ url: mcpUrl, provider, code });
} finally {
  loopback.close();
}
```

- `authorizeMcpServer({ url, provider, code, fetch?, connectAs? })` resolves once the tokens are saved. `code` may reject (cancelled, timed out) before it is awaited; that rejection is never left unhandled.
  - Without `connectAs`, it runs the SDK `auth` flow directly with the provider's `scope`. If the first call returns `REDIRECT`, it awaits `code` and calls `auth` again with it. It throws `"Sign-in did not finish"` if that call does not authorize.
  - With `connectAs: { name, version }`, it connects an MCP client over Streamable HTTP first. A server that needs no sign-in resolves at once and `code` is never awaited. On `UnauthorizedError` it awaits `code` and calls `transport.finishAuth`. Other connect errors are thrown.
- `refreshMcpOAuth({ url, provider, fetch? })` runs `auth` without a code; pass a non-interactive provider so it never opens a browser. It returns `true` when authorized and `false` on any failure; it never throws. Rejected tokens are cleared by the SDK.
- `revokeMcpOAuth({ url, state, fetch? })` is best-effort RFC 7009 revocation, bounded to 3 seconds.
  - It runs only when the authorization server advertises `revocation_endpoint`. The server is the stored `issuer`, or is found from the MCP server.
  - The refresh token is posted first, then the access token, with `client_id` and `client_secret` when stored.
  - It returns `true` if at least one token was revoked. It never throws. Clear the local state yourself afterwards.
- `fetch` is injectable everywhere (`FetchLike` from the SDK).

## Loopback

`startLoopback(options?)` listens on `127.0.0.1` with a free port. It resolves to `{ redirectUrl, waitForCode(expectedState, timeoutMs?), close }`.

- `redirectUrl` is `http://127.0.0.1:<port>/callback` (`LOOPBACK_PATH`).
- `waitForCode` reads `expectedState()` when each request arrives, so the state may be set after the browser opens. Its timeout defaults to `LOOPBACK_TIMEOUT_MS` (5 minutes).
- Responses:
  - Any other path or method gets a 404.
  - A request whose `state` is missing or wrong gets a 400 with `messages.invalid`, and the wait continues.
  - `error` or no `code` gets a 200 with `messages.incomplete`. The wait rejects with `Sign-in was cancelled` or `Sign-in returned no code`.
  - A code gets a 200 with `messages.success`, and the wait resolves.
- No redirect in time rejects with `Sign-in timed out`.

| Option | Default |
| --- | --- |
| `title` | `"Sign in"` |
| `messages.invalid` | `"This sign-in link is not valid. Go back to the app and try again."` |
| `messages.incomplete` | `"Sign-in was not completed. You can close this window."` |
| `messages.success` | `"You can close this window and go back to the app."` |

Each page is `<!doctype html><meta charset="utf-8"><title>{title}</title><body style="font:16px system-ui;margin:3rem"><p>{text}</p></body>`. The title and text are inserted unescaped, so pass constants only.

## Develop

```sh
pnpm --filter @vvedantb/mcp-client build
pnpm --filter @vvedantb/mcp-client test       # vitest from source, then node --test on the built package
pnpm --filter @vvedantb/mcp-client typecheck
```

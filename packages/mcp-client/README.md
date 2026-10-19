# @vvedantb/mcp-client (moved)

This package is no longer developed. Every export moved into `@vvedantb/server` 0.4.0 under the same name. 0.1.0 stays on npm, to be marked deprecated there.

```diff
- import { authorizeMcpServer, createMcpOAuthProvider, startLoopback } from "@vvedantb/mcp-client";
+ import { authorizeMcpServer, createMcpOAuthProvider, startLoopback } from "@vvedantb/server";
```

`@modelcontextprotocol/sdk` stays a dependency of your app: it is an optional peer of `@vvedantb/server`, loaded on first use.

One behaviour changed: a non-interactive provider's `redirectToAuthorization` returns a promise that rejects with the SDK's `UnauthorizedError`, where 0.1.0 threw it synchronously. The SDK awaits the call, so sign-in, refresh and connect flows are unchanged.

Docs: `packages/server/docs/mcp-client.md`. Steps per app: the repository `MIGRATION.md`.

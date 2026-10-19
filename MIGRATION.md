# Migration to the three-package layout

The repository now publishes three packages and keeps one private package.

| Package | Version | Status |
| --- | --- | --- |
| `@vvedantb/ui` | `0.2.0` | Public. Absorbs `@vvedantb/shell`, `@vvedantb/tokens` and `@vvedantb/app-kit`. |
| `@vvedantb/native-ui` | `0.2.0` | Public. No longer needs `@vvedantb/tokens`. |
| `@vvedantb/server` | `0.1.0` | Public. New. Combines `@vvedantb/convex-kit` and `@vvedantb/mcp-kit`. |
| `@vvedantb/config` | `0.1.1` | Private. Not on npm. |

## Folded packages (ui 0.10.0 and server 0.4.0)

`@vvedantb/convex-client` and `@vvedantb/mcp-client` are folded into existing packages. Every export keeps its name. Only the package in the import changes.

| Old | New |
| --- | --- |
| `@vvedantb/convex-client`: `ConvexClerkProvider`, `ConvexClerkProviderProps`, `ConvexClerkUseAuth`, `parseClientEnv`, `VITE_ENV_NAMES`, `ClientEnv`, `ClientEnvOptions`, `ClientEnvSource`, `ClientEnvWithoutViteEnv`, `ViteEnvMode`, `ViteEnvName`, `useEnsureUser`, `EnsureUserMutation` | `@vvedantb/ui` `^0.10.0` |
| `@vvedantb/convex-client`: `mapLoadedQuery`, `forEachLoadedQuery`, `updateAllCachedQueries`, `patchLoadedQuery`, `OptimisticStore`, `tempId`, `TempIdFormat`, `TempIdOptions`, `createMemoryOptimisticStore` | `@vvedantb/server` `^0.4.0` |
| `@vvedantb/mcp-client`: every export | `@vvedantb/server` `^0.4.0` |

Behaviour is unchanged except one detail: a non-interactive MCP OAuth provider's `redirectToAuthorization` now rejects with the SDK's `UnauthorizedError` instead of throwing it synchronously. The SDK awaits that call, so no app flow changes. `@vvedantb/ui` needs React 19 (convex-client allowed React 18); every app already runs 19.

Steps per app. Paths are relative to each app's repository root.

| App | Package | `package.json` | Import rewrites |
| --- | --- | --- | --- |
| app-a | `apps/web` | remove `@vvedantb/convex-client`; `@vvedantb/ui` to `^0.10.0`; add `@vvedantb/server` `^0.4.0` | `src/lib/convex-optimistic.ts`: `tempId`, `updateAllCachedQueries` from `@vvedantb/server`. `src/providers/ConvexClientProvider.tsx` (`ConvexClerkProvider`) and `src/providers/EnsureUser.tsx` (`useEnsureUser`) from `@vvedantb/ui` |
| app-a | `packages/backend` | `@vvedantb/server` to `^0.4.0` | none |
| app-f (app-a desktop) | `apps/desktop` | remove `@vvedantb/mcp-client`; add `@vvedantb/server` `^0.4.0`; keep `@modelcontextprotocol/sdk`; `@vvedantb/ui` to `^0.10.0` (renderer) | `src/mcp-oauth.ts`, `src/mcp-oauth-loopback.ts`: `@vvedantb/mcp-client` to `@vvedantb/server`. The esbuild main bundle still carries the SDK (tested without `node_modules`) |
| app-b | `apps/web` | remove `@vvedantb/convex-client`; `@vvedantb/ui` to `^0.10.0` | `src/env/client.ts` (`parseClientEnv`), `src/providers/ClientProvider.tsx` (`ConvexClerkProvider`), `src/routes/_authed.tsx` (`useEnsureUser`) from `@vvedantb/ui` |
| app-b | `packages/backend` | `@vvedantb/server` to `^0.4.0` | none |
| app-c | `apps/web` | remove `@vvedantb/convex-client`; `@vvedantb/ui` to `^0.10.0` | `src/lib/providers/ConvexClientProvider.tsx` (`ConvexClerkProvider`), `src/env/client.ts` (`parseClientEnv`) from `@vvedantb/ui`. `vitest.config.ts`: `inline: ["@vvedantb/convex-client"]` becomes `inline: ["@vvedantb/ui"]` if a test loads those modules (the package ships TypeScript), else drop it |
| app-c | `packages/backend` | `@vvedantb/server` to `^0.4.0` | none |
| app-d | `apps/web` | remove `@vvedantb/convex-client`; `@vvedantb/ui` to `^0.10.0` | `src/env/client.ts` (`parseClientEnv`), `src/lib/components/ClientProvider.tsx` (`ConvexClerkProvider`) from `@vvedantb/ui`. `vitest.config.ts`: as app-c |
| app-d | `packages/backend` | remove `@vvedantb/convex-client`; `@vvedantb/server` to `^0.4.0` | `client/optimistic/store.ts` (`forEachLoadedQuery`), `client/optimistic/id.ts` (`tempId`), `tests/optimisticMemoryStore.ts` (`createMemoryOptimisticStore`) from `@vvedantb/server`. The mobile app reaches these through `./optimistic`; Metro bundles the whole server root, and its lazy `node:http` and SDK imports sit in `try` blocks, which Expo's Metro config (`allowOptionalDependencies: true`) treats as optional |
| app-e | `apps/web` | remove `@vvedantb/convex-client`; `@vvedantb/ui` to `^0.10.0` | `src/providers/ConvexClientProvider.tsx` (`ConvexClerkProvider`) from `@vvedantb/ui` |
| app-e | `packages/backend` | `@vvedantb/server` to `^0.4.0` | none |

A one-line rewrite where every name in a file moves to the same package: `sed -i 's#"@vvedantb/convex-client"#"@vvedantb/ui"#'` (web providers and env) or `sed -i 's#"@vvedantb/\(convex\|mcp\)-client"#"@vvedantb/server"#'` (optimistic helpers, MCP OAuth). Merge duplicate imports from the same package afterwards.

## Breaking change

`@vvedantb/ui` `0.2.0` is a breaking release, although the version number is a 0.x minor. Three things break:

1. `@vvedantb/tokens` and `@vvedantb/shell` are gone. Their published versions stay on npm, but they get no more releases. Move the imports below before you upgrade `@vvedantb/ui`.
2. The 13 deprecated alias exports are removed (see "Removed aliases").
3. `@vvedantb/tokens` is no longer a peer of `@vvedantb/ui`. The tokens ship inside `@vvedantb/ui`.

Pin `@vvedantb/ui` to `~0.1.6` until the app is migrated. `^0.1.6` does not match `0.2.0`, so a caret range will not upgrade you by accident.

## Packages that were never published

`@vvedantb/app-kit`, `@vvedantb/convex-kit`, `@vvedantb/mcp-kit` and `@vvedantb/config` were marked "not yet published" in the previous README. If that is still true on npm, `npm install` of those names returns a 404 and there is nothing to migrate from: use the new names directly. Check with `npm view <name>` before you rely on this; this file does not record a registry lookup.

`@vvedantb/tokens`, `@vvedantb/shell`, `@vvedantb/ui` and `@vvedantb/native-ui` were published. Their old versions stay installable.

## Import map

### Tokens (`@vvedantb/tokens` to `@vvedantb/ui/tokens`)

| Old | New |
| --- | --- |
| `@import "@vvedantb/tokens";` | `@import "@vvedantb/ui/tokens";` |
| `@import "@vvedantb/tokens/tokens.css";` | `@import "@vvedantb/ui/tokens/tokens.css";` |
| `import { tokens } from "@vvedantb/tokens/native"` | `import { tokens } from "@vvedantb/ui/tokens/native"` |
| `import { tokensPreset } from "@vvedantb/tokens/tailwind-preset"` | `import { tokensPreset } from "@vvedantb/ui/tokens/tailwind-preset"` |
| `@import "@vvedantb/tokens/css/index.css";` | `@import "@vvedantb/ui/tokens/css/index.css";` |
| `@import "@vvedantb/tokens/css/base.css";` | `@import "@vvedantb/ui/tokens/css/base.css";` |
| `@import "@vvedantb/tokens/css/dialog.css";` | `@import "@vvedantb/ui/tokens/css/dialog.css";` |
| `@import "@vvedantb/tokens/css/modal.css";` | `@import "@vvedantb/ui/tokens/css/modal.css";` |
| `@import "@vvedantb/tokens/css/tabs.css";` | `@import "@vvedantb/ui/tokens/css/tabs.css";` |
| `@import "@vvedantb/tokens/css/tabs-pills.css";` | `@import "@vvedantb/ui/tokens/css/tabs-pills.css";` |
| `@import "@vvedantb/tokens/css/utilities.css";` | `@import "@vvedantb/ui/tokens/css/utilities.css";` |
| `@import "@vvedantb/tokens/css/scrollbar-thin.css";` | `@import "@vvedantb/ui/tokens/css/scrollbar-thin.css";` |
| `@import "@vvedantb/tokens/css/animations.css";` | `@import "@vvedantb/ui/tokens/css/animations.css";` |

The `./tokens/css/*.css` pattern also resolves any future CSS file added to that folder.

### Tailwind `@source` lines

| Old | New |
| --- | --- |
| `@source "../node_modules/@vvedantb/ui/src/**/*.{ts,tsx}";` | Unchanged. |
| `@source "../node_modules/@vvedantb/shell/dist/**/*.js";` | `@source "../node_modules/@vvedantb/ui/shell/src/**/*.{ts,tsx}";` |
| `@source "../node_modules/@vvedantb/app-kit/dist/**/*.js";` | `@source "../node_modules/@vvedantb/ui/app/src/**/*.{ts,tsx}";` |

`shell` and `app` are no longer compiled. Both ship source, like the rest of `@vvedantb/ui`.

### Shell (`@vvedantb/shell` to `@vvedantb/ui/shell`)

| Old | New |
| --- | --- |
| `import { SidebarHeader, PillTabs } from "@vvedantb/shell"` | `import { SidebarHeader, PillTabs } from "@vvedantb/ui/shell"` |

### App helpers (`@vvedantb/app-kit` to `@vvedantb/ui/app`)

| Old | New |
| --- | --- |
| `import { … } from "@vvedantb/app-kit"` | `import { … } from "@vvedantb/ui/app"` |

`@clerk/clerk-react`, `@tanstack/react-hotkeys` and `zod` are optional peers of `@vvedantb/ui`. Install them only if the app imports `@vvedantb/ui/app`. Apps that use only primitives need none of them.

### Convex and MCP (`@vvedantb/convex-kit`, `@vvedantb/mcp-kit` to `@vvedantb/server`)

| Old | New |
| --- | --- |
| `import { … } from "@vvedantb/convex-kit"` | `import { … } from "@vvedantb/server"` |
| `import { … } from "@vvedantb/mcp-kit"` | `import { … } from "@vvedantb/server"` |
| `"@vvedantb/convex-kit": "^0.1.0"` in `package.json` | `"@vvedantb/server": "^0.2.0"` |
| `"@vvedantb/mcp-kit": "^0.1.1"` in `package.json` | `"@vvedantb/server": "^0.2.0"` |

Install `@vvedantb/server` once and import everything from the root. `0.1.x` used `/convex` and `/mcp` subpaths, which `0.2.0` removed (see `packages/server/CHANGELOG.md`). `@clerk/backend` and `zod` stay optional peers. The MCP kit no longer has a runtime dependency on the Convex helpers as a separate package.

### Native (`@vvedantb/native-ui`)

| Old | New |
| --- | --- |
| `@vvedantb/native-ui` `0.1.x` with a `@vvedantb/tokens` peer | `@vvedantb/native-ui` `0.2.0`. Remove `@vvedantb/tokens` unless the app also uses it for web. |

`@vvedantb/native-ui` keeps its own copy of the JS tokens in `src/tokens.ts`. It does not depend on `@vvedantb/ui`, so React Native apps install no Radix or `react-dom`. Apps that already depend on `@vvedantb/ui` can import the same values from `@vvedantb/ui/tokens/native`.

### Config (`@vvedantb/config`)

`@vvedantb/config` is now `"private": true`. It is not on npm, and `npm publish` refuses to run. Use it inside this repository through the workspace (`"@vvedantb/config": "workspace:*"`). The folder, exports and `vvedantb-config` CLI are unchanged.

## Removed aliases

The 13 deprecated aliases are deleted, along with `packages/ui/src/deprecated.ts`. Use the `Alt` names. They were already exported.

| Removed | Use |
| --- | --- |
| `AccordionVerve` | `AccordionAlt` |
| `AccordionItemVerve` | `AccordionItemAlt` |
| `AccordionTriggerVerve` | `AccordionTriggerAlt` |
| `AccordionContentVerve` | `AccordionContentAlt` |
| `ClearInputVibot` | `ClearInputAlt` |
| `InputGroupVerve` | `InputGroupAlt` |
| `InputGroupAddonVerve` | `InputGroupAddonAlt` |
| `InputGroupButtonVerve` | `InputGroupButtonAlt` |
| `InputGroupTextVerve` | `InputGroupTextAlt` |
| `InputGroupInputVerve` | `InputGroupInputAlt` |
| `InputGroupTextareaVerve` | `InputGroupTextareaAlt` |
| `ScrollAreaVerve` | `ScrollAreaAlt` |
| `ScrollBarVerve` | `ScrollBarAlt` |

## Other changes

- `@vvedantb/ui` now has `exports` for `.`, `./cn`, `./shell`, `./app`, `./tokens`, `./tokens/tokens.css`, `./tokens/native`, `./tokens/css/*.css` and `./tokens/tailwind-preset`. Deep imports into `src/` are not part of the surface.
- `@vvedantb/ui/shell` and `@vvedantb/ui/app` each keep a small local `cn` that only joins class names. They do not merge Tailwind classes. This matches the old packages.
- The `@vvedantb/tokens` `verify` and `analyze` scripts now run as `pnpm --filter @vvedantb/ui verify` and `analyze`.

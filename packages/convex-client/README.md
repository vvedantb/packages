# @vvedantb/convex-client (moved)

This package is no longer developed. Its exports moved, with the same names and behaviour, into two existing packages. 0.1.0 stays on npm, to be marked deprecated there.

| Export | Now in |
| --- | --- |
| `ConvexClerkProvider`, `ConvexClerkProviderProps`, `ConvexClerkUseAuth` | `@vvedantb/ui` 0.10.0 |
| `parseClientEnv`, `VITE_ENV_NAMES`, `ClientEnv`, `ClientEnvOptions`, `ClientEnvSource`, `ClientEnvWithoutViteEnv`, `ViteEnvMode`, `ViteEnvName` | `@vvedantb/ui` 0.10.0 |
| `useEnsureUser`, `EnsureUserMutation` | `@vvedantb/ui` 0.10.0 |
| `mapLoadedQuery`, `forEachLoadedQuery`, `updateAllCachedQueries`, `patchLoadedQuery`, `OptimisticStore` | `@vvedantb/server` 0.4.0 |
| `tempId`, `TempIdFormat`, `TempIdOptions`, `createMemoryOptimisticStore` | `@vvedantb/server` 0.4.0 |

The non-React helpers went to `@vvedantb/server` so that backend packages, their tests and React Native apps can use them without loading `@vvedantb/ui`.

Replace the dependency and rewrite the imports; nothing else changes. Steps per app: the repository `MIGRATION.md`. Docs: `packages/ui/app/README.md` and `packages/server/docs/convex.md`.

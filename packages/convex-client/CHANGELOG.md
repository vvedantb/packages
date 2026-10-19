# Changelog

## 0.1.0

- First release, one root export:
  - Optimistic updates: `mapLoadedQuery` (also exported as `forEachLoadedQuery` and `updateAllCachedQueries`), `patchLoadedQuery`, `OptimisticStore`, `tempId(table?, { format?: "uuid" | "timestamp" })`.
  - `createMemoryOptimisticStore()`: an in-memory `OptimisticLocalStore` for tests.
  - `ConvexClerkProvider({ client, useAuth?, clerk? })`: `ConvexProviderWithClerk`, a plain `ConvexProvider`, or the children alone.
  - `parseClientEnv(rawEnv, { z, viteEnv?, extend? })`: zod VITE env parsing with your `z` (zod 3.25+ or 4).
  - `useEnsureUser(mutation)`: calls an ensure-user mutation on each sign-in.
- Peers: `convex`, `react` and `@clerk/clerk-react` required; `zod` optional.

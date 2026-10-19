# @vvedantb/convex-client

Browser and React helpers for Convex apps, from one root import.

```sh
npm install @vvedantb/convex-client
```

```ts
import {
  ConvexClerkProvider,
  createMemoryOptimisticStore,
  mapLoadedQuery,
  parseClientEnv,
  patchLoadedQuery,
  tempId,
  useEnsureUser,
} from "@vvedantb/convex-client";
```

There are no subpath exports. Compiled ESM with types in `dist`, built on pack.

## Peers

- `convex` `^1.24.0`, required.
- `react` `^18.0.0 || ^19.0.0`, required.
- `@clerk/clerk-react` `>=5`, **required**. `ConvexClerkProvider` defaults `useAuth` to Clerk's, which needs a static import, and the package has one root export, so every importer loads it. Apps that pass their own `useAuth` (for example from a Clerk browser-extension SDK) still need it installed.
- `zod` `^3.25.0 || ^4.0.0`, optional. The package never imports it at runtime: `parseClientEnv` takes your `z`.

## Optimistic updates

```ts
import { mapLoadedQuery, patchLoadedQuery, tempId } from "@vvedantb/convex-client";

const createTask = useMutation(api.tasks.create).withOptimisticUpdate((store, args) => {
  const now = Date.now();
  mapLoadedQuery(store, api.tasks.list, (tasks, listArgs) =>
    listArgs.projectId === args.projectId
      ? [{ _id: tempId("tasks"), _creationTime: now, title: args.title, done: false }, ...tasks]
      : tasks,
  );
  patchLoadedQuery(store, api.tasks.count, { projectId: args.projectId }, (count) => count + 1);
});
```

| Export | Semantics |
| --- | --- |
| `mapLoadedQuery(store, query, update)` | For each entry of `store.getAllQueries(query)` whose `value` is not `undefined` (still loading), `store.setQuery(query, entry.args, update(entry.value, entry.args))`. Does nothing if the store has no `getAllQueries`. |
| `forEachLoadedQuery`, `updateAllCachedQueries` | The same function as `mapLoadedQuery`, under the names some apps use. |
| `patchLoadedQuery(store, query, args, update)` | If `store.getQuery(query, args)` is not `undefined`, set it to `update(value)`. Never creates an entry. |
| `OptimisticStore` | The part of `OptimisticLocalStore` these read (`getAllQueries` optional). A real `OptimisticLocalStore` fits. |
| `tempId(table?, { format? })` | A placeholder `GenericId<table>`. `"uuid"` (default): `crypto.randomUUID()`. `"timestamp"`: `` `optimistic_${Date.now()}_${Math.random().toString(36).slice(2)}` ``. `table` only types the id. |
| `createMemoryOptimisticStore()` | An in-memory `OptimisticLocalStore` for tests: keyed by function name and `JSON.stringify(args)` (missing args read as `{}`, so key order matters), entries in first-set order, setting `undefined` deletes. |

```ts
// Test an optimistic update without a client.
const store = createMemoryOptimisticStore();
store.setQuery(api.tasks.list, { projectId }, []);
applyCreateTask(store, { projectId, title: "Write tests" });
expect(store.getQuery(api.tasks.list, { projectId })).toHaveLength(1);
```

## `ConvexClerkProvider`

```tsx
import { useStableAuth } from "@vvedantb/ui";
import { ConvexReactClient } from "convex/react";
import { ConvexClerkProvider } from "@vvedantb/convex-client";

const convex = new ConvexReactClient(env.VITE_CONVEX_URL);

<ClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}>
  <ConvexClerkProvider client={convex} useAuth={useStableAuth}>
    <App />
  </ConvexClerkProvider>
</ClerkProvider>;
```

| Props | Renders |
| --- | --- |
| `client` is `null` or `undefined` | `children` alone (no provider). |
| `clerk={false}` | `<ConvexProvider client={client}>`. |
| otherwise | `<ConvexProviderWithClerk client={client} useAuth={useAuth}>`; `useAuth` defaults to `@clerk/clerk-react`'s. |

`clerk` defaults to `true`. Render it inside `ClerkProvider` unless `clerk` is `false`.

## `parseClientEnv`

```ts
import { z } from "zod";
import { parseClientEnv } from "@vvedantb/convex-client";

export const clientEnv = parseClientEnv(import.meta.env, { z, viteEnv: "fallback" });
// { VITE_CONVEX_URL: string; VITE_CLERK_PUBLISHABLE_KEY: string; VITE_ENV: "development" | "staging" | "production" }

export const extensionEnv = parseClientEnv(import.meta.env, {
  z,
  viteEnv: false,
  extend: { VITE_CLERK_SYNC_HOST: z.string().url() },
});
```

The schema is `z.object({ VITE_CONVEX_URL: z.string().min(1), VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1), VITE_ENV: z.enum(["development", "staging", "production"]), ...extend })`, built with your `z`. Only the schema's keys are read from `rawEnv`. Failure throws the `ZodError` from `.parse` (your zod version, all issues together).

| `viteEnv` | `VITE_ENV` |
| --- | --- |
| `"strict"` (default) | Must be one of the three names. |
| `"fallback"` | Any other value, or none, becomes `"development"` before parsing. |
| `false` | Not in the schema or the result. |

## `useEnsureUser`

```tsx
function EnsureUser() {
  useEnsureUser(api.users.ensureUserExists);
  return null;
}
```

Calls `mutation({})` every time `useConvexAuth().isAuthenticated` becomes `true` (once on mount if already signed in), and logs a rejection with `console.error`. Needs a Convex auth provider above it. It is an effect because it syncs the server's users row with the sign-in state. Pair it with `ensureUser` from `@vvedantb/server`.

## How each app maps onto it

| App | Today | With the package |
| --- | --- | --- |
| app-a web | `tempId<T>()` and `updateAllCachedQueries` in `apps/web/src/lib/convex-optimistic.ts` | `tempId<T>()`, `updateAllCachedQueries`; the query-specific helpers stay |
| app-a web | `ConvexProviderWithClerk` + `useStableAuth` in `providers/ConvexClientProvider.tsx` | `<ConvexClerkProvider client={convex} useAuth={useStableAuth}>` |
| app-a web | `EnsureUser` effect in `providers/EnsureUser.tsx` | `useEnsureUser(api.auth.ensureUserExists)` |
| app-a web | env through `@t3-oss/env-core` (`url()`, `startsWith("pk_")`, empty string as undefined) | stays: different rules |
| app-a extension | `ConvexProviderWithClerk` + the extension SDK's `useAuth` | `<ConvexClerkProvider client={convex} useAuth={useAuth}>`; the error boundary and `ClerkProvider` stay |
| app-b shared | `OptimisticStore`, `mapLoadedQuery`, `patchLoadedQuery` in `packages/shared/optimistic/store.ts` | same names |
| app-b web | `ConvexProviderWithClerk` + `useStableAuth` in `providers/ClientProvider.tsx` | `<ConvexClerkProvider client={convexClient} useAuth={useStableAuth}>`; the cache, theme and toaster providers stay inside |
| app-b web | ensure-user effect in `routes/_authed.tsx` | `useEnsureUser(api.users.ensureUserExists)` |
| app-b web | `env/client.ts` (strict `VITE_ENV`) | `parseClientEnv(import.meta.env, { z })` |
| app-c shared | `tempId(table)` and `createMemoryStore` in `packages/shared/optimistic/` | `tempId(table)`, `createMemoryOptimisticStore` |
| app-c web | `ConvexProviderWithClerk` + `useStableAuth` | `<ConvexClerkProvider client={convex} useAuth={useStableAuth}>` |
| app-c web | `env/client.ts` (fallback `VITE_ENV`) | `parseClientEnv(import.meta.env, { z, viteEnv: "fallback" })` |
| app-c extension | providers with the extension SDK's `useAuth`; `env/client.ts` with `VITE_CLERK_SYNC_HOST` | `ConvexClerkProvider` with `useAuth`; `parseClientEnv(import.meta.env, { z, viteEnv: false, extend: { VITE_CLERK_SYNC_HOST: z.string().url() } })` |
| app-d backend client | `forEachLoadedQuery` in `client/optimistic/store.ts`, `optimisticId()` in `client/optimistic/id.ts`, `tests/optimisticMemoryStore.ts` | `forEachLoadedQuery`, `tempId(table, { format: "timestamp" })`, `createMemoryOptimisticStore`; `currentUserId` and `authorName` stay (they read app queries) |
| app-d web | `ConvexProvider` when Clerk failed, else `ConvexProviderWithClerk` + Clerk's `useAuth` | `<ConvexClerkProvider client={convex} clerk={!clerkDidFail()}>` |
| app-d web | `env/client.ts` (fallback `VITE_ENV`) | `parseClientEnv(import.meta.env, { z, viteEnv: "fallback" })` |
| app-e web | no client → children; Clerk not configured → `ConvexProvider`; else `ConvexProviderWithClerk` + `useStableAuth` | `<ConvexClerkProvider client={convex} clerk={clerkConfigured()} useAuth={useStableAuth}>` |
| app-e web | `env.ts` with `?? ""` defaults (no zod) | stays: it must not throw when unconfigured |

### Differences between the copies

- **`tempId` format.** app-a and app-c use `crypto.randomUUID()` (app-c takes the table name as an unused argument); app-d uses `optimistic_<ms>_<random base 36>`. Both are reproducible through `format`.
- **`getAllQueries`.** app-b's `OptimisticStore` makes it optional and does nothing without it; app-a and app-d require it. Same result on a real store, so the three are one function.
- **Update callback.** app-a's map function gets the value only; app-b and app-d also get the args. Passing args to a one-argument callback changes nothing.
- **Memory stores.** app-d's is a `Map` per function; app-c's is one array. Same lookups, order and deletes. app-d also reads `setQuery` with missing args as `{}`; app-c would key it as `undefined` (unreachable through Convex's types). The package follows app-d. `getAllQueries` returns the stored entry objects (app-d), not copies (app-c).
- **Env.** app-b rejects an unknown `VITE_ENV`; app-c web and app-d fall back to `"development"`; app-c's extension has no `VITE_ENV`. app-a (t3 env, stricter rules) and app-e (no validation) stay as they are.
- **Ensure-user effects.** Only app-a web and app-b web share one effect (`useConvexAuth().isAuthenticated`, `({}).catch(console.error)`). The others differ in trigger or error handling and stay: app-a's extension and app-c's extension use Clerk's `isLoaded && isSignedIn` (app-a does not catch); app-c web waits for Clerk's `user`; app-e calls it only for an admitted user and swallows errors; the mobile apps await it with their own logging.

## Develop

```sh
pnpm --filter @vvedantb/convex-client build
pnpm --filter @vvedantb/convex-client test       # vitest (jsdom), then the built-package check
pnpm --filter @vvedantb/convex-client typecheck
```

Tests port each app's copy and run it next to the package on the same inputs. `tests-node/esm-exports.mjs` builds the package, imports it from plain Node without zod installed, and typechecks a consumer against the published types with zod 4 and with zod 3.25.

import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";

/**
 * The part of Convex's `OptimisticLocalStore` these helpers use. A real
 * `OptimisticLocalStore` fits; `getAllQueries` is optional so a hand-written
 * store without it works too (then `mapLoadedQuery` does nothing).
 */
export type OptimisticStore = {
  getQuery<Query extends FunctionReference<"query">>(
    query: Query,
    args: FunctionArgs<Query>,
  ): undefined | FunctionReturnType<Query>;
  setQuery<Query extends FunctionReference<"query">>(
    query: Query,
    args: FunctionArgs<Query>,
    value: undefined | FunctionReturnType<Query>,
  ): void;
  getAllQueries?: <Query extends FunctionReference<"query">>(
    query: Query,
  ) => Array<{
    args: FunctionArgs<Query>;
    value: undefined | FunctionReturnType<Query>;
  }>;
};

/**
 * Replace every loaded copy of `query` (one per args) with `update(value, args)`.
 * Copies still loading (`value === undefined`) are skipped.
 */
export function mapLoadedQuery<Query extends FunctionReference<"query">>(
  store: OptimisticStore,
  query: Query,
  update: (value: FunctionReturnType<Query>, args: FunctionArgs<Query>) => FunctionReturnType<Query>,
): void {
  const entries = store.getAllQueries?.(query) ?? [];
  for (const entry of entries) {
    if (entry.value === undefined) continue;
    store.setQuery(query, entry.args, update(entry.value, entry.args));
  }
}

/** `mapLoadedQuery` under the name some apps use. Same function. */
export const forEachLoadedQuery = mapLoadedQuery;

/** `mapLoadedQuery` under the name some apps use. Same function. */
export const updateAllCachedQueries = mapLoadedQuery;

/** Replace the copy of `query` loaded for `args` with `update(value)`; nothing if it is not loaded. */
export function patchLoadedQuery<Query extends FunctionReference<"query">>(
  store: OptimisticStore,
  query: Query,
  args: FunctionArgs<Query>,
  update: (value: FunctionReturnType<Query>) => FunctionReturnType<Query>,
): void {
  const current = store.getQuery(query, args);
  if (current === undefined) return;
  store.setQuery(query, args, update(current));
}

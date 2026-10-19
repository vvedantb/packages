import type { OptimisticLocalStore } from "convex/browser";
import {
  getFunctionName,
  makeFunctionReference,
  type FunctionArgs,
  type FunctionReference,
  type FunctionReturnType,
} from "convex/server";
import { describe, expect, it } from "vitest";
import {
  createMemoryOptimisticStore,
  forEachLoadedQuery,
  mapLoadedQuery,
  patchLoadedQuery,
  updateAllCachedQueries,
  type OptimisticStore,
} from "@vvedantb/convex-client";

type Task = { _id: string; title: string; done: boolean };
const listTasks = makeFunctionReference<"query", { projectId: string }, Task[]>("tasks:list");
const getSettings = makeFunctionReference<"query", Record<string, never>, { theme: string } | null>("settings:get");

// ---- Ports of each app's copy ---------------------------------------------

/** app-a `updateAllCachedQueries` (requires getAllQueries, mapFn gets the value only). */
function appAUpdateAllCachedQueries<Query extends FunctionReference<"query">>(
  localStore: OptimisticLocalStore,
  query: Query,
  mapFn: (value: FunctionReturnType<Query>) => FunctionReturnType<Query>,
): void {
  for (const entry of localStore.getAllQueries(query)) {
    if (entry.value === undefined) continue;
    localStore.setQuery(query, entry.args, mapFn(entry.value));
  }
}

/** app-b `mapLoadedQuery` (getAllQueries optional). */
function appBMapLoadedQuery<Query extends FunctionReference<"query">>(
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

/** app-b `patchLoadedQuery`. */
function appBPatchLoadedQuery<Query extends FunctionReference<"query">>(
  store: OptimisticStore,
  query: Query,
  args: FunctionArgs<Query>,
  update: (value: FunctionReturnType<Query>) => FunctionReturnType<Query>,
): void {
  const current = store.getQuery(query, args);
  if (current === undefined) return;
  store.setQuery(query, args, update(current));
}

/** app-d `forEachLoadedQuery`. */
function appDForEachLoadedQuery<Query extends FunctionReference<"query">>(
  store: OptimisticLocalStore,
  query: Query,
  update: (value: FunctionReturnType<Query>, args: FunctionArgs<Query>) => FunctionReturnType<Query>,
) {
  for (const entry of store.getAllQueries(query)) {
    if (entry.value === undefined) continue;
    store.setQuery(query, entry.args, update(entry.value, entry.args));
  }
}

/** A store with two loaded lists, one list still loading and settings loaded. */
function seeded(): OptimisticLocalStore {
  const store = createMemoryOptimisticStore();
  store.setQuery(listTasks, { projectId: "p1" }, [{ _id: "t1", title: "One", done: false }]);
  store.setQuery(listTasks, { projectId: "p2" }, [{ _id: "t2", title: "Two", done: true }]);
  store.setQuery(getSettings, {}, { theme: "light" });
  return store;
}

/** Every entry, for comparing two stores. */
function snapshot(store: OptimisticLocalStore) {
  return [listTasks, getSettings].map((query) => [getFunctionName(query), store.getAllQueries(query)]);
}

/** A store whose `getAllQueries` also returns a loading entry (`value: undefined`). */
function withLoadingEntry(store: OptimisticLocalStore): OptimisticLocalStore {
  return {
    getQuery: store.getQuery,
    setQuery: store.setQuery,
    getAllQueries(query) {
      return [...store.getAllQueries(query), { args: { projectId: "loading" }, value: undefined }];
    },
  };
}

const markDone = (tasks: Task[]) => tasks.map((task) => ({ ...task, done: true }));

describe("mapLoadedQuery and its aliases", () => {
  it("forEachLoadedQuery and updateAllCachedQueries are the same function", () => {
    expect(forEachLoadedQuery).toBe(mapLoadedQuery);
    expect(updateAllCachedQueries).toBe(mapLoadedQuery);
  });

  it("matches app-a, app-b and app-d on every loaded copy", () => {
    const ours = seeded();
    mapLoadedQuery(ours, listTasks, markDone);
    for (const reference of [
      (store: OptimisticLocalStore) => appAUpdateAllCachedQueries(store, listTasks, markDone),
      (store: OptimisticLocalStore) => appBMapLoadedQuery(store, listTasks, markDone),
      (store: OptimisticLocalStore) => appDForEachLoadedQuery(store, listTasks, markDone),
    ]) {
      const theirs = seeded();
      reference(theirs);
      expect(snapshot(ours)).toEqual(snapshot(theirs));
    }
    expect(ours.getQuery(listTasks, { projectId: "p1" })).toEqual([{ _id: "t1", title: "One", done: true }]);
  });

  it("skips loading copies and passes args to update", () => {
    const seen: string[] = [];
    const store = withLoadingEntry(seeded());
    mapLoadedQuery(store, listTasks, (tasks, args) => {
      seen.push(args.projectId);
      return tasks;
    });
    expect(seen).toEqual(["p1", "p2"]);
    expect(store.getQuery(listTasks, { projectId: "loading" })).toBeUndefined();
  });

  it("does nothing on a store without getAllQueries (app-b)", () => {
    const inner = seeded();
    const store: OptimisticStore = { getQuery: inner.getQuery, setQuery: inner.setQuery };
    mapLoadedQuery(store, listTasks, () => []);
    appBMapLoadedQuery(store, listTasks, () => []);
    expect(inner.getQuery(listTasks, { projectId: "p1" })).toHaveLength(1);
  });
});

describe("patchLoadedQuery", () => {
  it("matches app-b for a loaded and an unloaded copy", () => {
    for (const args of [{}, { other: "x" }]) {
      const ours = seeded();
      const theirs = seeded();
      const update = (value: { theme: string } | null) => (value ? { ...value, theme: "dark" } : value);
      // @ts-expect-error the second args shape is not the query's; it exercises the not-loaded branch
      patchLoadedQuery(ours, getSettings, args, update);
      // @ts-expect-error as above
      appBPatchLoadedQuery(theirs, getSettings, args, update);
      expect(snapshot(ours)).toEqual(snapshot(theirs));
    }
    const store = seeded();
    patchLoadedQuery(store, getSettings, {}, () => ({ theme: "dark" }));
    expect(store.getQuery(getSettings, {})).toEqual({ theme: "dark" });
  });

  it("does not create an entry that is not loaded", () => {
    const store = createMemoryOptimisticStore();
    patchLoadedQuery(store, getSettings, {}, () => ({ theme: "dark" }));
    expect(store.getAllQueries(getSettings)).toEqual([]);
  });
});

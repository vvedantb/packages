import type { OptimisticLocalStore } from "convex/browser";
import { anyApi, getFunctionName, makeFunctionReference, type FunctionArgs, type FunctionReference, type FunctionReturnType } from "convex/server";
import { describe, expect, it } from "vitest";
import { createMemoryOptimisticStore } from "@vvedantb/server";

// ---- Ports of the two test stores ------------------------------------------

/** app-d `tests/optimisticMemoryStore.ts`: Map per function name. */
function appDCreateMemoryStore(): OptimisticLocalStore {
  type Slot = { args: FunctionArgs<FunctionReference<"query">>; value: ReturnType<OptimisticLocalStore["getQuery"]> };
  const data = new Map<string, Map<string, Slot>>();
  return {
    getQuery(query, ...args) {
      const key = JSON.stringify(args[0] ?? {});
      return data.get(getFunctionName(query))?.get(key)?.value;
    },
    getAllQueries(query) {
      const slots = data.get(getFunctionName(query));
      if (!slots) return [];
      return [...slots.values()];
    },
    setQuery(query, args, value) {
      const name = getFunctionName(query);
      let slots = data.get(name);
      if (!slots) {
        slots = new Map();
        data.set(name, slots);
      }
      const key = JSON.stringify(args ?? {});
      if (value === undefined) {
        slots.delete(key);
        return;
      }
      slots.set(key, { args, value });
    },
  };
}

/** app-c `optimistic/memoryStore.ts`: one array of rows. */
function appCCreateMemoryStore(): OptimisticLocalStore {
  type StoredQuery = { name: string; argsJson: string; args: object; value: FunctionReturnType<FunctionReference<"query">> };
  const rows: StoredQuery[] = [];
  return {
    getQuery(query, ...rest) {
      const args = rest[0] ?? {};
      const name = getFunctionName(query);
      const key = JSON.stringify(args);
      return rows.find((row) => row.name === name && row.argsJson === key)?.value;
    },
    getAllQueries(query) {
      const name = getFunctionName(query);
      return rows.filter((row) => row.name === name).map((row) => ({ args: row.args, value: row.value }));
    },
    setQuery(query, args, value) {
      const name = getFunctionName(query);
      const key = JSON.stringify(args);
      const index = rows.findIndex((row) => row.name === name && row.argsJson === key);
      if (value === undefined) {
        if (index >= 0) rows.splice(index, 1);
        return;
      }
      const next: StoredQuery = { name, argsJson: key, args, value };
      if (index >= 0) {
        rows[index] = next;
        return;
      }
      rows.push(next);
    },
  };
}

const list = makeFunctionReference<"query", { folder?: string }, string[]>("notes:list");
const count = makeFunctionReference<"query", Record<string, never>, number>("notes:count");

type Step =
  | { op: "set"; query: "list"; args: { folder?: string }; value: string[] | undefined }
  | { op: "set"; query: "count"; args: Record<string, never>; value: number | undefined };

const steps: Step[] = [
  { op: "set", query: "list", args: { folder: "a" }, value: ["x"] },
  { op: "set", query: "list", args: {}, value: ["root"] },
  { op: "set", query: "count", args: {}, value: 2 },
  { op: "set", query: "list", args: { folder: "b" }, value: ["y"] },
  // Overwrite keeps the first-set position; delete then re-add moves to the end.
  { op: "set", query: "list", args: { folder: "a" }, value: ["x", "z"] },
  { op: "set", query: "list", args: {}, value: undefined },
  { op: "set", query: "list", args: {}, value: ["root again"] },
  { op: "set", query: "count", args: {}, value: undefined },
  { op: "set", query: "count", args: {}, value: undefined },
];

function apply(store: OptimisticLocalStore, step: Step) {
  if (step.query === "list") store.setQuery(list, step.args, step.value);
  else store.setQuery(count, step.args, step.value);
}

function read(store: OptimisticLocalStore) {
  return {
    all: store.getAllQueries(list),
    counts: store.getAllQueries(count),
    a: store.getQuery(list, { folder: "a" }),
    root: store.getQuery(list, {}),
    // Convex passes no args object for an argless query: read as {}.
    rootNoArgs: store.getQuery(count),
    missing: store.getQuery(list, { folder: "missing" }),
  };
}

describe("createMemoryOptimisticStore", () => {
  it("matches app-c and app-d after every step", () => {
    const ours = createMemoryOptimisticStore();
    const appC = appCCreateMemoryStore();
    const appD = appDCreateMemoryStore();
    for (const step of steps) {
      for (const store of [ours, appC, appD]) apply(store, step);
      expect(read(ours)).toEqual(read(appC));
      expect(read(ours)).toEqual(read(appD));
    }
    expect(ours.getAllQueries(list).map((entry) => entry.args)).toEqual([{ folder: "a" }, { folder: "b" }, {}]);
  });

  it("keys args by JSON, so key order matters like both copies", () => {
    const pair = makeFunctionReference<"query", { a: number; b: number }, number>("pair:get");
    const ours = createMemoryOptimisticStore();
    ours.setQuery(pair, { a: 1, b: 2 }, 3);
    expect(ours.getQuery(pair, { b: 2, a: 1 })).toBeUndefined();
    expect(ours.getQuery(pair, { a: 1, b: 2 })).toBe(3);
  });

  // The store carries its own copy of Convex's getFunctionName (the package never imports convex at runtime).
  it("names and rejects references exactly as Convex's getFunctionName", () => {
    const store = createMemoryOptimisticStore();
    const references = [
      list,
      anyApi.tasks.list,
      "tasks:list",
      "",
      "function://handle-1",
      { [Symbol.for("toReferencePath")]: "_reference/childComponent/tasks/list" },
      {},
    ];
    for (const reference of references) {
      const viaConvex = settle(() => Reflect.apply(getFunctionName, undefined, [reference]));
      const set = settle(() => Reflect.apply(store.setQuery, store, [reference, {}, viaConvex.value ?? "x"]));
      const get = settle(() => Reflect.apply(store.getQuery, store, [reference, {}]));
      if ("error" in viaConvex) {
        expect(set).toEqual(viaConvex);
        expect(get).toEqual(viaConvex);
      } else {
        expect(set).toEqual({ value: undefined });
        // Stored under Convex's name: read back through a reference Convex names the same.
        expect(get).toEqual({ value: viaConvex.value });
      }
    }
  });
});

function settle(run: () => string | void) {
  try {
    return { value: run() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

import type { OptimisticLocalStore } from "convex/browser";
import { getFunctionName, type FunctionArgs, type FunctionReference } from "convex/server";

type Slot = {
  args: FunctionArgs<FunctionReference<"query">>;
  value: ReturnType<OptimisticLocalStore["getQuery"]>;
};

/**
 * An in-memory `OptimisticLocalStore` for testing optimistic updates without a
 * Convex client. Entries are keyed by function name and `JSON.stringify(args)`
 * (missing args read as `{}`), kept in first-set order; setting `undefined`
 * removes an entry.
 */
export function createMemoryOptimisticStore(): OptimisticLocalStore {
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

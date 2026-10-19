import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionArgs, FunctionReference } from "convex/server";

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

// `getFunctionName` from `convex/server` (as of 1.47), copied so this package
// never imports `convex` at runtime: the root is also loaded where `convex` is
// not installed. For the references Convex creates (`api`/`internal` refs,
// name strings, function handles, component refs) it returns the same name or
// throws the same message; tests compare it with Convex's.
const functionName: unique symbol = Symbol.for("functionName");
const toReferencePath: unique symbol = Symbol.for("toReferencePath");

function getFunctionName(reference: Parameters<OptimisticLocalStore["getQuery"]>[0] | string): string {
  if (typeof reference === "string") {
    if (reference.startsWith("function://")) {
      throw new Error(
        `Expected function reference like "api.file.func" or "internal.file.func", but received function handle ${reference}`,
      );
    }
    return reference;
  }
  // Read, not `in`: `api` references are proxies that answer property reads only.
  const symbols: { readonly [key: symbol]: string | undefined } = reference;
  const name = symbols[functionName];
  if (name) return name;
  const path = symbols[toReferencePath] ?? null;
  if (!path) throw new Error(`${String(reference)} is not a functionReference`);
  throw new Error(
    `Expected function reference in the current component like "api.file.func" or "internal.file.func", but received reference ${String(path)}`,
  );
}

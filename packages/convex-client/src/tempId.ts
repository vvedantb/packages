import type { GenericId } from "convex/values";

/**
 * - `"uuid"` (default): `crypto.randomUUID()`.
 * - `"timestamp"`: `optimistic_<Date.now()>_<Math.random() base 36>`.
 */
export type TempIdFormat = "uuid" | "timestamp";

export type TempIdOptions = { format?: TempIdFormat };

/**
 * A placeholder id for an optimistic insert. The server's real id replaces it
 * when the mutation lands. `table` only names the id type and is not used at
 * runtime: `tempId("tasks")` or `tempId<"tasks">()`.
 */
export function tempId<Table extends string>(
  table?: Table,
  options: TempIdOptions = {},
): GenericId<Table> {
  const value =
    options.format === "timestamp"
      ? `optimistic_${Date.now()}_${Math.random().toString(36).slice(2)}`
      : crypto.randomUUID();
  if (!isPlaceholderId<Table>(value)) {
    throw new Error(`tempId: empty id for ${table ?? "table"}`);
  }
  return value;
}

// GenericId is a branded string with no constructor; this guard is the one
// place a placeholder string is accepted as one.
function isPlaceholderId<Table extends string>(value: string): value is GenericId<Table> {
  return value.length > 0;
}

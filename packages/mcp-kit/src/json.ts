/** A JSON value as produced by `JSON.parse`. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** A JSON object as produced by `JSON.parse`. */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Anything `JSON.stringify` turns into JSON text. Wider than `JsonValue` so
 * Convex documents with optional fields can be passed without a cast.
 */
export type JsonInput = object | string | number | boolean | null;

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Any thrown value. `catch` bindings are assignable to it without a cast. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Thrown = {} | null | undefined;

/** `err.message` for an `Error`, otherwise `String(err)`, like the MCP SDK. */
export function errorMessage(err: Thrown): string {
  return err instanceof Error ? err.message : String(err);
}

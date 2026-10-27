import { useState } from "react";

/**
 * Keeps the last loaded `result` while a query is skipped, instead of
 * flipping to `undefined`. Pair it with any `useQuery`:
 *
 *   const result = useQuery(api.x.get, args);
 *   const shown = useHeldResult(result, args === "skip" ? null : JSON.stringify(args));
 *
 * `key` names what the result is for, and `null` means skipped. While skipped
 * the last result stays (so a hidden pane that pauses its subscription does
 * not flash a spinner when shown again). A new non-null key loads as
 * `undefined` rather than showing the previous key's data; pass a stable key
 * on purpose to keep the last result across argument changes.
 */
export function useHeldResult<T>(result: T | undefined, key: string | null): T | undefined {
  // State, not a ref: reading a ref during render makes the React Compiler
  // skip the file. Adjusting state during render is the supported way to
  // remember a previous value.
  const [held, setHeld] = useState({ key, value: result });
  if (result !== undefined && (result !== held.value || key !== held.key)) {
    setHeld({ key, value: result });
  }
  if (result !== undefined) return result;
  return key === null || key === held.key ? held.value : undefined;
}

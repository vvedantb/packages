/** The value, or a thrown error naming what was missing. Keeps tests free of `!`. */
export function must<T>(value: T | null | undefined, what = "value"): T {
  if (value === null || value === undefined) throw new Error(`Missing ${what}`);
  return value;
}

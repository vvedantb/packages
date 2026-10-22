/** Largest artifact body, in characters. Convex documents stop at 1 MiB. */
export const ARTIFACT_BODY_MAX_CHARS = 400_000;
/** Versions kept per artifact; older ones are pruned. */
export const ARTIFACT_VERSION_KEEP = 10;

export const ARTIFACT_STATE_MAX_KEYS = 32;
export const ARTIFACT_STATE_MAX_VALUE_BYTES = 16 * 1024;
export const ARTIFACT_STATE_MAX_TOTAL_BYTES = 64 * 1024;
export const ARTIFACT_STATE_MAX_KEY_LENGTH = 64;
/** Server side: a second state write for the same artifact and user within this window is refused. */
export const ARTIFACT_STATE_MIN_WRITE_INTERVAL_MS = 1000;
/** Host side: state is saved this long after the last change, and at least this often while changes keep coming. */
export const ARTIFACT_STATE_DEBOUNCE_MS = 5000;
export const ARTIFACT_STATE_MAX_WAIT_MS = 30_000;
/** State writes per user per UTC day (see `utcDayKey`). */
export const ARTIFACT_STATE_DAILY_WRITES = { free: 400, pro: 4000 } as const;

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/** The UTC day of `now` as a number, for example 20261022. */
export function utcDayKey(now: number): number {
  const date = new Date(now);
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

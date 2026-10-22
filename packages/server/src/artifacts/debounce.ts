import { ARTIFACT_STATE_DEBOUNCE_MS, ARTIFACT_STATE_MAX_WAIT_MS } from "./limits.js";

export type DebounceTimers = {
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
};

export type TrailingMaxDebounce = {
  schedule(): void;
  flushNow(): void;
  cancel(): void;
  readonly isPending: boolean;
};

/**
 * Calls `flush` `trailingMs` after the last `schedule()`, and at the latest
 * `maxMs` after the first one, so steady changes still save. `flushNow()`
 * runs a pending flush at once (for `pagehide`); `cancel()` drops it.
 */
export function createTrailingMaxDebounce(
  flush: () => void,
  trailingMs: number = ARTIFACT_STATE_DEBOUNCE_MS,
  maxMs: number = ARTIFACT_STATE_MAX_WAIT_MS,
  timers: DebounceTimers = {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id),
  },
): TrailingMaxDebounce {
  let trailingId: ReturnType<typeof setTimeout> | undefined;
  let maxId: ReturnType<typeof setTimeout> | undefined;
  let pending = false;

  function clearTimers() {
    if (trailingId !== undefined) timers.clearTimeout(trailingId);
    if (maxId !== undefined) timers.clearTimeout(maxId);
    trailingId = undefined;
    maxId = undefined;
  }

  function run() {
    clearTimers();
    if (!pending) return;
    pending = false;
    flush();
  }

  return {
    schedule() {
      pending = true;
      if (trailingId !== undefined) timers.clearTimeout(trailingId);
      trailingId = timers.setTimeout(run, trailingMs);
      if (maxId === undefined) maxId = timers.setTimeout(run, maxMs);
    },
    flushNow() {
      run();
    },
    cancel() {
      pending = false;
      clearTimers();
    },
    get isPending() {
      return pending;
    },
  };
}

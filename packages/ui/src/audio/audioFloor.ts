/** Calls closer together than this are dropped, so overlapping events sound once. */
export const AUDIO_FLOOR_MIN_GAP_S = 1;

let lastAcquiredAtS: number | null = null;

function nowS(): number {
  return performance.now() / 1000;
}

/**
 * Takes the shared audio floor. Returns `true` when at least 1 second has
 * passed since the last sound that took it, and starts a new gap. Returns
 * `false` otherwise, and the caller should stay silent.
 *
 * Every package sound (`playChime`, `playTone`) goes through this one floor.
 * Apps can route their own sounds through it too.
 */
export function tryAcquireAudioFloor(): boolean {
  const now = nowS();
  if (lastAcquiredAtS !== null && now - lastAcquiredAtS < AUDIO_FLOOR_MIN_GAP_S) {
    return false;
  }
  lastAcquiredAtS = now;
  return true;
}

/** Runs `play` only if the shared floor is free. Returns whether it ran. */
export function withAudioFloor(play: () => void): boolean {
  if (!tryAcquireAudioFloor()) return false;
  play();
  return true;
}

/** Clears the floor. For tests. */
export function resetAudioFloor(): void {
  lastAcquiredAtS = null;
}

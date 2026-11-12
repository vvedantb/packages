/**
 * The web `LoadingState` `Drive` pixel grid (`packages/ui/src/ui/loading-state.tsx`)
 * as plain numbers, so the timing stays testable apart from Reanimated. Each
 * function is a worklet: the grid runs it on the UI thread every frame.
 *
 * Nine cells in a 3x3 grid pulse in a chevron wavefront that drives right.
 * The 650 ms cycle is shorter than the sweep (0-360 ms of delays), so two
 * fronts are always in flight.
 */

/** One pulse of a cell, in ms: the web `PATTERNS.Drive.dur`. */
export const DRIVE_CYCLE_MS = 650;

/** A cell's opacity at the low and high keyframes. */
const LOW = 0.12;
const HIGH = 1;
/** A cell's still opacity before its delay ends: the web inline `opacity: 0.15`. */
export const DRIVE_IDLE_OPACITY = 0.15;

/**
 * Each cell's start delay in ms, row by row: column plus distance from the
 * middle row, times 90. The middle row leads, so the front is a chevron.
 */
export const DRIVE_DELAYS: readonly number[] = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3);
  const column = i % 3;
  return (column + Math.abs(row - 1)) * 90;
});

/** The web `size` tokens in points: `sm` is an 11 pt grid, `default` 15 pt. */
export const DRIVE_SIZES = {
  sm: { cell: 3, gap: 1, radius: 0.5 },
  default: { cell: 4, gap: 1.5, radius: 1 },
} as const;
export type LoadingStateSize = keyof typeof DRIVE_SIZES;

/**
 * The frame held with Reduce Motion: mid-sweep, so the still grid reads as
 * the chevron (left column bright, right column dim), not nine flat cells.
 */
export const DRIVE_STILL_FRAME_MS = DRIVE_CYCLE_MS * 1.5;

/** CSS `ease-in-out`, `cubic-bezier(0.42, 0, 0.58, 1)`, at progress `x` (0-1). */
export function cssEaseInOut(x: number): number {
  "worklet";
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // x(t) = 3(1-t)^2 t x1 + 3(1-t) t^2 x2 + t^3 rises with t, so bisect for t.
  const curve = (t: number, p1: number, p2: number) =>
    3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;
  let lo = 0;
  let hi = 1;
  let t = x;
  for (let i = 0; i < 20; i++) {
    t = (lo + hi) / 2;
    if (curve(t, 0.42, 0.58) < x) lo = t;
    else hi = t;
  }
  return curve(t, 0, 1);
}

/**
 * A cell's opacity `elapsedMs` after the grid mounted, as the web WAAPI pulse:
 * still at 0.15 during its delay, then 0.12 -> 1 -> 0.12 every cycle, each
 * half eased `ease-in-out`.
 */
export function driveCellOpacity(elapsedMs: number, delayMs: number): number {
  "worklet";
  const local = elapsedMs - delayMs;
  if (local < 0) return DRIVE_IDLE_OPACITY;
  const progress = (local % DRIVE_CYCLE_MS) / DRIVE_CYCLE_MS;
  return progress < 0.5
    ? LOW + (HIGH - LOW) * cssEaseInOut(progress * 2)
    : HIGH - (HIGH - LOW) * cssEaseInOut((progress - 0.5) * 2);
}

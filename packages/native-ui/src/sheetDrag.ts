/**
 * The rules of a bottom sheet's drag to dismiss, as plain numbers, so they
 * stay testable apart from the gesture. Distances are in points, `vy` in
 * points per millisecond (the React Native `PanResponder` unit).
 */

/** How far ahead (ms) the release velocity carries the sheet when deciding to close. */
const PROJECTION_MS = 200;

/** A flick down at this speed (pt/ms, so 1000 pt/s) closes the sheet however short the drag. */
const FLICK_VELOCITY = 1;

/** How far an upward pull may lift the sheet: less than the corner radius hidden below the screen. */
export const SHEET_OVERPULL = 12;

/** A drag that starts the sheet gesture: down, more vertical than sideways, past a small slop. */
export function isSheetDragDown(dx: number, dy: number): boolean {
  return dy > 4 && Math.abs(dy) > Math.abs(dx);
}

/**
 * Where the sheet sits for a finger `dy` from the start: it follows the finger
 * down, and an upward pull meets growing resistance, up to `SHEET_OVERPULL`.
 */
export function sheetDragOffset(dy: number): number {
  if (dy >= 0) return dy;
  return -SHEET_OVERPULL * (1 - 1 / (1 - dy / (SHEET_OVERPULL * 4)));
}

/**
 * Whether a released drag closes the sheet: a quick flick down, or a drag
 * whose position, carried on by its speed, passes half the sheet. A slow,
 * short drag springs back.
 */
export function sheetDragDismisses({ dy, vy, height }: { dy: number; vy: number; height: number }): boolean {
  if (dy <= 0) return false;
  if (vy >= FLICK_VELOCITY) return true;
  return dy + Math.max(0, vy) * PROJECTION_MS > height / 2;
}

/** The slide out after a release, in ms: the rest of the way at the release speed, kept between 120 and 250. */
export function sheetDismissDuration({ dy, vy, height }: { dy: number; vy: number; height: number }): number {
  const remaining = Math.max(0, height - dy);
  const speed = Math.max(vy, 0.8);
  return Math.round(Math.min(250, Math.max(120, remaining / speed)));
}

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
 * Where the sheet sits for a drag that would put it `dy` below rest (where
 * the drag started plus the finger's travel): it follows the finger down, and
 * past rest upward it meets growing resistance, up to `SHEET_OVERPULL`.
 */
export function sheetDragOffset(dy: number): number {
  if (dy >= 0) return dy;
  return -SHEET_OVERPULL * (1 - 1 / (1 - dy / (SHEET_OVERPULL * 4)));
}

/**
 * Whether a released drag closes the sheet: a quick flick down, or a drag
 * whose position (`dy` below rest), carried on by its speed, passes half the
 * sheet. A slow, short drag springs back.
 */
export function sheetDragDismisses({ dy, vy, height }: { dy: number; vy: number; height: number }): boolean {
  if (dy <= 0) return false;
  if (vy >= FLICK_VELOCITY) return true;
  return dy + Math.max(0, vy) * PROJECTION_MS > height / 2;
}

/**
 * The velocity (pt/s) a sheet springs home with after a release at
 * `position` (its offset from rest, up negative). Speed toward rest carries
 * on; speed away from rest above the top is dropped, so a flick up does not
 * lift the sheet off the bottom edge.
 */
export function sheetSnapVelocity(position: number, velocity: number): number {
  return position < 0 ? Math.max(0, velocity) : velocity;
}

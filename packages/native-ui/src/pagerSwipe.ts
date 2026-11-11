/**
 * The rules of a swiped `Pager`, as plain numbers, so they stay testable
 * apart from the gesture. The pager's position is in pages: 0 is the first
 * page, 1.5 is halfway between the second and the third. Distances are in
 * points and velocities in points per second (the Gesture Handler units),
 * positive to the right. Each rule is a worklet, so the drag runs it on the
 * UI thread.
 */

/**
 * Sideways travel (pt) before a drag takes the pager: twice a row swipe's
 * (`SWIPE_ACTIVE_OFFSET_X`), so a swipeable row under the finger takes its
 * own swipe first, and only a clearly sideways drag moves the pages.
 */
export const PAGER_ACTIVE_OFFSET_X = 24;

/** Vertical travel (pt) that leaves the touch to the page's own scroll. */
export const PAGER_FAIL_OFFSET_Y = 10;

/** A sideways flick at this speed (pt/s) turns the page, however short the drag. */
const FLICK_VELOCITY = 500;

/** How far ahead (s) the release velocity carries the pages when deciding where they settle. */
const PROJECTION_S = 0.2;

/** How far the pages move past the first or last page: less and less the further the finger goes. */
function rubberband(overshoot: number, dimension: number): number {
  "worklet";
  const constant = 0.55;
  return (overshoot * dimension * constant) / (dimension + constant * overshoot);
}

/**
 * Where the pages sit for a finger `dx` points from where the drag caught
 * them at `start`: they follow the finger 1:1 (a drag left shows the next
 * page), and past the first or last page they meet growing resistance.
 */
export function pagerPosition(start: number, dx: number, width: number, count: number): number {
  "worklet";
  if (width <= 0) return start;
  const raw = start - dx / width;
  const last = count - 1;
  if (raw < 0) return -rubberband(-raw * width, width) / width;
  if (raw > last) return last + rubberband((raw - last) * width, width) / width;
  return raw;
}

/**
 * The page a released drag settles on, from the page it started on
 * (`from`), where it is (`position`) and the finger's speed (`vx`): a flick
 * past `FLICK_VELOCITY` the way it moved turns one page; else the position
 * carried on by its speed rounds to the nearest page. Never more than one
 * page from `from`, and never past the ends.
 */
export function pagerSettle(position: number, vx: number, width: number, from: number, count: number): number {
  "worklet";
  const moved = position - from;
  // A drag left (negative `vx`) moves toward the next page (a larger position).
  const toward = -Math.sign(vx);
  let target: number;
  if (Math.abs(vx) >= FLICK_VELOCITY && moved !== 0 && toward === Math.sign(moved)) {
    target = from + toward;
  } else {
    target = Math.round(width > 0 ? position - (vx * PROJECTION_S) / width : position);
  }
  return Math.min(count - 1, Math.max(0, Math.min(from + 1, Math.max(from - 1, target))));
}

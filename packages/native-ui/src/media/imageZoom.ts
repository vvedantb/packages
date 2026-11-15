// The zoom rules of `ImageViewer`, as plain worklets: the gesture part
// (`zoom-image-gesture`) runs them on the UI thread, and tests call them.

/** Fitted size is 1; a pinch goes up to 5 and rubber-bands a little past both ends. */
export const ZOOM = { min: 1, max: 5, doubleTap: 2.5 } as const;

/** The scale while pinching: free inside [min, max], and a quarter of the overshoot past either end. */
export function zoomScale(raw: number): number {
  "worklet";
  if (raw < ZOOM.min) return ZOOM.min - (ZOOM.min - raw) / 4;
  if (raw > ZOOM.max) return ZOOM.max + (raw - ZOOM.max) / 4;
  return raw;
}

/** Where a released pinch settles: back inside [min, max]. */
export function settleScale(scale: number): number {
  "worklet";
  return Math.min(ZOOM.max, Math.max(ZOOM.min, scale));
}

/**
 * The farthest the zoomed image may move from centre on one axis: half of
 * what overflows the screen. At fitted size it cannot move.
 */
export function panLimit(scale: number, size: number): number {
  "worklet";
  return Math.max(0, (size * scale - size) / 2);
}

/** A translation kept inside `panLimit` on one axis. */
export function clampPan(translate: number, scale: number, size: number): number {
  "worklet";
  const limit = panLimit(scale, size);
  return Math.min(limit, Math.max(-limit, translate));
}

/**
 * A double tap: zoomed out, it zooms to `ZOOM.doubleTap` on the tapped point
 * (that point stays under the finger, as far as the edges allow); zoomed in,
 * it goes back to fitted. `point` and `size` are in the page's coordinates.
 */
export function doubleTapZoom(
  scale: number,
  point: { x: number; y: number },
  size: { width: number; height: number },
): { scale: number; x: number; y: number } {
  "worklet";
  if (scale > ZOOM.min) return { scale: ZOOM.min, x: 0, y: 0 };
  const next = ZOOM.doubleTap;
  // The tapped point, from centre, moves out by `next`; shift back by that much.
  const x = -(point.x - size.width / 2) * (next - 1);
  const y = -(point.y - size.height / 2) * (next - 1);
  return { scale: next, x: clampPan(x, next, size.width), y: clampPan(y, next, size.height) };
}

/** Whether the image is zoomed in: then a drag pans it instead of turning the page. */
export function isZoomed(scale: number): boolean {
  "worklet";
  return scale > ZOOM.min + 0.01;
}

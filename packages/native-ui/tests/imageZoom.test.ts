import { describe, expect, it } from "vitest";
import { clampPan, doubleTapZoom, isZoomed, panLimit, settleScale, ZOOM, zoomScale } from "../src/media/imageZoom";

describe("imageZoom", () => {
  it("rubber-bands a pinch past the ends and settles back inside", () => {
    expect(zoomScale(3)).toBe(3);
    expect(zoomScale(0.6)).toBeCloseTo(0.9);
    expect(zoomScale(9)).toBe(6);
    expect(settleScale(0.9)).toBe(ZOOM.min);
    expect(settleScale(6)).toBe(ZOOM.max);
  });

  it("keeps a zoomed image covering the screen while it pans", () => {
    expect(panLimit(1, 400)).toBe(0);
    expect(panLimit(2, 400)).toBe(200);
    expect(clampPan(500, 2, 400)).toBe(200);
    expect(clampPan(-500, 2, 400)).toBe(-200);
    expect(clampPan(120, 1, 400)).toBe(0);
  });

  it("double tap zooms on the tapped point, then back to fit", () => {
    const size = { width: 400, height: 800 };
    const centre = doubleTapZoom(1, { x: 200, y: 400 }, size);
    expect(centre).toEqual({ scale: ZOOM.doubleTap, x: -0, y: -0 });
    const corner = doubleTapZoom(1, { x: 0, y: 0 }, size);
    expect(corner.scale).toBe(ZOOM.doubleTap);
    // The top-left corner moves right and down, as far as the edges allow.
    expect(corner.x).toBe(panLimit(ZOOM.doubleTap, 400));
    expect(corner.y).toBe(panLimit(ZOOM.doubleTap, 800));
    expect(doubleTapZoom(2.5, { x: 10, y: 10 }, size)).toEqual({ scale: ZOOM.min, x: 0, y: 0 });
  });

  it("counts as zoomed only past fitted size", () => {
    expect(isZoomed(1)).toBe(false);
    expect(isZoomed(1.2)).toBe(true);
  });
});

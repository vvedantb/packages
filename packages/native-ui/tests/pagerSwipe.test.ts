import { describe, expect, it } from "vitest";
import { pagerPosition, pagerSettle } from "../src/pagerSwipe";
import { swipeRowActivation, SWIPE_ACTION_WIDTH, SWIPE_ACTIVE_OFFSET_X } from "../src/swipeRow";
import { toastDragDismisses, toastDragOffset } from "../src/toastDrag";

// The rules every `Pager` swipe and toast drag runs on: three pages 390
// wide (the Sessions tab), and a 60 high toast.
const WIDTH = 390;
const PAGES = 3;

describe("pager track phase", () => {
  it("follows the finger 1:1: a drag left shows the next page", () => {
    expect(pagerPosition(0, -195, WIDTH, PAGES)).toBe(0.5);
    expect(pagerPosition(1, 390, WIDTH, PAGES)).toBe(0);
    expect(pagerPosition(1, -195, WIDTH, PAGES)).toBe(1.5);
  });

  it("rubber-bands past the first and last page, more the further it goes", () => {
    const near = pagerPosition(0, 40, WIDTH, PAGES);
    const far = pagerPosition(0, 400, WIDTH, PAGES);
    expect(near).toBeLessThan(0);
    expect(near).toBeGreaterThan(-40 / WIDTH);
    expect(far).toBeGreaterThan(-400 / WIDTH);
    expect(far - near).toBeGreaterThan(-(400 - 40) / WIDTH);
    expect(pagerPosition(2, -40, WIDTH, PAGES)).toBeGreaterThan(2);
    expect(pagerPosition(2, -40, WIDTH, PAGES)).toBeLessThan(2 + 40 / WIDTH);
  });

  it("stays put before the pager has a width", () => {
    expect(pagerPosition(1, -100, 0, PAGES)).toBe(1);
  });
});

describe("pager release", () => {
  it("turns a page past halfway, and springs back short of it", () => {
    expect(pagerSettle(0.6, 0, WIDTH, 0, PAGES)).toBe(1);
    expect(pagerSettle(0.4, 0, WIDTH, 0, PAGES)).toBe(0);
    expect(pagerSettle(1.4, 0, WIDTH, 2, PAGES)).toBe(1);
  });

  it("turns a page on a flick the way it moved, however short the drag", () => {
    expect(pagerSettle(0.1, -600, WIDTH, 0, PAGES)).toBe(1);
    expect(pagerSettle(1.9, 600, WIDTH, 2, PAGES)).toBe(1);
  });

  it("springs back on a flick against the drag", () => {
    expect(pagerSettle(0.3, 600, WIDTH, 0, PAGES)).toBe(0);
  });

  it("moves one page at most, and never past the ends", () => {
    expect(pagerSettle(0.9, -5000, WIDTH, 0, PAGES)).toBe(1);
    expect(pagerSettle(-0.1, 2000, WIDTH, 0, PAGES)).toBe(0);
    expect(pagerSettle(2.1, -2000, WIDTH, 2, PAGES)).toBe(2);
  });
});

describe("swipeable row inside a pager", () => {
  it("takes both directions outside a pager, or with actions on both sides", () => {
    const both = [-SWIPE_ACTIVE_OFFSET_X, SWIPE_ACTIVE_OFFSET_X];
    expect(swipeRowActivation({ leading: 0, trailing: SWIPE_ACTION_WIDTH }, false)).toEqual({ activeOffsetX: both });
    expect(swipeRowActivation({ leading: SWIPE_ACTION_WIDTH, trailing: SWIPE_ACTION_WIDTH }, true)).toEqual({
      activeOffsetX: both,
    });
  });

  it("leaves the side with no actions to the pager", () => {
    // Sessions: Archive on a swipe left; a swipe right fails the row at once.
    expect(swipeRowActivation({ leading: 0, trailing: SWIPE_ACTION_WIDTH }, true)).toEqual({
      activeOffsetX: -SWIPE_ACTIVE_OFFSET_X,
      failOffsetX: SWIPE_ACTIVE_OFFSET_X,
    });
    expect(swipeRowActivation({ leading: SWIPE_ACTION_WIDTH, trailing: 0 }, true)).toEqual({
      activeOffsetX: SWIPE_ACTIVE_OFFSET_X,
      failOffsetX: -SWIPE_ACTIVE_OFFSET_X,
    });
  });
});

describe("toast drag", () => {
  it("follows the finger up 1:1 and resists down", () => {
    expect(toastDragOffset(-30)).toBe(-30);
    const near = toastDragOffset(20);
    const far = toastDragOffset(200);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(20);
    expect(far).toBeLessThan(24);
  });

  it("dismisses past half its height or on a flick up, and not downward", () => {
    expect(toastDragDismisses(-31, 0, 60)).toBe(true);
    expect(toastDragDismisses(-20, 0, 60)).toBe(false);
    expect(toastDragDismisses(-5, -600, 60)).toBe(true);
    expect(toastDragDismisses(-20, -100, 60)).toBe(true);
    expect(toastDragDismisses(-20, 300, 60)).toBe(false);
    expect(toastDragDismisses(10, -900, 60)).toBe(false);
  });
});

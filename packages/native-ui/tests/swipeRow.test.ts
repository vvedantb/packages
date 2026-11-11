import { describe, expect, it, vi } from "vitest";
import {
  closeSwipeRows,
  isSwipeRowOpen,
  markSwipeRowClosed,
  markSwipeRowOpen,
  SWIPE_ACTION_WIDTH,
  swipeActionsAccessibility,
  swipeFullAt,
  swipeRowArmed,
  swipeRowOffset,
  swipeRowSettle,
  type SwipeAction,
} from "../src/swipeRow";

// The rules every `SwipeableRow` swipe runs on: one action each side on a
// 390 row (the Inbox), and a trailing action only (Sessions).
const BOTH = { leading: SWIPE_ACTION_WIDTH, trailing: SWIPE_ACTION_WIDTH, width: 390 };
const TRAILING_ONLY = { leading: 0, trailing: SWIPE_ACTION_WIDTH, width: 390 };

function action(key: string, onPress: () => void = () => {}): SwipeAction {
  return { key, label: key, icon: () => null, onPress };
}

describe("swipeable row track phase", () => {
  it("follows the finger 1:1 toward a side with actions", () => {
    expect(swipeRowOffset(-50, BOTH)).toBe(-50);
    expect(swipeRowOffset(300, BOTH)).toBe(300);
    expect(swipeRowOffset(-390, BOTH)).toBe(-390);
  });

  it("resists toward a side with no actions, more the further it goes", () => {
    const near = swipeRowOffset(40, TRAILING_ONLY);
    const far = swipeRowOffset(400, TRAILING_ONLY);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(40);
    expect(far).toBeLessThan(SWIPE_ACTION_WIDTH);
    expect(far - near).toBeLessThan(400 - 40);
  });

  it("resists past the row's own width", () => {
    expect(swipeRowOffset(-500, BOTH)).toBeGreaterThan(-500);
    expect(swipeRowOffset(-500, BOTH)).toBeLessThan(-390);
  });
});

describe("swipeable row full swipe", () => {
  it("arms at half the row, and never toward a side with no actions", () => {
    expect(swipeFullAt(SWIPE_ACTION_WIDTH, 390)).toBe(195);
    expect(swipeRowArmed(-194, BOTH)).toBeNull();
    expect(swipeRowArmed(-195, BOTH)).toBe("trailing");
    expect(swipeRowArmed(200, BOTH)).toBe("leading");
    expect(swipeRowArmed(300, TRAILING_ONLY)).toBeNull();
  });

  it("arms past the revealed buttons on a narrow row", () => {
    expect(swipeFullAt(2 * SWIPE_ACTION_WIDTH, 200)).toBe(3 * SWIPE_ACTION_WIDTH);
  });

  it("commits a slow drag released past the full-swipe point", () => {
    expect(swipeRowSettle(-220, 0, BOTH)).toEqual({ kind: "commit", side: "trailing" });
    expect(swipeRowSettle(220, 0, BOTH)).toEqual({ kind: "commit", side: "leading" });
  });

  it("commits a fling that carries a revealed row past the point", () => {
    expect(swipeRowSettle(-120, -600, BOTH)).toEqual({ kind: "commit", side: "trailing" });
  });

  it("does not commit a fling before the buttons are in view: it only opens", () => {
    expect(swipeRowSettle(-60, -3000, BOTH)).toEqual({ kind: "open", side: "trailing" });
  });

  it("cancels an armed swipe that is flung back", () => {
    expect(swipeRowSettle(-220, 1500, BOTH)).toEqual({ kind: "close" });
  });
});

describe("swipeable row release", () => {
  it("opens past half the buttons, else closes", () => {
    expect(swipeRowSettle(-40, 0, BOTH)).toEqual({ kind: "open", side: "trailing" });
    expect(swipeRowSettle(-30, 0, BOTH)).toEqual({ kind: "close" });
    expect(swipeRowSettle(-90, 0, BOTH)).toEqual({ kind: "open", side: "trailing" });
  });

  it("carries the release speed: a short flick opens, a flick back closes", () => {
    expect(swipeRowSettle(-20, -400, BOTH)).toEqual({ kind: "open", side: "trailing" });
    expect(swipeRowSettle(-72, 600, BOTH)).toEqual({ kind: "close" });
  });

  it("always closes toward a side with no actions", () => {
    expect(swipeRowSettle(30, 2000, TRAILING_ONLY)).toEqual({ kind: "close" });
  });
});

describe("one open row at a time", () => {
  it("closes the open row when another opens, and not the same row twice", () => {
    const first = { close: vi.fn() };
    const second = { close: vi.fn() };
    markSwipeRowOpen(first);
    markSwipeRowOpen(first);
    expect(first.close).not.toHaveBeenCalled();
    markSwipeRowOpen(second);
    expect(first.close).toHaveBeenCalledOnce();
    expect(isSwipeRowOpen()).toBe(true);
    closeSwipeRows();
    expect(second.close).toHaveBeenCalledOnce();
    expect(isSwipeRowOpen()).toBe(false);
  });

  it("forgets a row that closed itself, but not another row", () => {
    const first = { close: vi.fn() };
    const second = { close: vi.fn() };
    markSwipeRowOpen(first);
    markSwipeRowClosed(second);
    expect(isSwipeRowOpen()).toBe(true);
    markSwipeRowClosed(first);
    expect(isSwipeRowOpen()).toBe(false);
    closeSwipeRows();
    expect(first.close).not.toHaveBeenCalled();
  });
});

describe("swipe actions for screen readers", () => {
  it("offers each action by its label and runs the one chosen", () => {
    const archive = vi.fn();
    const read = vi.fn();
    const a11y = swipeActionsAccessibility([action("read", read), action("archive", archive)]);
    expect(a11y.accessibilityActions).toEqual([
      { name: "read", label: "read" },
      { name: "archive", label: "archive" },
    ]);
    a11y.onAccessibilityAction({ nativeEvent: { actionName: "archive" } });
    expect(archive).toHaveBeenCalledOnce();
    expect(read).not.toHaveBeenCalled();
    a11y.onAccessibilityAction({ nativeEvent: { actionName: "activate" } });
    expect(read).not.toHaveBeenCalled();
  });
});

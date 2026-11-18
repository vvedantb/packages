import { afterEach, describe, expect, it, vi } from "vitest";

// The overlay store that holds chat lists still while a Modal shows: timers
// faked, the store re-imported fresh for each test, and `useOverlayFrozen`'s
// subscription captured so a test reads the value a chat list would.

const sync = vi.hoisted(() => ({
  subscribe: null as null | ((listener: () => void) => () => void),
  snapshot: null as null | (() => boolean),
}));

vi.mock("react-native", () => ({ View: "View" }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useSyncExternalStore: (subscribe: (listener: () => void) => () => void, snapshot: () => boolean) => {
    sync.subscribe = subscribe;
    sync.snapshot = snapshot;
    return snapshot();
  },
}));

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

/** The store, and what a chat list sees: the frozen value now, and every change it was told of. */
async function watched() {
  vi.useFakeTimers();
  const freeze = await import("../src/primitives/overlay-freeze");
  expect(freeze.useOverlayFrozen()).toBe(false);
  const changes: boolean[] = [];
  sync.subscribe?.(() => changes.push(sync.snapshot?.() ?? false));
  return { freeze, frozen: () => sync.snapshot?.() ?? false, changes };
}

describe("overlay freeze", () => {
  it("freezes while an overlay shows, and for SETTLE_MS after the last one closes", async () => {
    const { freeze, frozen, changes } = await watched();
    const closeFirst = freeze.overlayFreezeRef({} as never);
    const closeSecond = freeze.overlayFreezeRef({} as never);
    expect(frozen()).toBe(true);
    closeFirst?.();
    vi.advanceTimersByTime(freeze.SETTLE_MS * 2);
    // One overlay still shows: still frozen.
    expect(frozen()).toBe(true);
    closeSecond?.();
    vi.advanceTimersByTime(freeze.SETTLE_MS - 1);
    expect(frozen()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(frozen()).toBe(false);
    // The list heard two changes: frozen, then free.
    expect(changes).toEqual([true, false]);
  });

  it("lets a drag release it at once after every overlay closed, but not while one shows", async () => {
    const { freeze, frozen } = await watched();
    const close = freeze.overlayFreezeRef({} as never);
    freeze.settleOverlays();
    expect(frozen()).toBe(true);
    close?.();
    freeze.settleOverlays();
    expect(frozen()).toBe(false);
    // The settle timer then changes nothing.
    vi.advanceTimersByTime(freeze.SETTLE_MS);
    expect(frozen()).toBe(false);
  });

  it("takes no part for a detached ref", async () => {
    const { freeze, frozen } = await watched();
    expect(freeze.overlayFreezeRef(null)).toBeUndefined();
    expect(frozen()).toBe(false);
  });
});

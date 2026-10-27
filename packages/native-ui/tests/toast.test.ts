import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_TOAST_DURATION,
  MAX_TOASTS,
  getToasts,
  subscribeToasts,
  toast,
} from "../src/toastStore";

afterEach(() => toast.dismiss());

describe("toast store", () => {
  it("queues toasts with variants and returns their ids", () => {
    const first = toast("Saved");
    const second = toast.error("Failed", { description: "Try again." });
    expect(getToasts().map((item) => [item.id, item.variant, item.title])).toEqual([
      [first, "default", "Saved"],
      [second, "error", "Failed"],
    ]);
    expect(getToasts()[1]!.description).toBe("Try again.");
    expect(getToasts()[0]!.duration).toBe(DEFAULT_TOAST_DURATION);
  });

  it("keeps loading toasts open and replaces a toast by id", () => {
    const id = toast.loading("Syncing");
    expect(getToasts()[0]!.duration).toBe(Infinity);
    toast.success("Synced", { id });
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({ id, variant: "success", title: "Synced" });
  });

  it(`shows at most ${MAX_TOASTS}, dropping the oldest`, () => {
    for (let i = 0; i < MAX_TOASTS + 2; i++) toast(`Toast ${i}`);
    expect(getToasts().map((item) => item.title)).toEqual(
      Array.from({ length: MAX_TOASTS }, (_, i) => `Toast ${i + 2}`),
    );
  });

  it("dismisses one toast or all, and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToasts(listener);
    const keep = toast.info("Keep");
    const drop = toast.warning("Drop");
    toast.dismiss(drop);
    expect(getToasts().map((item) => item.id)).toEqual([keep]);
    toast.dismiss();
    expect(getToasts()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
    toast("Unheard");
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("returns a new array on change, for useSyncExternalStore", () => {
    const before = getToasts();
    toast("Changed");
    expect(getToasts()).not.toBe(before);
    expect(getToasts()).toBe(getToasts());
  });
});

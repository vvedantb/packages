import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ARTIFACT_STATE_DAILY_WRITES,
  ARTIFACT_STATE_DEBOUNCE_MS,
  ARTIFACT_STATE_MAX_KEY_LENGTH,
  ARTIFACT_STATE_MAX_KEYS,
  ARTIFACT_STATE_MAX_TOTAL_BYTES,
  ARTIFACT_STATE_MAX_VALUE_BYTES,
  ARTIFACT_STATE_MAX_WAIT_MS,
  ARTIFACT_STATE_MIN_WRITE_INTERVAL_MS,
  applyArtifactStateOp,
  applyArtifactStatePatch,
  createTrailingMaxDebounce,
  utcDayKey,
  utf8ByteLength,
  validateArtifactStateMap,
  type ArtifactStateMap,
} from "@vvedantb/server";

function keys(count: number): ArtifactStateMap {
  return Object.fromEntries(Array.from({ length: count }, (_, i) => [`k${String(i)}`, "1"]));
}

describe("limits", () => {
  it("match the documented numbers", () => {
    expect(ARTIFACT_STATE_MAX_KEYS).toBe(32);
    expect(ARTIFACT_STATE_MAX_VALUE_BYTES).toBe(16 * 1024);
    expect(ARTIFACT_STATE_MAX_TOTAL_BYTES).toBe(64 * 1024);
    expect(ARTIFACT_STATE_MAX_KEY_LENGTH).toBe(64);
    expect(ARTIFACT_STATE_MIN_WRITE_INTERVAL_MS).toBe(1000);
    expect(ARTIFACT_STATE_DAILY_WRITES).toEqual({ free: 400, pro: 4000 });
  });

  it("allows 32 keys and refuses 33", () => {
    expect(validateArtifactStateMap(keys(32))).toBeUndefined();
    expect(validateArtifactStateMap(keys(33))).toBe("State can have at most 32 keys.");
    expect(applyArtifactStatePatch({}, { sets: keys(33), reset: true }).error).toContain("32");
  });

  it("allows a 16 KiB value and refuses one byte more, counting UTF-8 bytes", () => {
    expect(validateArtifactStateMap({ v: "x".repeat(16 * 1024) })).toBeUndefined();
    expect(validateArtifactStateMap({ v: "x".repeat(16 * 1024 + 1) })).toBe('State value for "v" exceeds 16 KiB.');
    // "é" is two bytes.
    expect(utf8ByteLength("é")).toBe(2);
    expect(validateArtifactStateMap({ v: "é".repeat(8 * 1024) })).toBeUndefined();
    expect(validateArtifactStateMap({ v: `${"é".repeat(8 * 1024)}x` })).toContain("16 KiB");
  });

  it("allows 64 KiB in total, keys included, and refuses one byte more", () => {
    // Four 2-char keys + four values = 64 KiB exactly.
    const value = "x".repeat(16 * 1024 - 2);
    const full = { k0: value, k1: value, k2: value, k3: value };
    expect(validateArtifactStateMap(full)).toBeUndefined();
    expect(validateArtifactStateMap({ ...full, k: "" })).toBe("State exceeds 64 KiB.");
    const set = applyArtifactStateOp(full, { op: "set", key: "k", value: "" });
    expect(set.error).toBe("State exceeds 64 KiB.");
    expect(set.data).toBe(full);
  });

  it("allows a 64-character key and refuses 65 or an empty one", () => {
    expect(applyArtifactStateOp({}, { op: "set", key: "k".repeat(64), value: "1" }).error).toBeUndefined();
    expect(applyArtifactStateOp({}, { op: "set", key: "k".repeat(65), value: "1" }).error).toBe("State key is too long.");
    expect(applyArtifactStateOp({}, { op: "get", key: "  " }).error).toBe("State key is required.");
  });

  it("utcDayKey is the UTC calendar day", () => {
    expect(utcDayKey(Date.UTC(2026, 9, 22, 23, 59, 59))).toBe(20261022);
    expect(utcDayKey(Date.UTC(2026, 9, 23, 0, 0, 0))).toBe(20261023);
  });
});

describe("state bridge ops", () => {
  it("get/set/remove/reset without mutating on quota errors", () => {
    const first = applyArtifactStateOp({}, { op: "set", key: "a", value: "1" });
    expect(first.data.a).toBe("1");
    expect(applyArtifactStateOp(first.data, { op: "get", key: "a" }).value).toBe("1");
    expect(applyArtifactStateOp(first.data, { op: "get", key: "missing" }).value).toBeNull();
    expect(applyArtifactStateOp(first.data, { op: "getAll" }).value).toEqual({ a: "1" });
    expect(applyArtifactStateOp(first.data, { op: "remove", key: "a" }).data.a).toBeUndefined();
    expect(applyArtifactStateOp(first.data, { op: "reset" }).data).toEqual({});
    expect(first.data).toEqual({ a: "1" });
  });

  it("trims keys", () => {
    expect(applyArtifactStateOp({}, { op: "set", key: " a ", value: "1" }).data).toEqual({ a: "1" });
  });
});

describe("applyArtifactStatePatch", () => {
  it("resets, sets, then removes", () => {
    const result = applyArtifactStatePatch({ old: "1", keep: "2" }, { reset: true, sets: { index: "0", known: '["a"]' } });
    expect(result).toEqual({ data: { index: "0", known: '["a"]' }, value: null });
    expect(applyArtifactStatePatch({ a: "1", b: "2" }, { sets: { c: "3" }, removes: ["a"] }).data).toEqual({ b: "2", c: "3" });
  });

  it("is all or nothing: a failing set or remove returns the current data", () => {
    const current = { a: "1" };
    const bigSet = applyArtifactStatePatch(current, { sets: { b: "2", huge: "x".repeat(16 * 1024 + 1) } });
    expect(bigSet.error).toContain("16 KiB");
    expect(bigSet.data).toBe(current);
    const badRemove = applyArtifactStatePatch(current, { sets: { b: "2" }, removes: [""] });
    expect(badRemove.error).toBe("State key is required.");
    expect(badRemove.data).toBe(current);
  });
});

describe("createTrailingMaxDebounce", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it("defaults to a 5 s trailing wait and a 30 s max wait", () => {
    expect([ARTIFACT_STATE_DEBOUNCE_MS, ARTIFACT_STATE_MAX_WAIT_MS]).toEqual([5000, 30_000]);
    const flush = vi.fn();
    const debounce = createTrailingMaxDebounce(flush);
    debounce.schedule();
    vi.advanceTimersByTime(4999);
    expect(flush).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(flush).toHaveBeenCalledOnce();
  });

  it("flushes after the trailing wait, at the latest after the max wait, and on flushNow", () => {
    const flush = vi.fn();
    const debounce = createTrailingMaxDebounce(flush, 100, 250);
    debounce.schedule();
    vi.advanceTimersByTime(99);
    expect(flush).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(1);
    expect(flush).toHaveBeenCalledTimes(1);
    expect(debounce.isPending).toBe(false);

    // A change every 60 ms never lets the trailing timer fire; the max wait does.
    for (let i = 0; i < 5; i += 1) {
      debounce.schedule();
      vi.advanceTimersByTime(60);
    }
    expect(flush).toHaveBeenCalledTimes(2);

    debounce.schedule();
    debounce.flushNow();
    expect(flush).toHaveBeenCalledTimes(3);
    debounce.flushNow();
    expect(flush).toHaveBeenCalledTimes(3);

    debounce.schedule();
    debounce.cancel();
    vi.advanceTimersByTime(1000);
    expect(flush).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });
});

// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAudioFloor, tryAcquireAudioFloor, withAudioFloor } from "./audioFloor";
import { playChime } from "./playChime";
import { playTone } from "./playTone";

let oscillators = 0;

class FakeAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  resume = () => Promise.resolve();
  createOscillator() {
    oscillators += 1;
    const node = {
      type: "",
      frequency: { value: 0 },
      connect: (next: unknown) => next,
      start: () => undefined,
      stop: () => undefined,
    };
    return node;
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => undefined,
        linearRampToValueAtTime: () => undefined,
        exponentialRampToValueAtTime: () => undefined,
      },
      connect: (next: unknown) => next,
    };
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  oscillators = 0;
  resetAudioFloor();
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("audio floor", () => {
  it("allows one acquire per second", () => {
    expect(tryAcquireAudioFloor()).toBe(true);
    vi.advanceTimersByTime(999);
    expect(tryAcquireAudioFloor()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(tryAcquireAudioFloor()).toBe(true);
  });

  it("withAudioFloor runs the callback only when the floor is free", () => {
    const play = vi.fn();
    expect(withAudioFloor(play)).toBe(true);
    expect(withAudioFloor(play)).toBe(false);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("is shared by playChime, playTone and withAudioFloor", () => {
    playChime();
    expect(oscillators).toBe(2);
    playTone({ frequency: 440 });
    expect(oscillators).toBe(2);
    expect(withAudioFloor(() => undefined)).toBe(false);

    vi.advanceTimersByTime(1000);
    playTone({ frequency: 440 });
    expect(oscillators).toBe(3);
    playChime();
    expect(oscillators).toBe(3);
  });
});

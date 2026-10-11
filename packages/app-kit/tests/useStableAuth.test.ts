// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createUseStableAuth,
  resetStableAuthSession,
  type ClerkAuthSlice,
} from "../src/auth/useStableAuth.js";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

function harness(debounceMs?: number) {
  let current: ClerkAuthSlice = { isLoaded: false, isSignedIn: undefined };
  const seen: ClerkAuthSlice[] = [];
  const useStable = createUseStableAuth(
    () => current,
    debounceMs === undefined ? {} : { debounceMs },
  );
  function Probe() {
    seen.push(useStable());
    return null;
  }
  const container = document.createElement("div");
  const root: Root = createRoot(container);
  const render = (next: ClerkAuthSlice) => {
    current = next;
    act(() => root.render(createElement(Probe)));
  };
  return {
    render,
    last: () => seen[seen.length - 1],
    unmount: () => act(() => root.unmount()),
  };
}

const SIGNED_IN = { isLoaded: true, isSignedIn: true } as const;
const SIGNED_OUT = { isLoaded: true, isSignedIn: false } as const;

describe("createUseStableAuth", () => {
  beforeEach(() => {
    resetStableAuthSession();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes auth through while signed in", () => {
    const h = harness();
    h.render(SIGNED_IN);
    expect(h.last()).toEqual(SIGNED_IN);
    h.unmount();
  });

  it("reports loading for 2000 ms after a sign-in loss, then settles", () => {
    const h = harness();
    h.render(SIGNED_IN);
    h.render(SIGNED_OUT);
    expect(h.last()?.isLoaded).toBe(false);
    act(() => void vi.advanceTimersByTime(1999));
    expect(h.last()?.isLoaded).toBe(false);
    act(() => void vi.advanceTimersByTime(1));
    expect(h.last()).toEqual(SIGNED_OUT);
    h.unmount();
  });

  it("honours a custom debounce", () => {
    const h = harness(500);
    h.render(SIGNED_IN);
    h.render(SIGNED_OUT);
    act(() => void vi.advanceTimersByTime(500));
    expect(h.last()?.isLoaded).toBe(true);
    h.unmount();
  });

  it("does not delay a sign-out when the user was never signed in", () => {
    const h = harness();
    h.render(SIGNED_OUT);
    act(() => void vi.advanceTimersByTime(0));
    expect(h.last()).toEqual(SIGNED_OUT);
    h.unmount();
  });

  it("cancels the debounce when the user signs back in", () => {
    const h = harness();
    h.render(SIGNED_IN);
    h.render(SIGNED_OUT);
    h.render(SIGNED_IN);
    expect(h.last()).toEqual(SIGNED_IN);
    act(() => void vi.advanceTimersByTime(5000));
    expect(h.last()).toEqual(SIGNED_IN);
    h.unmount();
  });
});

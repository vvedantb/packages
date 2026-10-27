import { useLayoutEffect, useState, type RefCallback } from "react";

/** Re-apply after a virtualised list measures; first paint often resets scrollTop. */
function applyScrollTop(el: HTMLElement, scrollTop: number): void {
  el.scrollTop = scrollTop;
  requestAnimationFrame(() => {
    el.scrollTop = scrollTop;
    requestAnimationFrame(() => {
      el.scrollTop = scrollTop;
    });
  });
}

function readScrollTop(key: string): number {
  try {
    // Stored as JSON; a JSON number is also a plain numeric string.
    const value = Number(sessionStorage.getItem(key) ?? 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** JSON, so a value written by an older `useSessionStorage` reads back. */
function writeScrollTop(key: string, scrollTop: number): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(Math.round(scrollTop)));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/**
 * Scroll-container ref that saves `scrollTop` to `sessionStorage` under
 * `storageKey` and restores it when the container mounts again, so a list keeps
 * its place when a route swaps it out for a detail page and back. Per tab:
 * closing the tab clears it. Writes are throttled to one per frame and do not
 * re-render.
 */
export function usePersistedScrollParent(storageKey: string): {
  scrollParent: HTMLDivElement | null;
  scrollRef: RefCallback<HTMLDivElement>;
} {
  const [scrollParent, scrollRef] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!scrollParent) return;

    const initial = readScrollTop(storageKey);
    if (initial > 0) applyScrollTop(scrollParent, initial);

    let rafId = 0;
    const onScroll = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        writeScrollTop(storageKey, scrollParent.scrollTop);
      });
    };

    scrollParent.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      writeScrollTop(storageKey, scrollParent.scrollTop);
      scrollParent.removeEventListener("scroll", onScroll);
    };
  }, [scrollParent, storageKey]);

  return { scrollParent, scrollRef };
}

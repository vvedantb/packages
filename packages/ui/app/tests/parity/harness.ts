// Shared harness for the parity suites: a controllable `prefers-color-scheme`,
// a log of localStorage writes, DOM snapshots and a React root driven by act().
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

type MediaListener = (event: { matches: boolean }) => void;

/** Replaces `window.matchMedia` with one whose dark preference the test flips. */
export function installColorScheme(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<MediaListener>();
  const matchMedia = (query: string) => {
    const matches = () => query === "(prefers-color-scheme: dark)" && dark;
    return {
      media: query,
      get matches() {
        return matches();
      },
      onchange: null,
      addListener: (listener: MediaListener) => listeners.add(listener),
      removeListener: (listener: MediaListener) => listeners.delete(listener),
      addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
      dispatchEvent: () => true,
    };
  };
  Reflect.set(window, "matchMedia", matchMedia);
  return {
    setDark(next: boolean) {
      dark = next;
      for (const listener of [...listeners]) listener({ matches: next });
    },
    listenerCount: () => listeners.size,
  };
}

// Patched once: a vi.spyOn on Storage.prototype stops recording after
// vi.restoreAllMocks() and a re-spy under happy-dom.
let storageWrites: [string, string][] = [];
const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function setItem(this: Storage, key: string, value: string) {
  storageWrites.push([key, String(value)]);
  originalSetItem.call(this, key, value);
};

/** Every `localStorage.setItem` call from now on, in order. */
export function logStorageWrites() {
  storageWrites = [];
  return storageWrites;
}

export function resetDom() {
  const root = document.documentElement;
  for (const name of root.getAttributeNames()) root.removeAttribute(name);
  for (const style of document.head.querySelectorAll("style")) style.remove();
  document.title = "Initial title";
  localStorage.clear();
}

/** What a user or stylesheet can see on `<html>`, plus injected style elements. */
export function domSnapshot() {
  const root = document.documentElement;
  return {
    class: root.className,
    attributes: Object.fromEntries(root.getAttributeNames().filter((n) => n.startsWith("data-")).map((n) => [n, root.getAttribute(n)])),
    colorScheme: root.style.colorScheme,
    styles: document.head.querySelectorAll("style").length,
    title: document.title,
  };
}

/** Drops functions so context values compare by data; marks where functions were. */
export function plain(value: object | undefined): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typeof v === "function" ? "fn" : v]));
}

export function mount(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => root.render(node));
  return {
    render: (next: ReactNode) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
    container,
  };
}

export function step(fn: () => void) {
  act(fn);
}

/** A cross-tab `storage` event, as the browser fires it in other tabs. */
export function storageEventFromOtherTab(key: string, newValue: string | null) {
  act(() => {
    if (newValue === null) localStorage.removeItem(key);
    else localStorage.setItem(key, newValue);
    window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
  });
}

/** Minimal reactive store standing in for a server query plus its optimistic update. */
export function createServerStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

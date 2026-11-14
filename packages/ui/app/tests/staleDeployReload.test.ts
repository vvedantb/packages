// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimStaleDeployReload,
  installStaleDeployReload,
  isChunkLoadError,
  reloadForStaleDeploy,
  stripStaleDeployReloadParam,
  STALE_DEPLOY_RELOAD_KEY,
  STALE_DEPLOY_RELOAD_PARAM,
} from "../src/update/staleDeployReload.js";

describe("isChunkLoadError", () => {
  it("matches the ChunkLoadError name and the known chunk/module messages", () => {
    expect(isChunkLoadError(Object.assign(new Error("boom"), { name: "ChunkLoadError" }))).toBe(true);
    for (const msg of [
      "Failed to fetch dynamically imported module: /assets/x.js",
      "Importing a module script failed.",
      "Failed to load module script",
      "Loading chunk 42 failed",
      "Loading CSS chunk 3 failed",
      "... was blocked because of a disallowed MIME type",
    ]) {
      expect(isChunkLoadError(new Error(msg)), msg).toBe(true);
    }
  });

  it("rejects unrelated errors and non-Error values", () => {
    expect(isChunkLoadError(new Error("TypeError: undefined is not a function"))).toBe(false);
    expect(isChunkLoadError("Loading chunk failed")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe("claimStaleDeployReload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first claim, refuses a second inside the cooldown, allows again after it", () => {
    expect(claimStaleDeployReload({ cooldownMs: 10_000 })).toBe(true);
    expect(sessionStorage.getItem(STALE_DEPLOY_RELOAD_KEY)).not.toBeNull();
    vi.advanceTimersByTime(5_000);
    expect(claimStaleDeployReload({ cooldownMs: 10_000 })).toBe(false);
    vi.advanceTimersByTime(6_000);
    expect(claimStaleDeployReload({ cooldownMs: 10_000 })).toBe(true);
  });

  it("uses a caller storage key", () => {
    expect(claimStaleDeployReload({ storageKey: "custom-reload-ts" })).toBe(true);
    expect(sessionStorage.getItem("custom-reload-ts")).not.toBeNull();
    expect(sessionStorage.getItem(STALE_DEPLOY_RELOAD_KEY)).toBeNull();
  });

  it("allows the reload when sessionStorage throws", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(claimStaleDeployReload()).toBe(true);
    getItem.mockRestore();
  });
});

describe("reloadForStaleDeploy / stripStaleDeployReloadParam", () => {
  let replace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.history.replaceState(null, "", "/dashboard?tab=jobs");
    replace = vi.fn();
    vi.spyOn(window.location, "replace").mockImplementation(replace);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reloads to a URL carrying the cache-bust param, keeping existing params", () => {
    reloadForStaleDeploy();
    expect(replace).toHaveBeenCalledOnce();
    const target = new URL(String(replace.mock.calls[0]?.[0]));
    expect(target.searchParams.get("tab")).toBe("jobs");
    expect(target.searchParams.has(STALE_DEPLOY_RELOAD_PARAM)).toBe(true);
  });

  it("strips only the cache-bust param on boot and leaves the rest", () => {
    window.history.replaceState(null, "", `/dashboard?tab=jobs&${STALE_DEPLOY_RELOAD_PARAM}=123`);
    stripStaleDeployReloadParam();
    const url = new URL(window.location.href);
    expect(url.searchParams.has(STALE_DEPLOY_RELOAD_PARAM)).toBe(false);
    expect(url.searchParams.get("tab")).toBe("jobs");
  });

  it("leaves the URL untouched when the param is absent", () => {
    const before = window.location.href;
    stripStaleDeployReloadParam();
    expect(window.location.href).toBe(before);
  });
});

describe("installStaleDeployReload", () => {
  let reload: ReturnType<typeof vi.fn>;
  // Remove every installed listener set, even when an assertion throws first, so
  // a failed test cannot leave listeners that consume the next test's cooldown.
  let cleanups: Array<() => void>;

  function install(options: Parameters<typeof installStaleDeployReload>[0] = {}): () => void {
    const stop = installStaleDeployReload({ reload, ...options });
    cleanups.push(stop);
    return stop;
  }

  const preloadError = () =>
    window.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    window.history.replaceState(null, "", "/home");
    reload = vi.fn();
    cleanups = [];
  });
  afterEach(() => {
    for (const stop of cleanups) stop();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("reloads once on a chunk-load error event and runs onBeforeReload first", () => {
    const order: string[] = [];
    const onBeforeReload = vi.fn(() => void order.push("before"));
    reload.mockImplementation(() => order.push("reload"));
    install({ onBeforeReload });

    const event = new ErrorEvent("error", {
      error: new Error("Loading chunk 9 failed"),
      cancelable: true,
    });
    const prevented = !window.dispatchEvent(event);

    expect(onBeforeReload).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
    expect(order).toEqual(["before", "reload"]);
    expect(prevented).toBe(true);
  });

  it("reloads on a matching unhandledrejection and on vite:preloadError", () => {
    install({ cooldownMs: 0 });

    const rejection = new Event("unhandledrejection", { cancelable: true });
    Object.defineProperty(rejection, "reason", { value: new Error("Loading CSS chunk 1 failed") });
    window.dispatchEvent(rejection);
    expect(reload).toHaveBeenCalledTimes(1);

    preloadError();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("ignores non-chunk errors", () => {
    install();
    window.dispatchEvent(
      new ErrorEvent("error", { error: new Error("ordinary bug"), cancelable: true }),
    );
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads only once while the cooldown holds, then again after it passes", () => {
    install({ cooldownMs: 10_000 });
    preloadError();
    preloadError();
    expect(reload).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(10_001);
    preloadError();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("reloads despite a throwing onBeforeReload", () => {
    install({
      onBeforeReload: () => {
        throw new Error("socket already closed");
      },
    });
    preloadError();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("registers nothing when disabled", () => {
    install({ enabled: false });
    preloadError();
    expect(reload).not.toHaveBeenCalled();
  });

  it("stops listening after the returned stop function runs", () => {
    const stop = install({ cooldownMs: 0 });
    stop();
    preloadError();
    expect(reload).not.toHaveBeenCalled();
  });

  it("strips the cache-bust param on install", () => {
    window.history.replaceState(null, "", `/home?${STALE_DEPLOY_RELOAD_PARAM}=42`);
    install();
    expect(new URL(window.location.href).searchParams.has(STALE_DEPLOY_RELOAD_PARAM)).toBe(false);
  });
});

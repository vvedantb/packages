// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  showUpdateAvailableToast,
  startUpdateAvailableWatcher,
  type UpdateToastOptions,
} from "../src/update/updateWatcher.js";

const htmlFor = (hash: string) =>
  `<script type="module" src="/assets/index-${hash}.js"></script>`;

type ShownToast = { title: string; opts: UpdateToastOptions };

function fakeToast() {
  const toasts: ShownToast[] = [];
  return {
    toasts,
    toast: { message: (title: string, opts: UpdateToastOptions) => void toasts.push({ title, opts }) },
  };
}

describe("showUpdateAvailableToast", () => {
  it("shows the sticky update toast with the default id", () => {
    const { toast, toasts } = fakeToast();
    showUpdateAvailableToast({ toast, reload: vi.fn() });
    expect(toasts).toHaveLength(1);
    const [first] = toasts;
    expect(first?.title).toBe("Update available");
    expect(first?.opts).toMatchObject({
      id: "app-update-available",
      description: "Refresh to load the latest version.",
      duration: Number.POSITIVE_INFINITY,
    });
    expect(first?.opts.action.label).toBe("Refresh");
  });

  it("uses a caller toastId", () => {
    const { toast, toasts } = fakeToast();
    showUpdateAvailableToast({ toast, toastId: "custom-update" });
    expect(toasts[0]?.opts.id).toBe("custom-update");
  });

  it("Refresh closes Convex first, then reloads, even if close throws", () => {
    const { toast, toasts } = fakeToast();
    const order: string[] = [];
    showUpdateAvailableToast({
      toast,
      closeConvex: () => {
        order.push("close");
        throw new Error("already closed");
      },
      reload: () => order.push("reload"),
    });
    toasts[0]?.opts.action.onClick();
    expect(order).toEqual(["close", "reload"]);
  });

  it("Refresh reloads without closeConvex", () => {
    const { toast, toasts } = fakeToast();
    const reload = vi.fn();
    showUpdateAvailableToast({ toast, reload });
    toasts[0]?.opts.action.onClick();
    expect(reload).toHaveBeenCalledOnce();
  });
});

function setup(extra: { enabled?: boolean; closeConvex?: () => void; toastId?: string } = {}) {
  let html = htmlFor("one");
  const fetchMock = vi.fn(async (_url: string | URL | Request) =>
    new Response(html, { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { toast, toasts } = fakeToast();
  const reload = vi.fn();
  const stop = startUpdateAvailableWatcher({
    origin: "https://app.example.test",
    toast,
    pollMs: 1000,
    reload,
    ...extra,
  });
  return { fetchMock, toasts, reload, stop, setHtml: (h: string) => (html = h) };
}

describe("startUpdateAvailableWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("polls the given origin and stays quiet while the fingerprint is unchanged", async () => {
    const { fetchMock, toasts, stop } = setup();
    await vi.advanceTimersByTimeAsync(3500);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/app\.example\.test\/\?_vb=\d+$/,
    );
    expect(toasts).toHaveLength(0);
    stop();
  });

  it("shows one sticky toast when the fingerprint changes", async () => {
    const { toasts, setHtml, stop } = setup();
    await vi.advanceTimersByTimeAsync(0);
    setHtml(htmlFor("two"));
    await vi.advanceTimersByTimeAsync(3000);
    expect(toasts).toHaveLength(1);
    const [first] = toasts;
    expect(first?.title).toBe("Update available");
    expect(first?.opts).toMatchObject({
      id: "app-update-available",
      description: "Refresh to load the latest version.",
      duration: Number.POSITIVE_INFINITY,
    });
    expect(first?.opts.action.label).toBe("Refresh");
    stop();
  });

  it("Refresh closes Convex first, then reloads, even if close throws", async () => {
    const order: string[] = [];
    const closeConvex = vi.fn(() => {
      order.push("close");
      throw new Error("already closed");
    });
    const { toasts, reload, setHtml, stop } = setup({ closeConvex });
    reload.mockImplementation(() => order.push("reload"));
    await vi.advanceTimersByTimeAsync(0);
    setHtml(htmlFor("two"));
    await vi.advanceTimersByTimeAsync(1000);
    toasts[0]?.opts.action.onClick();
    expect(order).toEqual(["close", "reload"]);
    stop();
  });

  it("shows the same toast as showUpdateAvailableToast, with a caller toastId", async () => {
    const { toasts, setHtml, stop } = setup({ toastId: "custom-update" });
    await vi.advanceTimersByTimeAsync(0);
    setHtml(htmlFor("two"));
    await vi.advanceTimersByTimeAsync(1000);
    const expected = fakeToast();
    showUpdateAvailableToast({ toast: expected.toast, toastId: "custom-update" });
    const { action, ...opts } = expected.toasts[0]!.opts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]?.title).toBe(expected.toasts[0]?.title);
    expect(toasts[0]?.opts).toMatchObject(opts);
    expect(toasts[0]?.opts.action.label).toBe(action.label);
    stop();
  });

  it("does nothing when disabled", async () => {
    const { fetchMock, stop } = setup({ enabled: false });
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).not.toHaveBeenCalled();
    stop();
  });

  it("stops polling after the returned stop function runs", async () => {
    const { fetchMock, stop } = setup();
    await vi.advanceTimersByTimeAsync(0);
    stop();
    const calls = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("ignores failed fetches", async () => {
    const { fetchMock, toasts, stop } = setup();
    fetchMock.mockRejectedValue(new Error("offline"));
    await vi.advanceTimersByTimeAsync(3000);
    expect(toasts).toHaveLength(0);
    stop();
  });
});

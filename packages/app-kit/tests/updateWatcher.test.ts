// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  startUpdateAvailableWatcher,
  type UpdateToastOptions,
} from "../src/update/updateWatcher.js";

const htmlFor = (hash: string) =>
  `<script type="module" src="/assets/index-${hash}.js"></script>`;

function setup(extra: { enabled?: boolean; closeConvex?: () => void } = {}) {
  let html = htmlFor("one");
  const fetchMock = vi.fn(async (_url: string | URL | Request) =>
    new Response(html, { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const toasts: Array<{ title: string; opts: UpdateToastOptions }> = [];
  const reload = vi.fn();
  const stop = startUpdateAvailableWatcher({
    origin: "https://app.example.test",
    toast: { message: (title, opts) => void toasts.push({ title, opts }) },
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

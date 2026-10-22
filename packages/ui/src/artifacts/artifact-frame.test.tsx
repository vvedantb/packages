// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ARTIFACT_PORT_TYPE, ARTIFACT_READY_TYPE, ARTIFACT_STATE_RESULT_TYPE, type ArtifactStateMap } from "@vvedantb/server";
import { ArtifactFrame, type ArtifactStateStore } from "./artifact-frame";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;
const ports: MessagePort[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(async () => {
  await act(async () => root?.unmount());
  for (const port of ports.splice(0)) port.close();
  document.body.innerHTML = "";
  root = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function fakeStore(initial: ArtifactStateMap = {}) {
  const saves: ArtifactStateMap[] = [];
  const store: ArtifactStateStore = {
    load: vi.fn(async () => ({ ...initial })),
    save: vi.fn(async (data: ArtifactStateMap) => {
      saves.push(data);
    }),
    onError: vi.fn(),
  };
  return { store, saves };
}

async function mountFrame(props: Partial<React.ComponentProps<typeof ArtifactFrame>> = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () =>
    created.render(<ArtifactFrame body="<p>Quiz</p>" format="html" title="My quiz" {...props} />),
  );
  const iframe = host.querySelector("iframe");
  if (!iframe) throw new Error("no iframe");
  return { iframe, rerender: (next: Partial<React.ComponentProps<typeof ArtifactFrame>>) =>
    act(async () => created.render(<ArtifactFrame body="<p>Quiz</p>" format="html" title="My quiz" {...props} {...next} />)) };
}

/** Stands in for the frame's `postMessage` (happy-dom drops transferred ports) and records what the host sends. */
function recordGuestMessages(guest: Window) {
  const sent: { message: object; transfer: Transferable[] }[] = [];
  Object.defineProperty(guest, "postMessage", {
    configurable: true,
    value: (message: object, _targetOrigin: string, transfer: Transferable[] = []) => sent.push({ message, transfer }),
  });
  return sent;
}

/** Plays the guest: posts `artifact:ready` from the frame and returns the port the host sends back. */
async function connect(iframe: HTMLIFrameElement): Promise<MessagePort> {
  const guest = iframe.contentWindow;
  if (!guest) throw new Error("no contentWindow");
  const sent = recordGuestMessages(guest);
  await act(async () => {
    window.dispatchEvent(new MessageEvent("message", { data: { type: ARTIFACT_READY_TYPE }, source: guest }));
  });
  const last = sent.at(-1);
  if (!last) throw new Error("host sent no port");
  expect(last.message).toEqual({ type: ARTIFACT_PORT_TYPE });
  // Node's MessageChannel, so not happy-dom's `MessagePort` class: check the shape.
  const port = last.transfer[0];
  if (!port || !("postMessage" in port)) throw new Error("no port in transfer");
  ports.push(port);
  return port;
}

type StateResult = { type: string; requestId: number; ok: boolean; value?: string | ArtifactStateMap | null; error?: string };

function request(port: MessagePort, message: { requestId: number; op: string; key?: string; value?: string }) {
  return new Promise<StateResult>((resolve) => {
    port.onmessage = (event: MessageEvent<StateResult>) => resolve(event.data);
    port.postMessage({ type: "artifact:state", ...message });
  });
}

describe("ArtifactFrame", () => {
  it("is sandboxed with allow-scripts only and titled", async () => {
    const { iframe } = await mountFrame();
    expect(iframe.getAttribute("sandbox")).toBe("allow-scripts");
    expect(iframe.getAttribute("title")).toBe("My quiz");
  });

  it("writes the document with the loaded snapshot, the CSP and the aliases", async () => {
    const { store } = fakeStore({ score: "3" });
    const { iframe } = await mountFrame({ store, stateGlobalAliases: ["app"] });
    expect(store.load).toHaveBeenCalledTimes(1);
    expect(iframe.srcdoc).toContain('window.__ARTIFACT_SNAPSHOT__={"score":"3"};');
    expect(iframe.srcdoc).toContain('window.__ARTIFACT_ALIASES__=["app"];');
    expect(iframe.srcdoc).toContain("connect-src 'none'");
    expect(iframe.srcdoc).toContain("<p>Quiz</p>");
  });

  it("answers state requests from the snapshot and saves after the debounce", async () => {
    const { store, saves } = fakeStore({ score: "3" });
    const { iframe } = await mountFrame({ store });
    const port = await connect(iframe);

    expect(await request(port, { requestId: 1, op: "get", key: "score" })).toEqual({
      type: ARTIFACT_STATE_RESULT_TYPE,
      requestId: 1,
      ok: true,
      value: "3",
    });
    expect((await request(port, { requestId: 2, op: "set", key: "index", value: "2" })).ok).toBe(true);
    expect((await request(port, { requestId: 3, op: "set", key: "index", value: "4" })).ok).toBe(true);
    expect(store.save).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(4999));
    expect(store.save).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(saves).toEqual([{ score: "3", index: "4" }]);

    expect((await request(port, { requestId: 4, op: "getAll" })).value).toEqual({ score: "3", index: "4" });
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it("saves at the max wait while changes keep coming", async () => {
    const { store } = fakeStore();
    const { iframe } = await mountFrame({ store, saveDelayMs: 100, saveMaxWaitMs: 250 });
    const port = await connect(iframe);
    for (let i = 0; i < 5; i += 1) {
      await request(port, { requestId: i + 1, op: "set", key: "tick", value: String(i) });
      await act(async () => vi.advanceTimersByTime(60));
    }
    expect(store.save).toHaveBeenCalledTimes(1);
  });

  it("refuses writes over the limits and malformed requests without saving", async () => {
    const { store } = fakeStore();
    const { iframe } = await mountFrame({ store });
    const port = await connect(iframe);
    const big = await request(port, { requestId: 1, op: "set", key: "big", value: "x".repeat(16 * 1024 + 1) });
    expect(big.ok).toBe(false);
    expect(big.error).toMatch(/16 KiB/);
    const malformed = await request(port, { requestId: 2, op: "set", key: "missing-value" });
    expect(malformed).toMatchObject({ ok: false, error: "Malformed state request." });
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(store.save).not.toHaveBeenCalled();
  });

  it("flushes a pending save on pagehide, and on hidden visibility", async () => {
    const { store, saves } = fakeStore();
    const { iframe } = await mountFrame({ store });
    const port = await connect(iframe);
    await request(port, { requestId: 1, op: "set", key: "a", value: "1" });
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    expect(saves).toEqual([{ a: "1" }]);

    await request(port, { requestId: 2, op: "remove", key: "a" });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(saves).toEqual([{ a: "1" }, {}]);
  });

  it("flushes a pending save on unmount", async () => {
    const { store, saves } = fakeStore({ a: "1" });
    const { iframe } = await mountFrame({ store });
    const port = await connect(iframe);
    await request(port, { requestId: 1, op: "reset" });
    await act(async () => root?.unmount());
    root = null;
    expect(saves).toEqual([{}]);
  });

  it("ignores ready messages from other windows", async () => {
    const { iframe } = await mountFrame();
    const guest = iframe.contentWindow;
    if (!guest) throw new Error("no contentWindow");
    const sent = recordGuestMessages(guest);
    await act(async () => {
      window.dispatchEvent(new MessageEvent("message", { data: { type: ARTIFACT_READY_TYPE }, source: window }));
      window.dispatchEvent(new MessageEvent("message", { data: { type: "other" }, source: guest }));
    });
    expect(sent).toEqual([]);
  });

  it("starts empty and never saves when the load fails", async () => {
    const { store } = fakeStore();
    store.load = vi.fn(async () => {
      throw new Error("offline");
    });
    const { iframe } = await mountFrame({ store });
    expect(store.onError).toHaveBeenCalledWith(new Error("offline"), "load");
    expect(iframe.srcdoc).toContain("window.__ARTIFACT_SNAPSHOT__={};");
    const port = await connect(iframe);
    expect((await request(port, { requestId: 1, op: "set", key: "a", value: "1" })).ok).toBe(true);
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    expect(store.save).not.toHaveBeenCalled();
  });

  it("reports a failed save", async () => {
    const { store } = fakeStore();
    store.save = vi.fn(async () => {
      throw new Error("quota");
    });
    const { iframe } = await mountFrame({ store });
    const port = await connect(iframe);
    await request(port, { requestId: 1, op: "set", key: "a", value: "1" });
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    expect(store.onError).toHaveBeenCalledWith(new Error("quota"), "save");
  });

  it("keeps state in memory without a store", async () => {
    const { iframe } = await mountFrame();
    expect(iframe.srcdoc).toContain("window.__ARTIFACT_SNAPSHOT__={};");
    const port = await connect(iframe);
    await request(port, { requestId: 1, op: "set", key: "a", value: "1" });
    expect((await request(port, { requestId: 2, op: "get", key: "a" })).value).toBe("1");
  });

  it("reloads after a new body, once the pending save has finished", async () => {
    const { store } = fakeStore({ v: "1" });
    let finishSave = () => {};
    store.save = vi.fn(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    const { iframe, rerender } = await mountFrame({ store, stateGlobalAliases: ["app"] });
    const port = await connect(iframe);
    await request(port, { requestId: 1, op: "set", key: "v", value: "2" });

    // Same alias names in a new array: no reload.
    await rerender({ stateGlobalAliases: ["app"] });
    expect(store.load).toHaveBeenCalledTimes(1);

    await rerender({ body: "<p>Version 2</p>" });
    expect(store.save).toHaveBeenCalledWith({ v: "2" });
    expect(store.load).toHaveBeenCalledTimes(1);
    await act(async () => finishSave());
    expect(store.load).toHaveBeenCalledTimes(2);
    expect(iframe.srcdoc).toContain("<p>Version 2</p>");
  });
});

import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  ARTIFACT_CSP,
  ARTIFACT_LOCAL_STORAGE_PREFIX,
  ARTIFACT_PORT_TYPE,
  ARTIFACT_READY_TYPE,
  ARTIFACT_SESSION_STORAGE_PREFIX,
  ARTIFACT_STATE_RESULT_TYPE,
  ARTIFACT_STATE_TYPE,
  GUEST_BOOTSTRAP_SCRIPT,
  applyArtifactStateOp,
  artifactGuestScript,
  clearPrefixedKeys,
  parseArtifactStateOp,
  prefixedStorageKey,
  storageView,
  wrapArtifactHtml,
  type ArtifactStateMap,
} from "@vvedantb/server";

const page = "<!DOCTYPE html><html><head></head><body>hi</body></html>";

describe("message names", () => {
  it("are neutral", () => {
    expect([ARTIFACT_READY_TYPE, ARTIFACT_PORT_TYPE, ARTIFACT_STATE_TYPE, ARTIFACT_STATE_RESULT_TYPE]).toEqual([
      "artifact:ready",
      "artifact:port",
      "artifact:state",
      "artifact:state-result",
    ]);
    for (const type of [ARTIFACT_READY_TYPE, ARTIFACT_PORT_TYPE, ARTIFACT_STATE_TYPE, ARTIFACT_STATE_RESULT_TYPE]) {
      expect(GUEST_BOOTSTRAP_SCRIPT).toContain(`"${type}"`);
    }
  });
});

describe("artifact iframe bootstrap", () => {
  it("injects CSP connect-src none and the artifactState guest", () => {
    const wrapped = wrapArtifactHtml(page);
    expect(wrapped).toContain(ARTIFACT_CSP);
    expect(wrapped).toContain("connect-src 'none'");
    expect(wrapped).toContain("window.artifactState=state");
    expect(GUEST_BOOTSTRAP_SCRIPT).toContain("getAll");
    expect(wrapped).not.toContain("allow-same-origin");
    // At the start of <head>, before anything the page runs.
    expect(wrapped.indexOf("<head>") + "<head>".length).toBe(wrapped.indexOf("<meta http-equiv"));
  });

  it("adds a <head>, or a whole document, when the page has none", () => {
    expect(wrapArtifactHtml("<html lang=\"en\"><body>x</body></html>")).toMatch(/^<html lang="en"><head><meta http-equiv/);
    const fragment = wrapArtifactHtml("<p>x</p>");
    expect(fragment.startsWith("<!doctype html><html><head><meta http-equiv")).toBe(true);
    expect(fragment.endsWith("<body><p>x</p></body></html>")).toBe(true);
  });

  it("shims localStorage and sessionStorage over the bridge", () => {
    const wrapped = wrapArtifactHtml(page, { "ls:theme": "dark", score: "1" });
    expect(wrapped).toContain("localStorage");
    expect(wrapped).toContain("sessionStorage");
    expect(wrapped).toContain('createStorage("ls:")');
    expect(wrapped).toContain('createStorage("ss:")');
    expect(wrapped).toContain("getItem");
    expect(wrapped).toContain("__ARTIFACT_SNAPSHOT__");
    expect(wrapped).toContain("ls:theme");
    expect(GUEST_BOOTSTRAP_SCRIPT).toContain("QuotaExceededError");
  });

  it("escapes < in the snapshot so it cannot close the script", () => {
    const wrapped = wrapArtifactHtml(page, { note: "</script><script>alert(1)</script>" });
    expect(wrapped).not.toContain("</script><script>alert(1)");
    expect(wrapped).toContain("\\u003c/script>");
  });

  it("rejects over-quota set and leaves data unchanged", () => {
    const current = { a: "1" };
    const result = applyArtifactStateOp(current, { op: "set", key: "huge", value: "x".repeat(16 * 1024 + 8) });
    expect(result.error).toMatch(/16 KiB/);
    expect(result.data).toEqual(current);
  });
});

describe("state global aliases", () => {
  it("are embedded as data, and none by default", () => {
    expect(artifactGuestScript()).toContain("window.__ARTIFACT_ALIASES__=[];");
    expect(wrapArtifactHtml(page, {}, { stateGlobalAliases: ["app", "legacy_1"] })).toContain(
      'window.__ARTIFACT_ALIASES__=["app","legacy_1"];',
    );
  });

  it("refuse names that are not identifiers or would replace a global", () => {
    for (const alias of ["", "a-b", "1x", "a.b", "</script>", "window", "document", "localStorage", "artifactState"]) {
      expect(() => artifactGuestScript({}, { stateGlobalAliases: [alias] }), alias).toThrow("Invalid artifact state alias");
    }
  });
});

/** Run the guest script in a bare VM realm that stands in for the iframe: messages go out through `ReactNativeWebView`. */
function runGuest(snapshot: ArtifactStateMap, aliases: string[]) {
  const sent: { type: string; requestId?: number; op?: string; key?: string; value?: string }[] = [];
  const listeners: ((event: { data: object; ports?: object[] }) => void)[] = [];
  const context = createContext({
    TextEncoder,
    DOMException,
    ReactNativeWebView: { postMessage: (json: string) => sent.push(JSON.parse(json)) },
    addEventListener: (_type: string, listener: (event: { data: object }) => void) => listeners.push(listener),
  });
  runInContext("var window = globalThis;", context);
  runInContext(artifactGuestScript(snapshot, { stateGlobalAliases: aliases }), context);
  const reply = (requestId: number, value: string | null) => {
    for (const listener of listeners) listener({ data: { type: ARTIFACT_STATE_RESULT_TYPE, requestId, ok: true, value } });
  };
  return { sent, reply, run: (code: string) => runInContext(code, context) };
}

describe("guest runtime", () => {
  it("exposes window.artifactState and the same object under each alias", () => {
    const guest = runGuest({}, ["app", "other"]);
    expect(guest.run("window.app.state === window.artifactState && window.other.state === window.artifactState")).toBe(true);
    expect(guest.run("typeof window.artifactState.getAll")).toBe("function");
    expect(guest.run("'__ARTIFACT_SNAPSHOT__' in window || '__ARTIFACT_ALIASES__' in window")).toBe(false);
    expect(guest.sent).toEqual([{ type: ARTIFACT_READY_TYPE }]);
  });

  it("defines no alias global the host did not pass", () => {
    const guest = runGuest({}, []);
    expect(guest.run("typeof window.artifactState")).toBe("object");
    expect(guest.run("Object.keys(window).filter((k) => window[k] && window[k].state === window.artifactState)")).toEqual([]);
  });

  it("reads the snapshot through the storage shims and sends state ops", async () => {
    const guest = runGuest({ "ls:theme": "dark", "ss:tmp": "1", score: "3" }, ["app"]);
    expect(guest.run("localStorage.getItem('theme') + ',' + sessionStorage.tmp + ',' + localStorage.length")).toBe("dark,1,1");
    guest.run("localStorage.setItem('theme', 'light')");
    const pending = guest.run("window.app.state.set('index', 2)");
    expect(guest.sent.slice(1)).toEqual([
      { type: ARTIFACT_STATE_TYPE, requestId: 1, op: "set", key: "ls:theme", value: "light" },
      { type: ARTIFACT_STATE_TYPE, requestId: 2, op: "set", key: "index", value: "2" },
    ]);
    guest.reply(2, null);
    await expect(pending).resolves.toBeNull();
    // The host side parses what the guest sent.
    expect(guest.sent.slice(1).map(parseArtifactStateOp)).toEqual([
      { op: "set", key: "ls:theme", value: "light" },
      { op: "set", key: "index", value: "2" },
    ]);
  });

  it("in an iframe, posts ready to the parent and queues requests until the port arrives", async () => {
    const toParent: object[] = [];
    const listeners: ((event: { data: object; ports?: object[] }) => void)[] = [];
    const context = createContext({
      TextEncoder,
      DOMException,
      parent: { postMessage: (message: object, targetOrigin: string) => toParent.push({ message, targetOrigin }) },
      addEventListener: (_type: string, listener: (event: { data: object; ports?: object[] }) => void) =>
        listeners.push(listener),
    });
    runInContext("var window = globalThis;", context);
    runInContext(artifactGuestScript({}), context);
    expect(toParent).toEqual([{ message: { type: ARTIFACT_READY_TYPE }, targetOrigin: "*" }]);

    const pending = runInContext("window.artifactState.getAll()", context);
    const onPort: object[] = [];
    const port: { postMessage: (message: object) => void; onmessage: ((event: { data: object }) => void) | null } = {
      postMessage: (message) => onPort.push(message),
      onmessage: null,
    };
    for (const listener of listeners) listener({ data: { type: ARTIFACT_PORT_TYPE }, ports: [port] });
    expect(onPort).toEqual([{ type: ARTIFACT_STATE_TYPE, requestId: 1, op: "getAll" }]);

    port.onmessage?.({ data: { type: ARTIFACT_STATE_RESULT_TYPE, requestId: 1, ok: true, value: { a: "1" } } });
    await expect(pending).resolves.toEqual({ a: "1" });
    runInContext("window.artifactState.set('b', 2)", context);
    expect(onPort.at(-1)).toEqual({ type: ARTIFACT_STATE_TYPE, requestId: 2, op: "set", key: "b", value: "2" });
    expect(toParent).toHaveLength(1);
  });

  it("refuses writes over the limits before they reach the host", async () => {
    const guest = runGuest({}, []);
    expect(() => guest.run("localStorage.setItem('blob', 'x'.repeat(16 * 1024 + 1))")).toThrow("quota");
    await expect(guest.run("window.artifactState.set('big', 'x'.repeat(16 * 1024))")).rejects.toThrow("State exceeds quota.");
    expect(guest.sent).toEqual([{ type: ARTIFACT_READY_TYPE }]);
  });
});

describe("parseArtifactStateOp", () => {
  it("accepts the five ops and drops malformed messages", () => {
    expect(parseArtifactStateOp({ op: "getAll" })).toEqual({ op: "getAll" });
    expect(parseArtifactStateOp({ op: "reset" })).toEqual({ op: "reset" });
    expect(parseArtifactStateOp({ op: "get", key: "a" })).toEqual({ op: "get", key: "a" });
    expect(parseArtifactStateOp({ op: "remove", key: "a" })).toEqual({ op: "remove", key: "a" });
    expect(parseArtifactStateOp({ op: "set", key: "a", value: "1" })).toEqual({ op: "set", key: "a", value: "1" });
    expect(parseArtifactStateOp({ op: "set", key: "a" })).toBeUndefined();
    expect(parseArtifactStateOp({ op: "get" })).toBeUndefined();
    expect(parseArtifactStateOp({ op: "drop" })).toBeUndefined();
  });
});

describe("artifact localStorage namespace", () => {
  it("prefixes ls keys and keeps state keys when clearing storage", () => {
    const data = {
      index: "2",
      [prefixedStorageKey(ARTIFACT_LOCAL_STORAGE_PREFIX, "theme")]: "dark",
      [prefixedStorageKey(ARTIFACT_SESSION_STORAGE_PREFIX, "tmp")]: "1",
    };
    expect(storageView(data, ARTIFACT_LOCAL_STORAGE_PREFIX)).toEqual({ theme: "dark" });
    expect(storageView(data, ARTIFACT_SESSION_STORAGE_PREFIX)).toEqual({ tmp: "1" });
    expect(clearPrefixedKeys(data, ARTIFACT_LOCAL_STORAGE_PREFIX)).toEqual({
      index: "2",
      [prefixedStorageKey(ARTIFACT_SESSION_STORAGE_PREFIX, "tmp")]: "1",
    });
  });

  it("applies the same quota to namespaced localStorage writes", () => {
    const result = applyArtifactStateOp(
      {},
      { op: "set", key: prefixedStorageKey(ARTIFACT_LOCAL_STORAGE_PREFIX, "blob"), value: "x".repeat(16 * 1024 + 8) },
    );
    expect(result.error).toMatch(/16 KiB/);
    expect(result.data).toEqual({});
  });
});

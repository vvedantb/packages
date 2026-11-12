import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { imageAspect, imageGridTiles, imageViewerPage, MEDIA } from "../src/media/imageGrid";
import {
  HTML_VIEW_HEIGHT_SCRIPT,
  htmlViewNavigation,
  htmlViewPostScript,
  parseHtmlViewHeight,
} from "../src/webview/htmlView";

describe("image gallery grid", () => {
  it("is the web ImageGalleryPreview: up to four tiles, the third case spanning, +N on the fourth", () => {
    expect(imageGridTiles(2)).toEqual([
      { index: 0, spansColumn: false, overflow: 0 },
      { index: 1, spansColumn: false, overflow: 0 },
    ]);
    expect(imageGridTiles(3).map((tile) => tile.spansColumn)).toEqual([true, false, false]);
    expect(imageGridTiles(4).map((tile) => tile.overflow)).toEqual([0, 0, 0, 0]);
    expect(imageGridTiles(7).map((tile) => tile.overflow)).toEqual([0, 0, 0, 3]);
    expect(imageGridTiles(7)).toHaveLength(4);
  });

  it("keeps a lone image's shape within 1:2 to 3:1, 4:3 until it loads", () => {
    expect(imageAspect(null)).toBe(MEDIA.tileAspect);
    expect(imageAspect({ width: 1600, height: 900 })).toBeCloseTo(16 / 9);
    expect(imageAspect({ width: 390, height: 2000 })).toBe(0.5);
    expect(imageAspect({ width: 4000, height: 100 })).toBe(3);
    expect(imageAspect({ width: 0, height: 0 })).toBe(MEDIA.tileAspect);
  });

  it("reads the viewer page from the scroll offset, in range", () => {
    expect(imageViewerPage(0, 390, 3)).toBe(0);
    expect(imageViewerPage(400, 390, 3)).toBe(1);
    expect(imageViewerPage(5000, 390, 3)).toBe(2);
    expect(imageViewerPage(-20, 390, 3)).toBe(0);
    expect(imageViewerPage(100, 0, 3)).toBe(0);
  });
});

describe("HtmlView navigation", () => {
  it("loads the page's own document and its frames", () => {
    expect(htmlViewNavigation("about:blank", true)).toBe("load");
    expect(htmlViewNavigation("about:blank#section", true)).toBe("load");
    expect(htmlViewNavigation("https://cdn.example.com/embed", false)).toBe("load");
  });

  it("hands top-level http(s) links out and drops every other scheme", () => {
    expect(htmlViewNavigation("https://example.com/a", true)).toBe("open");
    expect(htmlViewNavigation("HTTP://example.com", true)).toBe("open");
    for (const url of ["javascript:alert(1)", "intent://scan#Intent;end", "file:///etc/hosts", "data:text/html,hi", "mailto:a@b.c"]) {
      expect(htmlViewNavigation(url, true), url).toBe("block");
    }
  });
});

/** Runs the height script against a stand-in document whose sizes the test sets. */
function runHeightScript(sizes: { scrollHeight: number; clientHeight: number; rectHeight: number }) {
  const posted: string[] = [];
  const listeners = new Map<string, () => void>();
  const documentElement = {
    get scrollHeight() {
      return sizes.scrollHeight;
    },
    get clientHeight() {
      return sizes.clientHeight;
    },
    getBoundingClientRect: () => ({ height: sizes.rectHeight }),
  };
  const document = {
    documentElement,
    body: {},
    addEventListener: (name: string, listener: () => void) => listeners.set(`document:${name}`, listener),
  };
  const window = {
    ReactNativeWebView: { postMessage: (message: string) => posted.push(message) },
    addEventListener: (name: string, listener: () => void) => listeners.set(`window:${name}`, listener),
  };
  const result = runInNewContext(HTML_VIEW_HEIGHT_SCRIPT, { window, document, Math, JSON });
  return { posted, result, fire: (key: string) => listeners.get(key)?.() };
}

describe("HtmlView height script", () => {
  it("posts the content height of a short page, and nothing again until it changes", () => {
    const sizes = { scrollHeight: 400, clientHeight: 400, rectHeight: 120.4 };
    const page = runHeightScript(sizes);
    // `true` as the last value, as react-native-webview asks of injected scripts.
    expect(page.result).toBe(true);
    page.fire("document:DOMContentLoaded");
    page.fire("window:load");
    expect(page.posted).toEqual(["native-ui:height:121"]);
    sizes.scrollHeight = 900;
    page.fire("window:load");
    expect(page.posted.map(parseHtmlViewHeight)).toEqual([121, 900]);
  });

  it("ignores messages that are not its own", () => {
    expect(parseHtmlViewHeight("native-ui:height:0")).toBeNull();
    expect(parseHtmlViewHeight("native-ui:height:abc")).toBeNull();
    expect(parseHtmlViewHeight('{"height":10}')).toBeNull();
  });
});

describe("HtmlView host message", () => {
  it("delivers the JSON to the page as a message event from its own window", () => {
    const received: Array<{ data: { method: string }; target: string }> = [];
    const window = {
      postMessage: (data: { method: string }, target: string) => received.push({ data, target }),
    };
    const message = JSON.stringify({ jsonrpc: "2.0", method: "ui/notifications/host-context-changed" });
    const result = runInNewContext(htmlViewPostScript(message), { window, JSON });
    expect(result).toBe(true);
    expect(received).toEqual([{ data: { jsonrpc: "2.0", method: "ui/notifications/host-context-changed" }, target: "*" }]);
  });
});

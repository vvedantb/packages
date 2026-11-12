/**
 * The pure half of `HtmlView`: which navigations the page may make, and the
 * script that reports the page's height to the app.
 */

/** What `HtmlView` does with a navigation: let it load, hand it to `onOpenLink`, or drop it. */
export type HtmlViewNavigation = "load" | "open" | "block";

/**
 * The page never leaves its own document. Its first load (`about:`) and its
 * frames load; a top-level http(s) link goes to `onOpenLink` (the system
 * browser), as the web's sandboxed frame opens links in a new tab; any other
 * scheme (`javascript:`, `intent:`, `file:`, `data:`) is dropped.
 */
export function htmlViewNavigation(url: string, isTopFrame: boolean): HtmlViewNavigation {
  if (!isTopFrame) return "load";
  if (url.startsWith("about:")) return "load";
  return /^https?:\/\//i.test(url) ? "open" : "block";
}

const HEIGHT_PREFIX = "native-ui:height:";

/**
 * Runs in the page before its own scripts. It posts the document's height
 * (`native-ui:height:<px>`) whenever it changes: the full scroll height when
 * the content is taller than the view, else the content's own height, so the
 * view can both grow and shrink to fit.
 */
export const HTML_VIEW_HEIGHT_SCRIPT = `(function(){var h,o;function z(){var r=document.documentElement,b=window.ReactNativeWebView;if(!r||!b)return;var v=Math.ceil(r.scrollHeight>r.clientHeight?r.scrollHeight:r.getBoundingClientRect().height);if(v===h)return;h=v;b.postMessage(${JSON.stringify(HEIGHT_PREFIX)}+v)}if(window.ResizeObserver){o=new ResizeObserver(z);o.observe(document.documentElement)}document.addEventListener("DOMContentLoaded",function(){if(o&&document.body)o.observe(document.body);z()});window.addEventListener("load",z)})();true;`;

/** The height in a message from `HTML_VIEW_HEIGHT_SCRIPT`; `null` for any other message. */
export function parseHtmlViewHeight(data: string): number | null {
  if (!data.startsWith(HEIGHT_PREFIX)) return null;
  const height = Number(data.slice(HEIGHT_PREFIX.length));
  return Number.isFinite(height) && height > 0 ? height : null;
}

/**
 * Script that delivers `message` (a JSON string) to the page as a `message`
 * event from its own window, as a host frame's `postMessage` would. In a
 * WebView the page is the top window, so `event.source === window.parent`.
 */
export function htmlViewPostScript(message: string): string {
  return `window.postMessage(JSON.parse(${JSON.stringify(message)}),"*");true;`;
}

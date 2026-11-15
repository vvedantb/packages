import { useEffect, useImperativeHandle, useRef } from "react";
import { View } from "react-native";
import type { HtmlViewProps } from "./HtmlView";

/**
 * `HtmlView` on web (`react-native-webview` has no web build): the page in a
 * sandboxed `srcdoc` iframe at `height`, scrolling inside. Scripts, forms and
 * popups only, with no `allow-same-origin`. It does not report a height or
 * deliver `hostMessage`; the native view does. The bridge works as on native:
 * the page's `parent.postMessage` reaches `onPageMessage` (as JSON text), and
 * the `ref` handle's `postMessage` reaches the page.
 */
export function HtmlView({ html, title, height, javaScriptEnabled = true, onPageMessage, ref: handle, testID }: HtmlViewProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  useImperativeHandle(handle, () => ({
    postMessage: (message: string) => frame.current?.contentWindow?.postMessage(JSON.parse(message), "*"),
  }));
  // The page is an external system: its messages arrive on the window, from this frame only.
  useEffect(() => {
    if (!onPageMessage) return;
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      onPageMessage(typeof event.data === "string" ? event.data : JSON.stringify(event.data));
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onPageMessage]);
  return (
    <View testID={testID} style={{ height }}>
      <iframe
        ref={frame}
        title={title}
        srcDoc={html}
        sandbox={javaScriptEnabled ? "allow-scripts allow-forms allow-popups" : ""}
        style={{ border: 0, width: "100%", height: "100%", background: "transparent" }}
      />
    </View>
  );
}

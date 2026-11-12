import { View } from "react-native";
import type { HtmlViewProps } from "./HtmlView";

/**
 * `HtmlView` on web (`react-native-webview` has no web build): the page in a
 * sandboxed `srcdoc` iframe at `height`, scrolling inside. Scripts, forms and
 * popups only, with no `allow-same-origin`. It does not report a height or
 * deliver `hostMessage`; the native view does.
 */
export function HtmlView({ html, title, height, javaScriptEnabled = true, testID }: HtmlViewProps) {
  return (
    <View testID={testID} style={{ height }}>
      <iframe
        title={title}
        srcDoc={html}
        sandbox={javaScriptEnabled ? "allow-scripts allow-forms allow-popups" : ""}
        style={{ border: 0, width: "100%", height: "100%", background: "transparent" }}
      />
    </View>
  );
}

import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { HTML_VIEW_HEIGHT_SCRIPT, htmlViewNavigation, htmlViewPostScript, parseHtmlViewHeight } from "./htmlView";

export type HtmlViewProps = {
  /** A whole HTML document, shown as written. */
  html: string;
  /** Names the view for TalkBack and VoiceOver. */
  title: string;
  /** The box height. Pass the page's own (`onContentHeight`) once known; the page scrolls inside past it. */
  height: number;
  /** Lets the page run scripts. Default `true`, as an `allow-scripts` iframe. */
  javaScriptEnabled?: boolean;
  /** A top-level http(s) link the page opened: show it outside, such as in the system browser. */
  onOpenLink: (url: string) => void;
  /** The page's content height in points, each time it changes. */
  onContentHeight?: (height: number) => void;
  /**
   * A JSON message for the page, delivered as a `message` event once it has
   * loaded and again whenever it changes (a theme switch, say), without a reload.
   */
  hostMessage?: string;
  testID?: string;
};

/**
 * An HTML page in a sandboxed `react-native-webview`, as the web's sandboxed
 * `srcdoc` iframe: transparent on the screen behind it, scripts on, and no
 * way out of its own document. A top-level link goes to `onOpenLink`; a
 * popup (`target="_blank"`, `window.open`) does too; any other navigation is
 * dropped. Incognito, with no DOM storage, cookies or file access, so the page
 * keeps nothing between views and reaches nothing of the app's. It reports its
 * height (`onContentHeight`) for a box that fits it.
 *
 * `@vvedantb/native-ui/webview` is the only entry that imports
 * `react-native-webview` (an optional peer). On web, `HtmlView.web.tsx` draws a
 * sandboxed iframe instead.
 */
export function HtmlView({ html, title, height, javaScriptEnabled = true, onOpenLink, onContentHeight, hostMessage, testID }: HtmlViewProps) {
  const ref = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);

  // The page is an external system: push each host message into it once it can listen.
  useEffect(() => {
    if (loaded && hostMessage) ref.current?.injectJavaScript(htmlViewPostScript(hostMessage));
  }, [loaded, hostMessage]);

  const openIfWeb = (url: string) => {
    if (htmlViewNavigation(url, true) === "open") onOpenLink(url);
  };

  return (
    <View testID={testID} style={{ height }}>
      <WebView
        ref={ref}
        source={{ html }}
        accessibilityLabel={title}
        // Every URL reaches `onShouldStartLoadWithRequest`: outside the
        // whitelist the WebView would hand it to `Linking` itself (an
        // `intent:` link would open another app).
        originWhitelist={["*"]}
        javaScriptEnabled={javaScriptEnabled}
        injectedJavaScriptBeforeContentLoaded={javaScriptEnabled ? HTML_VIEW_HEIGHT_SCRIPT : undefined}
        onMessage={(event) => {
          const reported = parseHtmlViewHeight(event.nativeEvent.data);
          if (reported !== null) onContentHeight?.(reported);
        }}
        onShouldStartLoadWithRequest={(request) => {
          const action = htmlViewNavigation(request.url, request.isTopFrame);
          if (action === "open") onOpenLink(request.url);
          return action === "load";
        }}
        setSupportMultipleWindows
        onOpenWindow={(event) => openIfWeb(event.nativeEvent.targetUrl)}
        onLoadEnd={() => setLoaded(true)}
        incognito
        domStorageEnabled={false}
        thirdPartyCookiesEnabled={false}
        sharedCookiesEnabled={false}
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        mediaPlaybackRequiresUserAction
        nestedScrollEnabled
        style={{ backgroundColor: "transparent" }}
      />
    </View>
  );
}

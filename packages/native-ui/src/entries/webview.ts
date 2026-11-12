// `@vvedantb/native-ui/webview`. Imports `react-native-webview` (an optional
// peer): the only entry that does, so an app without it bundles no WebView.
export { HtmlView } from "../webview/HtmlView";
export type { HtmlViewProps } from "../webview/HtmlView";
export { HTML_VIEW_HEIGHT_SCRIPT, htmlViewNavigation, htmlViewPostScript, parseHtmlViewHeight } from "../webview/htmlView";
export type { HtmlViewNavigation } from "../webview/htmlView";

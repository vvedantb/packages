---
"@vvedantb/native-ui": minor
---

`HtmlView` can run a request and reply bridge with its page: `onPageMessage` receives every message the page posts that is not a height report (`window.ReactNativeWebView.postMessage` on native, `parent.postMessage` in the web iframe), and a `ref` (`HtmlViewHandle`) has `postMessage(json)` to send the page a message at once. The web build now delivers both.

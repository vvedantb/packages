---
"@vvedantb/native-ui": patch
---

Fix `ExpoWebRoot` on Expo SDK 58: it now renders the HTML and body attributes, the head nodes (CSS links, metadata, preloads) and the body nodes (script tags) from `useServerDocumentContext`. Without them the static web export had no styles and no scripts, so every page was blank. Earlier SDKs are not affected.

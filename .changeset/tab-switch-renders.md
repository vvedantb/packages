---
"@vvedantb/native-ui": patch
---

Faster tab switches: `FloatingTabBar` tabs are memoised, so a switch re-renders only the two tabs whose focus changed; the glass blur target lives in a small external store, so handing it from one tab to the next re-renders only the subscribed glass instead of propagating a context change through every mounted tab.

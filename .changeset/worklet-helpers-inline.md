---
"@vvedantb/native-ui": patch
---

Fix an Android crash on tab change: React Compiler hoisted small functions out of worklets (the tab indicator's `useAnimatedStyle`), and the UI thread cannot call them. The dist build now puts them back inline.

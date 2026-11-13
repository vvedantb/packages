---
"@vvedantb/ui": patch
---

`PageWrapper` no longer takes a `useSyncTitle` prop (a hook passed as a prop breaks the Rules of React). Call the app's `usePageTitleSync(title)` next to it.

---
"@vvedantb/ui": minor
---

`SiteHeader` is now a floating pill bar instead of a full-width bar with a bottom border. Below `md` the menu button sits on the left and the wordmark is centred. The props are unchanged. The header is now `fixed` with a spacer of its own height, so pages need no layout change and it stays in view inside a wrapper that sets `overflow-x-hidden`, where `sticky` did not. Add `FloatingBar`, the pill on its own, for headers that bring their own navigation.

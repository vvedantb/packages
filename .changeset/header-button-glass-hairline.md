---
"@vvedantb/native-ui": patch
---

`HeaderIconButton` (and `ThemeToggle`, which sits on it) now draws its dark-mode border in `tokens.color.hairline.dark`, the glass hairline of `FloatingTabBar`, in place of a fixed white at 10%. The package default moves from white at 10% to white at 12%. An app that sets `hairline` through `configureTheme` now themes the header buttons and the tab bar together. Light mode is unchanged: white at 40%.

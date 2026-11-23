---
"@vvedantb/ui": minor
---

New `TabsTransition`: wrap a tab set's content to move it when the tab changes. The new panel comes from the side of the picked tab, as a phone swipe does. Variants: `"none"` (default), `"slide"` (32px plus fade, 240 ms in, 140 ms out) and `"push"` (full-width pager, 320 ms). Pass `value` and `order` (the tab values left to right). Set an app-wide default with `UiConfig.Tabs.transition`. It works with routed tab content, and `MotionProvider reducedMotion` and page-motion off still apply.

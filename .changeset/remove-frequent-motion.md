---
"@vvedantb/native-ui": patch
---

Less motion on surfaces seen many times a day:

- `CollapsibleContent` (the folds of `AgentTrace`, `ChainOfThought`, `Reasoning`, `Sources` and the subagent cards, from `/ai`): the content appears at once. It no longer fades in over 150 ms. The fade also ran each time a list mounted a fold that was already open, such as a chat opening or a virtualised row scrolled back into view. The chevron still turns in 150 ms. The content is now a plain `View` on iOS and Android, as it already was on web. A `className` on it now also styles it on iOS and Android.

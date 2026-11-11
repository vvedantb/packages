---
"@vvedantb/native-ui": patch
---

Less motion on surfaces seen many times a day:

- `FloatingTabBar`: the active pill moves to a newly focused tab at once. It no longer slides over 200 ms. A tab switch happens many times a day, so the slide read as delay. Reduce Motion was already instant, so nothing changes there.
- `CollapsibleContent` (the folds of `AgentTrace`, `ChainOfThought`, `Reasoning`, `Sources` and the subagent cards, from `/ai`): the content appears at once. It no longer fades in over 150 ms. The fade also ran each time a list mounted a fold that was already open, such as a chat opening or a virtualised row scrolled back into view. The chevron still turns in 150 ms. The content is now a plain `View` on iOS and Android, as it already was on web. A `className` on it now also styles it on iOS and Android.

---
"@vvedantb/native-ui": minor
---

`ConversationList` honours `inverted` (give `data` newest first). The newest message is the first row, drawn at the bottom, so a thread opens at its end in its first frame, with no scroll, no measuring and no hidden frame. Without `inverted`, a thread still opens hidden until its first jump to the measured end, and rows drawn or measured after that can still move it.

- A streamed reply (row 0) grows upwards and stays in view; there is no follow to run. A thread shorter than the view starts at its top, as before.
- Scrolled up, new content keeps what the reader sees in place (`maintainVisibleContentPosition`, set only while away from the bottom, on iOS and Android). `ConversationScrollButton` scrolls to the newest message, animated or at once with Reduce Motion.
- `ListHeaderComponent` draws at the bottom, under the newest message, and `ListFooterComponent` at the top. An empty list draws `ListEmptyComponent` in place of the list, the right way up.
- On Android, React Native flips an inverted list on both axes, so the column's left and right padding swap: keep it even, and put uneven side padding in the rows.
- `isScrolledToBottom` takes `inverted`: the bottom is within `AT_BOTTOM_THRESHOLD` of offset 0, less the space added before it.
- With `KeyboardControllerProvider`, the chat scroll view is inverted too. On iOS the end moves below offset 0 by the keyboard's space; on Android the content moves instead and 0 stays the end. While the keyboard moves, its scrolling does not count as the reader leaving the bottom, so the scroll button does not flash as the keyboard opens or closes (with or without `inverted`).

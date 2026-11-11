---
"@vvedantb/native-ui": minor
---

Bottom sheets drag down to close. `SheetContent` and the compact `DialogContent` follow the finger (Reanimated, from a `PanResponder`), the backdrop fades with the drag, and on release a flick or a drag past half the sheet slides it out and closes it, while a slow, short drag springs back. A `SheetBody` / `DialogBody` scrolled down keeps its scroll: the drag takes over only at its top. Reduce Motion settles the release at once; a sheet with `dismissible={false}` stays still.

`/ai` adds `ConversationDock`: put the composer or a docked question card in it, inside `Conversation`, and `ConversationScrollButton` sits 16 above the dock, so it moves with the dock and the keyboard. `ConversationScrollButton` takes `insets` to centre on an off-centre thread.

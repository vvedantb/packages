---
"@vvedantb/native-ui": minor
---

Phone quality fixes from a mobile-first pass, and two additive parts:

- `ConversationList` (from `/ai`) is `ConversationContent` as a virtualised `FlatList`, for a thread that can grow long: the same sticking to the bottom, scroll button and keyboard taps. It follows to the end it has measured, not `FlatList.scrollToEnd` (which places the end from estimated row heights, so a thread opened at its end stayed at the top). Its column has `px-3 py-3` and no gap: space messages with `ItemSeparatorComponent`. `useConversation().scrollRef` is now a `ConversationScroller` (`scrollToEnd`), the part both scrollers share.
- `ListDivider` (from `/primitives` and the root) is the `DividedList` hairline on its own, for the `ItemSeparatorComponent` of a `FlatList` or `SectionList`. `DividedList` draws it.
- `SheetContent` and the compact `DialogContent` shrink to fit under the top inset when they are taller than the room (a short window, or the keyboard up), so a `SheetBody` inside scrolls and the title stays on screen. Before, the sheet grew past the top edge and hid its title and the backdrop. `FloatingSurface` lets its content shrink with it.
- `DialogContent` and `SheetContent` take `onShow`, called once the overlay is on screen. Focus a field there: in a `Modal`, Android may not raise the keyboard for a field focused at mount, and the web focus trap moved focus to the backdrop.
- `MessageAction` slops only its height to 44, not its width. The actions sit 2 to 4 apart, so sideways slop overlapped the next one and a tap on Copy could fork or rate. `ChatIconButton` takes `slop="vertical"` for the same case.
- A `ChoiceQuestion` option's whole card is its target (the slop is the card padding), not the 32-high middle.

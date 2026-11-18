---
"@vvedantb/native-ui": patch
---

Every kit Modal holds chat lists still: on Android a Modal is a window of its own and moves the focus as it opens and closes, and `ConversationList`'s keyboard handler scrolled the list to its newest message each time — with the hold menu, and when an image opened over the chat. A shared overlay store now freezes that handler while any kit Modal shows (`MessageContextMenu`, `ImageViewer`, `DropdownMenu`, the dialogs and sheets on `OverlayModal`, `Select`, the full-screen `MarkdownTable`) and for 1 s after the last one closes, or until the reader drags the list. It replaces the hold menu's own freeze, whose release on the next keyboard event could come too early. Apps put `overlayFreezeRef` (primitives entry) on the root view of their own Modals.

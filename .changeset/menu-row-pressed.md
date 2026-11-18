---
"@vvedantb/native-ui": patch
---

Hold menu fixes:

- `Message` in a `ConversationList` with the keyboard parts: the hold menu freezes the list's keyboard handling from open until its close settles (`Conversation` `overlay`). Before, on Android, the menu's window took the focus as it opened and as it closed, and each time the list jumped to the newest message; the jump on open also closed the menu. `MessageContextMenu` gains `onDismissed` (iOS).
- `MessageContextMenu`: a pressed card row now takes the `SheetRow` pressed fill. Before, the row's own opacity style hid the press.

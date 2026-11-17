---
"@vvedantb/native-ui": patch
---

Hold menu fixes:

- `Message` in a `ConversationList` with the keyboard parts: the open hold menu freezes the list's keyboard handling (`overlayOpen`). Before, on Android, the menu's window took the focus and the list jumped to the newest message, which also closed the menu.
- `MessageContextMenu`: a pressed card row now takes the `SheetRow` pressed fill. Before, the row's own opacity style hid the press.

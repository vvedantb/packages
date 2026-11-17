---
"@vvedantb/native-ui": minor
---

Add `MessageContextMenu` and `Message`'s `menu` prop: holding a message opens an iMessage-style menu, with the chat under a frosted wash, the message lifted in place, its quick reactions in a pill above and its actions in a card below (label first, icon last; `disabled` actions dim). The parts move to stay on screen (`messageContextMenuLayout`). Add `MenuSheet`, `SubmenuRow` and `MenuDivider` (a menu as one bottom sheet, with submenu pages and a back button) and `ReactionRow` (round reaction toggles, tinted for emoji or solid for icons). A `Message` hold now takes 350 ms, shrinks it a little while held and gives a medium haptic. `MessageSheetAction` gains `disabled`.

---
"@vvedantb/native-ui": minor
---

`Dialog`, `AlertDialog`, `ConfirmDialog`, `Sheet` (and so `MenuSheet`) and `DropdownMenu` now draw in a `WindowLayer`. Under `WindowLayerHost` they sit in the app's window, so opening or closing one over a scrolled-up `KeyboardChatScrollView` chat no longer throws the chat to its newest message (an Android `Modal` is its own window, and its focus change scrolled the chat). Without a host they stay a `Modal`. `WindowLayer` gains `onShow` (once the layer is on screen, as a Modal's) and `fade` (`false` for an overlay that runs its own motion). Each overlay gives its own context (the open state, the menu) to its content again, because a layer does not keep the context between the host and the overlay; app context from above the host is kept.

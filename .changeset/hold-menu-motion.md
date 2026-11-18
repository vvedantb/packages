---
"@vvedantb/native-ui": patch
---

`MessageContextMenu` pops in: as the menu fades in, the reaction pill and the action card grow into place from the corner next to the message (0.96 to 1, the popover's 150 ms ease-out), and the held message lifts a little (to 1.02). Driven by a shared value started on the menu's first layout, as Reanimated's entering animations do not run inside a Modal on Android. With Reduce Motion, everything is in place at once. The pill's layout classes become styles, as it is now a Reanimated view.

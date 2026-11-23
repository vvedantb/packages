---
"@vvedantb/native-ui": patch
---

Fix `DropdownMenu` opening at the top left of the screen on Android. `Button`, `IconButton`, `ChatIconButton` and `PromptInputButton` now forward `ref`, so `DropdownMenuTrigger asChild` can measure them. The trigger also treats an empty `measureInWindow` box as unmeasured, reads `measure` as a second source, and keeps a `ref` passed by the caller.

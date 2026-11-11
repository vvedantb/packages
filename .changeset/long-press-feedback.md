---
"@vvedantb/native-ui": patch
---

Long presses: `Message` with `onLongPress` or `actions` offers the long press to TalkBack and VoiceOver as the `longpress` action (named by `actionSheetTitle`, default "Message actions"), which opens the same action sheet. `SurfaceRow` fires `impactHaptic("light")` when a long press fires; its `longpress` accessibility action has no haptic.

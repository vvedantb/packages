---
"@vvedantb/native-ui": minor
---

New entry `@vvedantb/native-ui/keyboard-controller` with `KeyboardControllerProvider`, and a new optional peer `react-native-keyboard-controller` (`>=1.21.0`). Put the provider inside the app's `KeyboardProvider`: the kit then follows the keyboard's real position, frame by frame, on the UI thread.

- `ConversationList` keeps its size as the keyboard opens. It scrolls in `KeyboardChatScrollView`: the content gains the keyboard's height at the end and rises with it, so the newest message stays on the composer. It sits in `KeyboardGestureArea`: a drag down moves the keyboard with the finger once the finger reaches the composer, and lets it go at the finger's speed (iOS, and Android 11+ with `keyboardDismissMode="interactive"`). Android 10 and below keep `on-drag`. Scroll to end and the at-bottom check count the keyboard's space past the content.
- `ConversationDock` and `ConversationScrollButton` move with the keyboard (`KeyboardStickyView`, `translateY`), less the bottom safe-area inset, which the dock's content pads (as `PromptInput` does) and the keyboard covers. A `PromptInput` in the dock adds no lift of its own.
- `PromptInput` outside a dock, `ChatThread` and the `Dialog` / `AlertDialog` / `Sheet` overlays pad frame by frame (keyboard-controller's `KeyboardAvoidingView`).

New `KeyboardAvoidingView` on `/primitives` and the root: React Native's, or with the provider keyboard-controller's (padding by default; it takes `style`, not `className`). `PromptInput`'s field has `nativeID="native-ui-composer"`. `ChatThread` lifts the whole column (a new inner `View` takes its `className`), so its footer and scroll button add no lift of their own.

Without the provider (the peer is optional), every part keeps React Native's `KeyboardAvoidingView` as before. Only the new entry imports `react-native-keyboard-controller`.

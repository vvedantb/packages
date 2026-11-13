---
"@vvedantb/native-ui": patch
---

Fix two type errors in apps that typecheck the package source against `react-native-reanimated` 4.3.

- `ConversationScroller` (the type of `useConversation().scrollRef`) gains an optional `scrollTo({ y, animated })`. Only the `ScrollView` of `ConversationContent` has it, so call `scrollRef.current?.scrollTo?.(...)`. 0.12.0 narrowed the ref to `scrollToEnd` and broke apps that scroll to a message.
- The `/ai` collapsible chevron turns on the predefined `ease-out` curve, not `cubicBezier(0.23, 1, 0.32, 1)`. The duration (150 ms) and reduced-motion handling do not change.

---
"@vvedantb/native-ui": patch
---

`ConversationList` opens at its end: a list with rows stays hidden until its first jump to the measured end, then shows on the next frame. Before, a thread drew its first rows for a frame and then jumped to the end. An empty list (spinner or empty state) still shows at once.

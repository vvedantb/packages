---
"@vvedantb/native-ui": minor
---

`Pager`: a page set from outside (a tab press) slides there in 220 ms (`withTiming`, at once with Reduce Motion) in place of a jump, and the pages it passes are drawn, so it never crosses a blank page. `PAGER_FAIL_OFFSET_Y` is 14 (was 10), so a slightly diagonal swipe still turns the page. New pure helpers `pagesBetween` and `centredTabScroll` (the tab row's centred scroll).

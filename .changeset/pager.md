---
"@vvedantb/native-ui": minor
---

New `Pager` (on the root and `/primitives` entries), with the `PagerProps` type: side-by-side pages a horizontal swipe moves between, such as the sections under a row of `PillTabs`. The pages follow the finger 1:1 and, on release, spring on at the finger's speed (250 ms, no bounce) to the nearest page; a flick of 500 pt/s the way the drag moved turns one page, and past the first and last page they rubber-band. A drag caught mid-spring carries on from where the pages are. A settled page fires `selectionHaptic` and `onIndexChange`; an `index` set from outside (a tab press, a link) jumps there with no slide. Only a clearly sideways drag takes the pages (24 pt sideways, failing after 10 pt vertical), so a page's vertical list still scrolls. A page is drawn once visited or once a drag starts next to it, and then stays mounted, so it keeps its state. Pages off screen are hidden from screen readers. With Reduce Motion on the pages still follow the finger, and the release settles at once.

`PillTabs` takes an optional `progress` (the pager's shared value): the selected fill is then one indicator that moves with the pages under the finger. Without it nothing changes.

Inside a `Pager`, a `SwipeableRow` takes only the directions it has actions for, and a drag the other way passes to the pager (a row with only trailing actions, swiped right, moves the pages). Outside a pager it is as before.

The swipe runs on Gesture Handler worklets and needs `GestureHandlerProvider` from `@vvedantb/native-ui/gesture-handler`; without it only the current page is drawn, with no swipe, and no Gesture Handler import.

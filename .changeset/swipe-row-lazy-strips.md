---
"@vvedantb/native-ui": patch
---

`SwipeableRow` (with `GestureHandlerProvider`) mounts its action strips on the row's first touch, not with the row. A list of swipe rows no longer mounts every row's hidden buttons and icons up front (the Eva Inbox: 2 strips on each of up to 100 rows). The strips are invisible until the row moves, and a touch lands a few frames before a swipe can move it, so nothing changes on screen.

---
"@vvedantb/native-ui": minor
---

`UnifiedDiff` (from `/ai`) takes `onLinePress`, `linePressHint` and `markedLines`, for line comments on a phone Code tab:

- With `onLinePress`, each code row (not a hunk header) is a button named `Line N`. A tap calls it with the row's index in `lines`. The code is then not selectable, so a tap always lands. Rows have no hit slop: they tile the diff edge to edge, so slop would take the next line's taps. Without it, rows are as before.
- `markedLines` names rows by index, such as those with a pending comment. Their gutter fills at 12% of the primary colour and the number turns foreground.

---
"@vvedantb/native-ui": minor
---

Diff parts (from `/ai`) for a read-only file diff, as the web Code tab:

- `UnifiedDiff` draws one file's diff in one column, as `@pierre/diffs` in unified view: a line number gutter (the old number on a removed line, the new one otherwise), the `+`/`-` marker and the line in mono 14 / 22. Added lines tint emerald and removed lines red, each at 10%; a hunk header is a muted row on the secondary surface. Long lines do not wrap: the diff scrolls sideways and every row spans the widest line. It takes `lines` (`UnifiedDiffLine`: a hunk, or an added, removed or context line with its old and new numbers). `UNIFIED_DIFF` holds the metrics.
- `DiffStat` is the web `PrDiffStat`: `+n` in emerald, `−m` in the danger colour, tabular mono at `text-sm`, with `hideZero` to drop a zero side.

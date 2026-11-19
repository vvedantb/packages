---
"@vvedantb/ui": minor
---

Add `Sidebar.RailGroup`: a shared trough for rail tiles, styled like segmented tabs. One `bg-segment` pill per group slides to the active tile with the tabs pill motion (`--tabs-dur`, `--tabs-ease`), and hides when no tile is active. Idle tiles get a half-strength pill on hover. Grouped rail items carry `data-rail-tile` and `data-active` for the pill. `railTileStateClass` takes an optional `grouped` flag, and `railGroupClass` and `useInRailGroup` are exported for custom tiles. The account trigger follows the group fills too.

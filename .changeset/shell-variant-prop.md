---
"@vvedantb/ui": minor
---

`AppShell` and `AppShell.Root` take `variant`: `"floating"` (default, no change) or `"rail"`. Both variants take the same inputs, so an app switches layout with one prop. `"rail"` has no content card or gutter, puts each `SidebarRail` slot on a `RailGroup` trough with a sliding pill, and draws no `showDivider` border or `RailDivider`. New exports: `useAppShellVariant` and the `AppShellVariant` type.

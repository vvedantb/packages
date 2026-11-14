---
"@vvedantb/ui": minor
---

Visual change. The sidebar rail is more compact: `AppShell` `railWidth` defaults to `3.5rem` (was `4rem`) and `sidebarWidth` to `19.5rem` (was `20rem`, so the panel keeps its 16rem), rail tiles and the account trigger are 40px from `md` up (44px below, as before), the gap between tiles is `gap-1` (was `gap-1.5`) and `SIDEBAR_RAIL_APP_ICON_SIZE` is 24 (was 26). An app that passes its own `railWidth` or `sidebarWidth` keeps them.

Menu surfaces (`DropdownMenu`, `ContextMenu`, `Select`, `RadixSelect`) use the new `rounded-menu` utility (14px at the default radius, was `rounded-lg`, 16px): the item radius plus the `p-1.5` inset, so the gap between a highlighted item and the surface edge is the same round the corner. `rounded-menu` comes with `tokens.css` and `compat-shadcn-rgb.css`, and the root `cn` treats it as a radius class.

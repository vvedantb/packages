---
"@vvedantb/ui": minor
---

Tab troughs take the card tone in dark mode, as Eva did with its own override.

- `SidePanelTabs.List`, `Sidebar.RailGroup` (`railGroupClass`) and `ButtonTrack` (`buttonTrackClass`) add `dark:bg-surface` to their `bg-default` trough. In dark the trough was lighter than the card; in `.dark.neutral` it was the same tone as the `bg-segment` pill, so the pill did not show. Light mode is unchanged.
- `SidePanelTabs.Frame` card radius is now `md:rounded-surface` (was `md:rounded-lg`).
- Apps that copied Eva's `.tabs-segmented` / `.rail-track` dark override can remove it.

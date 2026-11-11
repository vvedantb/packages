---
"@vvedantb/native-ui": minor
---

`FloatingTabBar`:

- The active pill slides to a newly focused tab again, over the web `--tabs-dur` (200 ms) and `--tabs-ease`. Reduce Motion still moves it at once.
- The pill fill is the new `palette.tabBarPill` (`#ebebeb` light, `#474747` dark), not `palette.default` and `palette.segment`. An app that themes `segment` for the segmented `Tabs` thumb no longer darkens the bar's pill; theme `tabBarPill` to change it.

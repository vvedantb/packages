---
"@vvedantb/ui": patch
---

`SidePanelTabs.List` always shows the sliding pill on the active tab. Before, the pill showed only when the app set `UiConfig.Tabs.variant` to `segmented`. `TabsList` takes a `pillMotion` prop, which overrides `UiConfig.Tabs.pillMotion`.

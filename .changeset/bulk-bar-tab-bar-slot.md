---
"@vvedantb/native-ui": minor
---

`BulkActionBar` takes `placement="tabBar"`, the phone contextual bar. It sits in the slot and shape of `FloatingTabBar` (same insets, height and pill radius) and shows up and leaves at once, so the two bars swap with no gap. Each action is its icon over its `shortLabel` (12 px; 14 px with larger text) in a box at least 48 high (56 with larger text), and the actions share the spare width. There is no count chip, because the screen header shows the count. The default `placement="float"` is unchanged.

`FloatingTabBar` draws nothing while the focused route's `tabBarStyle` resolves to `display: "none"`, as React Navigation's own bar does. A screen hides the bar with `navigation.setOptions` or Expo Router's `<Tabs.Screen options>` inside the screen. New type: `BulkBarPlacement`.

`PageHeader` takes `leading`: content before the title, such as a close button while a page is in select mode.

Docked, the bar has no Cancel (X): the screen header carries the exit, as Android's contextual action bar, which leaves room for every label.

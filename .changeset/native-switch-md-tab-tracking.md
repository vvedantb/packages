---
"@vvedantb/native-ui": minor
---

`Switch` takes an optional `size` prop. `"sm"` (the default) is unchanged: the 36 × 20 web `Switch` with a 16 thumb. `"md"` is a 40 × 24 track with a 20 thumb that sits 2 in from the left and moves 18 when on, for apps that set the larger switch on the web through `UiConfig.Switch`. Larger text keeps the 56 × 32 size at both sizes. `switchSize(largerText, size?)` now also returns the `off` thumb class.

`TabsTrigger` labels now use the web type-scale letter spacing: `sm` triggers (`text-xs`) get 0.06 (0.005em), default triggers (`text-sm`) stay 0. Larger text keeps 0. `tabTriggerSize` returns this as `letterSpacing`.

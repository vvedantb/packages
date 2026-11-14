---
"@vvedantb/native-ui": minor
---

Export `useScheme` from `@vvedantb/native-ui/theme` and add `TabScreen` to `@vvedantb/native-ui/expo-router`.

`useScheme` returns the active NativeWind colour scheme as a `"light" | "dark"` key and redraws the caller after each `configureTheme`. `TabScreen` wraps its children in a `GlassBlurTarget` that is active only while the tab is focused, so the focused tab owns the floating tab bar's Android blur target.

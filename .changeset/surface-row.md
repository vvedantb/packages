---
"@vvedantb/native-ui": minor
---

`SurfaceRow` (from `/primitives` and the root) is the shell of a status list row, as the web `ListRow`: a card surface (`tokens.color.surface`, or a `backgroundColor`) at the 16 surface radius, a 4 wide status stripe (`accentColor`) on the leading edge 8 in from top and bottom, an optional 1 wide `borderColor` hairline, and the body at the web inset (`p-2.5 pl-3`, or a `className`). The whole row is one button (`accessibilityLabel`, `accessibilityHint`, `onPress`) that fades while pressed. `SURFACE_ROW` holds the metrics.

---
"@vvedantb/native-ui": minor
---

`LoadingState`: the web `LoadingState` with `variant="Drive"` and `iconOnly`, a 3x3 pixel grid whose chevron wavefront drives right. Same cells, delays, 650 ms cycle and keyframes as the web; `size="sm"` is the web session-row grid (3 pt cells). It runs on the UI thread (one Reanimated frame clock per grid) and is named `label` (default "Working") for assistive tech. With Reduce Motion, or `paused`, it holds a still frame and runs no clock. Cells use the muted text colour unless `color` is set. Exported from the root and `/primitives`. The labelled form and the `Dots` and `Orbit` variants are not ported.

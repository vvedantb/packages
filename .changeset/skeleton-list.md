---
"@vvedantb/native-ui": minor
---

New `SkeletonRow` and `SkeletonList` (on the root and `/primitives` entries), with their props types: placeholder rows for a loading list, in place of a centred spinner. `SkeletonRow` takes the real row's shape (a round `leading` mark, one or two `lines`, a `trailing` block, its `minHeight`), and its title width varies with `index`. `SkeletonList` draws `count` rows, with a `ListDivider` between them unless `divided` is off, and reads to screen readers as one busy element named `label`.

Fix: `Skeleton` drew nothing. NativeWind does not style a Reanimated `Animated.View`, so its size, fill and radius classes were dropped. The classes now sit on a plain `View`, with the pulse (opacity) on a fill inside. It still holds still with Reduce Motion.

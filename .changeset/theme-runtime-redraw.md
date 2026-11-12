---
"@vvedantb/native-ui": minor
---

`configureTheme` can run after the first render. Each call now redraws the mounted parts under `NativeUiProvider` that read the scheme, so an app can swap a palette at run time (for example a second dark palette, such as Eva's Neutral) without a restart. `BottomSheetContainer` and `FloatingSurface` read the scheme the same way as the other parts. New exports from `configureTheme.ts` (internal): `subscribeTheme` and `getThemeVersion`.

---
"@vvedantb/native-ui": minor
---

`BottomSheetContainer` now uses `@swmansion/react-native-bottom-sheet` in place of `@gorhom/bottom-sheet`. Apps must install the new library, remove `@gorhom/bottom-sheet` and remove `BottomSheetModalProvider`, which the sheet no longer needs. It needs React Native 0.82 or later and the New Architecture. A new optional `detents` prop sets the open detents (default `["40%"]`). The `@vvedantb/native-ui/native-bottom-sheet` subpath is removed: import from `@vvedantb/native-ui/bottom-sheet`.

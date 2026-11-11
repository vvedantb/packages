---
"@vvedantb/native-ui": minor
---

New entry `@vvedantb/native-ui/gesture-handler` with `GestureHandlerProvider`, and a new optional peer `react-native-gesture-handler` (`>=2.0.0`). Put the provider inside the app's `GestureHandlerRootView`: the sheet drags (`SheetContent`, the compact `DialogContent`) then run on `Gesture.Pan()` instead of `PanResponder`. The catch on touch-down, the 1:1 track phase and the velocity-seeded release run as worklets on the UI thread, so a busy JavaScript thread no longer makes the sheet lag the finger. The rules are the same: catch mid-slide, distance or velocity dismiss, rubber-band above rest, the backdrop fades with the sheet, slide-out on every close, Reduce Motion, the light haptic on snap-back.

`DialogBody` / `SheetBody` run their scroll with the pan (`Gesture.Native()`, simultaneous), read the offset on the UI thread (`useScrollOffset`) and hold still while the sheet follows the finger (`scrollTo`), so a drag re-renders nothing; the `PanResponder` drag re-rendered twice. When one touch scrolls the body back to its top and goes on down, the sheet takes over from there, with no jump by the scroll. Each overlay's `Modal` content sits in its own `GestureHandlerRootView`: on Android a `Modal` is a separate root, and without one every gesture in it silently does nothing.

Without the provider (the peer is optional), the sheets drag with `PanResponder` as before. Only the new entry imports `react-native-gesture-handler`.

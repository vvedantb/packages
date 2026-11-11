---
"@vvedantb/native-ui": minor
---

`Toaster` toasts swipe away the way they came in: up. Under `GestureHandlerProvider` a toast follows the finger 1:1 upward and fades as it rises; downward it gives a little, with growing resistance. On release a flick up (500 pt/s) or a drag past half its height dismisses it, carried on at the finger's speed, with a light impact haptic; else it springs home. While a finger is on the toast its auto-dismiss timer pauses, and lifting the finger resumes the time left. A tap still closes it. With Reduce Motion on it still follows the finger, and the release settles at once. Without the provider toasts close on a tap only, as before, and the `/toast` entry still imports no Gesture Handler.

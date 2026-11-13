---
"@vvedantb/native-ui": patch
---

DropdownMenu rows and the labelled Conversation scroll pill keep their layout on Android: the layout moved from a function `style` (which NativeWind drops on a native `Pressable`) to a plain style object, and the press state now draws from the `pressed` render state.

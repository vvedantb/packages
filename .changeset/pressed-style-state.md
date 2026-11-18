---
"@vvedantb/native-ui": patch
---

`SheetRow`, `Suggestion`, `Source` and the `FloatingTabBar` tabs keep their look. Each set its radius, border or fill in a `Pressable` style function next to a `className`, and NativeWind drops a style function then: suggestion chips drew square with no fill, and sheet rows and sources showed no pressed fill. They now read the pressed state from a new internal `usePressed` hook and pass a plain style. `Message` and the hold menu rows use the same hook.

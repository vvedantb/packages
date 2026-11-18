---
"@vvedantb/native-ui": minor
---

Image paste for `PromptInput`: a new `@vvedantb/native-ui/paste-input` entry with `PasteInputProvider`, on the optional peer `expo-paste-input` (native code, so a native build). With it, `PromptInput` takes `onPasteImages(uris)`: the long-press Paste and the keyboard's image insert (Gboard's clipboard, stickers) hand the images over as `file://` URIs, where React Native's `TextInput` took no image at all. Without the provider, or without `onPasteImages`, the field is unchanged.

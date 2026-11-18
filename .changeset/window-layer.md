---
"@vvedantb/native-ui": minor
---

The hold menu (`MessageContextMenu`) and the image viewer (`ImageViewer`) draw in the app's own window. A React Native `Modal` is a window of its own on Android: it took the focus as it opened and handed it back as it closed, and each time the chat list's keyboard handling (`react-native-keyboard-controller`) scrolled to the newest message — the jump after holding an older message or opening an image. New `WindowLayerHost` (primitives entry): wrap the app's navigator once; layers draw over it, fade in and out (Reduce Motion: at once), close on Android back, and hide the app under them from screen readers. Without a host, both fall back to a Modal as before.

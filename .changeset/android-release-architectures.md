---
"@vvedantb/config": patch
---

`vvedantb-android-release` can request ABIs for `reactNativeArchitectures` through the `REACT_NATIVE_ARCHITECTURES` env var or the `reactNativeArchitectures` config field, in that order. The default stays `arm64-v8a`. New helpers: `resolveReactNativeArchitectures` and `buildGradlePropertyEdits`.

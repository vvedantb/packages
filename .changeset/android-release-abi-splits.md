---
"@vvedantb/config": patch
---

`vvedantb-android-release` supports opt-in Gradle ABI splits through the `abiSplits` and `publishArchitectures` config fields. One `assembleRelease` writes one APK per ABI; only the publish ABI APK is renamed, hashed into `release.json` and published, with an unchanged versionCode. The `startup_apk` GitHub output names the x86_64 split for the start-up test. Default behaviour is unchanged. New helpers: `withAbiSplits`, `abiSplitsGradle`, `resolveReleaseApkNames`, `splitApkFileName` and `splitArchitectures`.

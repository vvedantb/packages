---
"@vvedantb/config": minor
---

Speed up the shared Android APK release path.

- Add `pickAndroidReleaseVersion` and its helpers (`compareSemver`, `highestSemver`, `publishedVersionNames`). The tests own the version rules. The `release-android-apk.yml` version step now lists tags once, takes published versionNames from tag suffixes and downloads `release.json` only for the highest semver tag, instead of every release.
- `vvedantb-android-release` builds `arm64-v8a` only (no `x86_64`), sets `org.gradle.workers.max=8` (replacing Expo's lower default) and `org.gradle.parallel=true`. `org.gradle.configuration-cache` stays off: ephemeral CI runners never reuse the cache, so a cold release build only pays the store cost, and native modules can still be incompatible on release tasks.
- Add the config flags `syncAppVersion` (write the version to `app.json` and the root `package.json`) and `versionNameFromAppJson` (use `expo.version` when `VERSION_NAME` is unset) so v-store can use the shared bin. Both default to `false`.
- The bin now also checks `versionName` in `android/app/build.gradle` after prebuild, not only `versionCode`.

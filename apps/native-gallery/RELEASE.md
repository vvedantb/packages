# Releasing the gallery APK

The gallery ships as a signed sideload APK through V Store. Nothing is published to a store or to npm.

## How a release happens

1. A push to `main` that touches the gallery or `packages/native-ui/src` runs `.github/workflows/release-gallery-android.yml`.
2. That workflow calls the shared `.github/workflows/release-android-apk.yml`, which picks the next `versionName` and `versionCode` and runs `scripts/build-android-release.sh`.
3. The APK and `release.json` go to a GitHub Release tagged `native-gallery-apk-<versionName>`.
4. V Store reads that release on its next catalog sync.

To build without publishing, run the workflow by hand with `dry_run` on. The APK is the `native-gallery-android-dry-run` artifact.

## Signing

The workflow needs four repository secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. A run stops if one is missing; a release never uses the debug key.

Android refuses an update that is signed with a different key. Keep a copy of the keystore outside GitHub. Do not commit it: `.gitignore` covers `*.jks`, `*.keystore`, `*.p12` and `keystore.properties`. Do not reuse another app's key without the owner's decision.

`app.config.js` adds `plugins/withReleaseSigning.js` only when `ANDROID_KEYSTORE_PATH` is set or `keystore.properties` is in the repository root, so the e2e build and `expo run:android` are unchanged.

## Local build (Linux or WSL2)

```bash
VERSION_NAME=1.0.1 VERSION_CODE=1000 ./apps/native-gallery/scripts/build-android-release.sh
```

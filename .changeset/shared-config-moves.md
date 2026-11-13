---
"@vvedantb/config": minor
---

Add four shared tooling items used across the apps:

- `withReleaseSigning`: an Expo config plugin that signs the Android `release` build type from a keystore (environment, else `keystore.properties`), failing a release when a value is missing. `expo/config-plugins` is an optional, lazily resolved peer. Marker is configurable and defaults to a value containing `plugins/withReleaseSigning.js` so build-script greps pass.
- `singletons` (and `nativeWindConfig`) on `defineExpoMetroConfig`: rewrites `originModulePath` to the app's `package.json` for the given module heads so a single copy resolves. Backward compatible for apps that omit it.
- `vvedantb-android-release`: a config-driven Android release build bin that merges the per-app build scripts into one and keeps the reusable-workflow `GITHUB_OUTPUT` interface (`apk`, `release_json`, `version_name`, `version_code`, `sha256`). Runs on Linux CI.
- A shared oxlint JS plugin at `@vvedantb/config/oxlint/plugin.mjs` with `no-value-block-in-try`, `no-source-text-in-tests`, `no-double-cast` and `no-json-parse`.

# Changelog

## 0.14.2

### Patch Changes

- [#338](https://github.com/vvedantb/packages/pull/338) [`5352f85`](https://github.com/vvedantb/packages/commit/5352f852ed51e4807e04fce84be83fbf522f7fe5) Thanks [@vvedantb](https://github.com/vvedantb)! - `vvedantb-android-release` supports opt-in Gradle ABI splits through the `abiSplits` and `publishArchitectures` config fields. One `assembleRelease` writes one APK per ABI; only the publish ABI APK is renamed, hashed into `release.json` and published, with an unchanged versionCode. The `startup_apk` GitHub output names the x86_64 split for the start-up test. Default behaviour is unchanged. New helpers: `withAbiSplits`, `abiSplitsGradle`, `resolveReleaseApkNames`, `splitApkFileName` and `splitArchitectures`.

## 0.14.1

### Patch Changes

- [#337](https://github.com/vvedantb/packages/pull/337) [`8bb6944`](https://github.com/vvedantb/packages/commit/8bb69441de755f833033b02fb2a65d72d692dd24) Thanks [@vvedantb](https://github.com/vvedantb)! - `vvedantb-android-release` can request ABIs for `reactNativeArchitectures` through the `REACT_NATIVE_ARCHITECTURES` env var or the `reactNativeArchitectures` config field, in that order. The default stays `arm64-v8a`. New helpers: `resolveReactNativeArchitectures` and `buildGradlePropertyEdits`.

## 0.14.0

### Minor Changes

- [#335](https://github.com/vvedantb/packages/pull/335) [`86d63c8`](https://github.com/vvedantb/packages/commit/86d63c83d4a927575fb2a7a812895442de095b22) Thanks [@vvedantb](https://github.com/vvedantb)! - `defineWebVitestConfig` takes `dedupe` (`resolve.dedupe`, as `defineWebViteConfig` does). Pass `dedupe: REACT_DEDUPE` when the tests load a workspace package from source: without it that package can load another copy of React than the app's.

### Patch Changes

- [#335](https://github.com/vvedantb/packages/pull/335) [`86d63c8`](https://github.com/vvedantb/packages/commit/86d63c83d4a927575fb2a7a812895442de095b22) Thanks [@vvedantb](https://github.com/vvedantb)! - The `vvedantb-*` bins are now small committed files in `bin/` that import the built CLI from `dist`. pnpm links a bin only when its file exists at install: in a workspace `dist` does not exist yet, so no bin was linked and scripts such as `vvedantb-check-shared-ui` failed. The commands and their behaviour do not change.

- [#335](https://github.com/vvedantb/packages/pull/335) [`86d63c8`](https://github.com/vvedantb/packages/commit/86d63c83d4a927575fb2a7a812895442de095b22) Thanks [@vvedantb](https://github.com/vvedantb)! - `vvedantb-doctor` accepts the shared workflow from `vvedantb/workflows`. Before, `ci-reusable-workflow` and `ci-commands` failed for a repo that called `vvedantb/workflows/.github/workflows/ci-app.yml`, because the doctor looked only for the `vvedantb/packages` path. A call to the older path still passes.

## 0.13.0

### Minor Changes

- [#333](https://github.com/vvedantb/packages/pull/333) [`659811a`](https://github.com/vvedantb/packages/commit/659811aa48efa54b1a6f3c8f908d1fa78d34d16b) Thanks [@vvedantb](https://github.com/vvedantb)! - `ci-runner` now matches the new Boat runner policy. Check jobs use `boat` (or `boat-small`). `boat-large` is only for Android release builds: the `release-android-apk.yml` and `release-gallery-android.yml` workflows, or a workflow file with `android` in its name. A `boat-large` runner on a `ci-app.yml` job fails. An unknown `boat*` label such as `boat-medium` fails and the message lists the valid labels.

## 0.12.0

### Minor Changes

- [#318](https://github.com/vvedantb/packages/pull/318) [`5f7ce9d`](https://github.com/vvedantb/packages/commit/5f7ce9d342f04bfd979baacc17fd00930f34bb56) Thanks [@vvedantb](https://github.com/vvedantb)! - Speed up the shared Android APK release path.

  - Add `pickAndroidReleaseVersion` and its helpers (`compareSemver`, `highestSemver`, `publishedVersionNames`). The tests own the version rules. The `release-android-apk.yml` version step now lists tags once, takes published versionNames from tag suffixes and downloads `release.json` only for the highest semver tag, instead of every release.
  - `vvedantb-android-release` builds `arm64-v8a` only (no `x86_64`), sets `org.gradle.workers.max=8` (replacing Expo's lower default) and `org.gradle.parallel=true`. `org.gradle.configuration-cache` stays off: ephemeral CI runners never reuse the cache, so a cold release build only pays the store cost, and native modules can still be incompatible on release tasks.
  - Add the config flags `syncAppVersion` (write the version to `app.json` and the root `package.json`) and `versionNameFromAppJson` (use `expo.version` when `VERSION_NAME` is unset) so v-store can use the shared bin. Both default to `false`.
  - The bin now also checks `versionName` in `android/app/build.gradle` after prebuild, not only `versionCode`.

## 0.11.0

### Minor Changes

- [#300](https://github.com/vvedantb/packages/pull/300) [`45a64a3`](https://github.com/vvedantb/packages/commit/45a64a3ff5140e29218302865b2fdbaeac0e5cb3) Thanks [@vvedantb](https://github.com/vvedantb)! - The oxlint base now loads the 9 rules of `eslint-plugin-react-you-might-not-need-an-effect` 1.0.2 as the `no-effect` JS plugin and sets them to `error`. A repo that extends `oxlint/base.json` gets the rules with no change of its own. The plugin is bundled into `@vvedantb/config/oxlint/no-effect.mjs`, so the package adds no dependency and no app installs ESLint. A repo that does not extend the base can name that file as its `jsPlugins` specifier.

## 0.10.1

### Patch Changes

- [#298](https://github.com/vvedantb/packages/pull/298) [`708736a`](https://github.com/vvedantb/packages/commit/708736a0659a909e8683256d87965b6a62529fee) Thanks [@vvedantb](https://github.com/vvedantb)! - `vvedantb-doctor` now reads a `pnpm-workspace.yaml` that starts with a byte-order mark. Before, it found no workspace packages in such a file and checked only the root `package.json`, so drift in the workspaces passed.

## 0.10.0

### Minor Changes

- [#296](https://github.com/vvedantb/packages/pull/296) [`5a84fe6`](https://github.com/vvedantb/packages/commit/5a84fe67f326782ed533f7247b63c58b653eb887) Thanks [@vvedantb](https://github.com/vvedantb)! - `vvedantb-doctor` has two new checks. `ci-runner` fails on a job that runs on the small `boat` runner (use `boat-large`). `ci-commands` fails on a CI command that is not `lint`, `typecheck` or `test` and has no written reason under `ciCommands` in `.vvedantb-doctor.json`.

## 0.9.0

### Minor Changes

- [#292](https://github.com/vvedantb/packages/pull/292) [`dfd2849`](https://github.com/vvedantb/packages/commit/dfd2849e95d2f55e2a697767d3de171aaf1fe763) Thanks [@vvedantb](https://github.com/vvedantb)! - Add a shared-worker Vitest preset and a `vvedantb-doctor` CLI.

  - `sharedWorkerVitestConfig` (and `SHARED_WORKER_SETUP`): an opt-in Vitest preset that lets test files share a worker (`isolate: false`), shuffles file order, and resets mocks, env stubs, global stubs and fake timers after each test. Trades per-file isolation for a faster run; adopt it per repo where tests are independent.
  - `vvedantb-doctor`: a dependency-free CLI that inspects a repo for drift from the shared CI and tooling house rules (ESLint, Prettier, plain `tsc`, missing `tsrs`, missing `oxlint` dep or script, an older `@vvedantb/config` minor, a CI workflow that does not call the shared reusable workflow). It walks workspace packages, supports `--json` and a per-repo waiver file, makes no network requests, and exits non-zero on drift.

## 0.8.1

### Patch Changes

- [#273](https://github.com/vvedantb/packages/pull/273) [`2db587f`](https://github.com/vvedantb/packages/commit/2db587ffc66fed29c86e8562f7f9b5bcb30e06c6) Thanks [@vvedantb](https://github.com/vvedantb)! - Soften the synced `## UI copy` section: subtext is the exception, allowed where the user needs it and nothing else on screen says it. The `vvedantb/no-settings-description` rule stays opt-in for apps that want a hard ban.

## 0.8.0

### Minor Changes

- [#272](https://github.com/vvedantb/packages/pull/272) [`712a66e`](https://github.com/vvedantb/packages/commit/712a66eb2f9567df914ef2f34da5db5433333650) Thanks [@vvedantb](https://github.com/vvedantb)! - Add the `vvedantb/no-settings-description` oxlint rule, which flags a `description` prop on `SettingsSection`, `SettingsToggleRow` and `LabeledSwitchRow` (option `components` adds names). `vvedantb-config sync` now adds a `## UI copy` section to `CLAUDE.md` when it is missing.

## 0.7.2

### Patch Changes

- [#269](https://github.com/vvedantb/packages/pull/269) [`f3667c6`](https://github.com/vvedantb/packages/commit/f3667c67a64b4f3fc74e5bda0fc08461981668f6) Thanks [@vvedantb](https://github.com/vvedantb)! - No code change. First release through the publish-on-merge Release workflow.

## 0.7.1

### Patch Changes

- [#267](https://github.com/vvedantb/packages/pull/267) [`07fed85`](https://github.com/vvedantb/packages/commit/07fed85331622de21f1c8240263f96f30030a525) Thanks [@vvedantb](https://github.com/vvedantb)! - Register the seven oxlint rules that `@vvedantb/config/oxlint/plugin.mjs` shipped but did not expose: `no-conditional-tests`, `no-inline-object-type-assertion`, `no-inline-zod-schema`, `no-is-record`, `no-ts-nocheck`, `no-unknown-shape-probing` and `prefer-schema-inferred-types`. Configuring them under `vvedantb/*` no longer fails with "Rule not found".

## 0.7.0

### Minor Changes

- [#256](https://github.com/vvedantb/packages/pull/256) [`313fff7`](https://github.com/vvedantb/packages/commit/313fff7cd8a4d63ed9b7ae0017c00ed933a51fdc) Thanks [@vvedantb](https://github.com/vvedantb)! - `vvedantb-android-release` now covers verve and velth: the config gains `unsetEnv`, `postPrebuildSteps` and the `authoritative` and `exportAll` options on the `eas-profile` source, and `easProfileEntries` is exported. The repo also adds the reusable `ci-app.yml` workflow and documents both reusable workflows with caller examples.

## 0.6.0

### Minor Changes

- [#254](https://github.com/vvedantb/packages/pull/254) [`e21cff1`](https://github.com/vvedantb/packages/commit/e21cff1ef94926769012753743f1b5dc14e931d0) Thanks [@vvedantb](https://github.com/vvedantb)! - Add two bins and extend the shared oxlint plugins. `vvedantb-check-shared-ui` checks the shared site header and footer, with flags for the directories, pages and hosts that differ per app. `vvedantb-check-no-source-text` fails when a test reads source text. The `vvedantb` oxlint plugin gains seven rules: `no-conditional-tests`, `no-inline-object-type-assertion`, `no-inline-zod-schema`, `no-ts-nocheck`, `no-unknown-shape-probing`, `no-is-record` and `prefer-schema-inferred-types`. A new `@vvedantb/config/oxlint/anti-slop.js` plugin ships ten anti-slop rules.

## 0.5.0

### Minor Changes

- [#225](https://github.com/vvedantb/packages/pull/225) [`4eada13`](https://github.com/vvedantb/packages/commit/4eada137e0ff7871dd1003c9b92e92fa29c1b892) Thanks [@vvedantb](https://github.com/vvedantb)! - Add four shared tooling items used across the apps:

  - `withReleaseSigning`: an Expo config plugin that signs the Android `release` build type from a keystore (environment, else `keystore.properties`), failing a release when a value is missing. `expo/config-plugins` is an optional, lazily resolved peer. Marker is configurable and defaults to a value containing `plugins/withReleaseSigning.js` so build-script greps pass.
  - `singletons` (and `nativeWindConfig`) on `defineExpoMetroConfig`: rewrites `originModulePath` to the app's `package.json` for the given module heads so a single copy resolves. Backward compatible for apps that omit it.
  - `vvedantb-android-release`: a config-driven Android release build bin that merges the per-app build scripts into one and keeps the reusable-workflow `GITHUB_OUTPUT` interface (`apk`, `release_json`, `version_name`, `version_code`, `sha256`). Runs on Linux CI.
  - A shared oxlint JS plugin at `@vvedantb/config/oxlint/plugin.mjs` with `no-value-block-in-try`, `no-source-text-in-tests`, `no-double-cast` and `no-json-parse`.

## 0.4.0

- New subpath `@vvedantb/config/extension` for Chrome extensions built with WXT. Like the Vite presets, it never imports WXT, Vite or a plugin; the app passes its plugin factories in. WXT is not a peer.
- `extensionHostPermissions({ hosts, devHosts, mode, connectable })` replaces the dev-only host lists the extensions kept in `wxt.config.ts` and `vite.config.ts`. `host_permissions` is `hosts`, plus `devHosts` when `mode` is `"development"`, without duplicates. `connectable` (off by default) adds `externally_connectable.matches` for those hosts, with the path set to `/*`. `true` takes every host that names one; a list picks some and throws on a pattern that is not a host.
- `defineVExtensionConfig({ app, react, tailwindcss, plugins, modules, buildTarget, hosts, devHosts, connectable, manifest })` returns WXT's `manifest` and `vite` (and `modules` when set). The manifest gets `name`, `icons` and `action.default_icon` at `icons/icon-{16,32,48,128}.png` (`EXTENSION_ICONS`, the `@vvedantb/ui` extension brand assets copied to `public/icons/`), the host keys, then the app's own keys. A test compares it with a copy of an extension's current config.
- New bin `vvedantb-clerk-allow <extension-id>`. It adds `chrome-extension://<id>` to the allowed origins of the Clerk instance whose key is in `CLERK_SECRET_KEY`: GET `/v1/instance`, add the origin, PATCH the full list. It does nothing if the origin is already there or the response has no list. The key is never printed. The root exports `runClerkAllow` and the types `ClerkAllowIo`, `ClerkAllowFetch` and `ClerkAllowResponse`; tests pass a fake `fetch`.
- No zip or release helper: `wxt zip` already covers it.
- No new dependencies or peers.

## 0.3.0

- New Vite and Vitest presets: `defineWebViteConfig`, `defineWebVitestConfig`, `reactPlugins`, `vendorChunkBuild`, `srcAlias` and `REACT_DEDUPE`. The app passes its plugin factories in; the root does not import Vite or any plugin, and needs no new peer.
- New Expo presets: `expoBabelConfig` (Babel with NativeWind) and `defineExpoMetroConfig` (Metro with NativeWind, monorepo folders and package exports).
- Each preset reproduces each app's current config object exactly. Tests compare it per app with a copy of that config.
- The root export uses the `default` condition instead of `import`, so CommonJS files can `require()` it (Node 20.19+ or 22.12+). It is still one ES module, not a dual build.
- README: `npx @vvedantb/config sync` cannot pick between the two bins. The docs now use the `vvedantb-config` bin (`pnpm exec vvedantb-config sync --check`) or `npx -p @vvedantb/config vvedantb-config`.
- The oxlint base is unchanged: no rule is set the same way by every app.

## 0.2.0

- Publishable again: `"private"` removed, `publishConfig.access: public`, and `repository.url` now points at github.com/vvedantb/packages.
- Breaking: the `./versions` subpath is gone. Import `versions` and `Versions` from the root (`@vvedantb/config`), which already exported them. The JSON subpaths (`./tsconfig/*.json`, `./oxlint/base.json`) stay, because tools resolve them by path.
- New bin `vvedantb-check-asar` checks a packaged Electron `app.asar` for missing runtime modules. It has two modes:
  - `list` reads the archive with `@electron/asar`.
  - `resolve` re-runs itself inside the packaged binary with `ELECTRON_RUN_AS_NODE=1`, and can run an app `--hook`.
  - The root also exports `runCheckAsar`, `packageName`, `findSpecifiers`, `findBareImports`, `CHECK_ASAR_CHILD_ENV` and the types `CheckAsarIo`, `AsarCheckHook` and `AsarCheckHookContext`.
- `@electron/asar` (`^3.2.0 || ^4.0.0`) is an optional peer. Only `list` mode loads it.
- `vvedantb-config sync` is unchanged.

## 0.1.1

- Not published to npm (npm latest stays 0.1.0).
- Marked `"private": true`.
- Docs no longer name consuming apps.
- The build compiles with `module`/`moduleResolution: NodeNext`, so the emitted ESM runs under plain Node.
- No change to the sync behaviour, the tsconfig bases or the oxlint base.

## 0.1.0

- First release: tsconfig bases, an oxlint base, pinned tool versions (`./versions`) and the `vvedantb-config sync [--check]` CLI.

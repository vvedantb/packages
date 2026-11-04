# packages

Shared packages for vvedantb apps. Four public npm packages.

| Package | Version | What it is |
| --- | --- | --- |
| `@vvedantb/ui` | `0.30.0` | Shared React 19 web UI from one main JavaScript entry (`.`, also `./brand` for the app marks and `./client`, the root without `@vvedantb/server`, convex or Clerk, for Chrome extensions): primitives, AI elements, audio, `toast` and `SonnerToaster`, the composer, the app shell, app helpers (confirm skip, update watcher, settings chrome, stable Clerk auth, theme provider, page title context, page motion provider, compact relative time, `ConvexClerkProvider`, `parseClientEnv`, `useEnsureUser`), marketing pieces (landing kit, site footer, pricing dialog), animated nav icons, family app marks (`AppMark` and raw SVG strings), artifact viewers (`ArtifactFrame` state bridge, card, list, toolbar, viewer, versions menu) and the native tokens. CSS subpaths: `./tokens`, `./tokens/css/*.css`, `./landing.css` and `./fonts/instrument-sans.css` (packaged Instrument Sans for extension pages); plus the `./tokens/tailwind-preset` build-tool entry. Source-exported. |
| `@vvedantb/native-ui` | `0.3.0` | React Native + Expo primitives (floating surfaces, forms, dialogs, sheets, toasts, tabs, tab bar, settings chrome), the family app marks and the upgrade card and pricing sheet. Source-exported. Has no dependency on `@vvedantb/ui`; it carries tested copies of the JS tokens and brand data. Parity with `@vvedantb/ui`: [docs/native-ui-parity.md](docs/native-ui-parity.md). |
| `@vvedantb/server` | `0.13.0` | Convex backend helpers, Convex optimistic updates and Node-side MCP client OAuth from one root export (`.`), plus Vercel AI Gateway helpers on `./ai` (service tier options, cost, error classification): query-limit errors, Clerk auth and token verification, an MCP bearer-token cache, Clerk-user lookups and `ensureUser`, V Pro plan checks and Clerk Billing webhook helpers, bearer tokens, env, CORS, `jsonResponse`, MCP server scaffolding (`serverInfo` with optional title, website URL and icons) and route registration for Convex `httpAction`s, WebCrypto primitives, optimistic-update helpers (`mapLoadedQuery`, `patchLoadedQuery`, `tempId`, an in-memory store for tests) and MCP client OAuth for desktop apps (provider, sign-in, refresh, revocation, loopback redirect server; Node built-ins and the MCP SDK load on first use, so Convex V8 bundles stay clean), a QuickJS code sandbox, and a pure artifacts core (Zod contract, state ops, quiz and flashcards pages, sandboxed document wrapper). Compiled. |
| `@vvedantb/config` | `0.4.0` | Root JS export plus JSON tsconfig and oxlint bases, Vite, Vitest, Babel and Metro presets, pinned tool versions, the `vvedantb-config sync` CLI, the `vvedantb-check-asar` packaged-app check and the `vvedantb-clerk-allow` CLI. `./extension` has the WXT preset and host-permission helper for Chrome extensions. Compiled. |

Moving from the earlier packages (`@vvedantb/tokens`, `shell`, `app-kit`, `convex-kit`, `mcp-kit`)? See [MIGRATION.md](MIGRATION.md).

## Install

```sh
npm install @vvedantb/ui                 # web
npm install @vvedantb/native-ui          # Expo / React Native
npm install @vvedantb/server             # Convex backends, optimistic updates, MCP client OAuth (Node)
npm install -D @vvedantb/config          # tooling
```

For a local checkout of this repo:

```json
"dependencies": {
  "@vvedantb/ui": "link:../packages/packages/ui"
}
```

`@vvedantb/ui` and `@vvedantb/native-ui` ship source and need no compile step. `@vvedantb/server` and `@vvedantb/config` publish compiled `dist` (built on pack); after a path or git install, run `pnpm build` first.

`@vvedantb/ui` expects the baseline peer stack (React 19, Radix, CVA, cmdk, motion, sonner, clsx, tailwind-merge, Tabler icons) plus the extras' peers (`radix-ui`, accordion/scroll-area/visually-hidden, vaul, embla, shiki, `ai`, streamdown, nanoid, use-stick-to-bottom). Install those in the app. The app helpers also use `@clerk/clerk-react`, `convex`, `@tanstack/react-hotkeys` and `zod`, and the artifact viewers use `@vvedantb/server` (0.6.1 or later). These are optional peers, so the package manager does not install them, but the root imports each one statically, so an app that imports `@vvedantb/ui` must have them installed (motion too). `@vvedantb/ui/client` imports none of `@clerk/clerk-react`, `convex` or `@vvedantb/server`.

## Package notes

- `@vvedantb/ui` app helpers: `ConfirmSkipHint`, `useRequestConfirm`, `useAltHeld`, `startUpdateAvailableWatcher`, `SettingsPage` and friends, `useStableAuth`, `createThemeProvider`, `createPageTitleContext`, `PageMotionProvider`, `formatCompactRelativeTime`, `ConvexClerkProvider`, `parseClientEnv`, `useEnsureUser`. See `packages/ui/app/README.md`.
- `@vvedantb/ui/tokens`: see `packages/ui/tokens/README.md`.
- `@vvedantb/server`: see `packages/server/README.md`, `packages/server/docs/convex.md` (including optimistic updates), `packages/server/docs/mcp.md`, `packages/server/docs/mcp-oauth-client.md`, `packages/server/docs/crypto.md`, `packages/server/docs/sandbox.md`, `packages/server/docs/artifacts.md` and `packages/server/docs/ai.md`. Per-app migration steps and measured line counts for the MCP kit are in `packages/server/docs/migration.md`.
- `@vvedantb/config`: `versions` and the CLIs from the root, `@vvedantb/config/extension` (WXT preset and host permissions), `@vvedantb/config/tsconfig/{base,web,convex,react-native}.json` and `@vvedantb/config/oxlint/base.json` (JSON by path), `vvedantb-config sync [--check]`, `vvedantb-check-asar list|resolve` and `vvedantb-clerk-allow <extension-id>`. See `packages/config/README.md`.

## Use in a Tailwind v4 app

In the app's main stylesheet:

```css
@import "tailwindcss";
@import "@vvedantb/ui/tokens";
@source "../node_modules/@vvedantb/ui/src/**/*.{ts,tsx}";
@source "../node_modules/@vvedantb/ui/shell/src/**/*.{ts,tsx}";
@source "../node_modules/@vvedantb/ui/app/src/**/*.{ts,tsx}";
```

- `@vvedantb/ui/tokens` does not import Tailwind itself, so import Tailwind first.
- Tailwind does not scan `node_modules`. The `@source` lines tell it to read the UI, shell and app sources, so their classes are generated. Paths are relative to the stylesheet. Change them to match the app's layout. Drop the shell or app line if you do not import that subpath.
- Dark mode uses the `.dark` class (the next-themes class strategy). `[data-theme="dark"]` also works.

#### Shared app CSS (0.2.0)

Rules that 3 or more apps had copied are now opt-in files. Import only the ones the app used to define, at the position of the app's own copy (Tailwind inlines `@import` where it sits; it must be at top level):

```css
@import "@vvedantb/ui/tokens/css/base.css";        /* html, ::selection, control transitions, cursor, range accent */
@import "@vvedantb/ui/tokens/css/dialog.css";      /* compact Dialog max-width fix (unlayered) */
@import "@vvedantb/ui/tokens/css/modal.css";       /* .t-modal, .is-open, .is-closing; --modal-* from tokens.css */
@import "@vvedantb/ui/tokens/css/tabs.css";        /* .t-tabs, .t-tab, .t-tabs-pill; --tabs-* from tokens.css */
@import "@vvedantb/ui/tokens/css/tabs-pills.css";  /* --tabs-* colours, .t-tabs--segmented / --pills */
@import "@vvedantb/ui/tokens/css/utilities.css";   /* @utility hit-target, reveal-on-hover */
@import "@vvedantb/ui/tokens/css/animations.css";  /* CSS-first apps only; @config apps use the preset */
```

From 0.15.0 `@vvedantb/ui/tokens` itself brings `.scrollbar-thin`, the `ClearInput` layers (`.t-clear*`), `.glass-panel-strong`, `.sidebar-section-label`, the `.ui-enter` family with the `PageMotionProvider` overrides, and default `--modal-*` / `--tabs-*` variables. Override any of them with app rules or `:root` variables (see `packages/ui/tokens/README.md`, Parameters). `@vvedantb/ui/tokens/css/index.css` imports base, dialog, modal, tabs, tabs-pills, utilities, animations and nav-icons for a new app. Apps that load a `tailwind.config.ts` through `@config` add `presets: [tokensPreset()]` from `@vvedantb/ui/tokens/tailwind-preset` (shared colours, radii, shadows, `ease-smooth`, px screens, keyframes). app-c passes its color-mix wrapper: `tokensPreset({ color: v })`.

The per-app steps (which blocks to delete, where each import goes, which `:root` parameters to add) are in `packages/ui/tokens/examples/migration.md`, generated and checked by `pnpm --filter @vvedantb/ui verify`.

### What the app must provide

`@vvedantb/ui` uses some classes that neither Tailwind nor `@vvedantb/ui/tokens` defines. Without them the classes silently render nothing:

- `@import "shadow-plugin";` for `smooth-shadow-ring-*`, the edge and shadow of dialogs, sheets, menus, popovers, tooltips and toasts.
- `@plugin "tailwindcss-animate";` (or `tw-animate-css`) for `animate-in`/`fade-*`/`zoom-*`/`slide-in-*` on overlays. `animate-accordion-down`/`-up` also need `accordion-down`/`accordion-up` keyframes (in `@vvedantb/ui/tokens/tailwind-preset`, or in the app) and an `animation` timing in the app.
- `.t-modal` with `.is-open`/`.is-closing`: import `@vvedantb/ui/tokens/css/modal.css` (or `index.css`), or keep an app copy (app-b and app-c do; theirs differ). `tokens.css` sets the `--modal-*` variables.
- `.t-tabs`, `.t-tab` and `.t-tabs-pill`: import `@vvedantb/ui/tokens/css/tabs.css` (+ `tabs-pills.css` for the `--tabs-*` colours and the segmented/pills variants). `tokens.css` sets `--tabs-dur` and `--tabs-ease`.
- `hit-target` and `reveal-on-hover`: import `@vvedantb/ui/tokens/css/utilities.css` (or keep plain `@layer utilities` rules, as app-a and app-e do).

### Font

The tokens set `font-sans` to Instrument Sans, with a `system-ui` fallback. To load it from Google Fonts, put this line *above* `@import "tailwindcss"`. CSS ignores `@import url(...)` when it comes after other rules, so the token file cannot include it.

```css
@import url("https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap");
```

Instrument Serif, Michroma and Inter are marketing fonts. They stay in each app and are not part of these packages.

### Components

```tsx
import { Button, Dialog, Input } from "@vvedantb/ui";
import { SidebarHeader, PillTabs } from "@vvedantb/ui/shell";
```

- `SidebarHeader`: 44px (`h-11`) header row with a truncated title and an optional `trailing` slot. It has no close button, icons or navigation.
- `PillTabs`: controlled pill tabs, icon and label only. It has no counts or badges. Use it only where you want pill tabs. It does not replace each app's segmented controls. Arrow keys, Home and End move between tabs.
- `SessionsHoverCard`: hover card shell for list rows. `children` is the trigger. Sets `openDelay` (400 ms default), position, `w-64 p-3` and `header`, `body` and `footer` slots. `body` can be a function of `{ open }`, and `loadContent` runs only while the card is open. It portals by default (`portal={false}` opts out), takes `surface` and `asChild`, and forwards its ref.
- `playChime` and `useReplyChime` (from `@vvedantb/ui`): soft two-note reply chime and a hook that plays it once when a thread stops streaming.

## What moved into `@vvedantb/ui`

**baseline (plain names, not blended):** `_menu-classes`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `dropdown-menu`, `hover-card`, `input`, `label`, `labeled-switch-row`, `modalTransition`, `popover`, `progress`, `select`, `separator`, `skeleton`, `sonner`, `sonner.css`, `spinner`, `switch`, `table`, `tabs`, `tabsSliding`, `textarea`, `time-picker`, `tooltip`, plus `cn` and motion presets.

**Leftovers from two other apps (now shared here):** `accordion`, `clear-input`, `input-group`, `scroll-area`, `button-group`, `carousel`, `pagination`, `radix-select`, `search-input`, `surface-classes`, the whole `ai-elements` directory, `clearInputDissolve`, `kbd`, `sheet`, `visually-hidden`. the extra motion presets and `_menu-classes` variants sit beside the baseline files as `presets.alt.ts` and `_menu-classes.alt.ts`.

### Drift (two copies existed)

- `accordion`: the default (`accordion.tsx`) uses the unified `radix-ui` package, a local chevron, and `data-slot` plus height animation. `accordion.alt.tsx` wraps it with the old markup (Tabler chevron, no `data-slot`), exported as the deprecated `AccordionAlt`, `AccordionItemAlt`, `AccordionTriggerAlt` and `AccordionContentAlt`.
- `clear-input`: the default runs the dissolve animation via `clearInputDissolve`. `clear-input.alt.tsx` wraps its `animation="none"` path with the old markup (an always-mounted clear button), exported as the deprecated `ClearInputAlt`.
- `input-group`: the default has `data-slot` variants and more addon/button sizes. `input-group.alt.tsx` wraps its parts with the old markup (the root with an `error` prop and the button stay their own), exported as the deprecated `InputGroupAlt`, `InputGroupAddonAlt`, `InputGroupButtonAlt`, `InputGroupTextAlt`, `InputGroupInputAlt` and `InputGroupTextareaAlt`.
- `scroll-area`: the default uses `radix-ui`, `data-slot` and a hover thumb. The `@radix-ui/react-scroll-area` `forwardRef` copy stays as `scroll-area.alt.tsx`, exported as `ScrollAreaAlt` and `ScrollBarAlt`.


`radix-select` is exported as `RadixSelect*` so it does not clash with app-a `select`.

## What stays app-local

Navigation layout (icon rails, sidebars, sidebar and header size variables), page layouts, segmented controls, view-transition names and timings, any tab or modal rules that differ from the shared files, `smooth-shadow-ring-*` and app `glass-panel-*` variants other than `glass-panel-strong`, the `[cmdk-*]` look of an app's own command menu, app colours and fonts (app-d's pink accent, app-c's chart colours, app-b's feature colours), Tailwind plugins, marketing fonts, page animations, markdown/editor styles and landing CSS. `packages/ui/tokens/verify/ANALYSIS.md` lists every duplicated block that was left in the apps and why.

## Android APK release workflow

`.github/workflows/release-android-apk.yml` is a reusable workflow (`on: workflow_call` only) for the five Expo apps: velth, verve, vmem, vibot and v-store. It never runs in this repo. It is a port of vmem's `.github/workflows/release-android.yml`. Each app keeps a thin caller.

### What it does

1. Decides whether to release, before checkout or any setup (see "Feature-only releases"). On a skip it logs `Not a feature merge, skipping release` and every later step is skipped, so the run passes with no version bump, tag or release.
2. Checks the inputs, then runs the optional `pre_setup_command` (velth uses it to free runner disk space) before any toolchain setup.
3. Picks versionName, versionCode and the tag. With no `version`, it bumps the patch of the highest semver `versionName` in published `<tag_prefix>*` (`mobile-apk-*`) `release.json` files, with `DEFAULT_VERSION_NAME` in `app.config.ts` as the floor. With `version_name_source: app_json`, it follows v-store's rules instead: the floor is `expo.version` in `app_json_path`, which wins if it is higher than the bumped patch, and the versionName must be higher than every published one. versionCode is the highest published versionCode plus 1, and at least `version_code_floor` (1000). `version_code` can set a higher one. A release with no `release.json` counts as versionCode 1. The run stops if the tag or release already exists.
4. On a tag push (`GITHUB_REF_TYPE=tag`), the pushed tag is the release tag. The versionName is the tag without `tag_prefix`, and `version`, if set, must match it. The tag may exist already, but the release must not.
5. Decodes the keystore into `$RUNNER_TEMP/<keystore_filename>` and sets `ANDROID_KEYSTORE_PATH`. It stops if any of the four signing secrets is missing, so a release never falls back to the debug key.
6. Sets up pnpm (version from `packageManager`), Node with the pnpm cache, Temurin Java and Gradle, then installs the Android SDK packages with the runner's own `sdkmanager`. It does not use `android-actions/setup-android`.
7. Runs the optional pre-build hook, then the app's build script (Expo prebuild and a signed Gradle `assembleRelease`). Next it checks the outputs: the APK name, the SHA-256, the `release.json` values, and, with `package_id`, the APK badging.
8. With `dry_run` and `upload_dry_run_artifact`, uploads the APK and `release.json` as the Actions artifact `<app_name>-android-dry-run`.
9. Publishes the tag with `<apk_basename>-<versionName>-android.apk` and `release.json`. It uses `gh release create --latest=false` (unless `mark_as_latest`), with `--target $GITHUB_SHA`, or `--verify-tag` on a tag push. The notes are the template and the generated "What's changed" notes since the release with the highest semver versionName. Then it runs the optional post-publish hook. `dry_run` builds and signs but publishes nothing and skips post-publish.
10. Removes the keystore (`if: always()`, unless step 1 skipped the release).

### Feature-only releases

On a branch `push`, with the default `release_on: feat`, a release runs only for a feature merge. The workflow reads `github.event.head_commit.message` (the caller's pushed commit):

- For a merge commit, `Merge pull request #N from <branch>`, it reads the PR title, which is the first non-empty line after the subject. For any other commit, such as a squash merge or a direct push, it reads the commit subject.
- It releases if that line starts with `feat:`, `feat(scope):`, `feat!:` or `feat(scope)!:`, in any case, followed by whitespace or the end of the line.
- It also releases if the commit message contains `[release]` anywhere (exact case).

Anything else, such as `fix:` or `chore:`, skips the release. To release a change that is not a feature, put `[release]` in the PR title, like `fix: crash on start [release]`. GitHub copies the PR title into the merge commit message.

`workflow_dispatch` always releases, `dry_run` included; the rule never applies to it. A tag push (`refs/tags/…`) always releases, because the tag is the release; the rule never applies to it either. The rule applies only to branch `push` events; other events release as before.

Set `release_on: always` to release on every push, as before this rule. Other values are refused.

On a skip, the job passes and all outputs are empty.

The asset names and the `release.json` shape `{"versionName","versionCode","sha256"}` are fixed, not inputs. The tag is `<tag_prefix><versionName>`; keep the default `tag_prefix`, `mobile-apk-`, for any app V Store lists. V Store's catalog sync depends on all three.

### What stays in the caller

- The `push` trigger and its `paths` filter, and the `workflow_dispatch` inputs.
- `concurrency` (vmem: `group: release-android`, `cancel-in-progress: false`). The version is chosen inside the job, so runs must not overlap.
- `permissions: contents: write`. A called workflow cannot get more than the caller grants, and publishing needs `contents: write`.
- The secrets, passed with `secrets: inherit` (or by name).
- The build script, the notes template and `app.config.ts`. The workflow changes no app code. If an app needs a patch before the build, such as the Groovy `${}` escape that vmem's `withReleaseSigning.js` has as `\${...}`, use `pre_build_script` or `pre_build_command`.

### Build script contract

The workflow runs `bash <build_script>` from the repo root. vmem's `scripts/build-android-release.sh` already meets this contract. The script:

- reads `VERSION_NAME`, `VERSION_CODE`, `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` from the environment;
- writes `apk`, `release_json`, `version_name`, `version_code` and `sha256` to `$GITHUB_OUTPUT`;
- names the APK `<apk_basename>-<versionName>-android.apk` and the manifest `release.json`.

The "Check build outputs" step fails the run if a value is missing or does not match the chosen version or the APK on disk.

### Secrets

| Secret | Required | What it is |
| --- | --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Yes | Base64 of the PKCS12 sideload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Yes | Keystore password |
| `ANDROID_KEY_ALIAS` | Yes | Key alias |
| `ANDROID_KEY_PASSWORD` | Yes | Key password |
| `BUILD_ENV_SECRETS` | No | Secret extra environment, in the `build_env` format; values are masked |

The four `ANDROID_*` secrets are declared `required: false`, so `secrets: inherit` works. The "Decode signing keystore" step then stops with a clear error if one is missing. The workflow uses `github.token` for `gh`.

### Inputs

| Input | Type | Default | What it does |
| --- | --- | --- | --- |
| `app_name` | string | required | Short name, like `vmem`. Default for `release_title`, `apk_basename` and the keystore file name |
| `release_title` | string | `app_name` | Release title is `<release_title> <versionName>` |
| `apk_basename` | string | `app_name` | Asset is `<apk_basename>-<versionName>-android.apk`. Must match the build script and V Store |
| `app_dir` | string | `apps/mobile` | Expo app folder |
| `package_id` | string | empty | If set, checks the APK package, versionCode and versionName with `aapt2` |
| `app_config_path` | string | `<app_dir>/app.config.ts` | File with `const DEFAULT_VERSION_NAME = "x.y.z";` (an `export` in front also works). Used only with `version_name_source: default_version_name` |
| `version_name_source` | string | `default_version_name` | versionName floor. `default_version_name`: `DEFAULT_VERSION_NAME` in `app_config_path`. `app_json`: `expo.version` in `app_json_path`, with v-store's rules (see "What it does"). Other values are refused |
| `app_json_path` | string | `app.json` | `app.json` with `expo.version`. Must exist with `version_name_source: app_json` |
| `tag_prefix` | string | `mobile-apk-` | Tags are `<tag_prefix><versionName>`; only releases with this prefix count. Letters, digits, `.`, `_` and `-` only. V Store's catalog sync reads `mobile-apk-*` |
| `build_script` | string | `scripts/build-android-release.sh` | Build script, run with bash from the repo root |
| `release_notes_path` | string | `.github/android-release-notes.md` | Template with `{{versionName}}`, `{{versionCode}}` and `{{sha256}}`. Empty: generated notes only |
| `keystore_filename` | string | `<app_name>-release.p12` | Keystore file name in `RUNNER_TEMP` |
| `node_version` | string | `22` | `actions/setup-node` version |
| `java_version` | string | `21` | Temurin version |
| `sdk_packages` | string | `platform-tools platforms;android-36 build-tools;36.0.0 ndk;27.1.12297006 cmake;3.22.1` | `sdkmanager` packages, separated by spaces or new lines |
| `version_code_floor` | number | `1000` | Lowest versionCode |
| `version_code` | string | empty | versionCode to release, a whole number of at least the highest published versionCode plus 1 and `version_code_floor`. Empty: that minimum |
| `mark_as_latest` | boolean | `false` | Mark the release as the repo's latest release |
| `version` | string | empty | versionName to release, like `1.0.1`. Must match the tag on a tag push. Empty: the tag's version on a tag push, else the next patch |
| `release_on` | string | `feat` | Which pushes release. `feat`: only feature merges or messages with `[release]` (see "Feature-only releases"). `always`: every push. Tag pushes and `workflow_dispatch` always release |
| `dry_run` | boolean | `false` | Build and sign, publish nothing |
| `upload_dry_run_artifact` | boolean | `false` | With `dry_run`, upload the APK and `release.json` as the artifact `<app_name>-android-dry-run` |
| `pre_setup_command` | string | empty | Inline bash run from the repo root before the Node, pnpm and Java setup, like freeing disk space. Does not get `build_env` |
| `build_env` | string | empty | Extra environment for the pre-build, build and post-publish steps. One `NAME=value` per line, `#` for comments, no multi-line values. Not masked. Names the workflow sets (`VERSION_*`, `ANDROID_KEY*`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `GITHUB_*`, `RUNNER_*`, `ACTIONS_*`, `PATH`) are refused |
| `pre_build_script` | string | empty | Script run with bash after toolchain setup, before the build |
| `pre_build_command` | string | empty | Inline bash run after `pre_build_script` |
| `post_publish_script` | string | empty | Script run with bash after a real publish. Gets `TAG`, `RELEASE_URL`, `APK`, `RELEASE_JSON`, `VERSION_NAME`, `VERSION_CODE`, `SHA256` and `GH_TOKEN` |
| `post_publish_command` | string | empty | Inline bash run after `post_publish_script` |
| `runs_on` | string | `ubuntu-latest` | Runner. It needs the Android SDK at `ANDROID_HOME` |
| `timeout_minutes` | number | `90` | Job timeout |

Outputs: `tag`, `version_name`, `version_code`, `sha256`, `published` (`true` or `false`) and `release_url`. All are empty when the release is skipped.

Pass `dry_run: ${{ inputs.dry_run == true }}`, not `${{ inputs.dry_run }}`. On a push run the dispatch inputs are empty, and a `boolean` input does not accept an empty string. `string` inputs such as `version` and `version_code` can be passed straight through: an empty string on a push means "not set".

Tag mode follows `GITHUB_REF_TYPE`, so a manual run started on a tag also releases that tag. The tag must start with `tag_prefix` and the rest must be a versionName like `1.0.1`.

`@main` follows this repo. To control when a change reaches the apps, pin a tag or commit SHA instead. If this repo is ever made private, allow access under Settings, Actions, General, Access.

### Callers

#### vmem

The paths match vmem's current `release-android.yml`.

```yaml
name: Release Android APK

on:
  push:
    branches: [main]
    paths:
      - "apps/mobile/**"
      - "!apps/mobile/tests/**"
      - "!apps/mobile/**/*.md"
      - "!apps/mobile/.env.example"
      - "packages/sdk/package.json"
      - "packages/sdk/src/**"
      - "!packages/sdk/**/*.test.ts"
      - "package.json"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"
      - ".npmrc"
      - "scripts/build-android-release.sh"
  workflow_dispatch:
    inputs:
      version:
        description: "versionName, like 1.0.1. Empty bumps the patch of the highest published release.json versionName."
        required: false
        type: string
      dry_run:
        description: "Build and sign the APK, but publish nothing."
        required: false
        type: boolean
        default: false

permissions:
  contents: write

concurrency:
  group: release-android
  cancel-in-progress: false

jobs:
  release:
    uses: vvedantb/packages/.github/workflows/release-android-apk.yml@main
    with:
      app_name: vmem
      package_id: com.projectvdotuk.vmem
      version: ${{ inputs.version }}
      dry_run: ${{ inputs.dry_run == true }}
    secrets: inherit
```

#### velth, verve, vibot

The velth `paths`, the disk clean-up and the dry-run artifact come from velth's current `release-android.yml`. velth's workflow does not name its applicationId, so `package_id` is still a guess: check it, or leave it empty to skip the `aapt2` check. Before you switch, also check:

- velth read its versionName floor from `npx expo config` (`.version`). This workflow reads the `DEFAULT_VERSION_NAME` literal from `apps/mobile/app.config.ts`, so that file needs one (or set `app_config_path`).
- velth's `gh release create` did not pass `--latest=false`. Add `mark_as_latest: true` if velth's releases should keep the "latest" flag.
- velth pinned no pnpm version in the workflow; `pnpm/action-setup@v6` reads `packageManager` from the root `package.json`.

```yaml
# velth: .github/workflows/release-android.yml
name: Release Android APK
on:
  # Paths: files that reach the APK (see velth's current workflow for the reasons).
  push:
    branches: [main]
    paths:
      - "apps/mobile/**"
      - "!apps/mobile/e2e/**"
      - "packages/shared/**"
      - "!packages/shared/tests/**"
      - "!packages/shared/vitest.config.ts"
      - "packages/backend/package.json"
      - "packages/backend/index.ts"
      - "packages/backend/client/**"
      - "packages/backend/convex/_generated/**"
      - "package.json"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"
      - ".npmrc"
      - "patches/**"
      - "scripts/build-android-release.sh"
  workflow_dispatch:
    inputs:
      version:
        description: "versionName, like 1.0.1. Empty bumps the patch of the highest published release.json versionName."
        required: false
        type: string
      dry_run:
        description: "Build and sign the APK, but publish nothing."
        required: false
        type: boolean
        default: false
permissions:
  contents: write
concurrency:
  group: release-android
  cancel-in-progress: false
jobs:
  release:
    uses: vvedantb/packages/.github/workflows/release-android-apk.yml@main
    with:
      app_name: velth
      release_title: Velth
      package_id: com.projectvdotuk.velth # verify; not in velth's workflow
      version: ${{ inputs.version }}
      dry_run: ${{ inputs.dry_run == true }}
      upload_dry_run_artifact: true # artifact velth-android-dry-run
      pre_setup_command: |
        df -h /
        sudo rm -rf /usr/share/dotnet /opt/ghc /usr/local/.ghcup /usr/local/share/boost /opt/hostedtoolcache/CodeQL /usr/local/lib/node_modules /usr/share/swift /usr/local/share/powershell /usr/local/share/chromium || true
        sudo docker image prune --all --force || true
        df -h /
    secrets: inherit
```

verve and vibot use the same file, without the velth extras unless their workflows have them. Change `app_name` to `verve` or `vibot`, and set `package_id` (for example `com.projectvdotuk.verve` or `com.projectvdotuk.vibot`; verify both). Set `paths` to the app's own sources.

#### v-store

The triggers, `paths`, dispatch inputs and settings below come from v-store's current `release-android.yml`. v-store is a single-app repo with `app.json` at the root, so `app_dir` is `.`. Before you switch, check:

- `apk_basename` and `package_id`: v-store's workflow takes both from its build script, so they are not known here. `apk_basename` must match the existing asset names. An applicationId cannot contain `-`.
- `mark_as_latest: true`: v-store's `gh release create` did not pass `--latest=false`, so its releases took the "latest" flag. This keeps that. The input default stays `false`.
- `version_code_floor: 4`: `mobile-apk-20261028-3` shipped versionCode 3.
- `keystore_filename: vstore-release.p12` matches the old file name. Any name works, because the file only lives in `RUNNER_TEMP`.
- v-store pinned pnpm 10 in `pnpm/action-setup`. This workflow reads `packageManager` from `package.json`, so v-store needs that field.
- v-store skipped a `release.json` that was not JSON, and ignored a non-numeric versionCode. This workflow stops on both. Fix any such release first.

```yaml
# v-store: .github/workflows/release-android.yml
name: Release Android APK
on:
  push:
    # Path filters apply to the main branch only; a tag push always runs.
    tags: ["mobile-apk-*"]
    branches: [main]
    paths:
      - "app/**"
      - "components/**"
      - "lib/**"
      - "utils/**"
      - "modules/**"
      - "plugins/**"
      - "assets/**"
      - "convex/_generated/**"
      - "convex/catalog.ts"
      - "convex/model/githubRelease.ts"
      - "convex/model/deviceToken.ts"
      - "convex/model/releaseSource.ts"
      - "app.json"
      - "app.config.ts"
      - "package.json"
      - "pnpm-lock.yaml"
      - ".npmrc"
      - "babel.config.js"
      - "metro.config.js"
      - "tailwind.config.js"
      - "global.css"
      - "tsconfig.json"
      - "scripts/build-android-release.sh"
      - "!**/*.md"
      - "!**/*.test.ts"
      - "!**/*.web.ts"
      - "!**/*.web.tsx"
      - "!app/+html.tsx"
      - "!assets/favicon.png"
      - "!modules/**/ios/**"
  workflow_dispatch:
    inputs:
      version:
        description: "versionName, X.Y.Z (for example 1.0.1). Must be higher than every published release.json. Leave empty to bump the patch of the highest."
        required: false
        type: string
      versionCode:
        description: "versionCode. Must be higher than every published release.json, and at least 4. Leave empty for the highest + 1."
        required: false
        type: string
      dry_run:
        description: "Build and sign the APK, but skip gh release create (no tag, no release)."
        required: false
        type: boolean
        default: false
permissions:
  contents: write
concurrency:
  group: release-android
  cancel-in-progress: false
jobs:
  release:
    uses: vvedantb/packages/.github/workflows/release-android-apk.yml@main
    with:
      app_name: v-store
      release_title: V Store
      app_dir: .
      apk_basename: v-store                  # verify; must match the existing asset names
      package_id: com.projectvdotuk.vstore   # verify, or leave empty to skip the aapt2 check
      keystore_filename: vstore-release.p12
      version_name_source: app_json
      app_json_path: app.json
      tag_prefix: mobile-apk-                # the default; shown for clarity
      version: ${{ inputs.version }}
      # A string input, so the empty value on a push means "highest + 1".
      version_code: ${{ inputs.versionCode }}
      version_code_floor: 4
      mark_as_latest: true
      dry_run: ${{ inputs.dry_run == true }}
      build_env: |
        EXPO_PUBLIC_CONVEX_URL=${{ vars.EXPO_PUBLIC_CONVEX_URL }}
      # Release APKs must talk to live Convex, never the bundled catalog.
      pre_build_command: |
        if [ -z "${EXPO_PUBLIC_CONVEX_URL:-}" ]; then
          echo "::error::Set the EXPO_PUBLIC_CONVEX_URL repository variable (Settings > Secrets and variables > Actions > Variables). Release APKs need live Convex."
          exit 1
        fi
    secrets: inherit
```

## Develop

Needs Node 22 and pnpm.

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

`pnpm build` typechecks `@vvedantb/ui` (source export, no `dist`) and checks that every `@vvedantb/ui` export target exists, compiles `@vvedantb/server` and `@vvedantb/config` to each package's `dist`, and checks the `@vvedantb/native-ui` entry. `pnpm test` runs the vitest suites, and an offline `node --test` suite in `@vvedantb/ui` for the tokens (exports, CSS structure, Tailwind compile of each shared file and the preset).

`pnpm --filter @vvedantb/ui verify` is not part of `pnpm test`: it needs the five app clones (`APPS_DIR`) and network access to install Tailwind into a scratch directory (`VERIFY_DIR`). It builds each app's CSS before and after its migration and fails on any difference. Results: `packages/ui/tokens/verify/RESULTS.md`.

`pnpm typecheck` runs each package's `typecheck` script.

## Publish

No CI workflow publishes the npm packages. Publish from a logged-in npm machine (`NPM_CONFIG_USERCONFIG` if the token lives in a non-default rc). Bump each version in its `package.json` first.

```sh
pnpm --filter @vvedantb/ui exec npm publish --access public
pnpm --filter @vvedantb/native-ui exec npm publish --access public
pnpm --filter @vvedantb/server exec npm publish --access public
pnpm --filter @vvedantb/config exec npm publish --access public
```

`@vvedantb/server` and `@vvedantb/config` compile in `prepack`, so publishing builds `dist` first. The packages are independent of each other: `@vvedantb/native-ui` does not need `@vvedantb/ui`.

`@vvedantb/ui` `0.2.0` removes the old `@vvedantb/tokens` and `@vvedantb/shell` packages and the deprecated alias exports. Apps must change imports before they upgrade; see `MIGRATION.md`.

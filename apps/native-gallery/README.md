# native-gallery

An Expo app that renders every component that `@vvedantb/native-ui` exports. It runs on Expo SDK 57, the SDK the package supports (`FloatingTabBar` does not fit SDK 58 yet). It links the package with `"@vvedantb/native-ui": "workspace:*"`, so it shows the code in this repository.

## Run it

```sh
pnpm install
pnpm --filter native-gallery start
# or
cd apps/native-gallery && npx expo start
```

Press `a` for an Android emulator. The gallery uses native modules (blur, reanimated, gesture handler), so it needs a development build or `expo run:android`, not Expo Go:

```sh
cd apps/native-gallery
npx expo run:android
```

## What is in it

| Route | Shows |
| --- | --- |
| `/` | Switches for larger text and dark mode, and links to every screen. |
| `/parity` | `ParityGallery` from `/gallery`: the primitives, dialogs, sheets, menus, toasts, pricing and date fields. |
| `/ai` | `AiChatGallery` from `/ai-gallery`. |
| `/section/forms` | `PasswordInput`, `Chip`, `PillTabs`, `DividedList`, avatars, empty states and long text. |
| `/section/glass` | `FloatingSurface`, the glass blur parts, `FloatingFAB` and `FloatingTabBar`. |
| `/section/layout` | Containers, settings chrome, bot tiles, `ArtifactList`, `RouterStackPageHeader`, `Text`. |
| `/section/brand` | The app marks. |
| `/section/ai-cards` | Tool and subagent cards, quotes, the message action sheet, `ChoiceQuestion`, `Collapsible`, `Markdown`, `ChatThread`. |
| `/section/entries` | Every entry point, its exports and the section that renders each component. |
| `/layering` | The layering stress screen: a tab bar over glass, with a dropdown, select, sheet, bottom sheet, confirm and alert dialogs and a toast opened over it. |
| `/keyboard` | Inputs and the `PromptInput` composer, inline and stacked, with a live height read-out. |
| `/auth` | `SignInScreen`, `SignUpScreen`, `SecondFactorScreen` and the frame parts, on a mocked Clerk. |

Larger text and dark mode apply to every screen except `/parity`, which always draws the default sizes, as the web gallery does.

### Clerk is mocked

`metro.config.js` swaps `@clerk/clerk-expo` for `src/mocks/clerk.tsx`. There are no Clerk keys, no network call and no real sign-in. A submit shows the error that the mock throws.

### Entry points

`src/entries.ts` imports every entry point once (`.`, `/ai`, `/auth`, `/expo-router`, `/gallery`, `/ai-gallery`, `/bottom-sheet`, `/date-time`, `/tab-bar`, `/brand`, `/button`, `/primitives`, `/search-input`, `/password-input`, `/page-title`, `/toast`, `/theme`, `/floating`, `/marketing`, `/ambient`, `/blur`, `/haptics`, `/push`, `/markdown`, `/expo-web-root`, `/layout`). `/tailwind-preset` is CommonJS: `tailwind.config.js` loads it, and `tests/tailwindPreset.test.ts` and `tests/galleryRegistry.test.ts` check its exports. `ExpoWebRoot` renders `<html>`, so it is web only and is listed as non-visual in the registry.

## The registry rule

`src/galleryRegistry.ts` maps every React component export to the gallery section that renders it. The vitest `packages/native-ui/tests/galleryRegistry.test.ts` fails when:

- a PascalCase value export of any entry point has no registry entry (types, constants and helpers are not components);
- the section that the entry names does not use the component;
- the registry lists a name that the package no longer exports;
- an entry point is not imported anywhere in the gallery.

When you add a component, render it in the gallery, add it to the registry and cover it in `e2e/run.mjs` (or a Maestro flow). See `AGENTS.md`.

## Agent driver, test clock and e2e

CI drives the gallery with `scripts/agent.mjs` (Node and `adb` only) and a test clock that is built into agent builds only.

### Build and run

```sh
pnpm --filter native-gallery build:android:agent   # EXPO_PUBLIC_NATIVE_UI_AGENT=1: clock and bridge inside
adb install -r apps/native-gallery/android/app/build/outputs/apk/release/app-release.apk
pnpm --filter native-gallery e2e:android           # all scenarios; or: node e2e/run.mjs dropdown select
```

`build:android` has no agent flag and is the prod-like build. `e2e/run.mjs` covers the five flows that were in `.maestro/` (home and screens, dropdown over the tab bar, composer grows, sheet and bottom sheet, select). It writes screenshots and `e2e-report.json` to `screenshots/`, prints one JSON line per step and exits 1 on failure, after saving `screenshots/FAIL-<scenario>.png`.

### The driver

Every command prints one JSON object. Errors print `{"ok":false,"error":...}` and exit 1. Env: `ANDROID_SERIAL`, `AGENT_APP_ID` (default `dev.vvedantb.nativegallery`), `AGENT_SCHEME` (default `nativegallery`). `tree`, `tap`, `type`, `screenshot`, `logs`, `key`, `back`, `swipe`, `wait` and `launch` work on any Android app. `clock` and the bridge part of `state` need the agent build.

```sh
node scripts/agent.mjs tree                         # id, text, desc, role, bounds of each useful node
node scripts/agent.mjs screenshot /tmp/home.png
node scripts/agent.mjs tap link-layering            # testID (exact or suffix), then label, then label substring
node scripts/agent.mjs tap "id=dd-trigger"          # id=, text=, desc= prefixes narrow the match
node scripts/agent.mjs tap 540,1200                 # x,y
node scripts/agent.mjs type "hello world" composer-input   # taps the target first, then types
node scripts/agent.mjs state                        # foreground activity, focused node, route and clock from the bridge
node scripts/agent.mjs logs --grep NATIVE_UI_AGENT --lines 500
node scripts/agent.mjs clock freeze                 # also: clock +250, clock settle, clock resume, clock status
node scripts/agent.mjs launch --clear
node scripts/agent.mjs wait sheet-body --gone --timeout 5000
```

`type` sends printable ASCII only, because `adb shell input text` cannot send more. A newline in the text sends Enter. From the repo root, `pnpm agent <command>` runs the same script.

### The clock

`src/agent/clock.ts` replaces `setTimeout`, `setInterval`, `requestAnimationFrame`, `Date` and `performance.now` with a virtual clock. React Native `Animated` with the JS driver follows, as it reads those globals. While running, the clock follows real time. After `freeze` it moves only on `clock +N` (advance N ms, in due order, frames on a 16 ms grid) or `clock settle` (run frames and timers due within 1000 ms until idle, 10 s budget; intervals do not hold it open). `+N` is refused while the clock runs.

Limits:

- `useNativeDriver: true` animations and Reanimated worklet animations run on the UI thread. The JS clock cannot step them. Agent builds mount `ReducedMotionConfig` (`src/agent/AgentMotion.tsx`) so Reanimated skips most of them. Animations that ignore it (possibly parts of `@gorhom/bottom-sheet`) still run in real time, so the e2e script polls the UI tree for the result after each action. The clock does not replace that polling.
- React rendering stays in real time. Only app timers and frames are virtual.
- Native modules and the system keyboard keep their own time.

### The bridge

The driver sends a deep link on the `nativegallery` scheme, for example `nativegallery://agent/clock?cmd=%2B100&id=ab12` (also `agent/state` and `agent/ping`). `app/+native-intent.tsx` hands agent links to `src/agent/bridge.ts` and drops them, so they never navigate. The app answers with one logcat line:

```
NATIVE_UI_AGENT_RESULT {"ok":true,"op":"clock","id":"ab12","cmd":"+100","state":{"frozen":true,"elapsedMs":100,"timeouts":0,"intervals":1,"frames":0}}
```

The driver matches the reply on `id`. From a shell, the same link works: `adb shell am start -W -a android.intent.action.VIEW -p dev.vvedantb.nativegallery -d 'nativegallery://agent/clock?cmd=freeze&id=1'`.

### Prod builds have no clock

`app/_layout.tsx` and `app/+native-intent.tsx` load `src/agent/*` through `require` behind `process.env.EXPO_PUBLIC_NATIVE_UI_AGENT === "1"`. Metro inlines the flag, folds the branch away and does not bundle the modules. `tests/strip.test.mjs` proves it. It runs `expo export --platform android` twice, then asserts that the default bundle holds none of `NATIVE_UI_AGENT_RESULT`, `NATIVE_UI_AGENT_READY`, `installAgentClock`, `__nativeUiAgentClock`, `handleAgentUrl` or `setAgentRoute`, and that the agent bundle holds all of them.

```sh
pnpm --filter native-gallery test:strip   # slow: about 5 minutes
pnpm test:scripts                         # driver fixtures and clock unit tests, seconds
```

### Maestro (reference)

`.maestro/` still holds the original flows for reference (`pnpm --filter native-gallery maestro`, Maestro 2.12.1). CI no longer runs them.

## CI

`.github/workflows/native-ui-gallery.yml` runs on pull requests that touch `packages/native-ui/**`, `apps/native-gallery/**` or the workflow. Its job, `native-ui-gallery-android`, typechecks and tests native-ui, runs the driver and clock tests, runs the strip proof, builds the agent APK, boots an API 34 x86_64 emulator with `reactivecircus/android-emulator-runner@v2`, runs `e2e/run.mjs` and uploads the screenshots, the e2e log and logcat as the `native-ui-gallery-android` artifact. Gradle, pnpm, Expo and the AVD are cached.

## Not included

The Instrument Sans font is not loaded, so text uses the system font. The layout and touch targets are the same; the glyph shapes differ.

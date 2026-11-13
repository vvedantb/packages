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

When you add a component, render it in the gallery, add it to the registry and add a Maestro flow. See `AGENTS.md`.

## Maestro flows

`.maestro/` holds the flows. They need a build with the JS bundle inside:

```sh
pnpm --filter native-gallery build:android      # prebuild, then Gradle assembleRelease for x86_64
adb install -r apps/native-gallery/android/app/build/outputs/apk/release/app-release.apk
cd apps/native-gallery && maestro test .maestro  # or: pnpm --filter native-gallery maestro
```

| Flow | Checks |
| --- | --- |
| `01-screenshots.yaml` | Screenshots of home, layering, keyboard, auth (mock) and AI, in `screenshots/`. |
| `02-dropdown-over-tab-bar.yaml` | Opens the dropdown over the tab bar, picks a radio row and an item, asserts the result text. |
| `03-composer-grows.yaml` | Types several lines into the composer, asserts the height read-out grows, inline and stacked. |
| `04-bottom-sheet.yaml` | Opens and closes the sheet and the bottom sheet. |
| `05-select.yaml` | Opens the select over the glass and picks an option. |

Install Maestro from https://maestro.dev (CI pins version 2.12.1).

## CI

`.github/workflows/native-ui-gallery.yml` runs on pull requests that touch `packages/native-ui/**`, `apps/native-gallery/**` or the workflow. Its job, `native-ui-gallery-android`, typechecks and tests native-ui, builds the APK, boots an API 34 x86_64 emulator with `reactivecircus/android-emulator-runner@v2`, runs the flows and uploads the screenshots and the JUnit report as the `native-ui-gallery-android` artifact. Gradle, pnpm, Expo and the AVD are cached.

## Not included

The Instrument Sans font is not loaded, so text uses the system font. The layout and touch targets are the same; the glyph shapes differ.

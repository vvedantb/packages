# `@vvedantb/native-ui`

React Native + Expo primitives extracted from a React Native app. Floating pill chrome, Android-safe shadows, forms, overlays, toasts, list rows, settings sections and the family app marks.

Web apps should keep using `@vvedantb/ui`. This package is native-only. Components that exist on both sides use the web names and, where they make sense on touch, the web props. `docs/native-ui-parity.md` at the repository root lists every `@vvedantb/ui` export and its native status.

## Install

```sh
npm install @vvedantb/native-ui
```

Peers the app must already have (Expo SDK 57 / RN 0.76+):

- `react`, `react-native`
- `nativewind` `>=4`
- `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`
- `@rn-primitives/slot`, `@rn-primitives/switch`, `@rn-primitives/select`
- `@expo/vector-icons`, `@tabler/icons-react-native`, `lucide-react-native`
- `class-variance-authority`, `clsx`, `tailwind-merge`

Optional, only if you import those components:

- `@gorhom/bottom-sheet` — `BottomSheetContainer`
- `@react-native-community/datetimepicker` and `dayjs` — `DateTimeField`
- `react-native-svg` — the app marks (`APP_ICONS`, `Icon*`, `AppMark`, `AppWordmark`) and `PricingModal`. Apps with the icon peers above already have it: `lucide-react-native` and `@tabler/icons-react-native` both require it.

Optional and loaded only when installed, so the package imports and runs without them:

- `expo-blur` — glass blur on `FloatingSurface` and the chrome built on it. Without it, those surfaces draw a solid fill.
- `expo-haptics` — the selection haptic on `FloatingTabBar`, `Tabs` and `Checkbox` presses. Without it, presses are silent.
- `expo-linear-gradient` — the gradient in `AmbientBackground`. Without it, the background is the solid `tokens.color.background`.

The package loads these three with a `require` inside `try`. Metro treats that as an optional dependency when `transformer.allowOptionalDependencies` is on, which is the default in the Expo and React Native Metro configs. `@vvedantb/native-ui/blur` exports the loader (`loadBlur`) and `@vvedantb/native-ui/haptics` exports `loadHaptics` and `selectionHaptic`. TypeScript still resolves their types: an app that type-checks without them reports a missing module in `src/blur.ts`, `src/haptics.ts` or `src/gradient.ts`. Declare the missing ones in a `.d.ts` file in the app:

```ts
declare module "expo-blur";
declare module "expo-haptics";
declare module "expo-linear-gradient";
```

`expo-router` stays an optional peer, but the package does not import it. `FloatingTabBar` declares the props it reads (`FloatingTabBarProps`) and fits the `tabBar` prop of Expo Router's `Tabs` on Expo SDK 57. Expo SDK 58 passes `emitter` and `navigateToTab` to `tabBar` in place of `navigation`, so the bar does not fit it yet.

## Entry points

The root entry exports everything. It still imports `BottomSheetContainer` and `DateTimeField`, so Metro resolves `@gorhom/bottom-sheet`, `@react-native-community/datetimepicker` and `dayjs` for any import from it. Apps without those peers, such as V Store, should import from the smaller entries below. Between them, they export every name the root exports.

| Entry | Exports | Optional peers it reaches |
| --- | --- | --- |
| `@vvedantb/native-ui/tab-bar` | `FloatingTabBar`, `FloatingTabBarProps`, `FLOATING_INSET`, `FLOATING_TAB_BAR_HEIGHT`, `FLOATING_TAB_BAR_HEIGHT_LARGE`, `tabBarReserve` | `expo-blur`, `expo-haptics` (loaders) |
| `@vvedantb/native-ui/brand` | `AppMark`, `AppWordmark`, `APP_ICONS`, `IconVibot` and the other `Icon*`, the SVG helpers (`APP_MARKS`, `appMarkSvg`, `appTileSvg` and the rest), `FAMILY_APPS`, `familyApp`, `V_PRO_APP_BENEFITS` | none |
| `@vvedantb/native-ui/button` | `Button`, `ButtonProps`, `ButtonSize`, `ButtonVariant` | none |
| `@vvedantb/native-ui/primitives` | `Button`, `Input`, `Textarea`, `Label`, `Select`, `Switch`, `LabeledSwitchRow`, `Checkbox`, `Card` and its parts, `Badge`, `StatusDot`, `Avatar`, `Separator`, `Progress`, `Spinner`, `Skeleton`, `EmptyState`, `ListRow`, `Chip`, `HeaderIconButton`, `Tabs`, `PillTabs`, `Dialog`, `AlertDialog`, `ConfirmDialog`, `Sheet`, `toast`, `Toaster` | `expo-blur`, `expo-haptics` (loaders) |
| `@vvedantb/native-ui/theme` | `NativeUiProvider`, `useNativeUi`, `useLargerText`, `useAccentColor`, `DEFAULT_ACCENT`, `tokens`, `palette`, `withAlpha`, `fontClass`, `cn`, `Colors` and the colour constants | none |
| `@vvedantb/native-ui/floating` | `FloatingSurface`, `GlassSheetBackground`, `LiquidGlass`, `GlassBlurProvider`, `GlassBlurTarget`, `FloatingFAB`, `useReduceTransparency`, the floating metrics and styles | `expo-blur` (loader) |
| `@vvedantb/native-ui/layout` | `ScreenContainer`, `SafeAreaContainer`, `SettingsSection`, `SettingsField`, `SettingsToggleRow`, `SettingsStack` | `expo-blur` (loader) |
| `@vvedantb/native-ui/marketing` | `UpgradeToProCard`, `PricingModal` and the pricing types | none |
| `@vvedantb/native-ui/ambient` | `AmbientBackground` | `expo-linear-gradient` (loader) |
| `@vvedantb/native-ui/blur`, `/haptics` | the loaders | `expo-blur`, `expo-haptics` (loaders) |
| `@vvedantb/native-ui/bottom-sheet` | `BottomSheetContainer` | `@gorhom/bottom-sheet` (import), `expo-blur` (loader) |
| `@vvedantb/native-ui/date-time` | `DateTimeField` | `@react-native-community/datetimepicker`, `dayjs` (import) |

"Loader" means the `require` inside `try` described above, so the entry bundles and runs without that peer. `@vvedantb/native-ui/gallery` imports the root entry.

```tsx
import { FloatingTabBar } from "@vvedantb/native-ui/tab-bar";
import { AppMark } from "@vvedantb/native-ui/brand";
import { NativeUiProvider } from "@vvedantb/native-ui/theme";
```

The entries re-export the same source files, so they can be mixed: `NativeUiProvider` from `/theme` sets the context that `FloatingTabBar` from `/tab-bar` reads. `tests/subpaths.test.ts` walks the imports from each entry and fails if one of the basic entries reaches a heavy peer other than through its loader.

## Expo / NativeWind

Source-exported. Point Tailwind at the package so class names are generated:

```js
// tailwind.config.js
content: [
  "./app/**/*.{js,ts,tsx}",
  "./components/**/*.{js,ts,tsx}",
  "./node_modules/@vvedantb/native-ui/src/**/*.{js,ts,tsx}",
],
```

Metro already resolves `node_modules`. In a pnpm monorepo, if a peer resolves to the wrong copy, add:

```js
const path = require("node:path");
config.watchFolders = [path.resolve(__dirname, "../..")];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../../node_modules"),
];
```

The app must define NativeWind tokens (`bg-surface`, `bg-secondary`, pink utilities) and Instrument Sans font classes (`font-instrument-sans-*`). Accent pink stays in the app stylesheet. `Button`, `Input`, `Textarea`, the `Select` trigger, `Switch`, `Checkbox`, `Badge`, `Tabs` and `PillTabs` take their colours from `tokens` and `palette`, so they do not need `primary`, `input` or other theme keys. From 0.3.3 so does component text (titles, descriptions, labels, rows, toasts): it no longer uses `text-foreground` or `text-muted-foreground`, which stay light-mode colours in dark mode when an app defines `foreground` with a nested `dark` key. Override those colours with `style`, not `className`. App text needs the same care: `tokens.color.foreground[scheme]` reads in both schemes.

## Theme

Wrap the tree (inside your colour-scheme provider):

```tsx
import { NativeUiProvider, Button, Card } from "@vvedantb/native-ui";

<NativeUiProvider largerText={false} accentColor="#db2777">
  <Card title="Today">
    <Button onPress={() => {}}>Record a dose</Button>
  </Card>
</NativeUiProvider>
```

`useLargerText()` steps type and tap targets up. Without it, `Button`, `Input`, `Textarea` and the `Select` trigger have the web sizes (`Button` 32 / 40 / 44 high, fields 40); with it they keep the larger 0.3.2 sizes. `accentColor` tints FABs, card icons and progress bars (checked checkboxes use the palette primary, as on the web). Surfaces use the tokens in `src/tokens.ts` for fill, radius (card 24, button 16, field 10, pill 999; rows 20) and spacing (16).

## Components (0.3.0)

| Area | Exports |
| --- | --- |
| Actions and fields | `Button` (`default`/`primary`, `secondary`, `outline`, `destructive`, `ghost`, `link`, `tinted`; `sm`/`small`, `default`/`medium`, `lg`/`large`, `icon`), `Input`, `Textarea`, `Label`, `Select`, `Switch`, `Checkbox`, `LabeledSwitchRow`, `DateTimeField` |
| Display | `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`), `Badge`, `StatusDot`, `Avatar` (+ `AvatarImage`, `AvatarFallback`, `initials()`), `Separator`, `Progress`, `Spinner`, `CenteredSpinner`, `Skeleton`, `EmptyState` (+ `EmptyState.Root` and parts), `ListRow`, `Chip` |
| Navigation | `Tabs` (+ `TabsList`, `TabsTrigger`, `TabsContent`), `PillTabs`, `FloatingTabBar`, `FloatingFAB`, `HeaderIconButton` |
| Overlays | `Dialog`, `AlertDialog`, `ConfirmDialog`, `Sheet` (RN `Modal`, each with the web part names), `BottomSheetContainer` (`@gorhom/bottom-sheet`) |
| Feedback | `toast()` and `<Toaster />` |
| Brand and upgrade | `APP_ICONS`, `IconVibot` and the other `Icon*`, `AppMark`, `AppWordmark`, `FAMILY_APPS`, `V_PRO_APP_BENEFITS`, `UpgradeToProCard`, `PricingModal` |
| Settings and layout | `SettingsSection`, `SettingsField`, `SettingsToggleRow`, `SettingsStack`, `ScreenContainer`, `SafeAreaContainer`, `FloatingSurface`, `AmbientBackground` |

Overlays hold their own open state, or take `open` and `onOpenChange`:

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete this list?</AlertDialogTitle>
      <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onPress={remove}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

As on the web, `AlertDialogAction` does not close the dialog; `ConfirmDialog` closes on either button. `DialogFooter` and `AlertDialogFooter` lay their buttons out in a row at the end, as the web does from `sm` up. Pass `fullWidth={false}` to a plain `Button` there (`AlertDialogAction` and `AlertDialogCancel` already default to it). `SheetFooter` stacks full width.

Toasts need one `<Toaster />` inside `SafeAreaProvider`, after the navigator. Then call `toast("Saved")`, `toast.error("Failed")` or `toast.loading("Syncing")` from anywhere. Pass the returned id to replace a toast (`toast.success("Synced", { id })`). On iOS toasts show over modals; on Android a `Modal` covers them.

`Tabs` shares its name with Expo Router's `Tabs` layout. In a file that needs both, import one under another name.

`@vvedantb/native-ui/gallery` exports `ParityGallery`, a screen that renders these components. Put it in a dev-only route to check them on a device.

## Floating UI / Android shadows

Do not put `elevation` or NativeWind `shadow-*` on nested or translucent chrome. `floatingShadow` is iOS `shadow*` and Android/web `boxShadow`. `FloatingSurface` clips on an inner view.

## Glass blur (iOS and Android)

With `expo-blur` installed, `FloatingSurface` blurs on iOS and Android. So do the components built on it: `FloatingTabBar`, `Card`, `SettingsSection`, toasts, the `Select` popover and `GlassSheetBackground`. Web uses a CSS backdrop blur. A surface draws the solid fill when `expo-blur` is not installed, with `blur={false}`, or when Reduce Transparency is on.

Since expo-blur 55, Android blur needs a target: the content to blur. Wrap the screen content in `GlassBlurTarget` and render the floating chrome outside it, with both inside one `GlassBlurProvider`:

```tsx
import { GlassBlurProvider, GlassBlurTarget } from "@vvedantb/native-ui";

<GlassBlurProvider>
  <GlassBlurTarget>
    <Stack />
  </GlassBlurTarget>
  <Toaster />
</GlassBlurProvider>
```

With `FloatingTabBar`, put `GlassBlurProvider` around `Tabs` and wrap each tab screen's content in `GlassBlurTarget`. Pass `active={isFocused}` (for example from React Navigation's `useIsFocused()`) so the bar blurs the visible tab. The last active target wins.

`GlassBlurTarget` is a view with `flex: 1`; pass `style` to change that. A blur view must not sit inside its own target, so surfaces inside a target (such as cards on the screen) get none. Without a target, expo-blur logs a warning on Android and draws only its tint, which under the glass fill looks almost solid.

On Android the `BlurView` uses the dimezis method (`experimentalBlurMethod` and `blurMethod` set to `"dimezisBlurView"`) with `blurReductionFactor={3}`, and the same `tint` and `intensity` as iOS. The translucent glass fill is laid over the Android blur, because on iOS the blur samples that fill and dimezis does not. expo-blur 55 and later log a deprecation warning for `experimentalBlurMethod` when each Android `BlurView` mounts.

## Tokens

The JS tokens (colours, radii, spacing) live in `src/tokens.ts`. It is a copy of `packages/ui/tokens/src/native.ts` (the `tokens` export of `@vvedantb/ui`), kept inside this package so React Native apps do not install `@vvedantb/ui` (Radix, react-dom and the rest of the web stack) for colour values. A test in each package fails when the two files differ, so change both together. From 0.3.3 the neutrals and radii match the web `tokens.css` (oklch converted to sRGB hex), and a test converts `tokens.css` and fails when they drift. `fill`, `hairline` and `radius.card` are native-only.

`palette` holds the web semantic colours that `tokens` lacks (`primary`, `danger`, `success`, `warning`, `default`, `overlay`, `segment` and others), each `{ light, dark }`. A test converts `tokens.css` and fails when a value drifts. `withAlpha("#rrggbb", 0.12)` gives tints such as the web `bg-danger/12`.

The brand files `src/brand/svg.ts`, `familyApps.ts` and `vProAppBenefits.ts` are byte-identical copies of `packages/ui/src/brand/`. A test fails when they differ.

`fontClass` lists the Instrument Sans classes. `AppWordmark` uses `font-instrument-sans-medium` (weight 500) with -0.02em letter spacing, as on the web.

## Type checking

`pnpm --filter @vvedantb/native-ui typecheck` runs `tsc` against `types/peers.d.ts`, local declarations of the React Native peers, because they are not installed in this repository. The declarations are looser than the real types. Apps type-check the source against the real packages.

## Publish

There is no CI publish workflow. From a machine with npm access:

```sh
export NPM_CONFIG_USERCONFIG="$HOME/.npmrc"   # if you keep the token there
cd packages/native-ui && npm publish --access public
```

`@vvedantb/native-ui` `0.2.0` has no `@vvedantb/tokens` peer. See `MIGRATION.md` at the repository root.

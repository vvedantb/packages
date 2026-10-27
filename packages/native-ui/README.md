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
- `expo-blur`, `expo-haptics`, `expo-linear-gradient`
- `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`
- `@rn-primitives/slot`, `@rn-primitives/switch`, `@rn-primitives/select`
- `@expo/vector-icons`, `@tabler/icons-react-native`, `lucide-react-native`
- `class-variance-authority`, `clsx`, `tailwind-merge`

Optional, only if you import those components:

- `expo-router` — `FloatingTabBar`
- `@gorhom/bottom-sheet` — `BottomSheetContainer`
- `@react-native-community/datetimepicker` and `dayjs` — `DateTimeField`
- `react-native-svg` — the app marks (`APP_ICONS`, `Icon*`, `AppMark`, `AppWordmark`) and `PricingModal`. Apps with the icon peers above already have it: `lucide-react-native` and `@tabler/icons-react-native` both require it.

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

The app must define NativeWind tokens (`bg-surface`, `bg-secondary`, `text-foreground`, pink utilities) and Instrument Sans font classes (`font-instrument-sans-*`). Accent pink stays in the app stylesheet. `Button`, `Input`, `Textarea`, the `Select` trigger, `Switch` and `Badge` take their colours from `tokens` and `palette`, so they do not need `primary`, `input` or other theme keys. Override those colours with `style`, not `className`.

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

`useLargerText()` steps type and tap targets up. `accentColor` tints FABs, card icons, checked checkboxes and progress bars. Surfaces use the tokens in `src/tokens.ts` for fill, radius (card 24, row 20, pill 999) and spacing (16).

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

As on the web, `AlertDialogAction` does not close the dialog; `ConfirmDialog` closes on either button.

Toasts need one `<Toaster />` inside `SafeAreaProvider`, after the navigator. Then call `toast("Saved")`, `toast.error("Failed")` or `toast.loading("Syncing")` from anywhere. Pass the returned id to replace a toast (`toast.success("Synced", { id })`). On iOS toasts show over modals; on Android a `Modal` covers them.

`Tabs` shares its name with Expo Router's `Tabs` layout. In a file that needs both, import one under another name.

`@vvedantb/native-ui/gallery` exports `ParityGallery`, a screen that renders these components. Put it in a dev-only route to check them on a device.

## Floating UI / Android shadows

Do not put `elevation` or NativeWind `shadow-*` on nested or translucent chrome. `floatingShadow` is iOS `shadow*` and Android/web `boxShadow`. `FloatingSurface` paints an opaque fill on Android and clips on an inner view. Blur is iOS-only.

## Tokens

The JS tokens (colours, radii, spacing) live in `src/tokens.ts`. It is a copy of `packages/ui/tokens/src/native.ts` (the `tokens` export of `@vvedantb/ui`), kept inside this package so React Native apps do not install `@vvedantb/ui` (Radix, react-dom and the rest of the web stack) for colour values. A test in each package fails when the two files differ, so change both together. Some values differ from the web `tokens.css`, most visibly the dark neutrals and `radius.field`; the parity doc lists them.

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

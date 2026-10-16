# `@vvedantb/native-ui`

React Native + Expo primitives extracted from app-d. Floating pill chrome, Android-safe shadows, forms, list rows, and settings sections.

Web apps should keep using `@vvedantb/ui`. This package is native-only.

## Install

```sh
npm install @vvedantb/native-ui @vvedantb/tokens
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

The app must define NativeWind tokens (`bg-surface`, `bg-secondary`, `text-foreground`, pink utilities) and Instrument Sans font classes (`font-instrument-sans-*`). Accent pink stays in the app stylesheet.

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

`useLargerText()` steps type and tap targets up. `accentColor` tints FABs and card icons. Surfaces use `@vvedantb/tokens/native` for fill, radius (card 24, row 20, pill 999) and spacing (16).

## Floating UI / Android shadows

Do not put `elevation` or NativeWind `shadow-*` on nested or translucent chrome. `floatingShadow` is iOS `shadow*` and Android/web `boxShadow`. `FloatingSurface` paints an opaque fill on Android and clips on an inner view. Blur is iOS-only.

## Publish

There is no CI publish workflow. From a machine with npm access:

```sh
export NPM_CONFIG_USERCONFIG="$HOME/.npmrc"   # if you keep the token there
cd packages/tokens && npm publish --access public
cd ../native-ui && npm publish --access public
```

`@vvedantb/tokens` must be `0.1.1+` first (`./native` export).

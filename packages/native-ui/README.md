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
- `react-native-svg` — the app marks (`APP_ICONS`, `Icon*`, `AppMark`, `AppWordmark`), `GoogleMark` and `PricingModal`. Apps with the icon peers above already have it: `lucide-react-native` and `@tabler/icons-react-native` both require it.

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

To hide a tab, give its screen Expo Router's `href: null`. From 0.3.9 `FloatingTabBar` draws no tab for that route. It also hides a route whose `tabBarItemStyle` resolves to `display: "none"`, because Expo Router's `Tabs` can pass `href: null` on in that form. The other tabs keep their focus and navigation, as `state.index` still counts every route:

```tsx
<Tabs tabBar={(props) => <FloatingTabBar {...props} />}>
  <Tabs.Screen name="index" options={{ title: "Home" }} />
  <Tabs.Screen name="details" options={{ href: null }} />
</Tabs>
```

From 0.3.16 the focused tab sits on a rounded pill with the `TabsTrigger` pills outline, with the foreground label and icon; the other tabs are muted. From 0.3.17 the pill fill is `floatingTabPillColors(scheme)`: the muted `palette.default` (`--default`, `#ebebeb`) in light, so it shows on the near-white glass bar, and `palette.segment` (`--segment`, `#474747`) in dark. On the web the `--segment` pill sits on a `--default` track; here the bar is the raised surface, so the light pill takes the track fill. A route's `tabBarActiveTintColor` and `tabBarInactiveTintColor` still override the label and icon colours. The pill is one tab wide, inset 4 from the bar on every side, and slides to a newly focused tab over the web `--tabs-dur` (200 ms) and `--tabs-ease`. It counts only the tabs drawn, and there is none while a hidden route is focused.

## Entry points

The root entry exports everything. It still imports `BottomSheetContainer` and `DateTimeField`, so Metro resolves `@gorhom/bottom-sheet`, `@react-native-community/datetimepicker` and `dayjs` for any import from it. Apps without those peers, such as V Store, should import from the smaller entries below. Between them, they export every name the root exports.

| Entry | Exports | Optional peers it reaches |
| --- | --- | --- |
| `@vvedantb/native-ui/tab-bar` | `FloatingTabBar`, `FloatingTabBarProps`, `FLOATING_INSET`, `FLOATING_TAB_BAR_HEIGHT`, `FLOATING_TAB_BAR_HEIGHT_LARGE`, `tabBarReserve` | `expo-blur`, `expo-haptics` (loaders) |
| `@vvedantb/native-ui/brand` | `AppMark`, `AppWordmark`, `GoogleMark` (from 0.3.15), `APP_ICONS`, `IconVibot` and the other `Icon*`, the SVG helpers (`APP_MARKS`, `appMarkSvg`, `appTileSvg` and the rest), `FAMILY_APPS`, `familyApp`, `V_PRO_APP_BENEFITS` | none |
| `@vvedantb/native-ui/button` | `Button`, `ButtonProps`, `ButtonSize`, `ButtonVariant` | none |
| `@vvedantb/native-ui/primitives` | `Button`, `Input`, `SearchInput`, `Textarea`, `Label`, `Select`, `Switch`, `LabeledSwitchRow`, `Checkbox`, `Card` and its parts, `Badge`, `StatusDot`, `Avatar`, `Separator`, `Progress`, `Spinner`, `Skeleton`, `EmptyState`, `ListRow`, `Chip`, `HeaderIconButton`, `ThemeToggle` (from 0.3.16), `Tabs`, `PillTabs`, `Dialog`, `AlertDialog`, `ConfirmDialog`, `Sheet`, `toast`, `Toaster` | `expo-blur`, `expo-haptics` (loaders) |
| `@vvedantb/native-ui/search-input` | `SearchInput`, `SearchInputProps` | none |
| `@vvedantb/native-ui/page-title` | `PageTitle`, `PageHeader`, `PageTitleProps`, `PageHeaderProps` (from 0.3.13) | none |
| `@vvedantb/native-ui/toast` | `toast`, `Toaster`, `ToastOptions`, `ToastVariant` | none (from 0.3.12) |
| `@vvedantb/native-ui/theme` | `NativeUiProvider`, `useNativeUi`, `useLargerText`, `useAccentColor`, `DEFAULT_ACCENT`, `tokens`, `palette`, `withAlpha`, `fontClass`, `cn`, `Colors` and the colour constants | none |
| `@vvedantb/native-ui/floating` | `FloatingSurface`, `GlassSheetBackground`, `LiquidGlass`, `GlassBlurProvider`, `GlassBlurTarget`, `FloatingFAB`, `useReduceTransparency`, the floating metrics and styles | `expo-blur` (loader) |
| `@vvedantb/native-ui/layout` | `ScreenContainer`, `SafeAreaContainer`, `PageTitle`, `PageHeader` and their props types, `SettingsSection`, `SettingsField`, `SettingsToggleRow`, `SettingsStack` | `expo-blur` (loader) |
| `@vvedantb/native-ui/marketing` | `UpgradeToProCard`, `PricingModal` and the pricing types | none |
| `@vvedantb/native-ui/ambient` | `AmbientBackground` | `expo-linear-gradient` (loader) |
| `@vvedantb/native-ui/blur`, `/haptics` | the loaders | `expo-blur`, `expo-haptics` (loaders) |
| `@vvedantb/native-ui/bottom-sheet` | `BottomSheetContainer` | `@gorhom/bottom-sheet` (import), `expo-blur` (loader) |
| `@vvedantb/native-ui/date-time` | `DateTimeField` | `@react-native-community/datetimepicker`, `dayjs` (import) |
| `@vvedantb/native-ui/ai` | The AI chat parts (from 0.4.0): `Conversation`, `Message`, `Reasoning`, `AgentTrace`, `ChainOfThought`, `ActivityStep`, `PromptInput`, `Suggestions`, `Sources`, `FileChip`, `Attachments`, `CodeBlock`, `ResponseText`, `Shimmer`, `Collapsible`, `useStreamingDisclosure` and their parts. See [AI chat](#ai-chat-040). Not on the root entry. | none |
| `@vvedantb/native-ui/ai-gallery` | `AiChatGallery`, `AiChatSamples` (from 0.4.0) | none |

"Loader" means the `require` inside `try` described above, so the entry bundles and runs without that peer. `@vvedantb/native-ui/gallery` imports the root entry; `@vvedantb/native-ui/ai-gallery` imports `/ai` only.

The AI chat parts are only on `/ai`. Metro does not tree-shake by default, so on the root entry they would bundle into every app, with or without a chat.

```tsx
import { FloatingTabBar } from "@vvedantb/native-ui/tab-bar";
import { AppMark } from "@vvedantb/native-ui/brand";
import { NativeUiProvider } from "@vvedantb/native-ui/theme";
import { SearchInput } from "@vvedantb/native-ui/search-input";
import { PageHeader } from "@vvedantb/native-ui/page-title";
import { toast, Toaster } from "@vvedantb/native-ui/toast";
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

From 0.3.5 text that uses `font-instrument-sans-medium` or `-semibold` also sets `fontWeight` as a style (`typeStyle` in `src/controlStyles.ts`). Where an app maps every `font-instrument-sans-*` class to one family with no weight, as Expo web does, the class alone draws Regular. A weight without the face class does not pick the Instrument Sans Medium or Semibold file, so set both. From 0.3.13 every title in the package pairs the two, the internal primitives included, and `tests/fontWeight.test.ts` fails on a face class without its weight, a weight without its face class, or a bare Tailwind `font-medium`, `font-semibold` or `font-bold`.

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
| Actions and fields | `Button` (`default`/`primary`, `secondary`, `outline`, `destructive`, `ghost`, `link`, `tinted`; `sm`/`small`, `default`/`medium`, `lg`/`large`, `icon`), `Input`, `SearchInput` (0.3.9), `Textarea`, `Label`, `Select`, `Switch`, `Checkbox`, `LabeledSwitchRow`, `DateTimeField` |
| Display | `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`), `Badge`, `StatusDot`, `Avatar` (+ `AvatarImage`, `AvatarFallback`, `initials()`), `Separator`, `Progress`, `Spinner`, `CenteredSpinner`, `Skeleton`, `EmptyState` (+ `EmptyState.Root` and parts), `ListRow`, `Chip` |
| Navigation | `Tabs` (+ `TabsList`, `TabsTrigger`, `TabsContent`), `PillTabs`, `FloatingTabBar`, `FloatingFAB`, `HeaderIconButton`, `ThemeToggle` (0.3.16) |
| Overlays | `Dialog`, `AlertDialog`, `ConfirmDialog`, `Sheet` (RN `Modal`, each with the web part names), `BottomSheetContainer` (`@gorhom/bottom-sheet`) |
| Feedback | `toast()` and `<Toaster />` |
| Brand and upgrade | `APP_ICONS`, `IconVibot` and the other `Icon*`, `AppMark`, `AppWordmark`, `GoogleMark` (0.3.15), `FAMILY_APPS`, `V_PRO_APP_BENEFITS`, `UpgradeToProCard`, `PricingModal` |
| Settings and layout | `PageTitle`, `PageHeader` (0.3.13), `SettingsSection`, `SettingsField`, `SettingsToggleRow`, `SettingsStack`, `ScreenContainer`, `SafeAreaContainer`, `FloatingSurface`, `AmbientBackground` |

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

From 0.3.7, in a compact window (639 wide or less, or 500 high or less: the web `COMPACT_OVERLAY_QUERY`) `DialogContent`, and so `AlertDialogContent` and `ConfirmDialog`, is the web phone bottom sheet: full width, top corners 16, a handle, the bottom safe-area inset. Its footer stacks the buttons full width and at least 44 high, the last child on top, whatever `fullWidth` says. Pass `viewportAware={false}` to keep the centred dialog at every size.

From 0.3.8 `UpgradeToProCard` has the web `SidebarUpgradeCard` sizes: a 14 / 600 title, a 32-high pill with a 12 / 500 label (the web `Button` `sm`), `px-3 py-2.5` padding and radius 16. With larger text the title and pill keep their larger sizes.

From 0.3.9 `SearchInput` is the web search field: a search icon, and a clear button while there is text. It is controlled with `value` and `onChange(text)`; `onClear` runs whenever the value becomes empty. `size="sm"` (default) is 32 high and `md` 40, border included, as on the web. From 0.3.12 that height is locked, so the line height of the text class cannot grow the field; it still grows with the system font size. The clear button is painted at 24 and reaches 44 with its hit slop. Inside a `ScrollView`, set `keyboardShouldPersistTaps="handled"` so the first tap on it clears while the keyboard is up. The web `shortcut` hint and `toolbar` variant are not ported.

```tsx
const [query, setQuery] = useState("");
<SearchInput value={query} onChange={setQuery} label="Search apps" />
```

From 0.3.13 `PageTitle` is the web page title, the type on the web `Breadcrumb` (`text-xl font-semibold leading-tight tracking-tight`): Instrument Sans 600 at 20 / 25 with -0.5 letter spacing (-0.025em), in the foreground colour. It sets the semibold face class and `fontWeight: "600"` together, so it is not drawn Regular on Android or Expo web. It is a header for VoiceOver and TalkBack, one line (pass `numberOfLines={0}` to wrap), and scales with the system font size. `PageHeader` is a tab-root title row: `PageTitle` at the start and an optional `action` at the end, which keeps its width while a long title is cut off. It has the `ScreenContainer` side padding (`px-4`) and a row at least 56 high, so tabs with and without an action put their titles at the same height. It pads the top by the safe-area inset; pass `safeTop={false}` under a native header or inside a view that already pads it. Give a `Button` in `action` `fullWidth={false}`.

```tsx
<PageHeader
  title="Apps"
  action={<Button variant="ghost" size="sm" fullWidth={false} onPress={updateAll}>Update all</Button>}
/>
```

Toasts need one `<Toaster />` inside `SafeAreaProvider`, after the navigator. Then call `toast("Saved")`, `toast.error("Failed")` or `toast.loading("Syncing")` from anywhere. Pass the returned id to replace a toast (`toast.success("Synced", { id })`). On iOS toasts show over modals; on Android a `Modal` covers them.

From 0.3.12 a toast looks like the web `SonnerToaster` at its default density with `toastIcons="filled24"`: the filled 24 success, info, warning and error icons (the web paths, in `palette` colours), a `text-sm` medium title, `px-4 py-3`, radius 16, and the flat overlay fill with a 1 px ring and a light shadow (`smooth-shadow-ring-md`). Toasts no longer blur.

`Tabs` shares its name with Expo Router's `Tabs` layout. In a file that needs both, import one under another name.

`@vvedantb/native-ui/gallery` exports `ParityGallery`, a screen that renders these components. Put it in a dev-only route to check them on a device.

## AI chat (0.4.0)

`@vvedantb/native-ui/ai` ports the `@vvedantb/ui` AI elements for touch: the thread, messages, reasoning and agent trace folds, the composer, suggestions, sources, attachments and code. They are generic (no model names, no app logic) and say "the AI", "Thinking…", "Thought for 12s" and "Worked for 12s". They add no package.

```tsx
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  Message,
  MessageAction,
  MessageActionsBar,
  MessageContent,
  PromptInput,
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  ResponseText,
} from "@vvedantb/native-ui/ai";

<View className="flex-1">
  <Conversation>
    <ConversationContent>
      <Message from="user">
        <MessageContent>{question}</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent>
          <Reasoning isStreaming={status === "streaming"}>
            <ReasoningTrigger />
            <ReasoningContent>{reasoning}</ReasoningContent>
          </Reasoning>
          <ResponseText>{answer}</ResponseText>
        </MessageContent>
        <MessageActionsBar>
          <MessageAction kind="copy" onPress={() => copy(answer)} />
          <MessageAction kind="retry" onPress={retry} />
        </MessageActionsBar>
      </Message>
    </ConversationContent>
    <ConversationScrollButton />
  </Conversation>
  <PromptInput onSubmit={send} status={status} onStop={stop} />
</View>
```

| Part | Notes |
| --- | --- |
| `Conversation`, `ConversationContent`, `ConversationEmptyState`, `ConversationScrollButton`, `useConversation` | A `ScrollView` that sticks to the bottom: while the reader is within 70 of the end, new and growing messages stay in view. Once they drag up it stops following, and the scroll button shows: a round outline arrow (40, slop to 48), 16 above the bottom, with an opaque fill and no shadow. Pressing it scrolls down (a jump with Reduce Motion). For very long threads, drive a `FlatList` with `useConversation`. |
| `Message`, `MessageContent`, `MessageActionsBar`, `MessageAction` | A user message is the web primary bubble (radius 16, bottom-right 14, `px-4 py-3`) at the end of the row; an assistant message has no fill. `MessageAction` is a ghost icon button at the web `icon-sm` size (32, slop to 44). `kind` gives the icon and label: "Copy", "Retry", "Good response", "Bad response". `selected` marks chosen feedback. |
| `Reasoning`, `ReasoningTrigger`, `ReasoningContent`, `useReasoning` | Opens when streaming starts, times the stream and closes once, a second after it stops. The trigger shows a brain, the shimmering "Thinking…", then "Thought for 12s", and a chevron. The content is muted monospace text on the web `bg-surface-secondary/40` panel. Unlike the web, a reader can close it while it streams. |
| `AgentTrace`, `AgentTraceLine`, `AgentTraceIcon`, `AgentTraceTitle`, `AgentTraceDescription`, `AgentTraceCollapsible*` | One step per line, with an optional fold behind a rail. `AgentTraceTitle shimmer` pulses a running step. Spread `useStreamingDisclosure(isStreaming)` on `AgentTraceCollapsible` to open it while a step streams. |
| `ActivityStep` | One tool step as a trace line: icon, label, a spinner while `running`, a check when `complete`, a warning on `error`, and a description such as `` `Worked for ${formatElapsed(12)}` ``. |
| `ChainOfThought` and its parts | Simplified: header, steps with a rail, search-result chips. |
| `PromptInput`, `PromptInputButton`, `PromptInputSubmit` | The web field surface with a `header` slot (attachments), a field, a `toolbar` slot and the send button. The field grows from one line to 160 high (about 6 lines), then scrolls. Send is primary with text and disabled without. While `status` is `submitted` or `streaming` it is a "Stop" square that calls `onStop`. It sits in a `KeyboardAvoidingView` (padding, on iOS and Android) and pads the safe-area insets: put it last in a full-height column. Under a navigation header, pass the header height as `keyboardVerticalOffset`; above a tab bar, pass `safeBottom={false}`. |
| `Suggestions`, `Suggestion` | A horizontal row of round chips (or `orientation="vertical"`). `onPress` gets the suggestion text. |
| `Sources`, `SourcesTrigger`, `SourcesContent`, `Source` | A fold of link rows. A row opens its address with `Linking.openURL`, or hands it to `onPress`. |
| `FileChip`, `Attachments`, `Attachment` | A monospace file chip (a button with `onOpenFile`), and attachment chips with a media icon or image thumbnail and a labelled remove button. No hover cards and no grid previews. |
| `CodeBlock`, `CodeBlockCopyButton` | Plain monospace code on the flat panel, scrolling sideways, with the language and a copy button in a header. No highlighting. |
| `ResponseText` | Plain, selectable reply text with newlines kept. It takes the colour of the `MessageContent` it is in. |
| `Shimmer` | "Live" text: the foreground fades to 0.45 and back on the UI thread. With Reduce Motion it holds still, muted. |

**Markdown.** There is no markdown renderer: `ResponseText` draws the text as it is. To render markdown, an app can add one of these and use it in place of `ResponseText`: `react-native-markdown-display`, `@ronradtke/react-native-markdown-display` (a maintained fork) or `react-native-marked`.

**Clipboard.** React Native's own `Clipboard` is deprecated (moved out of core), and the package adds no clipboard package. `MessageAction kind="copy"` calls your `onPress`, and `CodeBlock` shows its copy button when given `onCopy(code)`. Pass your own clipboard call, for example `expo-clipboard`'s `setStringAsync`.

Every control has a role, an accessible name and a 44 pt target. Folds report `expanded`, feedback actions `selected`, and the send button `disabled`. Type and icons step up with larger text. Colours come from `palette` and `tokens` as styles, in light and dark.

`@vvedantb/native-ui/ai-gallery` exports `AiChatGallery`, a full chat screen with a sample thread: a user message, a finished assistant message with folded reasoning and trace, code, sources and actions, and a second answer that streams with its reasoning open until you press Stop. It also has suggestions and the composer with sample attachments. Put it in a dev-only route with a `SafeAreaProvider` above it. `ParityGallery` shows the same thread (`AiChatSamples`) in its "AI chat" section.

## Phones and accessibility

The components keep the web sizes on screen and reach a 44 pt touch target with `hitSlop` (`touchSlop` in `src/controlStyles.ts`): `Checkbox` (16), `Switch` (36 × 20), tab triggers (30 high), the `Select` trigger (40 high), the `SearchInput` clear button (24), the `UpgradeToProCard` pill (32 high, slop 8) and `Button` (the slop brings each size to at least 48). Controls set their role and state for VoiceOver and TalkBack: `Button` (`disabled`, `busy` while loading), `Checkbox` (`checked`, `mixed`), `Switch` (`checked`), `Tabs` and `PillTabs` (`tablist`, `tab`, `selected`) and the `Select` trigger (`combobox`, with an `accessibilityLabel` prop). Give a `Button` with no text child an `accessibilityLabel`.

Text scales with the system font size. Labelled controls have minimum heights, so a large Dynamic Type size grows them instead of clipping the label (the `SearchInput` lock grows with the font scale); only the `FloatingTabBar` labels are capped (1.5×), to fit the fixed bar. With Reduce Motion on, dialogs, sheets, toasts, the `Select` popover, `PricingModal`, `Progress`, `Skeleton` and the `FloatingTabBar` pill do not animate. Dialogs, sheets, toasts, `FloatingTabBar` and `FloatingFAB` stay inside the safe-area insets, and dialog and sheet fields stay above the keyboard on iOS and Android.

The brand marks (`APP_ICONS`, the `Icon*` exports, `AppMark` and `GoogleMark`) are images named by `title`, and hidden from assistive tech without one. From 0.3.14 they set the props each platform reads: `accessibilityRole="image"` and `accessibilityLabel` on iOS and Android, `role="img"` and `aria-label` on web. Without a title they set `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"` on native and `aria-hidden` on web. `testID` is `data-testid` on web. On web `react-native-svg` passes its props straight to the DOM `<svg>`, and React Native Web does not map `accessible`, the `accessibility*` props or `testID` there. So do not put them on an `Svg` or on a Tabler icon: put them on the parent `View` or `Pressable`. The package draws no Lucide icon, as a Lucide icon always sets `testID` on its `Svg`. On web the `Select` options are Radix DOM nodes, so from 0.3.14 they take their name and test id as `aria-label` and `data-testid` there, and as `accessibilityLabel` and `testID` on iOS and Android.

`ThemeToggle` (from 0.3.16) is a `HeaderIconButton` that switches between light and dark with NativeWind's `setColorScheme`, the scheme every component reads through `useColorScheme`. It shows and names the scheme it switches to: a moon and "Switch to dark mode" in light, a sun and "Switch to light mode" in dark. It stores nothing: to restore the choice on the next launch, store `useColorScheme().colorScheme` in the app. It takes `testID`.

`GoogleMark` (from 0.3.15) is the four-colour Google "G", 18 by default, for a "Continue with Google" button: `<Button variant="outline" leftIcon={<GoogleMark />}>Continue with Google</Button>`. Its colours are fixed, so it takes no `color`. Leave it without a `title` there, as the label names the button.

## Floating UI / Android shadows

Do not put `elevation` or NativeWind `shadow-*` on nested or translucent chrome. `floatingShadow` is iOS `shadow*` and Android/web `boxShadow`. `FloatingSurface` clips on an inner view.

Only chrome that floats on the web too has a shadow: dialogs, sheets and toasts, plus the native `FloatingTabBar` and `FloatingFAB`. From 0.3.5 `Card` and `SettingsSection` are flat (`cardStyle`: the web `rounded-lg bg-surface-card`), and `Button` is flat unless you pass `shadowType="shadow"`.

## Glass blur (iOS and Android)

With `expo-blur` installed, `FloatingSurface` blurs on iOS and Android. So do the components built on it: `FloatingTabBar`, the `Select` popover and `GlassSheetBackground`. `Card` and `SettingsSection` do not blur from 0.3.5, nor toasts from 0.3.12. Web uses a CSS backdrop blur. A surface draws the solid fill when `expo-blur` is not installed, with `blur={false}`, or when Reduce Transparency is on.

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

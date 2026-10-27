# `@vvedantb/native-ui` parity with `@vvedantb/ui`

Status on 27 October 2026, after `@vvedantb/native-ui` 0.3.5, against `@vvedantb/ui` 0.29.0. The 0.3.3 visual fixes (tokens, text colours, control sizes, dialog footer, checkbox) followed a side-by-side screenshot review of `ParityGallery` against the web gallery. 0.3.4 fixes the tab colours and the field placeholders in dark mode. 0.3.5 makes cards flat, sizes tabs and the switch as on the web, sets title and button weights as styles, and covers phone use: 44 pt touch targets, accessibility roles and states, Dynamic Type, Reduce Motion, safe-area insets and the keyboard. See [Phones and accessibility](#phones-and-accessibility).

This audit lists every public export of `@vvedantb/ui` and says whether `@vvedantb/native-ui` has an equivalent. It also records how the two packages share design tokens and brand data.

## Scope and method

- **Entries.** The root entry `@vvedantb/ui` has 1,362 named exports from 250 source modules. They were listed with the TypeScript compiler (`checker.getExportsOfModule` on `src/index.ts`) on 27 October 2026. `@vvedantb/ui/brand` and `@vvedantb/ui/client` add no names of their own: `./brand` is a subset of the root, and `./client` is the root without the artifact viewers, `ConvexClerkProvider`, `useStableAuth`, `createUseStableAuth`, `resetStableAuthSession` and `useEnsureUser`. The CSS subpaths (`./tokens`, `./tokens/css/*`, `./landing.css`, `./fonts/instrument-sans.css`) and `./tokens/tailwind-preset` are web build inputs. They are n/a on native, apart from the token values covered under [Tokens](#tokens).
- **Statuses.**
  - **same**: native has a component or value with the same job and, where it makes sense on touch, the same names and props. Differences are in the notes.
  - **partial**: native covers the main use, with a different API or fewer options.
  - **missing**: no native equivalent yet, and one can be built with the existing peers.
  - **missing (needs dep)**: no native equivalent, and a good one needs a package that native-ui does not have. See [Desired packages](#desired-packages).
  - **n/a**: not applicable on native. Each n/a row gives the reason, such as DOM, hover, keyboard, web Clerk, Convex web providers, Chrome extensions, landing pages or web app shell chrome.
- **Counting.** The summary counts exports. Each module's status applies to all of its exports, so a "same" module can hold an n/a part (for example `DialogPortal` in `dialog.tsx`). The notes name those exceptions.
- **Evidence.** For the grouped n/a areas (AI elements, composer, artifacts, Kibo blocks, nav icons), the notes list each module's non-React imports as found in the source on 27 October 2026.

## Summary

Exports by area and status (`@vvedantb/ui` 0.29.0, counted on 27 October 2026):

| Area | Exports | same | partial | missing | missing (needs dep) | n/a |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Primitives (`src/ui`) | 353 | 87 | 63 | 83 | 28 | 92 |
| Brand (`src/brand`, also `@vvedantb/ui/brand`) | 40 | 40 | 0 | 0 | 0 | 0 |
| Marketing (`src/marketing`) | 42 | 0 | 7 | 0 | 0 | 35 |
| Shell (`shell/src`) | 86 | 2 | 5 | 0 | 0 | 79 |
| App helpers (`app/src`) | 69 | 5 | 6 | 5 | 0 | 53 |
| Tokens | 2 | 2 | 0 | 0 | 0 | 0 |
| Utilities, hooks and motion | 42 | 1 | 0 | 10 | 0 | 31 |
| Audio (`src/audio`) | 10 | 0 | 0 | 3 | 7 | 0 |
| Animated nav icons (`src/icons`) | 25 | 0 | 0 | 0 | 0 | 25 |
| Markdown (`src/markdown`) | 3 | 0 | 0 | 0 | 0 | 3 |
| Composer (`src/composer`) | 72 | 0 | 0 | 0 | 0 | 72 |
| AI elements (`src/ai-elements`) | 468 | 0 | 0 | 0 | 0 | 468 |
| Artifact viewers (`src/artifacts`) | 32 | 0 | 0 | 0 | 0 | 32 |
| Kibo blocks (`src/kibo`) | 118 | 0 | 0 | 0 | 0 | 118 |
| **Total** | **1362** | **137** | **81** | **101** | **35** | **1008** |

Most of the n/a total (1,008 of 1,362 exports) is web-only by design: AI elements (468), Kibo blocks (118), the composer (72), the web shell (79 of 86) and app helpers tied to web Clerk, Vite or the DOM.

### Focus components

| Web export | Native 0.3.0 | Status | Notes |
| --- | --- | --- | --- |
| `Button` | `Button` (extended) | same | Web variant names `default`, `destructive`, `ghost`, `link`; web sizes `sm`, `default`, `lg`, `icon`; `startContent`, `endContent`, `loading`. Colours from `palette`, as on the web; `outline` is the web bordered neutral and the 0.2 pink `outline` is now `tinted`. From 0.3.3, without larger text: web heights and padding (`sm` 32, `default` 40, `lg` 44), `text-sm` / `text-xs` medium and radius 16 (web `rounded-lg`). From 0.3.5: no shadow by default, as on the web; `loading` shows the web 16 ring and keeps the label. `primary`, `small`, `medium` and `large` are aliases of the web names. |
| `Input` | `Input` | same | Web field look (white, bordered), web radius (10), height (40) and padding from 0.3.3. Placeholder in `palette.fieldPlaceholder`, also on iOS and Android from 0.3.4. |
| `Textarea` | `Textarea` (new) | same | Multiline `Input`, same field look; web `min-h-20`. |
| `Label` | `Label` (new) | same | Colour from `tokens` (a style) from 0.3.3. From 0.3.7 the web `text-sm` medium (14 / 500), with size and weight as styles. The web `leading-none` and `text-foreground/90` are not ported (line height 20, full foreground). |
| `Card` and parts | `Card` and parts (new parts) | same | `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` added. The existing `title` / `leftIcon` / `action` API is unchanged; `description` and `className` added. From 0.3.5 the card is flat, as on the web: `surfaceCard` fill, radius 16, no shadow or blur. |
| `Badge` | `Badge` (new) | same | All seven web variants. |
| `Switch` | `Switch` | same | Track and thumb colours from `palette`, as on the web. From 0.3.5 the web size (36 × 20, 16 thumb), with a hit slop to 44. |
| `Checkbox` | `Checkbox` (new) | same | No `@rn-primitives/checkbox`: `Pressable` and a Tabler check. From 0.3.3: palette `primary` fill (was the theme accent) and the web 16 px box, with a 14 hit slop. |
| `Select` | `Select` | partial | Options-array API. The trigger has the `Input` field look and size; the placeholder uses `palette.fieldPlaceholder` (on web from 0.3.4). From 0.3.5 the trigger is a `combobox` with an `accessibilityLabel` prop. |
| `Sheet` | `Sheet` (new), `BottomSheetContainer` | same | RN `Modal`, bottom edge only. |
| `Dialog` | `Dialog` (new) | same | RN `Modal`. From 0.3.3: footer buttons in a row at the end (the web layout from `sm` up), padding 24, title `text-lg` semibold, description in the web colour (`palette.overlayMuted`). From 0.3.7, in a compact window (the web `COMPACT_OVERLAY_QUERY`, from `useWindowDimensions`) `DialogContent` is the web phone bottom sheet with a handle and a stacked footer; `viewportAware={false}` turns that off, as on the web. |
| `AlertDialog` | `AlertDialog` (new) | same | |
| `ConfirmDialog` | `ConfirmDialog` (new) | partial | Legacy props, default size. |
| `Tabs` | `Tabs` (new), `PillTabs` | same | `pills`, `segmented`, `soft`. From 0.3.4 fills and labels are the web tab colours (`tabColors`), not pink. From 0.3.5 the web sizes (30 high, `text-sm` medium), as wide as the tabs and at the start. |
| `Avatar` | `Avatar` (new) | same | |
| `Skeleton` | `Skeleton` | same | Now takes `View` props and respects Reduce Motion. |
| `toast`, `SonnerToaster` | `toast`, `Toaster` (new) | partial | Top toasts, no sonner. |
| `Separator` | `Separator` (new) | same | |
| `Progress` | `Progress` (new) | same | |
| `Spinner`, `CenteredSpinner` | `Spinner`, `CenteredSpinner` (new) | partial, same | System spinner; no SVG variants. |
| `EmptyState` | `EmptyState` (parts new) | same | |
| `ListRow` | `ListRow` | partial | Different API. |
| `StatusDot` | `StatusDot` (new) | same | |
| `LabeledSwitchRow` | `LabeledSwitchRow` (new) | same | |
| `APP_ICONS`, `Icon*` | `APP_ICONS`, `Icon*` (new) | same | `react-native-svg`. |
| `AppMark` | `AppMark` (new) | same | |
| `AppWordmark` | `AppWordmark` (new) | same | Instrument Sans 500, -0.02em. |
| `APP_MARKS`, `APP_NAMES`, `FAMILY_APPS`, `familyApp`, `V_PRO_APP_BENEFITS` and the other `svg.ts` exports | same names (new) | same | Byte-identical copies. |
| `SidebarUpgradeCard` | `UpgradeToProCard` (new) | same | Renamed: native has no sidebar. From 0.3.8 the web sizes, set as styles: title `text-sm` semibold (14 / 600), pills the web `Button` `sm` (32 high, `px-3`, `text-xs` medium, 12 / 500), card `px-3 py-2.5` at radius 16 (`rounded-2xl`). |
| `PricingModal` | `PricingModal` (new) | partial | Multi-plan layout only. |

## Tokens

### How the packages share them

No new package was added, and `@vvedantb/ui` is unchanged. Sharing works through copies that tests keep in step:

| What | Native file | Source of truth | Check |
| --- | --- | --- | --- |
| Neutrals, radii, spacing (`tokens`) | `src/tokens.ts` | `packages/ui/tokens/src/native.ts`, whose neutrals and radii follow `tokens.css` | Body must match, below the header comment. Checked in both packages: `packages/ui/tokens/test/package.test.mjs` and `packages/native-ui/tests/tokens.test.ts`. From 0.3.3 `tests/tokens.test.ts` also converts the `tokens.css` neutrals, `--radius` and `--field-radius` and compares them. |
| Web semantic colours (`palette`) | `src/palette.ts` | `packages/ui/tokens/src/tokens.css` | `tests/tokens.test.ts` converts each `oklch()` value to sRGB hex (clipped to sRGB) and compares it with the light and dark values. `palette.destructive` is checked against the web destructive `Button` fill. |
| Brand data | `src/brand/svg.ts`, `familyApps.ts`, `vProAppBenefits.ts` | `packages/ui/src/brand/` | Byte-identical, checked by `tests/brand.test.ts`. |
| Wordmark type | `src/typography.ts` (`WORDMARK`) | `.landing-wordmark-text` in `landing.css`, `ICON_SCALE` and the gap in `AppWordmark.tsx` | `tests/tokens.test.ts`. |

A shared module that both packages import would need a new package, or would make native-ui import from `@vvedantb/ui` (and so pull in Radix, react-dom and the rest of the web stack). Neither was acceptable, so the copies stay. The `palette` test reads `tokens.css` directly, so a web colour change fails the native-ui tests until `palette.ts` is updated.

`palette` adds the colours that `tokens` lacks: `primary`, `danger`, `success`, `warning` (each with a foreground), `default`, `overlay`, `segment`, `surfaceTertiary`, `fieldPlaceholder`, `backdrop`, `overlayMuted` and `destructive`. `overlayMuted` is the web `DialogDescription` colour: `--overlay-foreground` mixed 72% into `--overlay` in oklch. A test derives it from `tokens.css` and `dialog.tsx`. Components use `tokens` and `palette` for any colour drawn through a style (icons, fills, borders, tints, text) and NativeWind classes (`bg-secondary`, `bg-surface`) for some fills. `Button`, `Input`, `Textarea`, the `Select` trigger, `Switch`, `Checkbox`, `Tabs` and `PillTabs` take their colours from `src/controlStyles.ts`, because the primitives' NativeWind keys (`bg-primary`, `bg-input`) are not defined in apps. `withAlpha(hex, alpha)` gives the tints that the web writes as `bg-danger/12`.

From 0.3.3, component text takes its colour from `textStyle(tone, scheme)` in `src/controlStyles.ts`, not from `text-foreground` or `text-muted-foreground`. A screenshot review found dialog titles, card titles, field labels and switch and checkbox labels near-invisible in dark mode. The preview app's Tailwind theme defined `foreground` as `{ DEFAULT: <light hex>, dark: <dark hex> }`. That makes `text-foreground` the light value in both schemes and adds a separate `text-foreground-dark` class, so dark mode drew about #242426 text on a dark surface. Apps can define their theme the same way, so the package no longer relies on those classes. A test fails if a component outside `src/primitives` uses them. The raw primitives keep the classes, but every public wrapper overrides their text colour.

### Where `tokens` and `tokens.css` differed

Up to 0.3.2 the neutrals and `radius.field` did not match `tokens.css`. 0.3.3 moves them to the web values, in both `packages/ui/tokens/src/native.ts` and the native-ui copy. `packages/native-ui/tests/tokens.test.ts` now converts each `tokens.css` value and fails when one drifts. Values converted from `oklch()` to sRGB hex on 27 October 2026 (before → 0.3.3, which is the web value):

| `tokens.color` | CSS variable | Light | Dark |
| --- | --- | --- | --- |
| `background` | `--background` | #f6f6f6 → #f5f5f5 | #1f1f1f → #060606 |
| `foreground` | `--foreground` | #242426 → #181818 | #fafafa → #fcfcfc |
| `muted` | `--muted` | #737373 → #727272 | #b3b3b3 → #a0a0a0 |
| `border` | `--border` | #e5e5e5 → #dedede | #474747 → #292929 |
| `surface` | `--surface` | #ffffff (unchanged) | #242426 → #181818 |
| `surfaceSecondary` | `--surface-secondary` | #f2f2f2 → #efefef | #2a2a2c → #242323 |
| `surfaceCard` | `--surface-card` | #fafafa → #f8f8f8 | #2a2a2c → #242323 |
| `separator` | `--separator` | #ebebeb → #e4e4e4 | #404040 → #222222 |

The light changes are small (each channel moves by 14 or less out of 255, the most in `foreground`). The dark theme is now the web's: a near-black page (#060606), surfaces and fields at #181818, and lower-contrast borders (#292929).

`fill` and `hairline` have no web token. `fill.dark`, the translucent glass fill, moves from `rgba(28, 28, 30, 0.88)` to `rgba(24, 24, 24, 0.88)`, so glass matches the solid surface (#181818) on the darker page. `fill.light` and both `hairline` values are unchanged.

| `tokens.radius` | Native | Web | Match |
| --- | --- | --- | --- |
| `lg` | 16 | `--radius` 1rem (16) | yes |
| `md` | 14 | `calc(var(--radius) - 2px)` (14) | yes |
| `sm` | 12 | `calc(var(--radius) - 4px)` (12) | yes |
| `field` | 10 (20 before 0.3.3) | `--field-radius` `min(var(--radius), 0.625rem)` (10, since ui 0.16.3) | yes |
| `card` | 24 | no token; web cards use `rounded-lg` (16), pricing cards `rounded-3xl` (24) | n/a |
| `pill` | 999 | `rounded-full` | yes |
| `spacing.unit` | 16 | 1rem | yes |

`FLOATING_ROW_RADIUS` (list rows and toasts; `UpgradeToProCard` until 0.3.7) was `tokens.radius.field`. It is now the literal 20, so rows look as before. From 0.3.8 `UpgradeToProCard` uses 16, the web `rounded-2xl`. `tokens` is also a public export of `@vvedantb/ui`, so these values change there too, with no `@vvedantb/ui` version bump yet.

### Instrument Sans

Apps load Instrument Sans and map the NativeWind classes `font-instrument-sans`, `-medium`, `-semibold` and `-bold` to it. Every component uses those classes. `fontClass` exports them for app code. `AppWordmark` uses `font-instrument-sans-medium` (weight 500) with letter spacing `size × -0.02`, the icon at `round(size × 1.4)` and a gap of `size × 0.2`. These are the web `AppWordmark` and `.landing-wordmark-text` values; a test checks them.

## Desired packages

No package was added. These would close the "missing (needs dep)" rows:

| Package | For | Priority |
| --- | --- | --- |
| `@rn-primitives/dropdown-menu` | `DropdownMenu` | Medium: common in app headers. |
| `@rn-primitives/popover` | `Popover` | Low. |
| `@react-native-community/slider` | `Slider`, `LabeledSliderRow` | Low. |
| `expo-audio` | `playChime`, `playTone`, `useReplyChime` | Low. |
| `expo-video` | `VideoPreview` | Low. |

Not needed: `@rn-primitives/checkbox`, `dialog`, `alert-dialog`, `tabs`, `avatar`, `progress`, `separator`, `label` and `sonner`. 0.3.0 builds those on `react-native` and the existing peers.

### `react-native-svg`

The brand marks render with `react-native-svg`. 0.3.0 declares it as an **optional peer dependency**. This adds no package to install and does not change `pnpm-lock.yaml` (`pnpm install --frozen-lockfile --offline` passes). Every app that meets the existing peers already has it, because two required peers, `lucide-react-native` and `@tabler/icons-react-native`, list `react-native-svg` as a required peer (npm registry, 27 October 2026). If the owner prefers no new peer entry, the fallback is to render the marks through `lucide-react-native`'s `createLucideIcon` with the same path data.

## Known differences and follow-ups

- **Not checked on a device.** There is no Expo app in this repository and the React Native peers are not installed here. A throwaway Expo web harness outside the repository rendered `ParityGallery` beside the web gallery on 27 October 2026; that led to the `Button`, field and `Switch` colour fixes, and a second review led to the 0.3.3 fixes. A third look led to 0.3.4; its tab and `Select` placeholder colours were measured in that harness after the change (computed styles, both schemes). The other 0.3.3 changes have not been re-captured. A further review led to 0.3.5; its changes have not been re-captured yet. iOS and Android were not checked, so the 0.3.4 `Input` / `Textarea` placeholder fix rests on reading the NativeWind source, and the 0.3.5 hit slop, Reduce Motion, safe-area and keyboard changes rest on the React Native documentation and source tests. Check them with `@vvedantb/native-ui/gallery` (`ParityGallery`) before release.
- **Type checking uses shims.** `pnpm typecheck` checks the package against local declarations of the peers in `types/peers.d.ts`. They are looser than the real types. Each consuming app type-checks the source against the real packages.
- **`Button` shape.** Colours, heights, padding, type and radius match the web from 0.3.3 (without larger text). From 0.3.5 there is no shadow unless `shadowType="shadow"`, and `loading` shows the 16 ring with the label, as on the web. Native keeps an always-underlined `link` (there is no hover). The web sizes are under the 44 pt touch target, so each size gets a hit slop that brings it to 48. Labelled sizes are minimum heights, so Dynamic Type grows them. `fullWidth` still defaults to `true`. `tinted` keeps the 0.2 pink tint for apps that used the old `outline`.
- **Larger text.** With `NativeUiProvider largerText`, `Button`, `Input`, `Textarea`, the `Select` trigger and dialog text keep their 0.3.2 sizes (for example a 64 px default button). These are a native accessibility step-up with no web equivalent. `Checkbox` grows to 24 px.
- **Type scale outside controls.** From 0.3.7 `Label` (14 / 500), `CardTitle` and the `Card` title (16 / 600, line height 20 against the web `leading-none` 16) and `CardDescription` (14) have the web sizes, set as styles (`sizeStyle`). From 0.3.8 so do the `UpgradeToProCard` title (14 / 600) and pill label (12 / 500). `LabeledSwitchRow`, `EmptyState`, list rows and settings rows keep their mobile sizes. The colours of all of these changed in 0.3.3. From 0.3.5 their weight is also a style (`typeStyle`), so it shows where an app maps every Instrument Sans class to one family, and the bold titles are semibold, as on the web.
- **Footers.** `DialogFooter` and `AlertDialogFooter` are a row at the end, which the web uses from `sm` up. From 0.3.7, in the compact sheet they stack (`flex-col-reverse`, last child on top) with every button full width and at least 44 high, as the web does on phones. The row footer has no `pt-2`; the web footer has it in both layouts. `SheetFooter` stacks full width, as the web sheet footer does on phones.
- **Colour overrides.** Text, field, button, checkbox and tab colours are styles. A `className` colour such as `text-pink-600` no longer changes them; pass `style={{ color }}`.
- **`AlertDialogAction`** does not close the dialog, as on the web. `ConfirmDialog` closes on either button.
- **Toasts over modals.** On iOS, `Toaster` draws in a `FullWindowOverlay`, so toasts show over dialogs. On Android an RN `Modal` covers them.
- **`Tabs` and Expo Router.** `Tabs` shares its name with Expo Router's `Tabs` layout. Import one under another name where a file needs both.
- **`Badge` text contrast.** Badges use the web colours, so they share the web contrast. Computed on 27 October 2026 (WCAG ratio, tint over the 0.3.3 page colour): in dark mode `default` and `secondary` 14.6, `outline` 7.7, `success` 8.0, `warning` 9.6, `destructive` 4.2 and `destructive-soft` 4.3 (under the 4.5 AA level for small text). In light mode `destructive` 2.8, `destructive-soft` 2.9, `success` 1.8 and `warning` 1.7 are low, as on the web. A fix belongs in `tokens.css` first.
- **Payments.** `PricingModal` does not choose a payment flow. Which purchase flow an iOS or Android paywall may use depends on App Store and Google Play rules and the app's markets. The app owner should confirm this before `onCheckout` is wired.
- **Portable helpers not yet copied:** `formatCompactRelativeTime`, `convexErrorMessage`, `userFacingErrorMessage`, `useHeldResult`, `useSingleFlight`, `ErrorBoundary`, `projectVelocity` and `rubberband`. Each has no DOM or web-only import.
- **Feasible next components** (no new dependency): `Collapsible`, `Accordion`, `SearchInput`, `ClearInput`, `InputGroup`, `ButtonGroup`, `LoadingState`, `CountPop`, `ImageLightbox` and `TabsBar`.

## Phones and accessibility

`@vvedantb/native-ui` is for phones. From 0.3.5 it follows the web look at phone width and adds what touch and assistive tech need. Source tests in `packages/native-ui/tests/mobile.test.ts` and `tests/controlStyles.test.ts` hold these:

- **Flat cards.** `Card`, `SettingsSection` and `CardSkeleton` use `cardStyle`: the web `rounded-lg bg-surface-card`, with no shadow and no blur. Only chrome that floats on the web has a shadow: dialogs, sheets and toasts, plus the native `FloatingTabBar` and `FloatingFAB`. `Button` is flat by default.
- **Compact tabs.** Tab triggers and `PillTabs` are the web `.t-tab` (30 high, `px-3 py-1`, `text-sm` medium) or soft trigger, as wide as their labels and at the start of the row. The parity gallery shows only the segmented One / Two / Three tabs, as the web gallery does.
- **Weights.** Weighted text sets `fontWeight` as a style (`typeStyle`): 600 on titles, labels and tab bar labels, 500 on button, badge and tab labels.
- **Touch targets.** Controls keep the web size on screen and reach 44 pt with `hitSlop` (`touchSlop`): `Checkbox` 16, `Switch` 36 × 20, tab triggers 30 high, the `Select` trigger 40 high. `Button` sizes reach 48. The dialog close button is 44 square, as on the web.
- **Roles and states.** `Button` (`button`, `disabled`, `busy`), `Checkbox` (`checkbox`, `checked`, `mixed`), `Switch` (`switch`, `checked`, `disabled`), `Tabs` and `PillTabs` (`tablist`, `tab`, `selected`), the `Select` trigger (`combobox`, `disabled`, `accessibilityLabel`), dialog and sheet closes and pressable list rows (`button`), and section and sheet titles (`header`).
- **Dynamic Type.** Font scaling is never turned off. Labelled controls have minimum heights, so a large text size grows them instead of clipping. Only the `FloatingTabBar` labels are capped (1.5×), to fit the fixed bar.
- **Reduce Motion.** `useReduceMotion` (internal) reads the setting synchronously at mount and follows changes. With it on, the dialog and sheet `Modal`, the sheet slide, toasts, the `Select` popover and `PricingModal` do not animate; `Progress` and `Skeleton` already held still.
- **Safe area and keyboard.** Dialogs stay inside every inset; sheets pad the bottom one. `Toaster`, `FloatingTabBar` and `FloatingFAB` keep clear of the notch and the home indicator. The dialog and sheet `KeyboardAvoidingView` pads on iOS and Android, so fields stay above the keyboard. Dialogs and sheets close on Android back and the VoiceOver escape gesture.

## Verification

Run on 27 October 2026 in this repository:

| Command | Result |
| --- | --- |
| `pnpm --filter @vvedantb/native-ui test` | 10 files, 174 tests passed (0.3.5). |
| `pnpm --filter @vvedantb/native-ui typecheck` | Passed (against `types/peers.d.ts`). |
| `pnpm --filter @vvedantb/native-ui build` | Passed. |
| `pnpm --filter @vvedantb/ui test` | 93 files, 1,798 tests passed; 50 node tests passed, including "native-ui keeps an identical copy of the native tokens". Needs `pnpm --filter @vvedantb/server build` first: without `packages/server/dist`, 19 test files cannot import `@vvedantb/server`. Run for 0.3.3; 0.3.5 changes no `@vvedantb/ui` file and not the native tokens copy, so it was not re-run. |
| `pnpm --filter @vvedantb/ui typecheck` | Passed (0.3.3; not re-run for 0.3.5). |
| `git diff pnpm-lock.yaml` | No change in 0.3.3 or 0.3.5 (`pnpm install --frozen-lockfile --offline` passed for 0.3.0). |

## Detailed table

Every root export of `@vvedantb/ui` 0.29.0, by source module. ᵀ marks a type-only export.


### Primitives (`src/ui`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/ui/ui-config.tsx` | `UiConfigProvider`, `useUiConfig`, `UiConfig`ᵀ, `UiConfigProviderProps`ᵀ | n/a | — | Class-override config for web parts. Native parts take `className` and props directly. |
| `src/ui/_menu-classes.ts` | `floatingSurfaceClass` | partial | `FloatingSurface` | A class string on the web; a component on native (blur on iOS and Android when `expo-blur` is installed, opaque without it). |
| `src/ui/_field-classes.ts` | `fieldFocusClass`, `fieldFocusWithinClass` | n/a | — | Keyboard focus-ring classes; touch fields have no focus ring. |
| `src/ui/overlay-a11y.ts` | `restoreModalScrollLock` | n/a | — | DOM scroll-lock repair for Radix overlays. |
| `src/ui/error-boundary.tsx` | `ErrorBoundary`, `ErrorBoundaryProps`ᵀ | missing | — | React-only, so portable as-is. Not copied in 0.3.0. |
| `src/ui/count-pop.tsx` | `CountPop`, `countLabel`, `UnreadDot` | missing | — | Uses `motion/react`. Feasible with Reanimated. |
| `src/ui/marquee-on-hover.tsx` | `MarqueeOnHover` | n/a | — | Hover-driven. |
| `src/ui/relative-date-time.tsx` | `RelativeDateTime`, `RelativeDateTimeProps`ᵀ | missing | — | Text plus a hover tooltip. `formatCompactRelativeTime` is portable; the tooltip is not. |
| `src/ui/image-lightbox.tsx` | `ImageLightbox`, `GalleryImage`ᵀ | missing | — | Feasible with RN `Modal` and `Image`. |
| `src/ui/media-preview.tsx` | `ImageGalleryPreview`, `ScreenshotPreview`, `VideoPreview` | missing (needs dep) | — | Video needs `expo-video`. Image previews are feasible. |
| `src/ui/radix-select.tsx` | `RadixSelect`, `RadixSelectContent`, `RadixSelectGroup`, `RadixSelectItem`, `RadixSelectLabel`, `RadixSelectScrollDownButton`, `RadixSelectScrollUpButton`, `RadixSelectSeparator`, `RadixSelectTrigger`, `RadixSelectValue` | partial | `Select` (`@rn-primitives/select`) | Native `Select` is an options-array component over `@rn-primitives/select`, not the Radix part names. |
| `src/ui/accordion.alt.tsx` | `AccordionAlt`, `AccordionItemAlt`, `AccordionTriggerAlt`, `AccordionContentAlt` | missing | — | Deprecated web wrappers. See `accordion`. |
| `src/ui/clear-input.alt.tsx` | `ClearInputAlt` | missing | — | Deprecated web wrapper. See `clear-input`. |
| `src/ui/input-group.alt.tsx` | `InputGroupAlt`, `InputGroupAddonAlt`, `InputGroupButtonAlt`, `InputGroupTextAlt`, `InputGroupInputAlt`, `InputGroupTextareaAlt` | missing | — | Deprecated web wrappers. See `input-group`. |
| `src/ui/scroll-area.alt.tsx` | `ScrollAreaAlt`, `ScrollBarAlt` | n/a | `ScrollView` | Custom scrollbars; native scroll views have platform scrollbars. |
| `sonner` (re-export) | `toast` | partial | `toast` + `Toaster` | Native `toast()` has the same call shape for `toast`, `.success`, `.error`, `.warning`, `.info`, `.loading` and `.dismiss`. No `toast.promise`, `toast.custom` or sonner options beyond `id`, `description`, `duration` and one `action`. |
| `src/ui/surface-classes.ts` | `overlaySurfaceClass`, `modalBackdropClass`, `staticSurfaceClass`, `flatElevatedSurfaceClass`, `flatElevatedSurfaceHoverClass`, `flatElevatedSurfaceFocusClass`, `chatInputContainerClass`, `flatPanelSubtleClass`, `flatPanelSubtleHoverClass`, `flatInteractiveClass`, `segmentActiveClass`, `segmentActiveStateClass`, `segmentOpenStateClass`, `segmentExpandedStateClass`, `defaultActiveClass`, `defaultSelectedStateClass`, `defaultActiveStateClass`, `menuItemHighlightClass`, `menuItemEmphasisHighlightClass`, `menuListSelectedClass` | n/a | `FloatingSurface` | Web class strings for surfaces, menus and segments. |
| `src/ui/avatar.tsx` | `Avatar`, `AvatarImage`, `AvatarFallback` | same | `Avatar`, `AvatarImage`, `AvatarFallback` | Same parts. Adds `size` and the `initials()` helper. |
| `src/ui/badge.tsx` | `BadgeConfig`ᵀ, `BadgeProps`ᵀ, `Badge` | same | `Badge` | Same seven variants and colours (from `palette`). `BadgeConfig` is n/a. |
| `src/ui/border-beam.tsx` | `BorderBeam`, `BorderBeamSize`ᵀ, `BorderBeamColorVariant`ᵀ, `BorderBeamProps`ᵀ | missing | — | CSS animation. Feasible with `expo-linear-gradient` and Reanimated; decorative, low priority. |
| `src/ui/breadcrumb.tsx` | `Breadcrumb`, `BreadcrumbLink`, `BreadcrumbPage` | n/a | — | Mobile uses stack navigation with a back button. |
| `src/ui/button.tsx` | `ButtonConfig`ᵀ, `ButtonProps`ᵀ, `Button` | same | `Button` | Adds the web variants `default`, `destructive`, `ghost`, `link` and sizes `sm`, `default`, `lg`, `icon`, plus `startContent` / `endContent`. `outline` matches the web; the 0.2 pink tint is `tinted`. No `asChild`; no `flat`, `success`, `warning`, `xs` or `icon-*`. `ButtonConfig` is n/a. |
| `src/ui/button-group.tsx` | `ButtonGroupConfig`ᵀ, `ButtonGroup`, `ButtonGroupSeparator`, `ButtonGroupText`, `buttonGroupVariants` | missing | — | Feasible with a row of `Button`s. |
| `src/ui/card.tsx` | `CardConfig`ᵀ, `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction` | same | `Card` + `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Native `Card` keeps `title` / `leftIcon` / `action` and adds `description` and `className`. `CardAction` is the `action` prop. Flat `rounded-lg bg-surface-card` from 0.3.5. |
| `src/ui/carousel.tsx` | `CarouselConfig`ᵀ, `CarouselApi`ᵀ, `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`, `CarouselDots`, `useCarousel` | n/a | — | Embla. Native pattern: a horizontal `FlatList` with `pagingEnabled`. |
| `src/ui/centered-spinner.tsx` | `CenteredSpinner` | same | `CenteredSpinner` | Same `label` prop. |
| `src/ui/checkbox.tsx` | `CheckboxConfig`ᵀ, `Checkbox`, `CheckboxProps`ᵀ | same | `Checkbox` | Built on `Pressable` and Tabler `IconCheck`, no `@rn-primitives/checkbox`. `checked` (incl. `"indeterminate"`), `onCheckedChange`, `disabled`, `icon`. Checked fill is the palette primary, as on the web (the theme accent before 0.3.3); 16 px box. |
| `src/ui/collapsible.tsx` | `CollapsibleConfig`ᵀ, `CollapsibleContentProps`ᵀ, `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | missing | — | Feasible with state and Reanimated. |
| `src/ui/command.tsx` | `CommandConfig`ᵀ, `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator` | n/a | — | cmdk keyboard command palette. |
| `src/ui/context-menu.tsx` | `ContextMenuConfig`ᵀ, `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuGroup`, `ContextMenuPortal`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`, `ContextMenuRadioGroup` | n/a | — | Right-click menus. A long-press menu would need `@rn-primitives/context-menu`. |
| `src/ui/crossfade-icon.tsx` | `CrossfadeIcon`, `CrossfadeIconSlot` | missing | — | Feasible with Reanimated. |
| `src/ui/dialog.tsx` | `DialogConfig`ᵀ, `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogRawContent`, `DialogHeader`, `DialogBody`, `DialogFooter`, `DialogTitle`, `DialogDescription` | same | `Dialog`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogBody`, `DialogTitle`, `DialogDescription`, `DialogFooter` | RN `Modal`, no new dependency. `DialogPortal`, `DialogOverlay` and `DialogRawContent` are n/a (the `Modal` is the portal and backdrop). `DialogConfig` is n/a. |
| `src/ui/alert-dialog.tsx` | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` | same | `AlertDialog*` | No backdrop dismiss, no close button. `AlertDialogAction` does not close (as on the web); `AlertDialogCancel` closes and defaults to `outline`, as on the web. Portal and overlay are n/a. |
| `src/ui/confirm-dialog-parts.tsx` | `useConfirmDialog`, `ConfirmDialogActionProps`ᵀ, `ConfirmDialogBodyProps`ᵀ, `ConfirmDialogCancelProps`ᵀ, `ConfirmDialogContentProps`ᵀ, `ConfirmDialogDescriptionProps`ᵀ, `ConfirmDialogFieldProps`ᵀ, `ConfirmDialogFooterProps`ᵀ, `ConfirmDialogHeaderProps`ᵀ, `ConfirmDialogRootProps`ᵀ, `ConfirmDialogSize`ᵀ, `ConfirmDialogTitleProps`ᵀ | missing | — | The composable `ConfirmDialog.*` parts, `useConfirmDialog`, sizes and confirm phrase are not ported. Compose `AlertDialog` parts instead. |
| `src/ui/confirm-dialog.tsx` | `ConfirmDialogProps`ᵀ, `ConfirmDialog` | partial | `ConfirmDialog` | Legacy props with `size="default"` (blocking, closes on either button). |
| `src/ui/dropdown-menu.tsx` | `DropdownMenuConfig`ᵀ, `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuRadioGroup` | missing (needs dep) | — | Needs `@rn-primitives/dropdown-menu`. Until then use `Select` or a `Sheet` of rows. |
| `src/ui/empty-state.tsx` | `EmptyStateVariant`ᵀ, `EmptyStateRootProps`ᵀ, `EmptyStateIconProps`ᵀ, `EmptyStateTitleProps`ᵀ, `EmptyStateDescriptionProps`ᵀ, `EmptyStateActionsProps`ᵀ, `EmptyState` | same | `EmptyState` | Native `EmptyState` keeps its props and gains `EmptyState.Root`, `.Icon`, `.Title`, `.Description`, `.Actions` with the `default` / `panel` variants. |
| `src/ui/hover-card.tsx` | `HoverCardConfig`ᵀ, `HoverCard`, `HoverCardTrigger`, `HoverCardContent` | n/a | — | Hover. |
| `src/ui/input.tsx` | `InputConfig`ᵀ, `Input` | same | `Input` | Web field look, radius (10) and size (40 high) from 0.3.3. `InputConfig` is n/a. |
| `src/ui/label.tsx` | `LabelConfig`ᵀ, `Label` | same | `Label` | Text with `disabled`. Link to a field with `nativeID` / `accessibilityLabelledBy`. |
| `src/ui/labeled-slider-row.tsx` | `LabeledSliderRow` | missing (needs dep) | — | Needs a slider (`@react-native-community/slider`). |
| `src/ui/labeled-switch-row.tsx` | `LabeledSwitchRow` | same | `LabeledSwitchRow` | Same props except `id`; adds `testID`. The row is one accessible switch. |
| `src/ui/list-row.tsx` | `LIST_ROW_CONTROL_CLASS`, `ListRowProps`ᵀ, `ListRowConfig`ᵀ, `ListRow` | partial | `ListRow` | Different API: native rows take `title`, `meta`, `icon`, `right`, `onPress`. No accent stripe, `selected` or link overlay (no nested-button problem on native). |
| `src/ui/loading-state.tsx` | `LoadingState`, `LoadingStateVariant`ᵀ, `LoadingStateSize`ᵀ, `LoadingStateColors`ᵀ, `LoadingStateConfig`ᵀ, `LoadingStateProps`ᵀ | missing | — | Pixel-grid loader on Web Animations. Feasible with Reanimated. |
| `src/ui/pagination.tsx` | `Pagination`, `PaginationProps`ᵀ | n/a | — | Mobile lists load more on scroll. |
| `src/ui/popover.tsx` | `PopoverConfig`ᵀ, `Popover`, `PopoverTrigger`, `PopoverAnchor`, `PopoverContent` | missing (needs dep) | — | Needs `@rn-primitives/popover`. |
| `src/ui/progress.tsx` | `ProgressConfig`ᵀ, `Progress` | same | `Progress` | Same `value` / `max`. Animated fill; adds `indicatorColor`. |
| `src/ui/refresh-spin-icon.tsx` | `RefreshSpinIcon` | n/a | — | Native pull-to-refresh uses `RefreshControl`. |
| `src/ui/search-input.tsx` | `SearchInputConfig`ᵀ, `SearchInputProps`ᵀ, `SearchInput` | missing | — | Feasible: `Input` with a search icon and clear button. |
| `src/ui/select.tsx` | `SelectConfig`ᵀ, `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` | partial | `Select` | Options-array API over `@rn-primitives/select` (internal parts not exported). `SelectConfig` is n/a. |
| `src/ui/select-field.tsx` | `SelectFieldProps`ᵀ, `SelectField` | partial | `SettingsField` + `Select` | No single component. |
| `src/ui/separator.tsx` | `SeparatorConfig`ᵀ, `Separator` | same | `Separator` | Hairline in `tokens.color.separator`; `orientation`, `decorative`. |
| `src/ui/skeleton.tsx` | `Skeleton` | same | `Skeleton` | Same `className` API; now takes `View` props and holds still with Reduce Motion. Native colour stays `neutral-200` / `neutral-700`. |
| `src/ui/slide-over-panel.tsx` | `SlideOverPanel`, `SlideOverPanelProps`ᵀ | partial | `Sheet` | Bottom sheet only. |
| `src/ui/slider.tsx` | `SliderConfig`ᵀ, `Slider`, `SliderProps`ᵀ | missing (needs dep) | — | Needs `@react-native-community/slider`. |
| `src/ui/sonner.tsx` | `SonnerToaster`, `createToasterClassNames`, `hoverChipCloseButtonClassName`, `mergeToastClassNames`, `mergeToastOptions`, `mergeToasterStyle`, `sonnerVarsStyle`, `SonnerToasterConfig`ᵀ, `SonnerToasterOptions`ᵀ | partial | `Toaster` | Top toasts under the safe area, no sonner. The class-merging helpers are n/a. |
| `src/ui/sonner-icons.tsx` | `filledToastIcons` | n/a | — | Sonner icon set; `Toaster` uses Tabler icons. |
| `src/ui/spinner.tsx` | `SpinnerMarkShape`ᵀ, `SpinnerMark`ᵀ, `SpinnerCircleColors`ᵀ, `SpinnerConfig`ᵀ, `SpinnerProps`ᵀ, `Spinner` | partial | `Spinner` | Platform `ActivityIndicator` with `size` and `tone`. The `mark`, `circle` and `ring` SVG variants are not ported. |
| `src/ui/status-dot.tsx` | `StatusDot`, `StatusTone`ᵀ, `StatusDotConfig`ᵀ, `StatusDotProps`ᵀ | same | `StatusDot` | Same tones and sizes. |
| `src/ui/surface.tsx` | `SurfaceProps`ᵀ, `Surface`, `surfaceVariants` | partial | `FloatingSurface` | Different API. |
| `src/ui/switch.tsx` | `SwitchConfig`ᵀ, `Switch` | same | `Switch` | `@rn-primitives/switch`, colours from `palette`. The web size (36 × 20) from 0.3.5, with a hit slop to 44 (56 × 32 with larger text, and before 0.3.5). `SwitchConfig` is n/a. |
| `src/ui/table.tsx` | `TableConfig`ᵀ, `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` | missing | — | Feasible; low priority on phones. |
| `src/ui/tabs.tsx` | `TabsConfig`ᵀ, `Tabs`, `TabsBar`, `TabsList`, `TabsTrigger`, `TabsContent` | same | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `pills`, `segmented` and `soft` variants and `size="sm"`, in the web tab colours from 0.3.4 and the web sizes from 0.3.5 (`text-sm` medium; soft regular). `TabsBar` (a toolbar strip) is missing. `TabsConfig` is n/a. |
| `@radix-ui/react-tabs` (re-export) | `TabsPrimitive` | n/a | — | Raw Radix primitive. |
| `src/ui/textarea.tsx` | `TextareaConfig`ᵀ, `Textarea` | same | `Textarea` | Multiline `Input`, same field look. |
| `src/ui/toolbar-search-input.tsx` | `ToolbarSearchInputProps`ᵀ, `ToolbarSearchInput` | missing | — | Feasible; see `search-input`. |
| `src/ui/time-picker.tsx` | `TimePicker` | partial | `DateTimeField mode="time"` | System picker. |
| `src/ui/calendar.tsx` | `CalendarConfig`ᵀ, `Calendar`, `CalendarDayButton` | partial | `DateTimeField` | System date picker; no inline calendar grid. |
| `src/ui/date-picker.tsx` | `DatePicker`, `DateTimePicker`, `MonthPicker`, `parseDateValue`, `formatDateValue`, `DatePickerProps`ᵀ, `DateTimePickerProps`ᵀ, `MonthPickerProps`ᵀ | partial | `DateTimeField` | System pickers. `MonthPicker`, `parseDateValue` and `formatDateValue` are missing. |
| `src/ui/tooltip.tsx` | `TooltipConfig`ᵀ, `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | n/a | — | Hover. Use `accessibilityHint` or visible text on touch. |
| `src/ui/kbd.tsx` | `KbdProps`ᵀ, `Kbd` | n/a | — | Keyboard shortcut hints. |
| `src/ui/sheet.tsx` | `Sheet`, `SheetPortal`, `SheetOverlay`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHandle`, `SheetTitle`, `SheetDescription`, `SheetHeader`, `SheetFooter` | same | `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHandle`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter` | RN `Modal`, bottom edge only (no `direction`). Adds `SheetBody`. `SheetPortal` and `SheetOverlay` are n/a. `BottomSheetContainer` remains for drag-to-dismiss. |
| `@radix-ui/react-visually-hidden` (re-export) | `VisuallyHidden` | n/a | — | Use `accessibilityLabel`, or a 1 × 1 transparent accessible view (as `PricingModal` does). |
| `src/ui/clearInputDissolve.ts` | `readCssNumber`, `readCssEase`, `runClearInputDissolve`, `ClearDissolveElements`ᵀ | n/a | — | DOM text-dissolve animation for `ClearInput`. |
| `src/ui/accordion.tsx` | `AccordionConfig`ᵀ, `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` | missing | — | Feasible with Reanimated, or `@rn-primitives/accordion`. |
| `src/ui/clear-input.tsx` | `ClearInputConfig`ᵀ, `ClearInputProps`ᵀ, `ClearInput` | missing | — | Feasible: `Input` plus a clear button. |
| `src/ui/input-group.tsx` | `InputGroupConfig`ᵀ, `InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupText`, `InputGroupInput`, `InputGroupTextarea` | missing | — | Feasible: row with addons around `Input`. |
| `src/ui/scroll-area.tsx` | `ScrollArea`, `ScrollBar` | n/a | `ScrollView` | Custom scrollbars. |
| `@dnd-kit/core` (re-export) | `SortableListDragEndEvent`ᵀ | n/a | — | dnd-kit type. |

### Brand (`src/brand`, also `@vvedantb/ui/brand`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/brand/vProAppBenefits.ts` | `V_PRO_APP_BENEFITS`, `PricingPlanAppBenefit`ᵀ | same | `V_PRO_APP_BENEFITS` | Byte-identical copy, checked by a native-ui test. |
| `src/brand/AppWordmark.tsx` | `AppWordmark`, `AppWordmarkProps`ᵀ, `ProductAppName`ᵀ | same | `AppWordmark` | Same `app`, `size`, `icon`; Instrument Sans 500 (`font-instrument-sans-medium`), -0.02em, icon 1.4×, gap 0.2em. `href` becomes `onPress`; adds `color`. |
| `src/brand/AppMark.tsx` | `AppMark`, `AppMarkProps`ᵀ | same | `AppMark` | Same `app`, `variant` (`mark`, `tile`, `tile-light`), `size`, `title`. Size is a number of points. |
| `src/brand/svg.ts` | `APP_MARKS`, `APP_MARK_CROP_VIEWBOX`, `APP_MARK_VIEWBOX`, `APP_MARK_VIEWBOX_START`, `PROJECTV_MARK_VIEWBOX`, `APP_MARK_SVG`, `APP_NAMES`, `APP_TILE_LIGHT_SVG`, `APP_TILE_SVG`, `appAdaptiveSvg`, `appExtension128Svg`, `appMarkSvg`, `appTileSvg`, `markAspect`, `markBBox`, `markLinecap`, `markStrokeWidth`, `pathBBox`, `AppMarkVariant`ᵀ, `AppName`ᵀ, `MarkShape`ᵀ | same | same exports | Byte-identical copy, checked by a native-ui test. The raw SVG strings are for web and store assets but cost nothing to keep. |
| `src/brand/familyApps.ts` | `FAMILY_APPS`, `familyApp`, `FamilyApp`ᵀ | same | `FAMILY_APPS`, `familyApp` | Byte-identical copy. |
| `src/brand/AppIcons.tsx` | `AppIconProps`ᵀ, `AppIconComponent`ᵀ, `APP_ICONS`, `IconVibot`, `IconVhub`, `IconVmem`, `IconVerve`, `IconVelth`, `IconProjectV` | same | `APP_ICONS`, `Icon*` | Rendered with `react-native-svg` on the same paths and viewBoxes. `size` is a number; default colour is the scheme foreground (no `currentColor`). |

### Marketing (`src/marketing`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/marketing/landing.tsx` | `LandingFeatureCard`, `LandingFooter`, `LandingLattice`, `LandingNavMenu`, `LandingPageLayout`, `LandingSection`, `LandingSectionHeading`, `landingItemVariants`, `LandingFeature`ᵀ, `LandingFooterProps`ᵀ, `LandingLatticeProps`ᵀ, `LandingLink`ᵀ, `LandingNavMenuProps`ᵀ, `LandingPageLayoutProps`ᵀ, `LandingSectionHeadingProps`ᵀ, `LandingSectionProps`ᵀ | n/a | — | Landing web pages. |
| `src/marketing/createLandingKit.tsx` | `createLandingKit`, `LandingCtaProps`ᵀ, `LandingHeroProps`ᵀ, `LandingKit`ᵀ, `LandingKitOptions`ᵀ, `LandingMotion`ᵀ, `LandingNavProps`ᵀ, `LandingRevealItemProps`ᵀ, `LandingRevealProps`ᵀ | n/a | — | Landing web pages (takes the app's `motion`). |
| `src/marketing/marketing-classes.ts` | `landingFooterButtonClass`, `landingFooterLinkClass`, `landingPanelClass`, `landingShellClass`, `PricingModalTone`ᵀ, `SiteFooterVariant`ᵀ | n/a | — | Landing and footer class strings. `PricingModalTone` picks web text classes; native uses token colours. |
| `src/marketing/SiteFooter.tsx` | `SiteFooter`, `SiteFooterLink`ᵀ, `SiteFooterProps`ᵀ, `SiteFooterSocial`ᵀ | n/a | — | Landing site footer. |
| `src/marketing/PricingModal.tsx` | `PricingModal`, `PricingModalLegacyProps`ᵀ, `PricingModalMultiProps`ᵀ, `PricingModalPeriod`ᵀ, `PricingModalProps`ᵀ, `PricingPlan`ᵀ, `PricingPlanBenefit`ᵀ | partial | `PricingModal` | Multi-plan layout ported as a page sheet with the same plan types, copy and `V_PRO_APP_BENEFITS` default. Adds `onCheckout` and `onAppPress`. The single-plan legacy layout (logo URLs, Michroma wordmark) and `tone` are not ported. |

### Shell (`shell/src`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `shell/src/SidebarHeader.tsx` | `SidebarHeader`, `SidebarHeaderProps`ᵀ | n/a | — | Web sidebar chrome. |
| `shell/src/SidebarUpgradeCard.tsx` | `SidebarUpgradeCard`, `SidebarUpgradeCardProps`ᵀ | same | `UpgradeToProCard` | Same copy, `onUpgrade` and `collapsed`. Adds `title` and `ctaLabel`. Renamed: native has no sidebar. |
| `shell/src/PillTabs.tsx` | `PillTabs`, `PillTabItem`ᵀ, `PillTabsProps`ᵀ | partial | `PillTabs` | Native `PillTabs` predates this; props are `options` / `value` / `onChange` (web: `items` / `value` / `onValueChange` with icons). `Tabs` with `TabsList variant="pills"` is the closer match. |
| `shell/src/SessionsHoverCard.tsx` | `SessionsHoverCard`, `SessionsHoverCardContext`ᵀ, `SessionsHoverCardProps`ᵀ, `SessionsHoverCardSurface`ᵀ | n/a | — | Hover card. |
| `shell/src/AppShell.tsx` | `AppShell`, `AppShellContentProps`ᵀ, `AppShellMainProps`ᵀ, `AppShellProps`ᵀ, `AppShellRootProps`ᵀ, `AppShellSkipLinkProps`ᵀ | n/a | — | Web app shell layout. Native uses Expo Router layouts and `FloatingTabBar`. |
| `shell/src/AppSidebar.tsx` | `AppSidebar`, `AppSidebarProps`ᵀ | n/a | — | Web sidebar. |
| `shell/src/SidebarRail.tsx` | `SidebarRail`, `RailTile`, `RailDivider`, `RailCollapseTile`, `SidebarRailProps`ᵀ, `RailTileProps`ᵀ, `RailDividerProps`ᵀ, `RailCollapseTileProps`ᵀ, `SidebarRailBodyProps`ᵀ, `SidebarRailFooterProps`ᵀ, `SidebarRailHeaderProps`ᵀ, `SidebarRailItemProps`ᵀ, `SidebarRailRootProps`ᵀ, `SidebarRailSeparatorProps`ᵀ | n/a | — | Web sidebar rail. |
| `shell/src/SidebarResize.tsx` | `SidebarResizeHandle`, `useAppShellResize`, `AppShellResize`ᵀ, `SidebarResizeHandleProps`ᵀ, `SidebarResizeOptions`ᵀ | n/a | — | Pointer resize of the web sidebar. |
| `shell/src/SidebarIconTooltip.tsx` | `SidebarIconTooltip`, `SidebarIconTooltipProps`ᵀ | n/a | — | Hover tooltip. |
| `shell/src/SidebarPanel.tsx` | `SidebarPanel`, `SidebarPanelProps`ᵀ, `SidebarPanelActionsProps`ᵀ, `SidebarPanelCloseProps`ᵀ, `SidebarPanelHeaderProps`ᵀ, `SidebarPanelRootProps`ᵀ, `SidebarPanelTitleProps`ᵀ, `SidebarNavItemPartProps`ᵀ, `SidebarNavItemProps`ᵀ | n/a | — | Web sidebar panel. |
| `shell/src/SidebarAccountMenu.tsx` | `SidebarAccountMenu`, `SidebarAccountMenuPlaceholder`, `SidebarAccountMenuProps`ᵀ, `SidebarAccountMenuPlaceholderProps`ᵀ, `SidebarAccountAvatarProps`ᵀ, `SidebarAccountBadgeProps`ᵀ, `SidebarAccountContentProps`ᵀ, `SidebarAccountLabelProps`ᵀ, `SidebarAccountMenuRootProps`ᵀ, `SidebarAccountSeparatorProps`ᵀ, `SidebarAccountTriggerProps`ᵀ | n/a | — | Web account dropdown (Radix menu). |
| `shell/src/SignOutDialog.tsx` | `SignOutDialog`, `SignOutDialogProps`ᵀ | partial | `ConfirmDialog` | No dedicated component; `ConfirmDialog variant="destructive"` covers it. |
| `shell/src/app-shell-classes.ts` | `railBadgeClass`, `railTileClass`, `railTileStateClass`, `sidebarNavIconClass`, `sidebarNavItemActionsClass`, `sidebarNavItemClass`, `sidebarNavItemIndentStyle`, `sidebarNavItemLabelClass`, `sidebarNavItemLeadingClass`, `sidebarNavItemSubtitleClass`, `sidebarNavItemTrailingClass`, `sidebarNavLinkTextClass`, `sidebarNavRowClass`, `sidebarSectionLabelClass`, `SidebarNavItemClassOptions`ᵀ | n/a | — | Web sidebar class strings. |
| `shell/src/SidebarChrome.tsx` | `SidebarAsideProps`ᵀ, `SidebarBackdropProps`ᵀ, `SidebarMobileActionsProps`ᵀ, `SidebarMobileHeaderProps`ᵀ, `SidebarMobileMenuButtonProps`ᵀ, `SidebarMobileTitleProps`ᵀ, `SidebarResizeHandlePartProps`ᵀ, `SidebarRootProps`ᵀ | n/a | — | Web sidebar part prop types. |
| `shell/src/Sidebar.tsx` | `Sidebar` | n/a | — | Web composable sidebar. |

### App helpers (`app/src`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `app/src/confirm/useAltHeld.ts` | `bindToWindow`, `createAltHeldStore`, `getAltHeld`, `useAltHeld`, `AltHeldBinding`ᵀ, `AltHeldSignals`ᵀ, `AltHeldStore`ᵀ, `AltKeyEvent`ᵀ | n/a | — | Alt key state. |
| `app/src/confirm/confirmSkip.ts` | `requestConfirm`, `shouldSkipConfirm` | n/a | — | Alt-click to skip a confirm. |
| `app/src/confirm/useRequestConfirm.ts` | `useRequestConfirm` | n/a | — | Alt-click to skip a confirm. |
| `app/src/confirm/ConfirmSkipHint.tsx` | `ConfirmSkipHint`, `skipConfirmTitle` | n/a | — | Keyboard hint. |
| `app/src/update/deployFingerprint.ts` | `fetchDeployFingerprint`, `fingerprintFromHtml` | n/a | — | Fetches the deployed `index.html`. Expo apps use `expo-updates`. |
| `app/src/update/updateWatcher.ts` | `startUpdateAvailableWatcher`, `UpdateAvailableWatcherOptions`ᵀ, `UpdateToastOptions`ᵀ | n/a | — | Web deploy watcher. |
| `app/src/settings/SettingsSection.tsx` | `SettingsSection`, `SettingsSectionConfig`ᵀ | same | `SettingsSection` | Native already had it (`title`, `description`, `action`, `footer`, `bodyVariant`). `SettingsSectionConfig` is n/a. |
| `app/src/settings/SettingsField.tsx` | `SettingsField` | same | `SettingsField` | Native already had it. |
| `app/src/settings/SettingsStack.tsx` | `SettingsStack` | same | `SettingsStack` | Native already had it. |
| `app/src/settings/SettingsToggleRow.tsx` | `SettingsToggleRow` | same | `SettingsToggleRow` | Native already had it. |
| `app/src/settings/SettingsEmptyState.tsx` | `SettingsEmptyState`, `SettingsEmptyStateConfig`ᵀ | partial | `EmptyState` | No dedicated settings variant. |
| `app/src/settings/SettingsPage.tsx` | `DefaultSettingsLayout`, `SettingsPage`, `SettingsLayoutProps`ᵀ, `SettingsPageProps`ᵀ | partial | `ScreenContainer` + `SettingsStack` | Web page layout with a header and tabs; native screens get their header from the navigator. |
| `app/src/auth/useStableAuth.ts` | `createUseStableAuth`, `resetStableAuthSession`, `useStableAuth`, `ClerkAuthSlice`ᵀ, `StableAuthOptions`ᵀ | n/a | — | `@clerk/clerk-react` (web Clerk). Expo apps use `@clerk/clerk-expo`. |
| `app/src/theme/createThemeProvider.tsx` | `applyThemeClass`, `createThemeProvider`, `getSystemTheme`, `ThemeAttribute`ᵀ, `ThemeProviderKit`ᵀ, `ThemeProviderOptions`ᵀ, `ThemeProviderProps`ᵀ, `ThemeState`ᵀ | n/a | — | Sets a class on `<html>`. Native uses NativeWind `useColorScheme`. |
| `app/src/page-title/createPageTitleContext.tsx` | `createPageTitleContext`, `DocumentTitleOptions`ᵀ, `PageTitleContextKit`ᵀ, `PageTitleContextOptions`ᵀ, `PageTitleValue`ᵀ | n/a | — | `document.title`. |
| `app/src/page-motion/PageMotionProvider.tsx` | `PageMotionProvider`, `useDisablePageMotion`, `PageMotionConfigProps`ᵀ, `PageMotionProviderProps`ᵀ | n/a | — | Web page enter animations. |
| `app/src/time/compactRelativeTime.ts` | `formatCompactRelativeTime`, `CompactRelativeTimeOptions`ᵀ | missing | — | Pure function, portable as-is. |
| `app/src/convex/ConvexClerkProvider.tsx` | `ConvexClerkProvider`, `ConvexClerkProviderProps`ᵀ, `ConvexClerkUseAuth`ᵀ | n/a | — | Web Clerk + Convex provider. |
| `app/src/convex/env.ts` | `parseClientEnv`, `VITE_ENV_NAMES`, `ClientEnv`ᵀ, `ClientEnvOptions`ᵀ, `ClientEnvSource`ᵀ, `ClientEnvWithoutViteEnv`ᵀ, `ViteEnvMode`ᵀ, `ViteEnvName`ᵀ | n/a | — | Parses `VITE_*` env. Expo uses `EXPO_PUBLIC_*`. |
| `app/src/convex/useEnsureUser.ts` | `useEnsureUser`, `EnsureUserMutation`ᵀ | n/a | — | Depends on web Clerk auth. |
| `app/src/convex/errorMessage.ts` | `convexErrorMessage`, `userFacingErrorMessage` | missing | — | Pure functions, portable as-is. |
| `app/src/convex/useHeldResult.ts` | `useHeldResult` | missing | — | React-only hook, portable as-is. |

### Tokens

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `tokens/src/native.ts` | `tokens`, `Tokens`ᵀ | same | `tokens` | Copy, checked by tests in both packages. See Tokens. |

### Utilities, hooks and motion

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/utils/cn.ts` | `cn` | same | `cn` | Same clsx + tailwind-merge helper. |
| `src/motion/list-enter.tsx` | `ListEnter`, `useFirstPaintGate`, `ListEnterProps`ᵀ | n/a | — | `motion/react` and CSS enter animations. Native uses Reanimated `entering`. |
| `src/utils/gesture.ts` | `DRAG_ACTIVATION_DISTANCE_PX`, `projectVelocity`, `rubberband` | missing | — | Pure maths, portable as-is. Not needed by any native component yet. |
| `src/utils/runtimeVisibility.ts` | `bindRuntimeAnimation`, `ensureRuntimeVisibility`, `observeAnimVisibility`, `useAnimOffscreenRef` | n/a | — | IntersectionObserver and page visibility for Web Animations. |
| `src/utils/sharedClock.ts` | `msUntilNextBoundary`, `quantizedSnapshot`, `subscribeQuantized` | n/a | — | Pauses on `document.visibilityState`. Native would use `AppState`. |
| `src/utils/cat-color.ts` | `CAT_SLOT_COUNT`, `catColorForId`, `catColorForSlot`, `catSlotForId`, `CatColorClasses`ᵀ, `CatSlot`ᵀ | missing | — | Class strings for the app-defined `--cat-*` ramp. Portable if the app defines `cat-*` NativeWind colours. |
| `src/utils/surface-radius.ts` | `CONTROL_RADIUS_CLASS`, `SURFACE_RADIUS_CLASS` | n/a | `tokens.radius` | Web radius utility classes. Native uses `tokens.radius` (card 24, field 20, pill 999). |
| `src/utils/useDragSensors.ts` | `useDragSensors` | n/a | — | dnd-kit pointer sensors. |
| `src/motion/presets.ts` | `staggerDelay`, `motionEase`, `motionDuration`, `motionTiming`, `motionDistance`, `defaultTransition`, `fadeUp`, `springTransition`, `springFastTransition`, `fadeUpSpring`, `tokenTransition` | n/a | — | `motion/react` transitions. Native uses Reanimated. |
| `src/motion/panel-transition.tsx` | `PanelTransition`, `PanelTransitionProps`ᵀ | n/a | — | `motion/react` panel transition. |
| `src/hooks/use-media-query.ts` | `useMediaQuery` | n/a | `useWindowDimensions` | `window.matchMedia`. |
| `src/hooks/use-document-visible.ts` | `useDocumentVisible` | n/a | — | `document.visibilityState`. Native would use `AppState`. |
| `src/hooks/use-idle-callback.ts` | `createIdleCallback`, `useIdleCallback` | n/a | — | `requestIdleCallback`. |
| `src/hooks/use-single-flight.ts` | `useSingleFlight` | missing | — | React-only, portable as-is. |
| `src/hooks/use-persisted-scroll-parent.ts` | `usePersistedScrollParent` | n/a | — | `sessionStorage` and DOM scroll parents. |

### Audio (`src/audio`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/audio/playChime.ts` | `playChime` | missing (needs dep) | — | Web Audio. Native needs `expo-audio` and sound files. |
| `src/audio/playTone.ts` | `playTone`, `Tone`ᵀ | missing (needs dep) | — | Web Audio. Native needs `expo-audio`. |
| `src/audio/audioFloor.ts` | `AUDIO_FLOOR_MIN_GAP_S`, `tryAcquireAudioFloor`, `withAudioFloor` | missing | — | Pure rate limiter, portable; only useful with native audio. |
| `src/audio/useReplyChime.ts` | `useReplyChime`, `nextReplyChimeState`, `ReplyChimeInput`ᵀ, `ReplyChimeWatch`ᵀ | missing (needs dep) | — | Depends on `playChime`. |

### Animated nav icons (`src/icons`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/icons/nav-icon-base.tsx` | `NavIconBase`, `CutoutIconProps`ᵀ, `IconAnimate`ᵀ, `IconProps`ᵀ, `NavIconBaseProps`ᵀ | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/memory-icon.tsx` | `MemoryIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/bolt-icon.tsx` | `BoltIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/files-icon.tsx` | `FilesIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/inbox-icon.tsx` | `InboxIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/building-icon.tsx` | `BuildingIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/settings-icon.tsx` | `SettingsIcon`, `SettingsIconProps`ᵀ | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/board-icon.tsx` | `BoardIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/checklist-icon.tsx` | `ChecklistIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/terminal-icon.tsx` | `TerminalIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/document-icon.tsx` | `DocumentIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/review-icon.tsx` | `ReviewIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/flask-icon.tsx` | `FlaskIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/inbox-arrow-icon.tsx` | `InboxArrowIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/draft-icon.tsx` | `DraftIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/automation-icon.tsx` | `AutomationIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/bar-chart-icon.tsx` | `BarChartIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/search-icon.tsx` | `SearchIcon` | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |
| `src/icons/sidebar-toggle-icon.tsx` | `SidebarToggleIcon`, `SidebarToggleIconProps`ᵀ | n/a | — | CSS keyframe icons for the web sidebar (`nav-icons.css`). Native uses Tabler and vector icons. |

### Markdown (`src/markdown`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/markdown/Markdown.tsx` | `Markdown`, `MarkdownProps`ᵀ | n/a | — | Streamdown, shiki and KaTeX render to the DOM. |
| `src/markdown/MarkdownLink.tsx` | `MarkdownLink` | n/a | — | DOM link for the markdown renderer. |

### Composer (`src/composer`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/composer/Composer.tsx` | `Composer`, `ComposerGhostText`, `ComposerIconButton`, `ComposerShell`, `ComposerGhostTextProps`ᵀ, `ComposerInputRenderContext`ᵀ, `ComposerLayout`ᵀ, `ComposerProps`ᵀ, `ComposerShellProps`ᵀ, `ComposerSlotContext`ᵀ, `ComposerStopMode`ᵀ, `ComposerTrailingContext`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. Imports: `@tabler/icons-react`. |
| `src/composer/useComposerPrediction.ts` | `useComposerPrediction`, `ComposerPrediction`ᵀ, `UseComposerPredictionOptions`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/prediction.ts` | `COMPOSER_PREDICTION_DEBOUNCE_MS`, `COMPOSER_PREDICTION_MIN_LENGTH`, `acceptComposerPrediction`, `initialComposerPredictionState`, `joinComposerPrediction`, `nextComposerPredictionState`, `shouldSkipComposerPrediction`, `visibleComposerPrediction`, `ComposerPredictionAction`ᵀ, `ComposerPredictionState`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/InputArea.tsx` | `InputArea`, `DEFAULT_ATTACH_ACCEPT`, `InputAreaProps`ᵀ, `InputAreaSlashContext`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. Imports: `react-dom`, `motion`, `@tabler/icons-react`. |
| `src/composer/input-area/InputActions.tsx` | `InputActions`, `InputActionsProps`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. Imports: `@tabler/icons-react`. |
| `src/composer/input-area/ConnectionStatusMenuItem.tsx` | `ConnectionStatusMenuItem`, `ConnectionStatusMenuItemProps`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/ComposerSlashMenu.tsx` | `ComposerSlashMenu` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. Imports: `motion`. |
| `src/composer/input-area/ComposerSlashRow.tsx` | `ComposerSlashRow` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. Imports: `@tabler/icons-react`. |
| `src/composer/input-area/InputBanners.tsx` | `InputBanners`, `defaultInputBannerStyles`, `InputBannersProps`ᵀ, `InputBannerStyles`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. Imports: `@tabler/icons-react`. |
| `src/composer/input-area/PromoBanner.tsx` | `PromoBanner`, `PromoBannerProps`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. Imports: `@tabler/icons-react`. |
| `src/composer/input-area/FadePresence.tsx` | `FadePresence`, `FadePresenceProps`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. Imports: `motion`. |
| `src/composer/input-area/motion.ts` | `motionFast` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/composerCompact.ts` | `isComposerCompact` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/useComposerCompact.ts` | `useComposerCompact` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/composerPrediction.ts` | `ghostSuggestion`, `scheduleCompletion`, `shouldSkipPrediction` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/useInputAreaPrediction.ts` | `useInputAreaPrediction` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/composerSlashItems.ts` | `buildComposerSlashItems`, `filterAndGroupSlashItems`, `ComposerSlashItem`ᵀ, `SlashGroup`ᵀ, `SlashIconKey`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/composerSlashTrigger.ts` | `findSlashTrigger`, `isValidSlashTrigger`, `matchesSlashQuery`, `stripSlashTrigger`, `SlashTrigger`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/composerSlashPosition.ts` | `computePanelPopupPlacement`, `viewportSize`, `ComposerSlashPlacement`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/composerSlashOptionId.ts` | `composerSlashOptionId` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/useComposerSlashMenu.ts` | `useComposerSlashMenu` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/inputPresets.ts` | `MAIN_CHAT_ACTION_FEATURES`, `CONTEXT_CHAT_ACTION_FEATURES`, `CONTEXT_CHAT_DISPLAY_OPTIONS` | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |
| `src/composer/input-area/types.ts` | `DEFAULT_BANNER_FEATURES`, `ActionFeatures`ᵀ, `BannerFeatures`ᵀ, `SkillChipPreview`ᵀ | n/a | — | Web chat composer: DOM text areas, caret-positioned slash menu, `motion`. |

### AI elements (`src/ai-elements`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/ai-elements/artifact.tsx` | `ArtifactConfig`ᵀ, `ArtifactProps`ᵀ, `Artifact`, `ArtifactHeaderProps`ᵀ, `ArtifactHeader`, `ArtifactTitleProps`ᵀ, `ArtifactTitle`, `ArtifactDescriptionProps`ᵀ, `ArtifactDescription`, `ArtifactActionsProps`ᵀ, `ArtifactActions`, `ArtifactActionProps`ᵀ, `ArtifactAction`, `ArtifactCloseProps`ᵀ, `ArtifactClose`, `ArtifactContentProps`ᵀ, `ArtifactContent` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/attachments.tsx` | `AttachmentData`ᵀ, `AttachmentMediaCategory`ᵀ, `AttachmentVariant`ᵀ, `AttachmentsConfig`ᵀ, `getMediaCategory`, `getAttachmentLabel`, `useAttachmentsContext`, `useAttachmentContext`, `AttachmentsProps`ᵀ, `Attachments`, `AttachmentProps`ᵀ, `Attachment`, `AttachmentPreviewProps`ᵀ, `AttachmentPreview`, `AttachmentInfoProps`ᵀ, `AttachmentInfo`, `AttachmentRemoveProps`ᵀ, `AttachmentRemove`, `AttachmentHoverCardProps`ᵀ, `AttachmentHoverCard`, `AttachmentHoverCardTriggerProps`ᵀ, `AttachmentHoverCardTrigger`, `AttachmentHoverCardContentProps`ᵀ, `AttachmentHoverCardContent`, `AttachmentEmptyProps`ᵀ, `AttachmentEmpty` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `ai`, `@tabler/icons-react`. |
| `src/ai-elements/chain-of-thought.tsx` | `ChainOfThought`, `ChainOfThoughtHeader`, `ChainOfThoughtStep`, `ChainOfThoughtSearchResults`, `ChainOfThoughtSearchResult`, `ChainOfThoughtContent`, `ChainOfThoughtImage`, `ChainOfThoughtProps`ᵀ, `ChainOfThoughtHeaderProps`ᵀ, `ChainOfThoughtStepProps`ᵀ, `ChainOfThoughtSearchResultsProps`ᵀ, `ChainOfThoughtSearchResultProps`ᵀ, `ChainOfThoughtContentProps`ᵀ, `ChainOfThoughtImageProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`, `@radix-ui/react-use-controllable-state`. |
| `src/ai-elements/code-block.tsx` | `CodeBlockConfig`ᵀ, `highlightCode`, `CodeBlockContainer`, `CodeBlockHeader`, `CodeBlockTitle`, `CodeBlockFilename`, `CodeBlockActions`, `CodeBlockContent`, `CodeBlock`, `CodeBlockCopyButtonProps`ᵀ, `CodeBlockCopyButton`, `CodeBlockLanguageSelectorProps`ᵀ, `CodeBlockLanguageSelector`, `CodeBlockLanguageSelectorTriggerProps`ᵀ, `CodeBlockLanguageSelectorTrigger`, `CodeBlockLanguageSelectorValueProps`ᵀ, `CodeBlockLanguageSelectorValue`, `CodeBlockLanguageSelectorContentProps`ᵀ, `CodeBlockLanguageSelectorContent`, `CodeBlockLanguageSelectorItemProps`ᵀ, `CodeBlockLanguageSelectorItem` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `shiki`, `@tabler/icons-react`. |
| `src/ai-elements/conversation.tsx` | `ConversationConfig`ᵀ, `ConversationProps`ᵀ, `Conversation`, `ConversationContentProps`ᵀ, `ConversationContent`, `ConversationEmptyStateProps`ᵀ, `ConversationEmptyState`, `ConversationScrollButtonProps`ᵀ, `ConversationScrollButton`, `ConversationMessage`ᵀ, `ConversationDownloadProps`ᵀ, `messagesToMarkdown`, `ConversationDownload` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `motion`, `@tabler/icons-react`, `use-stick-to-bottom`. |
| `src/ai-elements/file-chip.tsx` | `FileChip`, `FileChipProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/image.tsx` | `ImageProps`ᵀ, `Image` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `ai`. |
| `src/ai-elements/inline-citation.tsx` | `InlineCitationProps`ᵀ, `InlineCitation`, `InlineCitationTextProps`ᵀ, `InlineCitationText`, `InlineCitationCardProps`ᵀ, `InlineCitationCard`, `InlineCitationCardTriggerProps`ᵀ, `InlineCitationCardTrigger`, `InlineCitationCardBodyProps`ᵀ, `InlineCitationCardBody`, `InlineCitationCarouselProps`ᵀ, `InlineCitationCarousel`, `InlineCitationCarouselContentProps`ᵀ, `InlineCitationCarouselContent`, `InlineCitationCarouselItemProps`ᵀ, `InlineCitationCarouselItem`, `InlineCitationCarouselHeaderProps`ᵀ, `InlineCitationCarouselHeader`, `InlineCitationCarouselIndexProps`ᵀ, `InlineCitationCarouselIndex`, `InlineCitationCarouselPrevProps`ᵀ, `InlineCitationCarouselPrev`, `InlineCitationCarouselNextProps`ᵀ, `InlineCitationCarouselNext`, `InlineCitationSourceProps`ᵀ, `InlineCitationSource`, `InlineCitationQuoteProps`ᵀ, `InlineCitationQuote` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/jump-rail.tsx` | `JumpRail`, `JumpRailItem`ᵀ, `JumpRailProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `motion`. |
| `src/ai-elements/jump-rail-geometry.ts` | `resolveJumpRailHeightStyle`, `resolveJumpRailTopPercent`, `resolveJumpRailIndexFromPointer`, `resolveJumpRailTooltipTranslate`, `resolveJumpRailTickWidthPx`, `resolveJumpRailTickWidthClass`, `resolveJumpRailTickLevelStyle`, `JUMP_RAIL_ITEM_SPACING_PX`, `JUMP_RAIL_MAX_HEIGHT_CSS`, `JUMP_RAIL_MIN_VISIBLE_ITEMS`, `JUMP_RAIL_LEVEL_INDENT_PX`, `JUMP_RAIL_MIN_TICK_WIDTH_PX`, `JUMP_RAIL_MIN_HEIGHT_PX` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. |
| `src/ai-elements/chat-jump-rail.tsx` | `buildChatJumpRailTicks`, `buildChatJumpRailItems`, `ChatJumpRail`, `ChatJumpRailMessage`ᵀ, `ChatJumpRailTranscriptMessage`ᵀ, `ChatJumpRailProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `use-stick-to-bottom`. |
| `src/ai-elements/message.tsx` | `MessageConfig`ᵀ, `MessageProps`ᵀ, `Message`, `MessageContentProps`ᵀ, `MessageContent`, `MessageActionsBarProps`ᵀ, `MessageActionsBar`, `MessageActionProps`ᵀ, `MessageAction`, `MessageBranchProps`ᵀ, `MessageBranch`, `MessageBranchContentProps`ᵀ, `MessageBranchContent`, `MessageBranchSelectorProps`ᵀ, `MessageBranchSelector`, `MessageBranchPreviousProps`ᵀ, `MessageBranchPrevious`, `MessageBranchNextProps`ᵀ, `MessageBranchNext`, `MessageBranchPageProps`ᵀ, `MessageBranchPage`, `MessageToolbarProps`ᵀ, `MessageToolbar` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `ai`, `@tabler/icons-react`. |
| `src/ai-elements/model-selector.tsx` | `ModelSelectorProps`ᵀ, `ModelSelector`, `ModelSelectorTriggerProps`ᵀ, `ModelSelectorTrigger`, `ModelSelectorContentProps`ᵀ, `ModelSelectorContent`, `ModelSelectorDialogProps`ᵀ, `ModelSelectorDialog`, `ModelSelectorInputProps`ᵀ, `ModelSelectorInput`, `ModelSelectorListProps`ᵀ, `ModelSelectorList`, `ModelSelectorEmptyProps`ᵀ, `ModelSelectorEmpty`, `ModelSelectorGroupProps`ᵀ, `ModelSelectorGroup`, `ModelSelectorItemProps`ᵀ, `ModelSelectorItem`, `ModelSelectorShortcutProps`ᵀ, `ModelSelectorShortcut`, `ModelSelectorSeparatorProps`ᵀ, `ModelSelectorSeparator`, `ModelSelectorLogoProps`ᵀ, `ModelSelectorLogo`, `ModelSelectorLogoGroupProps`ᵀ, `ModelSelectorLogoGroup`, `ModelSelectorNameProps`ᵀ, `ModelSelectorName` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/prompt-input.tsx` | `PromptInputConfig`ᵀ, `AttachmentsContext`ᵀ, `TextInputContext`ᵀ, `PromptInputControllerProps`ᵀ, `usePromptInputController`, `useOptionalPromptInputController`, `useProviderAttachments`, `PromptInputProviderProps`ᵀ, `PromptInputProvider`, `usePromptInputAttachments`, `ReferencedSourcesContext`ᵀ, `LocalReferencedSourcesContext`, `usePromptInputReferencedSources`, `PromptInputActionAddAttachmentsProps`ᵀ, `PromptInputActionAddAttachments`, `PromptInputMessage`ᵀ, `PromptInputProps`ᵀ, `PromptInput`, `PromptInputBodyProps`ᵀ, `PromptInputBody`, `PromptInputTextareaProps`ᵀ, `PromptInputTextarea`, `PromptInputHeaderProps`ᵀ, `PromptInputHeader`, `PromptInputFooterProps`ᵀ, `PromptInputFooter`, `PromptInputToolsProps`ᵀ, `PromptInputTools`, `PromptInputButtonTooltip`ᵀ, `PromptInputButtonProps`ᵀ, `PromptInputButton`, `PromptInputActionMenuProps`ᵀ, `PromptInputActionMenu`, `PromptInputActionMenuTriggerProps`ᵀ, `PromptInputActionMenuTrigger`, `PromptInputActionMenuContentProps`ᵀ, `PromptInputActionMenuContent`, `PromptInputActionMenuItemProps`ᵀ, `PromptInputActionMenuItem`, `PromptInputSubmitProps`ᵀ, `PromptInputSubmit`, `PromptInputModelSelectProps`ᵀ, `PromptInputModelSelect`, `PromptInputModelSelectTriggerProps`ᵀ, `PromptInputModelSelectTrigger`, `PromptInputModelSelectContentProps`ᵀ, `PromptInputModelSelectContent`, `PromptInputModelSelectItemProps`ᵀ, `PromptInputModelSelectItem`, `PromptInputModelSelectValueProps`ᵀ, `PromptInputModelSelectValue`, `PromptInputHoverCardProps`ᵀ, `PromptInputHoverCard`, `PromptInputHoverCardTriggerProps`ᵀ, `PromptInputHoverCardTrigger`, `PromptInputHoverCardContentProps`ᵀ, `PromptInputHoverCardContent`, `PromptInputTabsListProps`ᵀ, `PromptInputTabsList`, `PromptInputTabProps`ᵀ, `PromptInputTab`, `PromptInputTabLabelProps`ᵀ, `PromptInputTabLabel`, `PromptInputTabBodyProps`ᵀ, `PromptInputTabBody`, `PromptInputTabItemProps`ᵀ, `PromptInputTabItem`, `PromptInputCommandProps`ᵀ, `PromptInputCommand`, `PromptInputCommandInputProps`ᵀ, `PromptInputCommandInput`, `PromptInputCommandListProps`ᵀ, `PromptInputCommandList`, `PromptInputCommandEmptyProps`ᵀ, `PromptInputCommandEmpty`, `PromptInputCommandGroupProps`ᵀ, `PromptInputCommandGroup`, `PromptInputCommandItemProps`ᵀ, `PromptInputCommandItem`, `PromptInputCommandSeparatorProps`ᵀ, `PromptInputCommandSeparator` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `ai`, `@tabler/icons-react`, `nanoid`. |
| `src/ai-elements/prompt-input-settings.tsx` | `PromptInputSettings`, `PromptInputSettingsOption`ᵀ, `PromptInputSettingsConfig`ᵀ, `PromptInputSettingsProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/prompt-input-speech.tsx` | `getSpeechRecognition`, `useSpeechRecognition`, `PromptInputSpeech`, `PromptInputSpeechProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/prompt-input-traits.tsx` | `isUltrathinkPrompt`, `applyUltrathinkPrefix`, `TraitsPanel`, `TraitsPanelConfig`ᵀ, `TraitsReasoningConfig`ᵀ, `TraitsMenuConfig`ᵀ, `TraitsMenuProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. |
| `src/ai-elements/queue.tsx` | `Queue`, `QueueHeader`, `QueueList`, `QueueItem`, `QueueConfig`ᵀ, `QueueProps`ᵀ, `QueueDivProps`ᵀ, `QueueHeaderProps`ᵀ, `QueueListProps`ᵀ, `QueueItemProps`ᵀ, `QueueItemLiProps`ᵀ, `QueueSectionProps`ᵀ, `QueueSection`, `QueueSectionTriggerProps`ᵀ, `QueueSectionTrigger`, `QueueSectionLabelProps`ᵀ, `QueueSectionLabel`, `QueueSectionContentProps`ᵀ, `QueueSectionContent`, `QueueItemIndicatorProps`ᵀ, `QueueItemIndicator`, `QueueItemContentProps`ᵀ, `QueueItemContent`, `QueueItemActionsProps`ᵀ, `QueueItemActions`, `QueueItemActionProps`ᵀ, `QueueItemAction` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `motion`, `@tabler/icons-react`. |
| `src/ai-elements/reasoning.tsx` | `Reasoning`, `ReasoningTrigger`, `ReasoningContent`, `useReasoning`, `ReasoningProps`ᵀ, `ReasoningTriggerProps`ᵀ, `ReasoningContentProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@radix-ui/react-use-controllable-state`, `@streamdown/cjk`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`, `@tabler/icons-react`, `streamdown`. |
| `src/ai-elements/shimmer.tsx` | `ShimmerConfig`ᵀ, `Shimmer`, `ShimmerProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `motion`. |
| `src/ai-elements/sources.tsx` | `SourcesProps`ᵀ, `Sources`, `SourcesTriggerProps`ᵀ, `SourcesTrigger`, `SourcesContentProps`ᵀ, `SourcesContent`, `SourceProps`ᵀ, `Source` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/speech-input.tsx` | `SpeechInputProps`ᵀ, `SpeechInput` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/suggestion.tsx` | `SuggestionsProps`ᵀ, `Suggestions`, `SuggestionProps`ᵀ, `Suggestion` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`, `motion`. |
| `src/ai-elements/activity-shared.tsx` | `activityStepHasRichDetail`, `ActivityThinkingIcon`, `getRandomActivityVerb`, `useActivitySpinnerVerb`, `useActivityElapsedSeconds`, `formatActivityElapsed`, `ActivityMarkdownProps`ᵀ, `ActivityTasksConfig`ᵀ, `ActivityTodoItem`ᵀ, `ActivityStepOutput`ᵀ, `ActivityStepEdit`ᵀ, `ActivityQuestionOption`ᵀ, `ActivityQuestion`ᵀ, `ActivityStep`ᵀ, `activityStepConfig` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/activity-question.tsx` | `ActivityQuestionCard`, `ActivityQuestionCardConfig`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/activity-tasks.tsx` | `ActivityLayout`ᵀ, `OpenSubagentContext`, `ActivityTasksProps`ᵀ, `ActivityTasks` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `react-dom`, `@tabler/icons-react`, `@streamdown/cjk`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`, `streamdown`, `motion`. |
| `src/ai-elements/trace.tsx` | `AgentTrace`, `AgentTraceLine`, `AgentTraceIcon`, `AgentTraceTitle`, `AgentTraceDescription`, `AgentTraceCollapsible`, `AgentTraceCollapsibleTrigger`, `AgentTraceCollapsibleContent`, `AgentTraceStatus`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/use-streaming-disclosure.ts` | `useStreamingDisclosure` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. |
| `src/ai-elements/plan.tsx` | `AgentPlanProps`ᵀ, `AgentPlan`, `AgentPlanHeaderProps`ᵀ, `AgentPlanHeader`, `AgentPlanTitleProps`ᵀ, `AgentPlanTitle`, `AgentPlanActionProps`ᵀ, `AgentPlanAction`, `AgentPlanContentProps`ᵀ, `AgentPlanContent`, `AgentPlanFooterProps`ᵀ, `AgentPlanFooter`, `AgentPlanTriggerProps`ᵀ, `AgentPlanTrigger` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/test-results.tsx` | `TestResultsProps`ᵀ, `TestResults`, `TestResultsHeaderProps`ᵀ, `TestResultsHeader`, `TestResultsSummaryProps`ᵀ, `TestResultsSummary`, `TestResultsDurationProps`ᵀ, `TestResultsDuration`, `TestResultsProgressProps`ᵀ, `TestResultsProgress`, `TestResultsContentProps`ᵀ, `TestResultsContent`, `TestSuiteProps`ᵀ, `TestSuite`, `TestSuiteNameProps`ᵀ, `TestSuiteName`, `TestSuiteStatsProps`ᵀ, `TestSuiteStats`, `TestSuiteContentProps`ᵀ, `TestSuiteContent`, `TestResultProps`ᵀ, `TestResult`, `TestResultStatusIndicatorProps`ᵀ, `TestResultStatusIndicator`, `TestResultNameProps`ᵀ, `TestResultName`, `TestResultDurationProps`ᵀ, `TestResultDuration`, `TestResultErrorProps`ᵀ, `TestResultError`, `TestResultErrorMessageProps`ᵀ, `TestResultErrorMessage`, `TestResultErrorStackProps`ᵀ, `TestResultErrorStack` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/web-preview.tsx` | `WebPreviewContextValue`ᵀ, `useWebPreview`, `WebPreviewProps`ᵀ, `WebPreview`, `WebPreviewNavigationProps`ᵀ, `WebPreviewNavigation`, `WebPreviewNavigationButtonProps`ᵀ, `WebPreviewNavigationButton`, `WebPreviewUrlProps`ᵀ, `WebPreviewUrl`, `WebPreviewBodyProps`ᵀ, `WebPreviewBody`, `WebPreviewConsoleProps`ᵀ, `WebPreviewConsole` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/context.tsx` | `ContextUsageProps`ᵀ, `ContextUsage`, `ContextUsageTriggerProps`ᵀ, `ContextUsageTrigger`, `ContextUsageContentProps`ᵀ, `ContextUsageContent`, `ContextUsageContentHeaderProps`ᵀ, `ContextUsageContentHeader`, `ContextUsageContentBodyProps`ᵀ, `ContextUsageContentBody`, `ContextUsageContentFooterProps`ᵀ, `ContextUsageContentFooter`, `ContextUsageInputProps`ᵀ, `ContextUsageInput`, `ContextUsageOutputProps`ᵀ, `ContextUsageOutput`, `ContextUsageCacheReadProps`ᵀ, `ContextUsageCacheRead`, `ContextUsageCacheWriteProps`ᵀ, `ContextUsageCacheWrite`, `ContextUsageCache` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. |
| `src/ai-elements/model-picker.tsx` | `ModelPicker`, `ModelPickerConfig`ᵀ, `modelPickerSurfaceClass`, `ModelPickerProps`ᵀ | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `@tabler/icons-react`. |
| `src/ai-elements/model-picker-types.ts` | `ModelAccount`ᵀ, `ModelOption`ᵀ, `findModelOption`, `formatModelDisplayLabel`, `getProviderLabel` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. |
| `src/ai-elements/model-picker-content.tsx` | `ModelPickerContent` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. Imports: `cmdk`, `@tabler/icons-react`. |
| `src/ai-elements/provider-icon.tsx` | `ProviderIcon` | n/a | — | Web chat and agent surfaces on Radix, Streamdown, shiki, the `ai` SDK and DOM APIs. A native chat UI would be its own design. |

### Artifact viewers (`src/artifacts`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/artifacts/types.ts` | `ArtifactSummary`ᵀ, `ArtifactDocument`ᵀ, `ArtifactVersionSummary`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `@vvedantb/server`. |
| `src/artifacts/artifact-type-icon.tsx` | `ArtifactTypeIcon`, `ARTIFACT_TYPE_LABELS`, `ArtifactTypeIconProps`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `@tabler/icons-react`, `@vvedantb/server`. |
| `src/artifacts/artifact-file.ts` | `downloadArtifactBody`, `copyArtifactBody`, `openArtifactInNewTab` | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `sonner`, `@vvedantb/server`. |
| `src/artifacts/artifact-frame.tsx` | `ArtifactFrame`, `ArtifactStateStore`ᵀ, `ArtifactFrameProps`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `zod`, `@vvedantb/server`. |
| `src/artifacts/artifact-render.tsx` | `ArtifactRender`, `ArtifactRenderProps`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `@streamdown/cjk`, `@streamdown/code`, `@streamdown/math`, `@streamdown/mermaid`, `streamdown`. |
| `src/artifacts/artifact-dialogs.tsx` | `ArtifactRenameDialog`, `ArtifactDeleteDialog`, `useArtifactEditDialogs`, `ArtifactRenameDialogProps`ᵀ, `ArtifactDeleteDialogProps`ᵀ, `ArtifactEditCallbacks`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `sonner`. |
| `src/artifacts/artifact-card.tsx` | `ArtifactCard`, `ArtifactLayout`ᵀ, `ArtifactCardActions`ᵀ, `ArtifactCardProps`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `@tabler/icons-react`, `sonner`. |
| `src/artifacts/artifact-list.tsx` | `ArtifactList`, `ArtifactListProps`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `@tabler/icons-react`. |
| `src/artifacts/artifact-list-toolbar.tsx` | `ArtifactListToolbar`, `ArtifactListToolbarProps`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `@tabler/icons-react`, `@vvedantb/server`. |
| `src/artifacts/artifact-versions-menu.tsx` | `ArtifactVersionsMenu`, `ArtifactVersionsMenuProps`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `@tabler/icons-react`, `sonner`. |
| `src/artifacts/artifact-viewer.tsx` | `ArtifactViewer`, `ArtifactViewerProps`ᵀ | n/a | — | Sandboxed HTML in an iframe with a postMessage state bridge. Imports: `@tabler/icons-react`, `@vvedantb/server`. |

### Kibo blocks (`src/kibo`)

| Module | Exports | Status | Native equivalent | Notes |
| --- | --- | --- | --- | --- |
| `src/kibo/gantt-provider.tsx` | `GanttProvider`, `GanttContext`, `useGanttContext`, `GanttProviderProps`ᵀ, `GanttStatus`ᵀ, `GanttFeature`ᵀ, `GanttMarkerProps`ᵀ, `GanttRange`ᵀ, `GanttTimelineData`ᵀ, `GanttContextProps`ᵀ, `GanttConfig`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. |
| `src/kibo/gantt-header.tsx` | `GanttHeader`, `GanttContentHeader`, `GanttHeaderProps`ᵀ, `GanttContentHeaderProps`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. |
| `src/kibo/gantt-timeline.tsx` | `GanttTimeline`, `GanttColumns`, `GanttColumn`, `GanttToday`, `GanttTimelineProps`ᵀ, `GanttColumnsProps`ᵀ, `GanttColumnProps`ᵀ, `GanttTodayProps`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. |
| `src/kibo/gantt-sidebar.tsx` | `GanttSidebar`, `GanttSidebarHeader`, `GanttSidebarItem`, `GanttSidebarGroup`, `GanttSidebarProps`ᵀ, `GanttSidebarItemProps`ᵀ, `GanttSidebarGroupProps`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. |
| `src/kibo/contribution-graph.tsx` | `ContributionGraph`, `ContributionGraphBlock`, `ContributionGraphCalendar`, `ContributionGraphFooter`, `ContributionGraphTotalCount`, `ContributionGraphLegend`, `ContributionGraphActivity`ᵀ, `ContributionGraphLabels`ᵀ, `ContributionGraphProps`ᵀ, `ContributionGraphBlockProps`ᵀ, `ContributionGraphCalendarProps`ᵀ, `ContributionGraphFooterProps`ᵀ, `ContributionGraphTotalCountProps`ᵀ, `ContributionGraphLegendProps`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. |
| `src/kibo/kanban.tsx` | `KanbanProvider`, `KanbanBoard`, `KanbanHeader`, `KanbanCards`, `KanbanCard`, `useKanbanContext`, `KanbanProviderProps`ᵀ, `KanbanBoardProps`ᵀ, `KanbanHeaderProps`ᵀ, `KanbanCardsProps`ᵀ, `KanbanCardProps`ᵀ, `KanbanItem`ᵀ, `KanbanColumnDef`ᵀ, `KanbanConfig`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. Imports: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `react-dom`, `${col?.name}`. |
| `src/kibo/list.tsx` | `SortableListProvider`, `SortableListGroup`, `SortableListHeader`, `SortableListItems`, `SortableListItem`, `SortableListProviderProps`ᵀ, `SortableListGroupProps`ᵀ, `SortableListHeaderProps`ᵀ, `SortableListItemsProps`ᵀ, `SortableListItemProps`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. Imports: `@dnd-kit/core`, `@dnd-kit/modifiers`. |
| `src/kibo/gantt-features.tsx` | `GanttFeatureList`, `GanttFeatureListGroup`, `GanttFeatureRow`, `GanttFeatureItem`, `GanttFeatureItemCard`, `GanttFeatureDragHelper`, `GanttFeatureListProps`ᵀ, `GanttFeatureListGroupProps`ᵀ, `GanttFeatureRowProps`ᵀ, `GanttFeatureItemProps`ᵀ, `GanttFeatureItemCardProps`ᵀ, `GanttFeatureDragHelperProps`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. Imports: `@dnd-kit/core`, `@dnd-kit/modifiers`. |
| `src/kibo/theme-switcher.tsx` | `ThemeSwitcher`, `ThemeSwitcherProps`ᵀ, `ThemeSwitcherConfig`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. Imports: `@radix-ui/react-use-controllable-state`, `@tabler/icons-react`, `motion`. |
| `src/kibo/video-player.tsx` | `VideoPlayer`, `VideoPlayerControlBar`, `VideoPlayerTimeRange`, `VideoPlayerTimeDisplay`, `VideoPlayerVolumeRange`, `VideoPlayerPlayButton`, `VideoPlayerSeekBackwardButton`, `VideoPlayerSeekForwardButton`, `VideoPlayerMuteButton`, `VideoPlayerPlaybackRateButton`, `VideoPlayerFullscreenButton`, `VideoPlayerContent`, `VideoPlayerProps`ᵀ, `VideoPlayerControlBarProps`ᵀ, `VideoPlayerTimeRangeProps`ᵀ, `VideoPlayerTimeDisplayProps`ᵀ, `VideoPlayerVolumeRangeProps`ᵀ, `VideoPlayerPlayButtonProps`ᵀ, `VideoPlayerSeekBackwardButtonProps`ᵀ, `VideoPlayerSeekForwardButtonProps`ᵀ, `VideoPlayerMuteButtonProps`ᵀ, `VideoPlayerPlaybackRateButtonProps`ᵀ, `VideoPlayerFullscreenButtonProps`ᵀ, `VideoPlayerContentProps`ᵀ, `VideoPlayerConfig`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. Imports: `media-chrome`. |
| `src/kibo/avatar-stack.tsx` | `AvatarStack`, `AvatarStackProps`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. |
| `src/kibo/cursor.tsx` | `LiveCursor`, `LiveCursorPointer`, `LiveCursorBody`, `LiveCursorName`, `LiveCursorProps`ᵀ, `LiveCursorPointerProps`ᵀ, `LiveCursorBodyProps`ᵀ, `LiveCursorNameProps`ᵀ | n/a | — | Web blocks on dnd-kit, DOM measurement and pointer events. |

# Changelog

## Unreleased

- Overlays: `UiConfig` entries `Dialog`, `SideSheet`, `Popover`, `HoverCard`, `Tooltip`, `DropdownMenu`, `ContextMenu`, `Select` and `Command` (part `classes`, `icons` and prop defaults; see the README section "Overlays: app config and opt-in props"). No output change without an entry.
- Overlays: new `SideSheet*` (Radix Dialog side panel, `side` left or right, `hideCloseButton`) and `PopoverAnchor`. New props: `DialogContent` `viewportAware`, `HoverCardContent` / `TooltipContent` / `ContextMenuSubContent` `portal`.
- Overlays: `DialogTrigger`, `PopoverTrigger`, `DropdownMenuTrigger` and `ContextMenuTrigger` are now thin wrappers (they read config); `HoverCard` and `TooltipProvider` are function components that read config delays. Same DOM and props without config.
- Tests: `src/ui/overlay-config.test.tsx`.
- Foundations (moved from eva): `CircleSpinner`, `CenteredSpinner`, `LoadingState`, `RefreshSpinIcon`, `CrossfadeIcon`, `CrossfadeIconSlot`, `BorderBeam` (+ opt-in `tokens/css/border-beam.css`), `StatusDot`, `Surface`/`surfaceVariants`, `ListRow`/`LIST_ROW_CONTROL_CLASS`, `Avatar`/`AvatarImage`/`AvatarFallback`, `Alert`/`AlertDescription`/`alertVariants`, `CardTitle`, `CardDescription`, `CardFooter`, `CardAction`, and `Toaster` (`SonnerToaster` with `UiConfig.SonnerToaster` defaults).
- Foundations helpers: `transitionFast`/`transitionBase`/`transitionSlow`, `staggerDelay`, `rubberband`, `projectVelocity`, `DRAG_ACTIVATION_DISTANCE_PX`, `ensureRuntimeVisibility`, `observeAnimVisibility`, `useAnimOffscreenRef`, `bindRuntimeAnimation`, `subscribeQuantized`, `quantizedSnapshot`, `msUntilNextBoundary`, `catSlotForId`, `catColorForId`, `catColorForSlot`, `CAT_SLOT_COUNT`, `SURFACE_RADIUS_CLASS`, `CONTROL_RADIUS_CLASS`. `SidebarResize` now imports the shared `rubberband` (same maths).
- `UiConfig` entries: `Spinner` (`mark`), `CircleSpinner` (`colors`), `LoadingState`, `StatusDot`, `ListRow`, `SonnerToaster`, `Card`, `Table`, `Progress`, `Separator`, `Label`. No entry = unchanged output.
- New props: `Spinner` `mark` (outline with a running dash instead of the loader icon), `SonnerToaster` `classes` (replace toast parts and the toaster class).

## 0.17.1

Fix: `text-muted` was nearly invisible with `compat-shadcn-rgb.css`. No markup, export or `tokens.css` changes.

- `compat-shadcn-rgb.css`: adds `--text-color-muted: rgb(var(--muted-foreground))` to its `@theme inline`. The compat file maps `--color-muted` to the app's `--muted`, which in a shadcn theme is a fill (for example 239 239 240), so `text-muted` came out as light grey on white. Tailwind reads `--text-color-*` before `--color-*` for `text-*` only, so `text-muted`, its variants (`hover:`, `[&_...]:`) and opacity modifiers (`text-muted/80`) now resolve to `--muted-foreground`.
- Affected: the `text-muted` exceptions (`InputArea` ghost text, `Button` `flat`, `CommandDialog` `listLayout="auto"` headings, the app shell rail tiles, account and sign-out classes, the landing kit and site footer classes).
- Unchanged: `bg-muted`, `border-muted` and the `dark:` `muted` classes on `Switch` and `Slider` still read `--muted`. Apps on `tokens.css` see no change: there `--muted` is already the grey text colour.
- Tests: `tokens/test/tailwind.test.mjs` compiles the compat file and checks `text-muted`, `hover:text-muted`, `text-muted/80` and an arbitrary-variant `text-muted` read `--muted-foreground`, while `bg-muted` and `border-muted` read `--muted`. `tokens/test/package.test.mjs` checks version 0.17.1.

## 0.17.0

One search field, and a lighter focus style on every field.

Added

- `SearchInput` props: `label` (default `"Search"`; the `aria-label`, and the placeholder when `placeholder` is not set), `clearLabel` default `"Clear search"`, `shortcut` (a `Kbd` hint on the right, shown only while the value is empty), `size` (`"sm"` `h-8`, default; `"md"` `h-10`) and `variant` (`"default"`; `"toolbar"`: `bg-transparent hover:bg-default focus-visible:bg-default`, `flex-1` on mobile, `sm:w-44 md:w-52`, `rounded-field`). It sets `enterKeyHint="search"`. Other input props and the ref still go to the `<input>`.
- `fieldFocusClass` and `fieldFocusWithinClass` (`src/ui/_field-classes.ts`), exported from the root.

Changed

- Field focus: `focus-visible:border-focus-border focus-visible:ring-2 focus-visible:ring-focus-ring` -> `fieldFocusClass` (`focus-visible:outline-hidden focus-visible:border-focus-border focus-visible:ring-1 focus-visible:ring-focus-ring`). Applies to `Input`, `Textarea`, `Select` and `RadixSelect` triggers, `ClearInput` (+ `.alt`), `SearchInput`, `pickerTriggerClass` (`DatePicker`, `TimePicker`). `InputGroup.alt` uses `fieldFocusWithinClass`. `InputGroup`, the `Calendar` caption dropdowns and the `Composer` shell keep their own `has-[...]` selectors with `ring-1`. Invalid `InputGroup` (+ `.alt`) keeps `danger` colours at 1px. Tokens, buttons, tabs, checkboxes, switches, sliders and clear buttons are unchanged.
- `ArtifactListToolbar` uses `<SearchInput variant="toolbar">`.

Deprecated

- `ToolbarSearchInput`: now a wrapper over `<SearchInput variant="toolbar">` with the same props (`placeholder` still defaults to `"Search..."`). Visual and behaviour changes: `rounded-lg` -> `rounded-field`; focus is `fieldFocusClass` (border colour and a 1px ring) instead of `ring-2` with `ring-offset-2`; the clear button is the `ClearInput` one (mounted only while the value is non-empty, including whitespace, with the dissolve on clear) instead of an always-mounted ghost `Button`.

Tests: new `src/ui/search-input.test.tsx` (label to `aria-label` and placeholder, ref and prop pass-through, clear, shortcut hint only while empty, sizes, toolbar classes). `toolbar-search-input.test.tsx` checks the wrapper. `date-picker.test.tsx` checks `focus-visible:ring-1`. `root-exports.test.ts` adds `SearchInput`, `fieldFocusClass` and `fieldFocusWithinClass`. `tokens/test/package.test.mjs` checks version 0.17.0.

## 0.16.4

Fix: `Switch` contrast in dark mode when unchecked, like the 0.16.1 `Slider` fix. Light mode and the checked state are unchanged in both modes. No export or prop changes.

- Track (unchecked): `border-border bg-default data-[state=unchecked]:bg-default` -> the same plus `dark:data-[state=unchecked]:border-muted/60 dark:data-[state=unchecked]:bg-muted/40`. In dark mode `--default` (oklch 27.4%) almost matched `--surface-card` (oklch 25.7%) and the background, so an off switch disappeared on a dark card.
- Thumb (unchecked): `bg-background` -> `bg-background dark:data-[state=unchecked]:bg-foreground`. The dark thumb was `--background` (oklch 12%); it is now light.
- Checked: `data-[state=checked]:border-primary data-[state=checked]:bg-primary` and the `data-[state=checked]:bg-primary-foreground` thumb, unchanged. The new `dark:` classes only match `[data-state="unchecked"]`, so they never apply to a checked switch. Focus ring and disabled styles are unchanged.
- A caller `className` still merges with `cn` after the defaults (`className="bg-border"` drops `bg-default` and keeps the `dark:` classes).
- Tests: new `src/ui/switch.test.tsx` checks the light, checked and `dark:` classes on the track and thumb, that every `dark:` class is scoped to the unchecked state, and that `className` merges after the defaults. `tokens/test/package.test.mjs` checks version 0.16.4.

## 0.16.3

Visual change: text fields now use 10px corners, matching `rounded-control`. Values are at the default `--radius: 1rem`. No export changes.

- `tokens.css`: `--field-radius` (light and dark) `1.25rem` (20px) -> `min(var(--radius), 0.625rem)` (10px). `--radius-field: var(--field-radius)` in `@theme` is unchanged, so `rounded-field` follows.
- `compat-shadcn-rgb.css`: `--radius-field` and `--field-radius` `min(calc(var(--radius) + 0.25rem), 1.25rem)` (20px) -> `min(var(--radius), 0.625rem)` (10px).
- Affected: `Input`, `Textarea`, `Select` and `RadixSelect` triggers, `ClearInput` (+ `.alt`) and its `.t-clear` / `.t-clear-clip` CSS, `InputGroup` (+ `.alt`), `DatePicker` and `TimePicker` triggers (`_picker-classes.ts`), `Calendar` caption dropdowns, `SearchInput` (via `ClearInput`; `ToolbarSearchInput` keeps its `rounded-lg`), `SonnerToaster` `toastRadius="control"`, and the tailwind preset `rounded-field`. The `ring-2` focus ring is a `box-shadow`, so it follows the new radius.
- Unchanged: buttons (`rounded-lg`), surfaces (`rounded-surface`), menu items (`rounded-menu-item`) and the chat `InputArea` (it sets `rounded-full` / `rounded-surface` on its `InputGroup`).
- `Composer` (`data-slot="composer"`) root: `rounded-field` -> `rounded-[1.25rem]`, pinned to its old 20px so chat composers look the same.
- Tests: `tokens/test/package.test.mjs` checks version 0.16.3 and the new `--field-radius` / `--radius-field` values in `tokens.css` and `compat-shadcn-rgb.css`.

## 0.16.2

Visual change: `Select`, `RadixSelect`, `Command` and `ComposerSlashMenu` item rows now use `rounded-menu-item` (`min(var(--radius), 0.5rem)`, 8px) corners, like `DropdownMenu` and `ContextMenu` items. Values are at the default `--radius: 1rem`. No export changes.

- `SelectItem` (`select.tsx`): `rounded-lg` (16px) -> `rounded-menu-item`. It also gains `max-sm:min-h-10`, as dropdown items have.
- `SelectItem` (`radix-select.tsx`): `rounded-lg` (16px) -> `rounded-menu-item`.
- `CommandItem`: `rounded-md` (`calc(var(--radius) - 2px)`, 14px) -> `rounded-menu-item`. `CommandDialog` sets `[&_[cmdk-item]]:rounded-menu-item` in place of `[&_[cmdk-item]]:rounded-md`.
- `ComposerSlashMenu` item rows: `rounded-lg` (16px) -> `rounded-menu-item`.
- With a large `--radius`, the highlight fill on these rows was close to a pill. It now matches the dropdown item. Menu surfaces (`rounded-lg`), triggers and colours are unchanged.
- Tests: `src/composer/input-area/composerSlashMenu.contract.test.ts` checks the slash menu rows use `rounded-menu-item`. `tokens/test/package.test.mjs` checks version 0.16.2.

## 0.16.1

Fix: `Slider` contrast in dark mode. Light mode is unchanged. Additive props, no export changes.

- Track: `bg-default` -> `bg-default dark:bg-muted/40`. In dark mode `--default` (oklch 27.4%) almost matched `--surface-card` (oklch 25.7%) and the background, so the track disappeared. `muted` at 40% shows on both.
- Range: `bg-primary`, unchanged in both modes.
- Thumb: `border-border bg-background` -> `border-border bg-background dark:border-muted dark:bg-foreground`. The dark thumb was `--background` (oklch 12%); it is now light with a visible border. `shadow-sm` and the focus ring (`ring-2 ring-focus-ring`) are unchanged.
- New optional props `trackClassName`, `rangeClassName` and `thumbClassName`, merged with `cn` after the defaults, so a caller class wins through tailwind-merge (`thumbClassName="bg-primary"` drops `bg-background`). A caller replaces a `dark:` default with its own `dark:` class. `thumbClassName` goes to every thumb.
- `Switch` is not changed. It shares part of the issue: its unchecked track is `bg-default` and its thumb `bg-background`, so in dark mode the unchecked state has low contrast. Its border (`border-border`) helps, and the checked state uses `bg-primary` with a `bg-primary-foreground` thumb.
- Tests: `src/ui/slider.test.tsx` checks the light and `dark:` classes on the track, range and thumb, and that the three className props apply and override the defaults. `tokens/test/package.test.mjs` checks version 0.16.1.

## 0.16.0

Additive: `Slider` and `LabeledSliderRow`. No other export changes.

- `Slider`: shadcn's slider on `@radix-ui/react-slider`, with package tokens: a `h-1.5` `bg-default` track, a `bg-primary` range and a `size-4` `bg-background` thumb with a border, `shadow-sm` and the `Switch` focus ring (`ring-2 ring-focus-ring`). Disabled dims to 50% with `cursor-not-allowed`. Horizontal and vertical. One thumb per value in `value` or `defaultValue`, so it covers single values and ranges. Every Radix `Root` prop passes through.
- `id`, `aria-label`, `aria-labelledby` and `aria-valuetext` go to the first thumb, the focusable `role="slider"` element, not `Root`. `thumbLabels` sets `aria-label` per thumb.
- `LabeledSliderRow`: the `LabeledSwitchRow` layout with a right-aligned value (`formatValue`), the slider below and optional `minLabel` / `maxLabel` captions. The label names the thumb through `aria-labelledby`, because `htmlFor` cannot name a `<span>`.
- New peer dependency: `@radix-ui/react-slider` `^1.4.7` (also a dev dependency, as with the other `@radix-ui/*` packages).
- Tests: `src/ui/slider.test.tsx` covers single and range thumbs, `aria-valuenow` / `aria-valuemin` / `aria-valuemax`, ArrowRight, ArrowLeft, Home and End with `onValueChange`, the disabled state, where `id` and the ARIA props land, and `LabeledSliderRow`. `src/root-exports.test.ts` checks both exports.

## 0.15.1

Fix: two bugs in the `ClearInput` CSS shipped in 0.15.0. One DOM change (a clip wrapper around the layers). No export changes.

- Placeholder shown twice: at rest, `.t-clear-placeholder` sat on top of the input's own placeholder, about 1px apart. The layer is now `opacity: 0` unless `.t-clear` has `.is-clearing`, which is when `clearInputDissolve` drops it in. While clearing, the input's own placeholder is hidden (`.t-clear.is-clearing > input::placeholder { opacity: 0 }`). Exactly one placeholder shows at rest, with a value, while clearing and after clearing. Apps can delete any `.t-clear-placeholder { opacity: 0 }` workaround.
- Focus ring clipped: `.t-clear { overflow: hidden }` cut the input's `ring-2`. `.t-clear` no longer clips. The mirror, placeholder and glow layers now sit in a new `.t-clear-clip` (`aria-hidden`, `position: absolute; inset: 0; overflow: hidden; border-radius: inherit`), so the glow and the flying text stay inside the field. The clip has to be a parent that never moves: the dissolve sets `transform` on the mirror and placeholder layers, so their own `overflow` would move with them. `.t-clear` now takes `border-radius: var(--radius-field)`, so the clip matches the default field. For an input with another radius, put the same `rounded-*` class on `wrapperClassName`.
- Tests: `tokens/test/package.test.mjs` checks that `.t-clear` sets no `overflow: hidden` or `clip` without an `overflow-clip-margin`, that `.t-clear-clip` clips and `clearInputDissolve` never styles it, that the placeholder layer is `opacity: 0` at rest and only shown under `.is-clearing`, and that the native placeholder hides while clearing. `tokens/test/tailwind.test.mjs` checks the new rules compile. `src/ui/clear-input.test.tsx` checks the three layers render inside `.t-clear-clip`.

## 0.15.0

CSS that every consuming app re-defined now ships in `@vvedantb/ui/tokens`, so apps get it by default. Every rule sits in a Tailwind layer (`base`, `components` or `utilities`) and every timing or strength is a `:root` variable, so an app rule or an app `:root` value still wins. No JS export changes.

- `tokens.css` now starts with `@import` of three new or changed files (`css/clear-input.css`, `css/scrollbar-thin.css`, `css/motion.css`), all exported under `tokens/css/`.
- `.glass-panel-strong` (Dialog, SonnerToaster, SlideOverPanel, SessionsHoverCard `surface="glass"`): defined in `tokens.css` as `background-color: var(--overlay)`, the same as `bg-overlay`, solid in light and dark. `compat-shadcn-rgb.css` now matches: solid `rgb(var(--popover))` in `@layer components`, replacing the `@utility` with `rgb(var(--card) / 0.95)` and a 12px blur. Compat apps that want the blur keep their own `.glass-panel-strong` after the import.
- `ClearInput`: `css/clear-input.css` ships the `.t-clear`, `.t-clear-mirror`, `.t-clear-placeholder` and `.t-clear-glow` layers and the defaults `clearInputDissolve` reads: `--clear-dur` 1000ms, `--clear-out-dur` / `--clear-in-dur` 400ms, `--clear-out-fly` / `--clear-in-fly` 12px, `--clear-out-ease` / `--clear-in-ease` `cubic-bezier(0.22, 1, 0.36, 1)`, `--glow-delay` 50ms, `--glow-peak-at` 0.15, `--glow-opacity` 0.85, `--glow-spread` 1.5. Values match the apps' copies.
- Fix: `clearInputDissolve` read `1s` as 1 ms and a `cubic-bezier()` with spaces as linear. Tailwind's optimiser writes `1000ms` as `1s` and keeps the spaces, so an optimised build could run a 1 ms, linear dissolve. Times in seconds are now converted to ms and the ease parser allows whitespace.
- Motion variables on `:root` in `tokens.css`: `--modal-open-dur` 180ms, `--modal-close-dur` 120ms, `--modal-scale` 0.96, `--modal-scale-close` 0.96, `--modal-ease` and `--tabs-ease` `cubic-bezier(0.22, 1, 0.36, 1)`, `--tabs-dur` 200ms. `modal.css` and `tabs.css` no longer need app variables, and `css/index.css` now includes `modal.css`, `tabs.css` and `tabs-pills.css`. It drops `scrollbar-thin.css`, which `tokens.css` brings.
- `tabs.css`: the `.t-tabs` container (`position: relative; display: inline-flex; align-items: center`), `.t-tab` transition `color var(--tabs-dur) var(--tabs-ease), transform 100ms ease-out`, and `.t-tab:active { transform: scale(0.97) }`.
- `.sidebar-section-label` (`sidebarSectionLabelClass`): `color-mix(in oklch, var(--muted) 55%, transparent)`, 80% on hover, in `tokens.css`. Variables `--sidebar-section-label-mix` and `--sidebar-section-label-hover-mix`.
- `.scrollbar-thin`: one shared rule in `css/scrollbar-thin.css`, now with Verve's values and structure. The thumb is `--scrollbar` at `--scrollbar-thin-rest` (40%) at rest and `--scrollbar-thin-hover` (80%) on hover. Standard `scrollbar-width` / `scrollbar-color` apply everywhere, and the 6px webkit thumb is a fallback under `@supports not (scrollbar-color: auto)`. Before, the file used 80% and 100% and preferred the webkit thumb in Chrome. To keep the old strength, set `--scrollbar-thin-rest: 80%` and `--scrollbar-thin-hover: 100%`.
- `css/motion.css`: `.ui-page-enter`, `.ui-enter`, `.ui-enter-up` and `.ui-stagger` (first 8 children) with keyframes `ui-page-enter`, `ui-enter`, `ui-enter-up` and `ui-fade-only`. No name clashes with `animations.css` or the preset. Reduced motion turns them into a 1 ms fade and turns view transition animations off. With `PageMotionProvider` `disabled` (`html[data-page-motion="off"]`), the same fade applies, `animate-in` / `animate-out` run in 0 s, `.t-modal` and `.t-tabs-pill` stop transitioning, and view transition animations stop. Variables `--ui-enter-ease`, `--ui-page-enter-dur` (160ms), `--ui-enter-dur` (200ms), `--ui-enter-up-dur` (220ms), `--ui-stagger-step` (40ms). View transition names, timings and morphs stay in the app.
- Not added: a compact cmdk variant. The package `Command` / `CommandDialog` style `[cmdk-*]` with their own classes, so an app's global `[cmdk-*]` rules are app styling, not something a package component needs.
- What apps can delete (Verve's slimmed `globals.css` as the example): the `--modal-*` and `--tabs-*` `:root` values that equal the defaults, the `.t-tabs` / `.t-tab` / `.t-tab:active` rules, `.glass-panel-strong`, `.sidebar-section-label` and its hover, the `.ui-*` classes, keyframes and reduced-motion block, the `html[data-page-motion="off"]` rules, the view transition reduced-motion block, `.scrollbar-thin` and its webkit fallback, and any `.t-clear*` rules with the `--clear-*` / `--glow-*` values. Keep any rule whose values differ, or set the variable instead. Apps on `compat-shadcn-rgb.css` import `scrollbar-thin.css`, `clear-input.css` and `motion.css` themselves and still set the `--modal-*` / `--tabs-*` values.
- Docs: README, `tokens/README.md` (exports, variables and a Parameters table for every new variable) and `app/README.md` (`PageMotionProvider`) no longer say apps must define these.
- Tests: `tokens/test/package.test.mjs` checks that no `@import` follows a rule in `tokens.css` or any `css/` file, that `tokens.css` imports the three files and sets the motion variables, `.glass-panel-strong` and `.sidebar-section-label`, that the compat fill is solid, and that every variable `clearInputDissolve` reads has a CSS default equal to its code fallback. `tokens/test/tailwind.test.mjs` compiles `tokens.css` alone and checks every moved selector, variable and keyframe, that no `@import` is left and that the new rules are layered. It also compiles `clear-input.css` and `motion.css`, and checks that `motion.css` keyframe names do not clash with `animations.css` or the preset. `src/ui/clearInputDissolve.test.ts` covers ms, seconds, px and spaced `cubic-bezier` values.

## 0.14.0

Additive: date pickers built on react-day-picker 9, next to `TimePicker`. One fix to `DialogFooter`. No other export changes.

- `Calendar`: shadcn's v9 calendar (`DayPicker` with `getDefaultClassNames`) on package tokens, with tabler chevrons. It has no fill of its own, so it takes the surface it sits on. Selected days use the `TimePicker` selected treatment (`bg-primary`, no rings), today is bold with a dot, outside days are muted and disabled days dimmed. The today, outside and hover rules skip selected days, so a selected today keeps `primary-foreground` text (and dot) in light and dark. Takes every `DayPicker` prop.
- `DatePicker`: controlled, `value` "YYYY-MM-DD" or "" (as `<input type="date">`). An input-styled trigger (the `TimePicker` trigger, now shared) shows the date with `Intl.DateTimeFormat` (`dateStyle: "medium"`, `locale`) or `placeholder` ("Pick a date"). It opens a `Popover` with the calendar on the selected month; picking a day calls `onChange` and closes. `min` and `max` disable days outside the range. `clearable` adds a clear control that calls `onChange("")`; `name` renders a hidden input with the value. Also `disabled`, `ariaLabel`, `className` (wrapper), `triggerClassName` (default `w-40`) and `id`.
- Sizing: `className` (wrapper) and `triggerClassName` (trigger) both size the field. A `w-*` on either works, and `w-full` on either gives a full-width field; the clear control stays inside the field on the right. `triggerClassName` merges with the defaults, so `"h-10 w-full rounded-full px-4 text-sm"` replaces the height, width, radius, padding and text size. `TimePicker`'s `triggerClassName` now merges the same way (before, any value dropped the 110px width).
- `DateTimePicker`: controlled, `value` "YYYY-MM-DDTHH:mm" or "" (as `<input type="datetime-local">`). A `DatePicker` and a `TimePicker` side by side. `triggerClassName` goes to both triggers, but a width only to the date; with `w-full` the date grows and the time keeps 110px. A date picked with no time uses `defaultTime` ("00:00"); a time picked with no date uses today's local date. The date part of `min` and `max` limits the calendar. `name` submits the combined value.
- `MonthPicker`: controlled, `value` "YYYY-MM" or "" (as `<input type="month">`). The same trigger, and a popover with year navigation and a 3 by 4 grid of month buttons (`aria-pressed`, full month and year as `aria-label`). `min` and `max` disable months and year steps outside the range. Same `clearable`, `name` and `locale` as `DatePicker`.
- Helpers `parseDateValue` ("YYYY-MM-DD" to a local `Date`, `undefined` for "" or an invalid date) and `formatDateValue` (local `Date` to "YYYY-MM-DD"). They never parse as UTC, so no date is off by one west of Greenwich. Types `DatePickerProps`, `DateTimePickerProps`, `MonthPickerProps`.
- New dependency: `react-day-picker` `^9.14.0`, the package's first `dependencies` entry. It brings its own `date-fns`.
- Fix: `DialogFooter` no longer sets `bg-overlay`. The footer is not sticky, so the fill did nothing useful, and when the content surface differed (an app's `glass-panel-strong`, or `bg-*` on `DialogContent`) it showed as a white block under the body. The footer now shows the content's surface in light and dark.
- Tests: `src/ui/date-picker.test.tsx` covers placeholder and formatted value, the trigger's attributes and classes, opening and picking a day, `min` and `max`, `clearable`, the hidden input, the helpers' round trip over a leap year (passes with `TZ` set from UTC-11 to UTC+14), `DateTimePicker` date and time combination, defaults and limits, and `MonthPicker` selection, year navigation and limits. It also covers a selected today, `w-full` through either prop, pill overrides and the `DateTimePicker` width split. `tokens/test/tailwind.test.mjs` compiles the calendar classes and checks that no today or outside colour rule can match a selected day. `src/ui/dialog.test.tsx` checks the footer has no fill. The `ConfirmDialog.Footer` test no longer expects `bg-overlay`, and the legacy DOM fixture drops it from the 28 dialog footers (no other change).

## 0.13.1

Additive: the artifact delete dialog text is configurable. Without the new prop nothing changes.

- `deleteDescription` (`ReactNode`) on `ArtifactViewer`, `ArtifactCard`, `ArtifactList` (through `ArtifactCardActions`) and `useArtifactEditDialogs`, and `description` on `ArtifactDeleteDialog`. It replaces the text under the delete dialog's title, for hosts that soft-delete with undo. The default stays "This cannot be undone."
- Tests: `src/artifacts/artifacts.test.tsx` checks the default text on the card and the viewer, and custom text through `ArtifactList` and `ArtifactViewer`.

## 0.13.0

Additive: artifact viewers join the root, built on the artifacts core in `@vvedantb/server`. No existing export changes, and no name collides with the ai-elements `Artifact*` parts.

- `ArtifactFrame` and `ArtifactStateStore`: the body in an iframe with `sandbox="allow-scripts"` (never `allow-same-origin`) and the core's CSP, plus the MessageChannel state bridge. It takes a backend-agnostic store (`load`, `save`, optional `onError`) and `stateGlobalAliases`, writes the loaded snapshot into the `srcdoc`, applies the guest's requests with the core's ops and limits, and saves the whole map 5 s after the last change (at least every 30 s), on `pagehide`, when the page is hidden and on unmount. After a failed load it never saves. Guest messages are parsed with zod at the boundary.
- `ArtifactCard`, `ArtifactList` (grid or list, empty state), `ArtifactListToolbar` (search, type filter, layout toggle), `ArtifactViewer` (header, versions, rename, copy, download by format, open in new tab, delete), `ArtifactVersionsMenu`, `ArtifactRender`, `ArtifactTypeIcon` and `ARTIFACT_TYPE_LABELS`. Rename and delete go through `ConfirmDialog` (`ArtifactRenameDialog`, `ArtifactDeleteDialog`, `useArtifactEditDialogs`); Alt-click skips the delete dialog. Data comes in through props and leaves through callbacks (`onOpen`, `getHref`, `getBody`, `onRename`, `onDelete`, `onViewVersion`, `onRestoreVersion`).
- Helpers `downloadArtifactBody`, `copyArtifactBody`, `openArtifactInNewTab`. Types `ArtifactSummary`, `ArtifactDocument`, `ArtifactVersionSummary`, `ArtifactLayout`, `ArtifactCardActions` and each component's props.
- New optional peer: `@vvedantb/server` `>=0.6.1`, imported statically by the root like `convex` (README, optional peers). 0.6.1 is the first version whose guest connects in a browser iframe; with 0.6.0 the bridge never connects. In this repository it is a workspace dev dependency, so build it before typechecking or testing this package (`pnpm build` at the root does).
- Tests: `src/artifacts/artifact-frame.test.tsx` plays the guest against a fake store (snapshot in `srcdoc`, debounced and max-wait saves, limit and malformed-request errors, `pagehide`, hidden and unmount flushes, a failed load that never saves, a reload that waits for the save in flight). `src/artifacts/artifacts.test.tsx` covers the empty state, list rows, card links and menu actions, rename and delete dialogs, toolbar search, filter and layout callbacks, the versions menu, the viewer actions, and a check that the source names no app. `app/tests-node/artifacts-esm.test.mjs` pins which root modules import `@vvedantb/server` and server-renders the frame in plain Node.

## 0.12.1

Fix: the package source now typechecks inside strict consuming apps. No runtime change.

- `SpeechInput` no longer augments the global `Window`. It reads `SpeechRecognition` or `webkitSpeechRecognition` through a module-scoped typed helper, so an app's own `Window` declarations (for example optional constructors) and the DOM lib no longer clash with the package. The local instance type lists only the members the component uses, and the effect returns early if neither constructor is set.
- `Pagination`: removed an unused `React` import that failed under `noUnusedLocals`.
- New `tsconfig.consumer.json` (strict, `noUnusedLocals`, `noUnusedParameters`, DOM lib, `skipLibCheck`) checks `src/index.ts` next to `consumer/window-speech.d.ts`, a fixture that declares optional `Window` speech recognition constructors the way apps do. `typecheck` runs it.

## 0.12.0

Additive. Every icon without the new prop renders the same DOM and CSS behaviour as 0.11.0.

- `SettingsIcon` `variant` (`SettingsIconProps`): `"spin"` (default) is the 0.11.0 icon. `"turn"` is the second source's gear: hub drawn before the teeth, its own path, stroke 1.75, 1.12 eased hover scale, and a 2400 ms stepped turn (one 60deg notch at a time) on `var(--motion-ease-emphasized, cubic-bezier(0.2, 0.8, 0.2, 1))`. `duration` scales against 2500 ms for `"spin"` and 2400 ms for `"turn"`.
- `nav-icons.css`: new `vv-icon-gear-turn` class and keyframes, with `transform-box: fill-box`. Existing rules are unchanged.
- Audit: the other twelve ported icons match their source shape for shape (geometry, order, attributes, `active` and `collapsed` output) and rule for rule (keyframes, durations, delays, easing, transform origins, hover scale). No other change was needed.
- README: `cutoutColor` note for apps whose `--sidebar-accent` holds bare RGB channels; the default fallback is then not a colour, so pass `cutoutColor="rgb(var(--sidebar-accent))"`.
- Tests: the default `SettingsIcon` markup is pinned to the 0.11.0 output; the `"turn"` geometry, attributes and `duration` are covered; the CSS check also renders `variant="turn"` and requires every animated shape to have `transform-box: fill-box` (except `ReviewIcon`'s marks, which keep the svg box as in the source).

## 0.11.0

Additive: animated nav icons from two apps' sidebars. No existing export changes, and no name collides.

- Icons: `MemoryIcon`, `BoltIcon`, `FilesIcon`, `InboxIcon`, `BuildingIcon`, `SettingsIcon` (stroke 1.7, hover scale 1.15 with a spring ease) and `BoardIcon`, `ChecklistIcon`, `TerminalIcon`, `DocumentIcon`, `ReviewIcon`, `FlaskIcon`, `InboxArrowIcon`, `DraftIcon`, `AutomationIcon`, `BarChartIcon`, `SearchIcon`, `SidebarToggleIcon` (stroke 1.75, hover scale 1.12). Geometry, keyframes, timings and easing are copied from the source icons.
- `SettingsIcon`: both apps had one; one source kept, the continuous 2.5 s spin with stroke 1.7. The stepped 2.4 s turn is not ported.
- Shared props (`IconProps`): `size` (default 20), `color`, `strokeWidth`, `className`, `style`, `title`, `animate` (`"hover"` default, `true`, `false`), `active`, `duration`, and any other SVG prop including `ref`. `TerminalIcon`, `InboxArrowIcon` and `AutomationIcon` render their solid variant while `active`, with cut-out details in `cutoutColor` (`CutoutIconProps`; default the sidebar accent). `SidebarToggleIcon` takes `collapsed` (`SidebarToggleIconProps`). Other icons only set `data-active`.
- `NavIconBase` (`NavIconBaseProps`): the svg wrapper every icon renders. `IconAnimate` is the `animate` type.
- New stylesheet `tokens/css/nav-icons.css` (`vv-icon-*` classes), included in `tokens/css/index.css` and listed in `exports` like the other CSS files. No JS module imports it, so `sideEffects` is unchanged. Easing reads `--motion-ease-out` and `--motion-ease-emphasized` with the source values as fallbacks. `duration` sets `--vv-icon-duration-scale`, which every duration and delay multiplies by. No reduced-motion override, as in the sources.
- Tests: `src/icons/icons.test.tsx` covers defaults and every prop for each icon, and checks that each animated class in the components has a rule and keyframes in `nav-icons.css`.

## 0.10.1

Docs only; no runtime change.

- `app/README.md` describes the Convex provider, VITE env and ensure-user helpers by what they do, without the name of the package they came from.

## 0.10.0

Additive: `@vvedantb/convex-client` 0.1.0's React and VITE env helpers move here with the same names and behaviour. No existing export changes, and no name collides.

- `ConvexClerkProvider({ client, useAuth?, clerk? })`: `ConvexProviderWithClerk` (default `useAuth` is Clerk's), a plain `ConvexProvider` with `clerk={false}`, or the children alone without a client. Types `ConvexClerkProviderProps`, `ConvexClerkUseAuth`.
- `parseClientEnv(rawEnv, { z, viteEnv?, extend? })` and `VITE_ENV_NAMES`: zod VITE env parsing with your `z` (zod 3.25+ or 4). Types `ClientEnv`, `ClientEnvOptions`, `ClientEnvSource`, `ClientEnvWithoutViteEnv`, `ViteEnvMode`, `ViteEnvName`.
- `useEnsureUser(mutation)`: calls an ensure-user mutation each time Convex auth becomes authenticated. Type `EnsureUserMutation`.
- convex-client's non-React helpers (`mapLoadedQuery`, `forEachLoadedQuery`, `updateAllCachedQueries`, `patchLoadedQuery`, `OptimisticStore`, `tempId`, `createMemoryOptimisticStore`) went to `@vvedantb/server` 0.4.0 instead, so backend packages, tests and React Native can use them without loading this package.
- New optional peer: `convex` `^1.24.0`. Like `@clerk/clerk-react`, the root imports it statically (`convex/react` in `ConvexClerkProvider` and `useEnsureUser`), so apps that import the root need it installed. The README now says this for every optional peer the root imports.
- Tests: `app/tests/convex/` ports convex-client's suites (each app's copy beside the helper). `app/tests-node/convex-esm.test.mjs` pins the root modules that import `convex` or Clerk, loads `parseClientEnv` in plain Node without `convex`, Clerk or zod, and renders the provider and hook with them. The plain Node suites share `app/tests-node/graph.mjs`.
- Dev only: `convex` and `zod3` (zod 3.25) for the tests.

## 0.9.0

Additive. Existing components render as in 0.8.0; `SidebarAccountMenu` without the new props is unchanged.

- Landing kit, from two apps' copies. `createLandingKit({ motion })` returns `LandingReveal`, `LandingRevealItem`, `LandingHero`, `LandingNav` and `LandingCta` on the app's Motion; the package does not import Motion. Plain parts: `LandingPageLayout`, `LandingSection`, `LandingSectionHeading`, `LandingLattice`, `LandingFeatureCard`, `LandingNavMenu` and `LandingFooter`. Constants: `landingShellClass`, `landingPanelClass`, `landingItemVariants`, `landingFooterLinkClass` and `landingFooterButtonClass`. Copy, brand, links and auth buttons are props or slots.
- New CSS subpath `@vvedantb/ui/landing.css`: the landing stylesheet the two apps shared (atmosphere, grain, pulse dot, ambient graph and preview animations, smooth `#top` scrolling, reduced-motion overrides). Listed in `sideEffects`.
- `SiteFooter`: the marketing footer three apps copied. Variants `muted` (default), `muted-foreground` and `touch`.
- `PricingModal`: the one-plan upgrade dialog two apps copied. Checkout goes through `renderCheckout(button)`. Options `description`, `closeButton`, `taglineFontClassName` and `tone` cover the differences between the copies.
- `SidebarAccountMenu`: `themeToggle`, `signOut` and `itemIconSize`. They add the theme item, the sign-out item with Alt-click skip, and `SignOutDialog` with its state, as two apps wrote them by hand.
- `RailCollapseTile`: the show or hide sidebar rail tile three apps copied.
- The bare `text-muted` in these components is allowed by the token check in `src/marketing/marketing-classes.ts` only, where every class string lives.
- Tests: parity suites render each app's current component (copies under `app/tests/marketing/fixtures`, app names replaced) beside the same screen built on the shared component, and expect identical markup. Menus and dialogs are mounted and opened. `app/tests-node/marketing-esm.test.mjs` imports the marketing modules in plain Node ESM without Motion or Clerk installed.

## 0.8.0

Additive: behavioural helpers that apps duplicated. No existing export changes.

- `createThemeProvider({ missingProviderMessage? })` returns `{ ThemeProvider, useTheme }`. A port of next-themes 0.4.6 with the same props and semantics (localStorage writes, `<html>` class or `data-*` attribute, `style.colorScheme`, `prefers-color-scheme` listener, cross-tab `storage` sync, transition blocking, DOM options read on the first render, nested provider passthrough, `setTheme` identity tied to `theme`). Adds `mounted`, `isDark` and `toggleTheme` to the state. Renders no inline script.
- `getSystemTheme()` and `applyThemeClass(theme)` for apps that keep their own theme state.
- `createPageTitleContext({ missingProviderMessage?, documentTitle? })` returns `{ PageTitleProvider, usePageTitle, usePageTitleSync }`. The value holds `pageTitle` and a mobile actions slot element. `documentTitle` (`suffix`, `separator`, `fallback`) is opt-in; without it `document.title` is not touched.
- `PageMotionProvider` (`disabled`, `motionConfig`) and `useDisablePageMotion()`: stamps `html[data-page-motion]` and sets Motion's `reducedMotion`. Does not import `motion`; the app passes `MotionConfig` or its own wrapper.
- `formatCompactRelativeTime(date, { now?, justNow?, calendar? })`: `"now"` / `"42s"`, `"5m"`, `"3h"`, `"2d"`, `"4mo"`, `"1y"`. Elapsed-time units by default; `calendar` counts as `dayjs().diff` does. Pure TypeScript.
- Tests: parity suites run each app's current provider or formatter beside its adoption on these helpers and compare storage writes, `<html>` state, committed context values, `document.title` and formatter output with a fixed clock across time zones. `app/tests-node` imports the helpers in plain Node ESM without `motion` installed.
- Dev only: `next-themes` 0.4.6 and `dayjs` 1.11.19, the reference implementations for the parity tests.

## 0.7.2

Dark mode visual change for sidebar panel nav rows; everything else is additive. No props removed. Light mode looks the same.

- Visual change: nav row fills (`sidebarNavLinkTextClass`, `sidebarNavItemClass`, `Sidebar.NavItem`) use `bg-sidebar-accent` instead of `bg-surface-tertiary`. New token `--sidebar-accent` (`--color-sidebar-accent`): light `var(--surface-tertiary)` (unchanged look), dark `oklch(22.64% 0 0)` (sRGB 28 28 28, was about 39 39 39). `compat-shadcn-rgb.css` maps it to the app's `--sidebar-accent` channels, falling back to `--secondary` (the old fill). Compat apps that define `--sidebar-accent` now get that colour in both modes. Rail tiles are unchanged.
- Additive: `sidebarNavItemClass` options `selected` (fill without `font-medium`), `dragging` (`opacity-40 cursor-grabbing`) and `dropTarget` (fill plus `ring-2 ring-inset ring-focus`). The returned string always includes the same styles keyed off `data-selected="true"`, `data-dragging="true"` and `data-drop-target="true"`, so the exact class string for `{ active, iconOnly }` gains those data-attribute classes; they apply only when the attribute is set.
- Additive: `Sidebar.NavItem` props `selected`, `indent` (12px per level on top of the 16px left padding, as inline `paddingLeft`), `dragging` and `dropTarget`. It sets `data-active`, `data-selected`, `data-dragging` and `data-drop-target` (`"true"`) only when the matching prop is on.
- Additive: row parts `Sidebar.NavItemLeading`, `Sidebar.NavItemLabel`, `Sidebar.NavItemTrailing` and `Sidebar.NavItemActions` (`<span>`, or `asChild`; type `SidebarNavItemPartProps`), with class helpers `sidebarNavItemLeadingClass`, `sidebarNavItemLabelClass`, `sidebarNavItemSubtitleClass`, `sidebarNavItemTrailingClass`, `sidebarNavItemActionsClass` and `sidebarNavItemIndentStyle(indent)`. Actions are in the row flow and show on row hover, focus within, or while a menu trigger inside is `data-state="open"`.

## 0.7.1

Intended visual change. No props removed; DOM structure unchanged. Values in brackets are at the default `--radius: 1rem`.

- Visual change: `DropdownMenu` and `ContextMenu` items, sub-triggers, checkbox items and radio items use `rounded-menu-item` instead of `rounded-md`: `calc(var(--radius) - 2px)` (14px) -> `min(var(--radius), 0.5rem)` (8px). The menu surface stays `rounded-lg` (16px). Colours are unchanged.
- Visual change: sidebar panel nav rows. `sidebarNavRowClass(isIconOnly)` was `gap-3 px-3 py-1.5` (12px gap, 12px / 6px padding) and is now the whole row layout: `group flex w-full items-center rounded-menu-item` (8px), `gap-2 px-4 py-1.5` (8px gap, 16px / 6px padding), `text-[0.8125rem] leading-[18px] tracking-[0.005em]` (13px / 18px), `active:scale-[0.99]` with a 150ms transition, and a `ring-foreground/35` focus ring. Icon-only rows keep `justify-center px-0`. Apps that added `rounded-lg text-sm` go from 16px corners, 14px / 20px text and a 32px row to 8px, 13px / 18px and 30px.
- Visual change: `sidebarNavLinkTextClass(isActive)`: active `text-foreground` -> `bg-surface-tertiary font-medium text-foreground`; idle `text-muted hover:text-foreground` -> `font-normal text-foreground/80 hover:bg-surface-tertiary hover:text-foreground`. The hover and active fill is a static rounded rectangle.
- Visual change: `sidebarSectionLabelClass`: `px-3` -> `px-4` (12px -> 16px, aligned with the rows) and `leading-4` (16px line). Colour still comes from the app's `.sidebar-section-label` rule.
- New: `sidebarNavItemClass({ active, iconOnly })` (the whole row in one call), `sidebarNavIconClass(active)` (`size-[19px] shrink-0`, `text-muted-foreground` idle, `text-foreground` active) and `Sidebar.NavItem` (`active`, `iconOnly`, `icon`, `asChild`). Type `SidebarNavItemClassOptions`, `SidebarNavItemProps`.
- `tokens.css` and `compat-shadcn-rgb.css` define `@utility rounded-surface` (`clamp(0.75rem, var(--radius), 1rem)`, moved from `utilities.css`), `rounded-menu-item` (`min(var(--radius), 0.5rem)`) and `rounded-control` (`min(var(--radius), 0.625rem)`), so apps get them through the file they already import.
- `cn` treats `rounded-surface`, `rounded-menu-item` and `rounded-control` as radius classes, so a later radius class replaces an earlier one.

## 0.7.0

Additive. With the new props unset every existing component renders as in 0.6.1.

- `Spinner`: numeric `size` (pixel size passed to the icon, no size class), `stroke`, `tone` (`"muted"` default, `"inherit"` drops the colour class so the spinner uses the current text colour) and `decorative` (`aria-hidden="true"`, no `role="status"` or `aria-label`).
- `EmptyState.*` (new): `Root` (`variant` `"default"` or `"panel"`), `Icon`, `Title` (`asChild`), `Description` and `Actions`. `default` is an open block with a large bare icon; `panel` is a filled block with the icon in a tile.
- `TabsList` `variant="soft"`: borderless wrapping pills with a filled active pill, no `t-tabs` CSS. `TabsTrigger` picks its classes from the list variant; with `pills` or `segmented` it is unchanged.
- `Badge` `variant="destructive-soft"`: `border-border bg-danger/10 text-danger`.
- `Kbd` `variant="subtle"`: `rounded bg-surface-secondary px-1.5 py-0.5 text-foreground`.

## 0.6.1

Additive. With the new options unset every part renders as in 0.6.0.

- `ConfirmDialog.Footer` `row`: a right-aligned row of buttons at every width, including the compact sheet (`justify-end flex-row!`). Looks like a `flex justify-end gap-2` div inside the footer. No-op for `size="sm"`.
- `ConfirmDialog.Root` `focusCancel`: with `alert={false}`, Cancel gets `data-alert-cancel=""`, so a Content with `role="alertdialog"` focuses it on open. An explicit `data-alert-cancel` on Cancel wins. No-op with `alert`.
- `ConfirmDialog.Root` `dismissibleWhilePending`: while `pending`, Escape, outside click and the close button still call `onOpenChange(false)`. Cancel stays disabled and Action stays pending.
- `ConfirmDialog.Action` `spinnerClassName`: merged into the spinner className after `animate-spin`, for example `"mr-2"`.
- README: documents patterns that already worked in 0.6.0 (pending on Action alone, Cancel `variant`, Cancel `preventDefault()`, parts in a child component, swapping footers and Content `role`).

## 0.6.0

Additive. Every existing component keeps its props and renders the same DOM as in 0.5.4 (checked by a DOM parity test against output captured from 0.5.4).

- Composable parts, shadcn style. Each part is a static member of a namespace: `ConfirmDialog.*`, `AppShell.*` and `Sidebar.*`. `ConfirmDialog` and `AppShell` stay callable with their props. `Sidebar` is a new plain object. Prop types are exported flat (`ConfirmDialogRootProps`, `SidebarRailItemProps`, ...). Every part that renders an element merges `className` last and forwards native props.
- `ConfirmDialog.Root` (`size`, `alert`, `pending`, `confirmPhrase`), `.Content`, `.Header`, `.Title`, `.Description`, `.Body`, `.Footer`, `.Cancel`, `.Action` (`pending`, `pendingLabel`, `spinnerSize`) and `.Field` (type-to-confirm), plus `useConfirmDialog()`. While `pending`, close requests are swallowed and Cancel is disabled. With `confirmPhrase`, Action stays disabled until the typed text matches (trimmed, case-insensitive); the text resets each time the dialog opens.
- `AppShell.Root`, `.SkipLink`, `.Main` and `.Content`.
- `Sidebar.Root` (drawer and layout state, no DOM), `.MobileHeader`, `.MobileMenuButton`, `.MobileTitle`, `.MobileActions`, `.Backdrop`, `.Aside`, `.ResizeHandle`, `.Rail`, `.RailHeader`, `.RailBody`, `.RailFooter` (alias `.Footer`), `.RailItem`, `.RailSeparator`, `.Tooltip`, `.Panel`, `.PanelHeader`, `.PanelTitle`, `.PanelActions`, `.PanelClose`, `.AccountMenu`, `.AccountTrigger`, `.AccountAvatar`, `.AccountContent`, `.AccountLabel`, `.AccountSeparator` and `.AccountBadge`.
- `Sidebar.AccountTrigger`, `.AccountAvatar` and `.AccountLabel` take the user's name as `userName`. Native `name` on `AccountTrigger` goes to the button, as `SidebarAccountMenu` `triggerProps.name` does.
- `ConfirmDialog`, `SignOutDialog`, `AppShell`, `AppSidebar`, `SidebarRail`, `RailTile`, `RailDivider`, `SidebarPanel`, `SidebarHeader` and `SidebarAccountMenu` are now thin compositions of these parts. Output and behaviour are unchanged.
- Variant-heavy props are marked "Legacy (still supported)" in the README and JSDoc. Nothing is removed.
- `DialogContent` also counts a `*Dialog.Description` part (by display name) as the alert dialog description, so a composed alert dialog with `ConfirmDialog.Description` gets no generated fallback description.

## 0.5.4

- `InputArea` (inline chips): Shift+Enter at the end of the text no longer leaves the editor stuck with a hidden `"\n"`. Under `white-space: pre-wrap` Chromium adds a trailing line holder newline, so `"hi"` then Shift+Enter gave `"hi\n\n"`, and clearing the text left `"\n"`, which apps then stored as the draft. `onChange` now drops that one trailing holder (`"hi\n"`, then `""`), and newlines inside the text are unchanged. A value ending in `"\n"` is written with its holder so it round-trips. A value of `"\n"` (Shift+Enter on an empty draft, or a draft stored by an earlier version) shows as an empty editor: `data-empty` and the placeholder show, and the first typed character replaces it, so `/` opens the slash menu again. Placing the caret at the end puts it before the holder.
- `AppSidebar`: the mobile header is a three-column grid (`grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)]`): menu button, title, then the actions or the end spacer. The title is no longer absolutely positioned. It is `min-w-0 truncate text-center` with `leading-tight` and without `text-balance`, so it stays on one row and ends with an ellipsis instead of overlapping two or more trailing actions. With no title an empty `<span>` keeps the middle column. The actions div is `flex shrink-0 items-center justify-self-end gap-2` (was `ml-auto ...`) and the spacer is `h-11 w-11 shrink-0 justify-self-end`.

## 0.5.3

- `AppSidebar`: the mobile header uses a solid `bg-surface`, the content card's token, in place of `bg-background/80 backdrop-blur-md`, so it blends with the page instead of showing as a grey bar.
- `RailTile`: without `asChild` or `tabValue` it renders a native `<button type="button">` with the same classes as the `asChild` tile, not a ghost `Button`, so icons keep their authored size (no 16px clamp), matching `asChild` and `tabValue` tiles.

## 0.5.2

Additive. With the new props unset, every component renders as in 0.5.1.

- `AppSidebar` `mobileHeaderActions`: trailing actions in the mobile header, for example icon buttons. When set, a `<div data-app-sidebar-mobile-actions>` (`ml-auto flex shrink-0 items-center gap-2`) holding them replaces the end spacer. The title stays centred.
- `SidebarAccountMenu` `badge`: an unread dot over the trigger's top-right corner (`data-account-badge`, `aria-hidden`). When set, a `<div class="relative">` wraps the menu and the dot is its last child, a sibling of the trigger, so the trigger's `opacity-75` and press scale do not apply to it. `true` shows it. `false` keeps it mounted at `opacity-0` so it fades out. Omitted, there is no wrapper and no dot.
- `SidebarAccountMenu` `triggerProps`: spread onto the trigger `Button` after the defaults, so they override `title`, `aria-label` and the rest. `className` merges after the default classes.
- `SidebarAccountMenu` `contentProps`: spread onto `DropdownMenuContent` (for example `fitViewport`, `suppressAltKey`, `restoreScrollLockOnClose`, `aria-label`). `align`, `side`, `sideOffset` and `collisionPadding` still come from their own props, and `contentClassName` stays the class hook, so `contentProps` takes no `className`.
- `ConfirmDialog` `size="md"`: a dismissible dialog with the title in a `DialogHeader` (`pb-4`), the description (`py-6 text-muted-foreground`) and a `DialogFooter` (`pt-4`) with default-size Cancel and confirm buttons. Cancel calls `onCancel` and then `onOpenChange(false)`. Confirm calls `onConfirm` only, so the caller closes it. `"default"` and `"sm"` are unchanged.

## 0.5.1

Additive. With the new props unset, every shell component renders as in 0.5.0.

- `AppShell` `resizable` (`SidebarResizeOptions`: `storageKey`, `defaultWidth`, `minWidth`, `maxWidth`, optional `label`; widths are panel px, rail excluded). The shell owns the panel width and resize state. It reads the stored width (a JSON number in `localStorage`) on mount, ignores invalid values, clamps it to the bounds and writes each change. It sets `--app-shell-sidebar-width` to `calc(<railWidth> + <width>px)` in place of `sidebarWidth`, and drops the main margin transition while resizing.
- `AppSidebar` inside a resizable `AppShell`: renders `SidebarResizeHandle` as the last child of the `<aside>` on desktop while the panel shows (not `collapsed`, not `panelHidden`), and drops the `<aside>` width transition while resizing. The mobile drawer has no handle.
- New `SidebarResizeHandle` (optional `className`): a vertical `separator` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`. Dragging past the bounds rubber-bands and springs back on release with the release velocity. ArrowLeft and ArrowRight step 16px, and double-click resets to `defaultWidth`. It renders nothing outside a resizable `AppShell`.
- New `useAppShellResize()`: `{ width, setWidth, isResizing, minWidth, maxWidth, defaultWidth }` inside a resizable `AppShell`, else `null`.
- `SidebarRail` `tabs`: renders the body as a Radix tabs list with the same classes. Use it inside a Tabs root with `orientation="vertical"`. `bodyAsChild` still works.
- `RailTile` `tabValue`: renders a Radix tabs trigger with the tile classes plus `relative`, the children, the label as sr-only text (no `aria-label`) and the badge. `active` drives the state classes; `asChild` is ignored.

## 0.5.0

Additive. Existing exports and defaults are unchanged.

- New app shell on the root entry, extracted from existing app markup with the same classes and behaviour. It is router-free: the app passes links, state and media query results in.
- `AppShell`: full-height frame with a skip link, a `sidebar` slot and `<main>` with the content card. It sets `--app-shell-rail-width` (`4rem`), `--app-shell-sidebar-width` (`20rem`) and `--app-shell-mobile-header-height` (`calc(3.5rem + env(safe-area-inset-top, 0px))`) from `railWidth`, `sidebarWidth` and `mobileHeaderHeight`. `panelHidden` offsets main by the rail width instead of the sidebar width.
- `AppSidebar`: mobile header (menu button, optional `mobileTitle`), drawer backdrop and the `<aside>` with `rail` and `panel` slots. It handles swipe and Escape to close, `inert` while the drawer is closed, `data-sidebar-layout` and closing the drawer at the desktop breakpoint. The app owns `mobileOpen`, `isDesktop` and route-change closing.
- `SidebarRail` (`top`, body and `footer` slots, `showDivider`, `bodyAsChild`; other HTML attributes such as `id`, `data-*` and `aria-*` go to the root `<div>`), `RailTile` (ghost button or `asChild` link with tooltip, `active`, `badge`), `RailDivider` and `SidebarIconTooltip`.
- `SidebarPanel`: panel column with a `SidebarHeader`, `headerTrailing`, an optional close button (`onClose`, `closeButtonClassName`) and `collapsed`.
- `SidebarAccountMenu` (avatar or initials trigger, name or name and email label, `stackedLabel` for the two-line layout without an email, app-provided items), `SidebarAccountMenuPlaceholder` and `SignOutDialog`.
- Class helpers: `railTileClass`, `railTileStateClass`, `railBadgeClass`, `sidebarNavRowClass`, `sidebarNavLinkTextClass` and `sidebarSectionLabelClass`.
- Packaging: `files` lists `shell/src/**/*.{ts,tsx}` instead of `shell/src`, so `pnpm pack` no longer ships the shell test files (`npm pack` already left them out).
- `PanelTransition` reads `ViewTransition` through a locally typed reference, so it typechecks with `@types/react` versions that do not declare it. Runtime and output are unchanged.
- `check:tokens` markers are now per rule. The shell class file may use the marked bare `text-muted` and `accent` names, which match existing app markup.

## 0.4.4

Additive. Existing defaults render as before; every change is a new prop, variant or export.

- `Button`: new variants `flat`, `success` and `warning` (each is `ghost` plus an override). New `loading` prop: disables the button, sets `data-loading="true"` and shows a spinner in place of `startContent`. Without `loading` the attribute is omitted. New `endContent` prop, rendered after the children. Both are ignored with `asChild`, but `loading` still disables.
- `DropdownMenuContent`: new `fitViewport` (small-screen height cap with scroll; reads the optional `--vv-height` CSS variable), `suppressAltKey` and `restoreScrollLockOnClose`.
- `DropdownMenuItem`: new `endContent`. When set, the label and description move into a growing column and `endContent` sits at the end. Without it the markup is unchanged.
- `DropdownMenuSubTrigger` and `ContextMenuSubTrigger`: new `startContent`.
- `ContextMenuContent`: new `suppressAltKey`. `ContextMenuItem`: new `startContent`, `description` and `endContent`, with the same row layout as above.
- `PopoverContent`: new `fitViewport` (transform origin, `collisionPadding` default of 8, small-screen width and height caps).
- `CommandDialog`: new `title` and `description` (visually hidden header), `className`, `shouldFilter` and `listLayout` (`"pinned"` default or `"auto"`).
- New `restoreModalScrollLock()` on the root: clears body `pointer-events` and, when no dialog is open, the scroll lock.
- New `CardHeader` and `SelectField` (labelled single select).
- Motion: new `springTransition`, `springFastTransition` and `fadeUpSpring` presets. `FadePresence` takes an optional `variants` prop; omitted, it keeps its opacity fade. New `PanelTransition` (React `ViewTransition` with `vt-panel-in` / `vt-panel-out` classes; needs a React build that exports `ViewTransition`).
- `check:tokens` allows the marked bare `text-muted` in the `Button` `flat` variant and the `CommandDialog` `"auto"` layout, which match existing app markup.

## 0.4.3

Additive. Existing defaults render as before.

- New `SlideOverPanel`: right-side panel, absolutely positioned inside its nearest positioned parent. Only the close button closes it. Props: `open`, `width` (`"w-96"` default or `"w-80"`), `onClose`, `header`, `children`, `closeLabel`, `className`.
- New `ToolbarSearchInput`: compact toolbar search field with a clear button that is hidden while the value is blank. Clearing calls `onChange("")` and does not move focus. The ref goes to the `<input>`.
- `SettingsField` `layout`: new optional prop, `"stacked"` (default, unchanged) or `"horizontal"` (label and description left, control right).
- `ConfirmDialog` `size`: new optional prop, `"default"` (unchanged alert dialog) or `"sm"` (compact dismissible dialog). In `"sm"`, confirm does not close the dialog.

## 0.4.2

- `InputArea` inline chips: fixes a 0.4.1 bug where the user could not type when `chips` were shown. With an empty draft, the chips host was the editor's only child, so the caret had no editable position. In the compact pill, the editor was a flex container, so a click could put the caret inside a chip.
- The editor now keeps a zero-width space (U+200B) text node right after the chips host, so the caret always has an editable position after the chips. The text is reconciled behind it. U+200B never reaches `onChange` or `onSubmit`. `data-empty`, the placeholder and the ghost suggestion are unchanged.
- The caret and selection never rest in the chips host. On focus, click, key-up and `selectionchange`, the editor moves them to the start of the text. Clicks on controls inside chips, such as remove buttons, are not changed. Typing anywhere on the page puts the caret at the end of the text, after the chips.
- Select-all (Ctrl+A or Cmd+A) selects the text only. Backspace, Delete, typing or paste over a selection never deletes the chips host. Backspace at the start of the text calls `onRemoveLastChip` once and keeps the zero-width space.
- Compact pill: the editor is a block, not a flex container, so chips and text share one line of inline flow. The pill looks the same: `h-12`, plus, editor, send. Chips stay level with the text. The expanded layout is unchanged.
- Compact width: the chips width is now measured from where the text starts. The chips host uses `display: contents` and has no width of its own. Before this fix the composer could switch between the pill and the card on each keystroke when chips were shown.

- `InputArea` compact mode: `chipCount` no longer forces the stacked card. The composer stays in the one-row pill (plus, editor, send in an `h-12` pill) for short text, with or without chips that fit. It expands on a wrapped line, a newline or `fileCount` above 0. The editor classes match the session composer: expanded keeps `min-h-16 max-h-50 px-4 pt-3.5 pb-1`. `chipCount` still enables send and Backspace removal.
- `InputArea` chips: with `chipsPlacement="inline"` (default) the input is a contenteditable. `chips` render in a non-editable inline host (`data-composer-chips-inline`) at the start of the same text flow, so wrapped lines start under the chips at the left edge. `value` and `onChange` stay plain text. Backspace at the start of the text calls `onRemoveLastChip`. Enter submits, Shift+Enter adds a newline, paste is plain text, and Enter is ignored during IME composition.
- `InputArea` ghost text in inline mode: drawn with `data-suggestion` and an `::after`, not an overlay.
- `InputArea` `predictionTextClassName` applies in inline mode again, as in `"top"` mode and 0.4.0-rc.2. A hidden probe span carries the class, and its colour and opacity are copied to `--composer-ghost-color` on the editor, which the `::after` reads. `InputAreaEditor` takes a new optional `suggestionClassName` prop.
- `InputArea` `chipsPlacement`: new optional prop, `"inline"` (default) or `"top"`. `"top"` keeps the strip above a textarea.
- `useComposerSlashMenu`: `textareaRef` accepts any `HTMLElement` and the key handler takes an `HTMLElement` event.
- `isComposerCompact` and `useComposerCompact`: the `chipCount` argument is removed.
- Visual check pages: `composer/examples/inputarea-harness` (`index.html` matrix, `reference.html` side-by-side with a static reference). It is not part of the published files.

## 0.4.0-rc.2

- `InputActions` plus menu: content now defaults to `align="start"`, as in the original app adapter. Radix had defaulted to centre. `side="top"` and `collisionPadding={12}` are unchanged. The shared `DropdownMenuContent` primitive default is not changed.
- `InputActions` `menuContentProps` and `InputArea` `plusMenuContentProps`: props merged onto the menu content (`align`, `side`, `sideOffset`, `collisionPadding`, `className` and others). Your keys win. Omitted, the markup matches the original.
- `LabeledSwitchRow` `className`: optional, merged onto the outer wrapper with `cn`. Omitted, the classes are unchanged.

## 0.4.0-rc.1

Release candidate. **Breaking for imports:** one JavaScript entry. See [`MIGRATION.md`](MIGRATION.md) for every old path and the consumer files that need a change.

- Single JS entry: `@vvedantb/ui` (`.`). Removed from `exports`: `./cn`, `./sonner`, `./audio`, `./shell`, `./app`, `./composer` and `./tokens/native`. Everything they exported is on the root: `cn`, `SonnerToaster` and helpers, `toast` (re-exported from `sonner`), audio, `SidebarHeader`, `PillTabs`, `SessionsHoverCard`, the app helpers (`useRequestConfirm`, `startUpdateAvailableWatcher`, `SettingsPage`, `useStableAuth` and others), and the native tokens `tokens` and `Tokens`.
- This changes the public export map only. Source folders (`composer/`, `app/`, `shell/`, `audio/` and others) are not moved or merged, and the root index re-exports from them.
- Name collision: shell `cn` and `ClassValue` are not exported. The root `cn` (clsx and tailwind-merge) is the only `cn`. It merges conflicting Tailwind classes, so output can differ from the shell `cn`. No other duplicate names.
- Kept in `exports`, none of them JS component APIs: `./package.json`; the CSS paths `./tokens`, `./tokens/tokens.css`, `./tokens/css/*` (and `./tokens/css/*.css`) and `./tokens/compat/shadcn-rgb.css`; and `./tokens/tailwind-preset`. The preset stays because Tailwind `@config "@vvedantb/ui/tokens/tailwind-preset"` needs a resolvable package path. It is a build-tool entry (`.mjs`), not a React API.
- Optional peers: `motion` is now optional in `peerDependenciesMeta` (with `@clerk/clerk-react`, `@tanstack/react-hotkeys` and `zod`). No peer was added or removed from `peerDependencies`. No other peer was marked optional. Tooling that resolves every import in the barrel still needs the packages installed.
- `sideEffects` is unchanged (`./src/ui/sonner.css` only). The root barrel has no top-level side effects.
- `composer/MIGRATION.md` is now `composer/MIGRATION-INPUTAREA.md`.

Also in this release candidate. It folds in the 0.4.0 notes below.

- Root exports: `InputArea`, `ConnectionStatusMenuItem`, `buildComposerSlashItems` and their public types are importable from `@vvedantb/ui`. The root re-exports `./composer`. **Removed:** the `@vvedantb/ui/composer` subpath no longer exists in the `exports` map. Import every composer symbol from `@vvedantb/ui`. `MIGRATION.md` now shows root imports first.
- `InputArea` `predictionTextClassName`: classes on the ghost suggestion span. The default is `text-muted`, matching the original app composer. This replaces the `text-muted-foreground` default in the 0.4.0 notes. `check:tokens` allows the bare `text-muted` on one marked line in `InputArea.tsx` only. Pass `text-muted-foreground` to keep the earlier look.
- Tree-shaking: Composer modules have no top-level side effects. `LazyMotion` and `domAnimation` run only inside the `InputArea` render.
- Peer dependencies: none added. The composer uses existing peers (`motion`, `react`, Radix, `@tabler/icons-react` and others). An app that never imports composer symbols needs nothing new.

## 0.4.0

Additive. Nothing from 0.3.x is removed or changed in behaviour. See [`composer/MIGRATION-INPUTAREA.md`](composer/MIGRATION-INPUTAREA.md) for the exact props an app passes.

- New `InputArea` in `@vvedantb/ui` (first shipped under the `./composer` subpath, since removed): the app chat composer, extracted as presentational UI. Same DOM and classes as the app `InputAreaCore`: the pill that grows into a card (compact mode), the footer with plus menu, dictate, stop and send, ghost text, and the `/` menu. Data, routing, billing, uploads and skills stay in the app and arrive as props, callbacks and slots (`banners`, `promoBanner`, `queue`, `attachments`, `chips`, `plusMenuExtra`, `slashItems`, `renderSlashItem`).
- Building blocks: `InputActions`, `ConnectionStatusMenuItem`, `ComposerSlashMenu`, `ComposerSlashRow`, `InputBanners`, `PromoBanner`, `FadePresence`, `useComposerCompact`, `useComposerSlashMenu`, `useInputAreaPrediction`, `buildComposerSlashItems`, `filterAndGroupSlashItems`, the slash trigger, position and option id helpers, `shouldSkipPrediction`, `ghostSuggestion`, `scheduleCompletion`, the presets (`MAIN_CHAT_ACTION_FEATURES` and others) and the types `ActionFeatures`, `BannerFeatures` and `SkillChipPreview`.
- `Button` `startContent` and `DropdownMenuItem` `startContent` and `description`: optional. Omitted, the markup is unchanged.
- **Deprecated:** the 0.3 `Composer` (a from-scratch generic composer). Use `InputArea`. `Composer`, `ComposerShell`, `ComposerGhostText`, `ComposerIconButton` and `useComposerPrediction` still work unchanged and are not removed in this release. Replacing or removing `Composer` in a later release would be cleaner, because two composers with two prediction hooks is confusing, but that is a breaking change for any consumer and is left for a major or a clearly flagged minor.
- `useInputAreaPrediction` is the extracted prediction hook. It does not replace the 0.3 `useComposerPrediction`, which has a different signature.
- Ghost text: superseded in 0.4.0-rc.1 by `predictionTextClassName` (default `text-muted`).
- Parity fixture: `composer/examples/parity.html` and `composer/examples/parity/`. `PARITY.md` lists pixels changed per state against a frozen snapshot of the original JSX.
- Tests: ported unit tests (compact, prediction helpers, slash items, trigger, position, option id, contract) and `InputArea` render tests.

## 0.3.2

Additive and default-safe. With the new props omitted, `Composer` and `ComposerShell` behave as in 0.3.1.

- `Composer` `canSend?: boolean | ((draft: string) => boolean)`: overrides whether send is enabled. Omitted, send is enabled when the trimmed draft is not empty, as before. A boolean gates send directly. A function receives the live draft (not trimmed), so callers usually check `draft.trim()` and any attachments, for example `canSend={(draft) => draft.trim() !== "" || hasAttachments}`. `disabled` always disables send and the textarea. With `stopMode="replace"`, `streaming` still blocks send. When `canSend` allows an empty or whitespace draft, `onSubmit` is called with `""`. The `onSubmit` note "never called for an empty draft" now applies only when `canSend` is omitted.
- `Composer` and `ComposerShell` `stopMode?: "replace" | "alongside"` (default `"replace"`). `"replace"` keeps the 0.3.1 behaviour: while streaming, stop takes the place of send and Enter does not submit. `"alongside"`: while streaming, the footer shows `trailingActions`, then stop, then send. Send stays usable to queue the next message, so Enter and the send button submit while streaming when `canSend` allows. Not streaming, only send shows. Predictions stay off while streaming. The shell carries `data-stop-mode`.
- `ComposerShell` `canSend` stays a boolean. `Composer` resolves the function form and passes the result.
- New type `ComposerStopMode`.
- Fixture: new states for an empty draft with `canSend` on, and streaming with `stopMode="alongside"`.
- Tests: `canSend` (boolean, function, `disabled`, streaming in replace mode, regression for the empty default) and `stopMode` (replace, alongside, button order, submit while streaming, stop, disabled, predictions).

## 0.3.1

Additive. Opt-in or default-safe. Defaults are unchanged, except the `SessionsHoverCard` focus fix and the `hoverChip` hover border below.

- `SonnerToaster` `titleLeading`: `"snug"` (default, `leading-snug`) or `"5"` (`leading-5`, 20px at `text-sm`). `createToasterClassNames` accepts it.
- `SonnerToaster` `loadingIcon`: opt-in loading icon merged into `icons`. A caller `icons.loading` wins over it. `icons.loading` already overrode the loader with both `toastIcons` values, and tests now cover this.
- `SonnerToaster` `hideStackedContent` (default `false`): adds `[&[data-expanded=false][data-front=false]>*]:opacity-0` to the toast class. `sonner.css` is unchanged.
- `closeButtonStyle="hoverChip"`: hover no longer brightens the border or ring in dark mode (`hover:border-border!`, which beats sonner's own dark hover border rule). The text colour changes, and sonner may still change the hover background. Other close button styles are unchanged.
- `SessionsHoverCard`: focus that follows a click or a context menu close no longer opens the card (`:focus-visible` only for focus-open). It still opens on pointer hover. If pointer-driven focus left the card stuck open, pointer leave force-closes it; otherwise Radix handles close (including moving onto the content).

## 0.3.0

Additive. No change for apps that do not use the new exports.

- New `Composer` from `@vvedantb/ui` (0.3.0 also added a `./composer` subpath. It was removed in 0.4.0-rc.1). It has an autosizing textarea (`maxHeight`, default 200 px, then it scrolls), a footer with `plusMenu` on the left and `trailingActions` plus send or stop on the right, and an `attachments` row. Value is controlled (`value`, `onChange`) or uncontrolled (`defaultValue`). Enter calls `onSubmit` with the trimmed draft, Shift+Enter adds a line, and IME composition (`isComposing` or key code 229) never submits. `streaming` swaps send for stop, which calls `onStop`. `disabled` turns off the textarea and send. The ref goes to the textarea.
- Ghost-text predictions when `getPrediction(draft, { signal })` is set. The package makes no requests. Defaults: `predictionDebounceMs` 500 ms and `predictionMinLength` 12 characters. It skips drafts whose last word starts with `@` or `/` and drafts that end a sentence. Each edit aborts the previous request, and aborted or out-of-date results are dropped. Tab accepts, Esc dismisses for the current draft. Ghost text shows only while the caret is at the end, so Tab appends. It is drawn in a mirror under the textarea with `text-muted-foreground/50`.
- New exports: `ComposerIconButton`, `useComposerPrediction`, the pure helpers `shouldSkipComposerPrediction`, `joinComposerPrediction`, `nextComposerPredictionState`, `visibleComposerPrediction`, `acceptComposerPrediction` and `initialComposerPredictionState`, the constants `COMPOSER_PREDICTION_DEBOUNCE_MS` and `COMPOSER_PREDICTION_MIN_LENGTH`, and the types `ComposerProps`, `ComposerSlotContext`, `ComposerTrailingContext`, `ComposerPrediction`, `UseComposerPredictionOptions`, `ComposerPredictionState` and `ComposerPredictionAction`.
- Styling uses package tokens only (`rounded-field`, `bg-field-background`, `border-focus-border`, `ring-focus-ring`, `text-muted-foreground`), so it works with `tokens.css` and `compat-shadcn-rgb.css`.
- New fixture in `composer/examples/` with a `tokens.css` page and a `compat-shadcn-rgb.css` page, each with light and dark. States: empty, ghost text, attachments, streaming, disabled and a long draft.
- `Composer` `layout` prop: `"stacked"` (default, unchanged) or `"inline"`, a single row with `plusMenu` left, the input in the middle (`flex-1`, `min-w-0`) and `trailingActions` plus send or stop right. Attachments stay above the row, and autosize and `maxHeight` still apply. The shell carries `data-layout`. Inline has no `data-slot="composer-footer"`; it uses `data-slot="composer-row"`.
- `Composer` `renderInput(ctx)` for a custom input such as a contenteditable editor. The context has `value`, `onChange`, `onKeyDown`, `ghostText`, `acceptGhost`, `dismissGhost`, `inputRef`, `disabled`, `placeholder`, `streaming`, `maxHeight` and `textareaClassName`. The default textarea is not rendered. Autosize and the caret-at-end ghost gate apply to the default textarea only. For a custom input, predictions run whenever the composer is not disabled or streaming, and the caller owns caret rules and sizing. `onKeyDown` handles Enter (submit, `preventDefault`, not while composing), Tab (accept) and Esc (dismiss). Shift+Enter is left to the caller. The `ref` on `Composer` still points at the default textarea only.
- Building blocks: new `ComposerShell` (outer chrome, slots, send or stop, `layout`), new `ComposerGhostText` (input-agnostic ghost overlay from `value` and `ghostText`), and the types `ComposerLayout`, `ComposerInputRenderContext`, `ComposerShellProps` and `ComposerGhostTextProps`. `useComposerPrediction` and the pure helpers take draft strings only and do not read any element. The focus ring follows any descendant with a `data-composer-input` attribute (the default textarea has it). The ghost mirror is now rendered by `ComposerGhostText`, with the same markup as before.
- Fixture: four inline states and a custom contenteditable example.

## 0.2.3

Additive. Defaults are unchanged, except that `SessionsHoverCard` now portals its content (see below).

- `SessionsHoverCard` renders its content in a portal on `document.body` by default, so `overflow:hidden` ancestors do not clip it. Pass `portal={false}` to keep the content in place. The shared `HoverCardContent` is unchanged.
- `SessionsHoverCard` `surface` prop: `"overlay"` (default, the floating overlay with `rounded-lg`), `"surface"` (same fill with `rounded-surface`) and `"glass"` (`glass-panel-strong` with `rounded-surface`). Only `"overlay"` carries the shared floating classes, so `className` merges over any surface without `!` overrides. New type `SessionsHoverCardSurface`.
- `SessionsHoverCard` is now a `forwardRef` component. Extra props and the ref go to the trigger. With `asChild` (default `true`) the child is the trigger and keeps its own handlers, such as a context menu. With `asChild={false}` the children render inside a default trigger element.
- `SonnerToaster` `toastRadius="control"` (`rounded-field`, the radius of inputs and selects) and `density="compact"` (`gap-2 px-3 py-2 text-xs`, description `text-xs`). `createToasterClassNames` accepts both. Without them the class strings are unchanged.
- New subpath `@vvedantb/ui/sonner`: `SonnerToaster`, the toaster helpers and `toast` (re-exported from `sonner`). The root exports stay.
- New subpath `@vvedantb/ui/audio`: `playChime`, `useReplyChime`, `nextReplyChimeState`, `playTone` and the audio floor helpers. It avoids loading the rest of the root barrel. The root exports stay.
- Audio floor: one shared 1 second minimum gap across all package sounds. `playChime` now uses it. New `playTone(tone | tones)` plays WebAudio tones through the floor. New `tryAcquireAudioFloor()` and `withAudioFloor(fn)` let apps route their own sounds through the same floor. New constant `AUDIO_FLOOR_MIN_GAP_S`. The floor clock is `performance.now()`, not the `AudioContext` clock.
- Fixtures: the hover card fixture now sits in an `overflow:hidden` box. The toaster fixture takes `?variant=compact` for compact density and control radius.

## 0.2.2

Additive. No change for apps that do not use the new exports.

- `playChime()` and `useReplyChime()` from `@vvedantb/ui`. `playChime` plays a soft rising two-note chime (A5 then D6) with WebAudio. It creates one shared `AudioContext` on first use and is silent on the server, without WebAudio, or when autoplay blocks audio. Calls less than 1 second apart play once. `useReplyChime({ enabled, isStreaming, threadId })` chimes once when a thread goes from streaming to finished. It is silent on the first sight of a thread and when `threadId` changes. It tracks the edge while `enabled` is false, so enabling mid-turn does not replay a finish. The pure `nextReplyChimeState` helper is exported for tests.
- `SessionsHoverCard` from `@vvedantb/ui/shell`: hover card shell for list rows. Props for `openDelay` (400 ms) and `closeDelay` (150 ms), `side`, `align` and `sideOffset` (right, start, 8), `className` (default `w-64 p-3`), and `header`, `body` and `footer` slots. `body` may be a function of `{ open }`, and `loadContent` runs only while the card is open. It uses the existing `HoverCard` primitive and package tokens only.
- `SonnerToaster` now merges caller props with its defaults instead of replacing them. `toastOptions.classNames` join per key (package classes first, then the caller's), other `toastOptions` fields let the caller win, `icons` merge per key, `style` merges, and `className` appends. With no new props the rendered output is unchanged.
- `SonnerToaster` opt-in props, all off by default: `toastRadius` (`"lg"` or `"surface"`), `toastIcons` (`"default"` or `"filled24"`), `closeButtonStyle` (`"default"` or `"hoverChip"`, which also turns on sonner's `closeButton`), `sonnerVars` (sets `--normal-*` from `--color-card`, `--color-border`, `--color-foreground` and `--color-muted`, plus `font-family: inherit`) and `descriptionMuted` (`text-muted-foreground!`).
- New exports: `createToasterClassNames`, `mergeToastClassNames`, `mergeToastOptions`, `mergeToasterStyle`, `sonnerVarsStyle`, `filledToastIcons` and `hoverChipCloseButtonClassName`.
- `tokens/css/utilities.css`: new `@utility rounded-surface` (`clamp(0.75rem, var(--radius), 1rem)`).
- `tokens/css/compat-shadcn-rgb.css`: adds `--color-card` and `--color-muted` as references to `--card` and `--muted`.
- New fixture in `tokens/examples/toaster/` with a `tokens.css` page and a `compat-shadcn-rgb.css` page, each with light and dark. It uses all the opt-in props.
- Tests now also run from `src/**` and `shell/**`. Test files are not published.
- New fixture in `shell/examples/sessions-hover-card/` with a `tokens.css` page and a `compat-shadcn-rgb.css` page, each with light and dark.

## 0.2.1

Additive. Apps that import `tokens.css` compile to the same CSS as in 0.2.0.

- `tokens.css`: shadcn-style aliases in `@theme`: `--color-primary`, `--color-primary-foreground`, `--color-muted-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-destructive`, `--color-destructive-foreground`, `--color-card`, `--color-card-foreground`, `--color-popover`, `--color-popover-foreground`, `--color-input` and `--color-ring`. `--color-muted` and `--color-accent` stay. `bg-muted-foreground` now exists.
- Tailwind preset: added `muted` (`DEFAULT` and `foreground`, both the muted text colour), `accent` and `ring`.
- Components: `text-muted` is now `text-muted-foreground`. Brand-colour `accent` classes are now `primary` classes. Raw `var(--muted)`, `var(--foreground)`, `var(--overlay)` and `var(--overlay-foreground)` reads in `shimmer` and `dialog` now use `--color-*` theme variables, with the raw variable as fallback for apps that use the Tailwind preset without `tokens.css`. The colours do not change for current apps.
- New `tokens/css/compat-shadcn-rgb.css` (also `tokens/compat/shadcn-rgb.css`) for apps with shadcn-style `R G B` variables. Import it instead of `tokens.css`, never both. It defines only the UI-only names, as references to the app variables, and a `glass-panel-strong` fallback.
- New check, `check:tokens`, in `build`, `test` and `verify`. It fails if a component uses `text-muted`, accent-as-brand classes or raw colour `var(--…)` reads.
- Docs: README section "Using an existing shadcn RGB theme". New fixture in `tokens/examples/compat-shadcn-rgb/`.

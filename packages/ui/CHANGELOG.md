# Changelog

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

# Changelog

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

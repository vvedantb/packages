# @vvedantb/ui

Shared React 19 web UI. Source-exported: no build step.

| Import | What it is |
| --- | --- |
| `@vvedantb/ui` | Primitives (Radix-based), AI elements, `playChime` and `useReplyChime`. |
| `@vvedantb/ui/sonner` | `SonnerToaster`, its helpers and `toast`. |
| `@vvedantb/ui/composer` | `InputArea` (recommended) and its building blocks. Also the deprecated 0.3 `Composer`, `ComposerShell`, `ComposerGhostText`, `ComposerIconButton`, `useComposerPrediction` and the pure prediction helpers. |
| `@vvedantb/ui/audio` | `playChime`, `useReplyChime`, `playTone` and the shared audio floor. |
| `@vvedantb/ui/cn` | `cn` class helper (clsx + tailwind-merge). |
| `@vvedantb/ui/shell` | Router-free `SidebarHeader`, `PillTabs` and `SessionsHoverCard`. |
| `@vvedantb/ui/app` | Alt-click confirm skip, update watcher, settings chrome, `useStableAuth`. See `app/README.md` in the repository. |
| `@vvedantb/ui/tokens` | `tokens.css`: colour, radius, shadow, ease and font tokens for Tailwind v4. |
| `@vvedantb/ui/tokens/css/*.css` | `index`, `base`, `dialog`, `modal`, `tabs`, `tabs-pills`, `utilities`, `scrollbar-thin`, `animations`, `compat-shadcn-rgb`. |
| `@vvedantb/ui/tokens/compat/shadcn-rgb.css` | Same file as `tokens/css/compat-shadcn-rgb.css`. |
| `@vvedantb/ui/tokens/tailwind-preset` | Tailwind preset for apps that load a JS config with `@config`. |
| `@vvedantb/ui/tokens/native` | JS colours, radii and spacing. No CSS, no React DOM. |

```css
@import "tailwindcss";
@import "@vvedantb/ui/tokens";
@source "../node_modules/@vvedantb/ui/src/**/*.{ts,tsx}";
```

## Reply chime

```tsx
import { playChime, useReplyChime } from "@vvedantb/ui";

useReplyChime({ enabled: soundOn, isStreaming, threadId });
```

- `playChime()`: soft rising two-note chime (WebAudio). One shared `AudioContext`, created on first use. It is a no-op on the server and when autoplay blocks audio. Calls less than 1 second apart play once.
- `playTone(tone | tones)`: plays `{ frequency, startOffsetS?, durationS?, peakGain?, type? }` through the same floor.
- Audio floor: every package sound shares one 1 second minimum gap. Route your own sounds through it with `withAudioFloor(() => play())` or `if (tryAcquireAudioFloor()) play()`.
- These are also available from `@vvedantb/ui/audio`, which does not load the rest of the root barrel.
- `useReplyChime`: chimes once when `isStreaming` goes from `true` to `false` for the same `threadId`. It is silent on the first sight of a thread, when `threadId` changes, and when `threadId` is null or undefined. While `enabled` is `false` it still tracks the edge, so enabling mid-turn does not replay a finish.

## Composer

### InputArea (recommended)

`InputArea` is the chat composer extracted from an app: a pill that grows into a card, a plus menu, dictate, stop and send, ghost text, a `/` menu, and slots for banners, a queue, attachments and chips. It is presentational. It makes no requests and reads no router, billing or storage. The app passes data in and handles callbacks. It adds its own `TooltipProvider` and `LazyMotion`, so it needs no app provider.

```tsx
import { InputArea, InputBanners, buildComposerSlashItems } from "@vvedantb/ui/composer";

<InputArea
  value={draft}
  onChange={setDraft}
  onSubmit={(text) => send(text)}
  onStop={abort}
  isStreaming={isStreaming}
  fileCount={files.length}
  chipCount={chips.length}
  onFilesSelected={addFiles}
  onRemoveLastChip={removeLastChip}
  showDictate
  slashItems={slashItems}
  onSlashSelect={(item, { openFilePicker }) => run(item, openFilePicker)}
  attachments={<AttachmentStrip />}
  chips={<ChipRow />}
  plusMenuExtra={<SkillPickerAndConnectionRows />}
  getPrediction={complete}
  className={composerClass}
  borderClassName={borderClass}
  submitButtonClassName={submitBg}
  submitIconClassName={submitText}
/>
```

| Prop | Default | Notes |
| --- | --- | --- |
| `value`, `onChange`, `defaultValue` | uncontrolled, `""` | `onSubmit` clears the draft through `onChange("")` first. Restore it yourself if sending fails. |
| `onSubmit(text)` | none | Trimmed text. Not called while `isSending`, or when send is disabled. |
| `onStop`, `isStreaming`, `isSending`, `isUploading` | off | While streaming, stop shows next to send, and send queues. Sending or uploading shows a spinner and disables send. |
| `canSubmit` | text, or `fileCount` or `chipCount` above 0 | Overrides when send is enabled. |
| `fileCount`, `chipCount` | `0` | Compact mode needs them: files or chips keep the card open. |
| `showDictate`, `onDictateTranscription` | off, append to draft | |
| `showFileUpload`, `onFilesSelected`, `onAttachFile`, `attachAccept` | on, none, click the hidden input, images and PDF | The hidden input and drop handling appear only with `onFilesSelected`. `onAttachFile` replaces the click. |
| `banners`, `promoBanner`, `queue`, `attachments`, `chips`, `plusMenuExtra` | none | Slots. `plusMenuExtra` goes after the attach row: include your own `DropdownMenuSeparator`. |
| `slashItems`, `onSlashSelect`, `renderSlashItem` | menu off | Build items with `buildComposerSlashItems`. `renderSlashItem(item, row)` wraps a row, for example in a hover card. |
| `getPrediction`, `predictionEnabled` | off, `true` | Ghost text. Tab accepts, Esc dismisses. Paused while the `/` menu is open. |
| `className`, `containerClassName`, `borderClassName`, `submitButtonClassName`, `submitIconClassName`, `placeholder` | none | The app passes its own class strings for an exact match. |

Building blocks: `InputActions`, `ConnectionStatusMenuItem` (icon, label, description, `connected`, `onClick`, `title`), `InputBanners`, `PromoBanner` (`show`, `onUpgrade`, `onDismiss`, text as children), `FadePresence`, `ComposerSlashMenu`, `ComposerSlashRow`, and the hooks and helpers listed in the changelog. Parity against the original: `composer/examples/parity/PARITY.md`. App migration: `composer/MIGRATION.md`.

### Composer (deprecated)

> **Deprecated in 0.4.0.** Use `InputArea`. The 0.3 `Composer` was written from scratch and does not match the app composer. It stays exported and unchanged for existing consumers, and is not removed in 0.4.0.

Chat composer with an autosizing textarea, a footer with a plus-menu slot, action slots and a send or stop button. It also shows optional ghost-text predictions. It makes no network calls: the app supplies `getPrediction`.

```tsx
import { Composer, ComposerIconButton } from "@vvedantb/ui"; // or "@vvedantb/ui/composer"

<Composer
  value={draft}
  onChange={setDraft}
  onSubmit={(text) => send(text)}
  streaming={isStreaming}
  onStop={cancel}
  plusMenu={<ComposerIconButton aria-label="Add">+</ComposerIconButton>}
  attachments={chips}
  getPrediction={(draft, { signal }) => fetchContinuation(draft, signal)}
/>;
```

| Prop | Default | Notes |
| --- | --- | --- |
| `value`, `defaultValue`, `onChange` | uncontrolled, `""` | Pass `value` to control it. When controlled, clear the value yourself after `onSubmit`. When uncontrolled, the composer clears after submit. |
| `onSubmit(text)` | none | Called with the trimmed draft on Enter or the send button. By default it is not called for an empty draft, or when `disabled` or (with `stopMode="replace"`) `streaming`. A `canSend` override that allows an empty draft calls it with `""`. If it returns a rejected promise, an uncontrolled composer restores the draft. |
| `streaming`, `onStop` | `false` | The stop button calls `onStop`. With `stopMode="replace"` it replaces send and Enter does not submit. Typing stays on. |
| `stopMode` | `"replace"` | `"alongside"` shows stop and send together while streaming, in the order `trailingActions`, stop, send. Send stays usable to queue the next message: Enter and the send button submit while streaming when `canSend` allows. Not streaming, only send shows. Predictions stay off while streaming. |
| `canSend` | trimmed draft is not empty | `boolean` or `(draft: string) => boolean`. Overrides whether send is enabled. The function gets the live draft (not trimmed). `disabled` and, in replace mode, `streaming` still block send. With attachments, use `canSend={(draft) => draft.trim() !== "" \|\| hasAttachments}`. `onSubmit` then gets `""` for an empty draft. |
| `disabled` | `false` | Disables the textarea and send. |
| `placeholder` | `"Message"` | Also the textarea `aria-label`. |
| `layout` | `"stacked"` | `"stacked"`: input above, footer bar with `plusMenu` left and `trailingActions` plus send or stop right. `"inline"`: one row with `plusMenu`, the input and the actions. Attachments stay above the row. |
| `renderInput(ctx)` | none | Supplies your own input instead of the textarea. See Building blocks. |
| `maxHeight` | `200` (px) | The textarea grows to this height, then scrolls. |
| `autoFocus`, `className`, `textareaClassName` | none | `className` is the outer shell. `textareaClassName` is also applied to the ghost text mirror, so put padding and font classes there, not on the shell. |
| `plusMenu` | none | Node, or `({ disabled }) => node`. Left of the footer. |
| `trailingActions` | none | Node, or `({ disabled, streaming }) => node`. Right of the footer, before send or stop. |
| `attachments` | none | Node rendered in a row above the textarea. The app renders the chips and their remove buttons. |
| `getPrediction(draft, { signal })` | none | Returns the continuation of `draft`. Pass `signal` to your request. Errors show no ghost text. |
| `predictionDebounceMs` | `500` (ms) | Pause after the last edit before a request. |
| `predictionMinLength` | `12` (characters) | Minimum trimmed draft length. |

Keys: Enter sends, Shift+Enter adds a line, and nothing sends during IME composition. Tab accepts the ghost text, and Esc hides it for the current draft.

Predictions skip drafts shorter than `predictionMinLength`, drafts whose last word starts with `@` or `/`, and drafts that match `/[.!?]\s*$/`. Each edit aborts the previous request, and a result for an older draft is dropped. Ghost text shows only while the caret is at the end of the draft, so Tab always appends. It does not insert at a caret in the middle of the text. A space joins the draft and the prediction when neither has whitespace at the join.

The ref goes to the textarea. `ComposerIconButton` is a round icon-only ghost button for the slots. The pure helpers `shouldSkipComposerPrediction`, `joinComposerPrediction`, `nextComposerPredictionState`, `visibleComposerPrediction` and `acceptComposerPrediction`, and the `useComposerPrediction` hook, are exported for apps with their own input.

### Building blocks

`renderInput` swaps the textarea for your own input and keeps the shell, slots, send or stop and predictions. The context gives `value`, `onChange`, `onKeyDown`, `ghostText`, `acceptGhost`, `dismissGhost`, `inputRef`, `disabled`, `placeholder`, `streaming`, `maxHeight` and `textareaClassName`.

```tsx
<Composer
  layout="inline"
  getPrediction={getPrediction}
  renderInput={(ctx) => (
    <MyEditor
      ref={ctx.inputRef}
      data-composer-input=""
      value={ctx.value}
      onChange={ctx.onChange}
      onKeyDown={ctx.onKeyDown}
      ghostText={ctx.ghostText}
    />
  )}
/>
```

Rules for a custom input:

- `onKeyDown` handles Enter (calls `preventDefault`, then submits, never during IME composition), Tab (accepts the ghost text) and Esc (dismisses it). Shift+Enter is not handled: your editor decides what a newline does.
- Autosize and the caret-at-end ghost gate apply to the default textarea only. With `renderInput`, predictions run whenever the composer is not disabled or streaming. You size the editor (use `maxHeight`) and decide when the caret allows ghost text, for example by ignoring `ghostText`.
- Put the `data-composer-input` attribute on the editor so the shell shows the focus ring.
- `ref` on `Composer` points at the default textarea only. Use `ctx.inputRef` for a custom input.

To build without `Composer`, assemble the parts yourself. `useComposerPrediction` takes the draft string and reads no element. `ComposerGhostText` draws the draft invisibly, then the ghost text, so give it the same padding and font classes as your editor and place it under the editor.

```tsx
import { ComposerGhostText, ComposerShell, useComposerPrediction } from "@vvedantb/ui/composer";

function MentionComposer({ draft, setDraft, send }: Props) {
  const prediction = useComposerPrediction({ value: draft, enabled: true, getPrediction });
  return (
    <ComposerShell layout="inline" plusMenu={plus} canSend={draft.trim() !== ""} onSend={send}>
      <ComposerGhostText value={draft} ghostText={prediction.ghost} className="px-2 py-1 text-sm leading-6" />
      <Editor data-composer-input="" className="relative px-2 py-1 text-sm leading-6" onChange={setDraft} />
    </ComposerShell>
  );
}
```

`ComposerShell` props: `layout`, `disabled`, `streaming`, `canSend` (always a boolean: `Composer` resolves the function form), `stopMode` (`"replace"` or `"alongside"`, where the buttons render), `onSend`, `onStop`, `plusMenu`, `trailingActions`, `attachments`, `className` and `children` (the input region). In the shell the Enter, Tab and Esc keys are yours to wire when you do not use `Composer`.

Fixture: `composer/examples/` (see its README). It has a `tokens.css` page and a `compat-shadcn-rgb.css` page, each with light and dark.

## Sessions hover card

```tsx
import { SessionsHoverCard } from "@vvedantb/ui/shell";

<SessionsHoverCard
  header="Session title"
  loadContent={() => fetchPreview(id)}
  footer="Updated today"
>
  <button type="button">Row</button>
</SessionsHoverCard>
```

`children` is the trigger. It is rendered with `asChild` by default, so it keeps its own handlers (such as a context menu). Extra props and the ref go to it. Use `asChild={false}` for a default trigger element. The content portals to `document.body` by default, so `overflow:hidden` ancestors do not clip it. Pass `portal={false}` to opt out. `surface` is `"overlay"` (default), `"surface"` (`rounded-surface`) or `"glass"` (`glass-panel-strong`, `rounded-surface`). `className` merges over the surface without `!`. Defaults: `openDelay` 400 ms, `closeDelay` 150 ms, `side="right"`, `align="start"`, `sideOffset` 8, width and padding `w-64 p-3` (override with `className`). `body` is a node or a function of `{ open }`. `loadContent` runs only while the card is open. Control the state with `open`, `defaultOpen` and `onOpenChange`. The card opens on pointer hover and on keyboard focus (`:focus-visible`) only. Focus that follows a click or a context menu close does not open it. If pointer-driven focus left it stuck open, pointer leave force-closes it; otherwise Radix handles close (including moving onto the content). Fixture: `shell/examples/sessions-hover-card/`.

## Toaster

```tsx
import { toast } from "sonner";
import { SonnerToaster } from "@vvedantb/ui"; // or "@vvedantb/ui/sonner"

<SonnerToaster
  theme={theme}
  toastRadius="surface"
  toastIcons="filled24"
  closeButtonStyle="hoverChip"
  sonnerVars
  descriptionMuted
/>;
```

With no new props the toaster looks as it did in 0.2.1. Caller props merge with the package defaults instead of replacing them:

- `toastOptions.classNames`: per key, the package classes come first and the caller classes follow, so callers can override utilities. Other `toastOptions` fields (such as `duration`) take the caller value.
- `icons`: merged per key. With `toastIcons="filled24"` the caller overrides single icons and keeps the rest.
- `style`: merged over the package style. `className` is appended.

Opt-in props (all default to the current look):

| Prop | Values | Effect |
| --- | --- | --- |
| `toastRadius` | `"lg"` (default), `"surface"`, `"control"` | `rounded-lg`, `rounded-surface` (from `tokens/css/utilities.css`) or `rounded-field` (the input radius). |
| `density` | `"default"`, `"compact"` | Current padding and text, or `gap-2 px-3 py-2 text-xs` with `text-xs` descriptions. |
| `toastIcons` | `"default"`, `"filled24"` | Sonner icons or 24px filled success, info, warning and error icons, a matching loader and a 14px close cross. |
| `closeButtonStyle` | `"default"`, `"hoverChip"` | Text-style close button or a round chip at the top-right, shown on hover and always on small screens. It turns on `closeButton` unless you set it. |
| `sonnerVars` | `false` (default), `true` | Sets `--normal-bg`, `--normal-border`, `--normal-text`, `--normal-bg-hover` and `--normal-border-hover` from `--color-card`, `--color-border`, `--color-foreground` and `--color-muted`, and `font-family: inherit`. |
| `descriptionMuted` | `false` (default), `true` | Description uses `text-muted-foreground!`, which beats sonner's dark-theme rule. |
| `titleLeading` | `"snug"` (default), `"5"` | Title `leading-snug` (19.25px at `text-sm`) or `leading-5` (20px). |
| `loadingIcon` | node (default none) | Custom loading icon, merged into `icons`. A caller `icons.loading` wins. `icons={{ loading }}` works with both `toastIcons` values. |
| `hideStackedContent` | `false` (default), `true` | Adds `[&[data-expanded=false][data-front=false]>*]:opacity-0` to the toast, so content behind the front toast is hidden while the stack is collapsed. `sonner.css` applies the same rule when imported. |

With `closeButtonStyle="hoverChip"`, hover changes the text colour, and sonner may still change the background. The border stays `border-border` (pinned with `hover:border-border!` over sonner's dark hover border), so the ring does not brighten in dark mode.

Helpers: `createToasterClassNames`, `mergeToastClassNames`, `mergeToastOptions`, `mergeToasterStyle`, `filledToastIcons`. Fixture: `tokens/examples/toaster/`.

## Colour names in components

Components use `text-muted-foreground`, `primary` and `--color-*` theme variables. They no longer use `text-muted`, `*-accent` or raw `var(--muted)` reads, which clash with shadcn names. `tokens.css` still defines `--color-muted` and `--color-accent`. `pnpm --filter @vvedantb/ui check:tokens` fails if a component brings the old names back (it also runs in `build`, `test` and `verify`).

## Using an existing shadcn RGB theme

Use this when the app defines shadcn-style variables as space-separated channels (`--background: 244 245 246`) and reads them as `rgb(var(--background) / 0.5)`.

1. Import `compat-shadcn-rgb.css` **instead of** `tokens.css`. Never import both.
2. The app keeps `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring` (each with its `-foreground` where shadcn has one) and `--radius`. The compat file does not define them. It only references them, so the app can change `--primary`, `--ring`, `--radius` or `--font-sans` at runtime.
3. Add the `@source` line for the package sources.

```css
@import "tailwindcss";
@import "@vvedantb/ui/tokens/css/compat-shadcn-rgb.css";
@source "../node_modules/@vvedantb/ui/src/**/*.{ts,tsx}";
```

Shared CSS that is safe without `tokens.css`: `compat-shadcn-rgb.css`, `dialog.css`, `utilities.css`, `scrollbar-thin.css` (reads `--scrollbar`, which the compat file defines), `modal.css` and `tabs.css` (both need the app motion variables listed in `tokens/README.md`), and `animations.css` (not with the Tailwind preset). `base.css` and `tabs-pills.css` read raw `--accent`, `--foreground`, `--muted`, `--segment` and `--default`; skip them unless the app defines those as full colour values.

The compat file includes a fallback `glass-panel-strong` (`rgb(var(--card) / 0.95)` with a 12px blur) for toasts and dialogs. Declare your own `@utility glass-panel-strong` after the import to override it.

A fixture that renders the main components against sample light and dark RGB variables is in `tokens/examples/compat-shadcn-rgb/`.

`@clerk/clerk-react`, `@tanstack/react-hotkeys` and `zod` are optional peers. Install them only if you import `@vvedantb/ui/app`.

Full documentation: the repository `README.md`. Upgrading from `@vvedantb/tokens`, `@vvedantb/shell` or `@vvedantb/app-kit`: `MIGRATION.md`.

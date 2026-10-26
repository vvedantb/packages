# @vvedantb/ui

Shared React 19 web UI. Source-exported: no build step.

| Import | What it is |
| --- | --- |
| `@vvedantb/ui` | The only JavaScript entry. Primitives (Radix-based), AI elements, audio (`playChime`, `useReplyChime`, `playTone`), `toast` and `SonnerToaster`, the composer (`InputArea`, deprecated 0.3 `Composer`), shell (`SidebarHeader`, `SidebarUpgradeCard`, `PillTabs`, `SessionsHoverCard`, and the app shell: `AppShell`, `AppSidebar`, `SidebarRail`, `RailTile`, `SidebarPanel`, `SidebarAccountMenu`, `SignOutDialog` and related helpers), app helpers (confirm skip, update watcher, settings chrome, `useStableAuth`, and from 0.8.0 `createThemeProvider`, `createPageTitleContext`, `PageMotionProvider` and `formatCompactRelativeTime`), marketing pieces from 0.9.0 (`createLandingKit` and the `Landing*` parts, `SiteFooter`, `PricingModal`), animated nav icons from 0.11.0 (`MemoryIcon`, `BoardIcon`, ... and `NavIconBase`; `SettingsIcon` `variant` from 0.12.0), artifact viewers from 0.13.0 (`ArtifactFrame`, `ArtifactList`, `ArtifactViewer`, ...), date pickers from 0.14.0 (`Calendar`, `DatePicker`, `DateTimePicker`, `MonthPicker`), `cn`, and the native tokens `tokens` and `Tokens`. See `app/README.md` in the repository for the app helpers. |
| `@vvedantb/ui/tokens` | `tokens.css`: colour, radius, shadow, ease and font tokens for Tailwind v4. CSS. |
| `@vvedantb/ui/tokens/tokens.css` | Same file as `@vvedantb/ui/tokens`. CSS. |
| `@vvedantb/ui/tokens/css/*.css` | `index`, `base`, `dialog`, `modal`, `tabs`, `tabs-pills`, `utilities`, `scrollbar-thin`, `clear-input`, `motion`, `animations`, `nav-icons`, `compat-shadcn-rgb`, `border-beam` (opt-in, for `BorderBeam`), `markdown` (opt-in, for `Markdown`). CSS. `tokens.css` imports `scrollbar-thin`, `clear-input` and `motion`. |
| `@vvedantb/ui/tokens/compat/shadcn-rgb.css` | Same file as `tokens/css/compat-shadcn-rgb.css`. CSS. |
| `@vvedantb/ui/tokens/tailwind-preset` | Tailwind preset (`.mjs`) for `@config "@vvedantb/ui/tokens/tailwind-preset"`. Kept as a build-tool entry: Tailwind needs a resolvable package path, and it is not a React API. |
| `@vvedantb/ui/landing.css` | Landing page classes (`landing-atmosphere`, `landing-grain`, `landing-pulse-dot`, ambient graph and preview animations, smooth `#top` scrolling). CSS. |
| `@vvedantb/ui/package.json` | Package metadata. |

Removed in 0.4.0-rc.1: the `/cn`, `/sonner`, `/audio`, `/shell`, `/app`, `/composer` and `/tokens/native` subpaths. Import from `@vvedantb/ui`. See [`MIGRATION.md`](MIGRATION.md).

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
- The root barrel has no top-level side effects, so an app that imports only the audio symbols bundles only audio code.
- `useReplyChime`: chimes once when `isStreaming` goes from `true` to `false` for the same `threadId`. It is silent on the first sight of a thread, when `threadId` changes, and when `threadId` is null or undefined. While `enabled` is `false` it still tracks the edge, so enabling mid-turn does not replay a finish.

## Composer

### InputArea (recommended)

`InputArea` is the chat composer extracted from an app: a pill that grows into a card, a plus menu, dictate, stop and send, ghost text, a `/` menu, and slots for banners, a queue, attachments and chips. It is presentational. It makes no requests and reads no router, billing or storage. The app passes data in and handles callbacks. It adds its own `TooltipProvider` and `LazyMotion`, so it needs no app provider.

```tsx
import { InputArea, InputBanners, buildComposerSlashItems } from "@vvedantb/ui";

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
| `value`, `onChange`, `defaultValue` | uncontrolled, `""` | `onSubmit` clears the draft through `onChange("")` first. Restore it yourself if sending fails. A value of `"\n"` shows as an empty editor with the placeholder, and the editor never reports a trailing line holder newline (0.5.4). |
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

Building blocks: `InputActions`, `ConnectionStatusMenuItem` (icon, label, description, `connected`, `onClick`, `title`), `InputBanners`, `PromoBanner` (`show`, `onUpgrade`, `onDismiss`, text as children), `FadePresence`, `ComposerSlashMenu`, `ComposerSlashRow`, and the hooks and helpers listed in the changelog. Parity against the original: `composer/examples/parity/PARITY.md`. App migration: `composer/MIGRATION-INPUTAREA.md`.

### Composer (deprecated)

> **Deprecated in 0.4.0-rc.1.** Use `InputArea`. The 0.3 `Composer` was written from scratch and does not match the app composer. It stays exported and unchanged for existing consumers, and is not removed in 0.4.0-rc.1.

Chat composer with an autosizing textarea, a footer with a plus-menu slot, action slots and a send or stop button. It also shows optional ghost-text predictions. It makes no network calls: the app supplies `getPrediction`.

```tsx
import { Composer, ComposerIconButton } from "@vvedantb/ui";

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
import { ComposerGhostText, ComposerShell, useComposerPrediction } from "@vvedantb/ui";

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

## Sidebar upgrade card

```tsx
import { SidebarUpgradeCard } from "@vvedantb/ui";

{!isPro && <SidebarUpgradeCard onUpgrade={() => setPricingOpen(true)} />}
{!isPro && <SidebarUpgradeCard collapsed onUpgrade={() => setPricingOpen(true)} />}
```

Shows the title "Upgrade to Pro" and an "Upgrade" pill, with no mark. The title fits in full at 254px. `collapsed` renders a round button with the short text "Pro", labelled "Upgrade to Pro" for narrow rails. The card does not check the plan, so the app hides it for Pro users.

## Sessions hover card

```tsx
import { SessionsHoverCard } from "@vvedantb/ui";

<SessionsHoverCard
  header="Session title"
  loadContent={() => fetchPreview(id)}
  footer="Updated today"
>
  <button type="button">Row</button>
</SessionsHoverCard>
```

`children` is the trigger. It is rendered with `asChild` by default, so it keeps its own handlers (such as a context menu). Extra props and the ref go to it. Use `asChild={false}` for a default trigger element. The content portals to `document.body` by default, so `overflow:hidden` ancestors do not clip it. Pass `portal={false}` to opt out. `surface` is `"overlay"` (default), `"surface"` (`rounded-surface`) or `"glass"` (`glass-panel-strong`, `rounded-surface`). `className` merges over the surface without `!`. Defaults: `openDelay` 400 ms, `closeDelay` 150 ms, `side="right"`, `align="start"`, `sideOffset` 8, width and padding `w-64 p-3` (override with `className`). `body` is a node or a function of `{ open }`. `loadContent` runs only while the card is open. Control the state with `open`, `defaultOpen` and `onOpenChange`. The card opens on pointer hover and on keyboard focus (`:focus-visible`) only. Focus that follows a click or a context menu close does not open it. If pointer-driven focus left it stuck open, pointer leave force-closes it; otherwise Radix handles close (including moving onto the content). Fixture: `shell/examples/sessions-hover-card/`.

## Panels, search and confirm

```tsx
import { ConfirmDialog, SearchInput, SlideOverPanel } from "@vvedantb/ui";

<div className="relative">
  <SlideOverPanel open={open} onClose={() => setOpen(false)} header={<h2>Details</h2>}>
    <div className="p-4">Body</div>
  </SlideOverPanel>
</div>

<SearchInput value={query} onChange={setQuery} label="Search files" shortcut="/" />

<SearchInput variant="toolbar" value={query} onChange={setQuery} />

<ConfirmDialog size="sm" open={open} onOpenChange={setOpen} title="Delete item?" variant="destructive" onConfirm={remove} />

<ConfirmDialog size="md" open={open} onOpenChange={setOpen} title="Delete item?" description="This cannot be undone." confirmLabel="Delete" variant="destructive" onConfirm={remove} />
```

- `SlideOverPanel`: a right-side panel, absolutely positioned inside its nearest positioned parent. It is not a portal or dialog. It slides in with a spring and is hidden below `md`. Only the close button closes it (no Escape, no outside click). `width` is `"w-96"` (default) or `"w-80"`. `closeLabel` defaults to `"Close panel"`. `className` merges last.
- `SearchInput`: the search field. A `ClearInput` with a search icon on the left and the clear button on the right (shown while there is text; clearing calls `onChange("")`). `label` (default `"Search"`) is the `aria-label` and, without `placeholder`, the placeholder. `clearLabel` defaults to `"Clear search"`. `shortcut` (such as `"/"` or `"⌘K"`) shows a `Kbd` hint on the right while the value is empty. `size`: `"sm"` (`h-8`, default) or `"md"` (`h-10`). `variant`: `"default"` or `"toolbar"` (transparent until hover or focus, `rounded-field`, full width on mobile and `sm:w-44 md:w-52`). Other input props pass through; `enterKeyHint="search"`. `className` goes to the `<input>`, `wrapperClassName` to the wrapper, the ref to the `<input>`.
- `ToolbarSearchInput` (deprecated in 0.17.0): a wrapper over `<SearchInput variant="toolbar">` with `placeholder="Search..."`. `className` goes to the wrapper, `inputClassName` to the `<input>`.
- Field focus: every field (`Input`, `Textarea`, `Select` and `RadixSelect` triggers, `ClearInput`, `SearchInput`, `InputGroup`, date and time picker triggers) uses `fieldFocusClass`: the border turns `focus-border` and a 1px `ring-focus-ring` shows. Wrappers use `fieldFocusWithinClass` (`has-focus-visible:`). Both are exported for app fields.
- `ConfirmDialog` `size`: `"default"` keeps the alert dialog. `"sm"` renders a compact, dismissible dialog (outside click, Escape and the close button close it) with small Cancel and confirm buttons. Cancel calls `onCancel` and then `onOpenChange(false)`. Confirm calls `onConfirm` only, so the caller closes it. `"md"` (0.5.2) is dismissible like `"sm"`, with the title in a header (`pb-4`), the description in its own section (`py-6`) and a footer (`pt-4`) with default-size buttons. It has the same Cancel and confirm behaviour as `"sm"`.
- Legacy (still supported): the `ConfirmDialog` `size`, `variant`, `cancelLabel` and `confirmLabel` props. For anything they do not cover, compose the parts (see [Composable parts](#composable-parts-060-options-061)).

## Buttons, menus and fields (0.4.4)

All of these are opt-in. Without the new props, components render as before.

```tsx
import {
  Button, CardHeader, CommandDialog, DropdownMenuContent, DropdownMenuItem,
  FadePresence, PanelTransition, PopoverContent, SelectField, SelectItem,
  fadeUpSpring, restoreModalScrollLock,
} from "@vvedantb/ui";

<Button variant="flat" loading={saving} endContent={<IconArrowRight />}>Save</Button>

<DropdownMenuContent fitViewport suppressAltKey restoreScrollLockOnClose>
  <DropdownMenuItem startContent={<IconFile />} endContent={<Kbd>⌘O</Kbd>}>Open</DropdownMenuItem>
</DropdownMenuContent>

<SelectField id="tone" label="Tone" placeholder="Pick one" value={tone} onValueChange={setTone}>
  <SelectItem value="calm">Calm</SelectItem>
</SelectField>

<FadePresence show={visible} variants={fadeUpSpring}>…</FadePresence>
```

- `Button`: variants `flat`, `success` and `warning` (each is `ghost` plus an override). `loading` disables the button, sets `data-loading="true"` and shows a spinner in place of `startContent`; without `loading` there is no `data-loading` attribute. `endContent` renders after the children. Both are ignored with `asChild` (`loading` still disables).
- `DropdownMenuContent`: `fitViewport` caps the height on small screens and scrolls. It reads the optional `--vv-height` CSS variable, which the app may set to the visual viewport height (falls back to `70dvh`). `suppressAltKey` stops a bare Alt press from moving focus. `restoreScrollLockOnClose` calls `restoreModalScrollLock` on close (now and on the next tick). `ContextMenuContent` takes `suppressAltKey` too.
- `DropdownMenuItem` `endContent` and `ContextMenuItem` `startContent`, `description` and `endContent`: the label moves into a growing column (`min-w-0 flex-1`), the description sits under it and `endContent` sits at the end. `DropdownMenuSubTrigger` and `ContextMenuSubTrigger` take `startContent`.
- `PopoverContent` `fitViewport`: grows from the trigger (`--radix-popper-transform-origin`), defaults `collisionPadding` to 8 (your value wins) and, on small screens, caps width to `100vw - 1.5rem` and height as above.
- `CommandDialog`: `title` and `description` add a visually hidden dialog header. `className` merges onto the dialog content. `shouldFilter` goes to `Command`. `listLayout` is `"pinned"` (default, fixed list height) or `"auto"` (the list sizes itself and items keep your styling).
- `restoreModalScrollLock()`: clears body `pointer-events`, and, when no dialog or alert dialog is open, the body and root `overflow` and body `padding-right` left by a modal menu.
- `CardHeader`: `flex flex-col space-y-1.5 p-6`.
- `SelectField`: a labelled single select built from `Select`. Children are `SelectItem`s. An empty `value` shows the placeholder. `id` goes to the trigger and the label points at it. `className` merges onto the trigger.
- Motion: `springTransition`, `springFastTransition` and `fadeUpSpring` presets. `FadePresence` takes optional `variants` (`hidden`, `show`, `exit`); omitted, it keeps its opacity fade. `PanelTransition` wraps children in React `ViewTransition` with `default="none"` and `enter`/`exit` classes (`vt-panel-in`, `vt-panel-out` by default). It needs a React build that exports `ViewTransition`, and the app supplies the `::view-transition-*` CSS.

## App shell (0.5.0 to 0.5.4)

A sidebar and main page layout, extracted from existing app markup. It is router-free: pass your own links (with `asChild`), state and media query result. Tooltips need a `TooltipProvider` above the shell.

```tsx
import {
  AppShell, AppSidebar, SidebarRail, RailTile, RailDivider, SidebarPanel,
  SidebarAccountMenu, DropdownMenuItem, railBadgeClass,
} from "@vvedantb/ui";

<AppShell
  panelHidden={collapsed || !hasPanel}
  sidebar={
    <AppSidebar
      isDesktop={isDesktop}
      collapsed={collapsed}
      panelHidden={!hasPanel}
      mobileOpen={open}
      onMobileOpenChange={setOpen}
      mobileTitle={pageTitle}
      rail={
        <SidebarRail
          showDivider={hasPanel && !(isDesktop && collapsed)}
          top={<RailTile asChild label="Home" active={isHome}><Link to="/"><IconHome size={22} /></Link></RailTile>}
          bodyClassName="scrollbar-thin"
          footerClassName="border-t border-separator"
          footer={<SidebarAccountMenu name={name} email={email} imageUrl={avatarUrl}><DropdownMenuItem>Settings</DropdownMenuItem></SidebarAccountMenu>}
        >
          <RailDivider />
        </SidebarRail>
      }
      panel={<SidebarPanel title="Library" collapsed={collapsed} onClose={isDesktop ? undefined : () => setOpen(false)}>{nav}</SidebarPanel>}
    />
  }
>
  {page}
</AppShell>
```

- Widths: `AppShell` sets `--app-shell-rail-width` (default `4rem`), `--app-shell-sidebar-width` (rail plus panel, default `20rem`) and `--app-shell-mobile-header-height` (default `calc(3.5rem + env(safe-area-inset-top, 0px))`) as inline style. Change them with `railWidth`, `sidebarWidth` and `mobileHeaderHeight`. The other pieces read these variables. Outside `AppShell`, set the variables yourself or pass a width class with `className`.
- `AppShell`: `sidebar`, `children`, `panelHidden` (main offsets by the rail width instead of the sidebar width), `skipLinkLabel` (`"Skip to main content"`), `mainId` (`"main-content"`), `className`, `mainClassName`, `contentClassName`.
- `AppSidebar`: legacy (still supported) `rail`, `panel` and `mobile*` props; compose `Sidebar.*` instead. `rail`, `panel` (not rendered while `panelHidden`), `collapsed`, `panelHidden`, `isDesktop`, `mobileOpen`, `onMobileOpenChange`, `id` (default from `useId`), `asideProps` (`data-*` attributes for the `<aside>`), `className`, `mobileTitle`, `mobileHeaderActions` (0.5.2; trailing actions such as icon buttons, in place of the end spacer), `mobileMenuIcon` (`(open) => node`, default a menu icon), `mobileMenuLabel` (`"Open navigation menu"`), `closeLabel` (`"Close navigation"`). Swipe left or Escape closes the drawer. The drawer is `inert` while closed on mobile, and closes when `isDesktop` becomes `true`. Close it on route change in the app. The mobile header is a three-column grid, so the title and trailing actions stay on one row and a long title truncates (0.5.4).
- `SidebarRail`: legacy (still supported) `top`, `footer`, `bodyAsChild`, `tabs` and `*ClassName` props; compose `Sidebar.Rail` parts instead. `top`, `children` (scroll body), `footer`, `showDivider`, `bodyAsChild` (the single child, for example a tabs list, becomes the body), `className`, `topClassName`, `bodyClassName`, `footerClassName`. Other HTML attributes (`id`, `data-*`, `aria-*`) go to the root `<div>`. The top and footer wrappers render only when their slot is set.
- `RailTile`: `label` (`aria-label` and tooltip), `active`, `tooltip`, `showTooltip` (default `true`), `badge` (inside the tile, after the children; style it with `railBadgeClass`), `asChild`, `className`. Without `asChild` it is a native `<button type="button">` (0.5.3), so icons keep their authored size; other props go to it. With `asChild` the child (for example a router link) gets the tile classes and `aria-current="page"` when active.
- `RailDivider`, `SidebarIconTooltip` (`label`, `enabled`, `side` `"right"`, `sideOffset` 8).
- `SidebarPanel`: legacy (still supported) `headerTrailing`, `onClose`, `closeLabel` and `closeButtonClassName`; compose `Sidebar.Panel` parts instead. `title`, `headerTrailing`, `onClose` (adds the close button; pass it on the mobile drawer only), `closeLabel`, `closeButtonClassName`, `collapsed` (`md:hidden`), `className`, `children`.
- `SidebarAccountMenu`: legacy (still supported) `badge`, `triggerProps`, `contentProps` and `stackedLabel`; compose `Sidebar.Account*` parts instead. `name`, `email` (two-line label when set), `stackedLabel` (two-line layout even without `email`, default `false`), `imageUrl` (initials without it), `align` (`"center"`), `side` (`"right"`), `sideOffset` (8), `collisionPadding`, `contentClassName`, `children` (menu items). 0.5.2 adds `badge` (unread dot beside the trigger, in a `relative` wrapper around the menu, so the trigger's dimming and press scale skip it: `true` shows it, `false` fades it out, omitted renders no wrapper and no dot), `triggerProps` (spread onto the trigger `Button` after the defaults; `className` merges last) and `contentProps` (spread onto `DropdownMenuContent`, for example `fitViewport` or `aria-label`; no `className`, use `contentClassName`). `SidebarAccountMenuPlaceholder` is the tile-sized loading box.
- `SignOutDialog`: legacy (still supported) `question` and `title`; compose `ConfirmDialog` parts with `alert={false}` for other copy. `open`, `onOpenChange` (not called with `false` while `pending`), `pending`, `onConfirm`, `description`, `contentClassName`, `title` (`"Sign out"`), `question` (`"Sign out of your account?"`).
- Class helpers: `railTileClass`, `railTileStateClass(active)`, `railBadgeClass`, `sidebarNavRowClass(isIconOnly)`, `sidebarNavLinkTextClass(isActive)`, `sidebarNavItemClass({ active, iconOnly, selected, dragging, dropTarget })`, `sidebarNavIconClass(active)`, `sidebarSectionLabelClass`, and the row parts `sidebarNavItemLeadingClass`, `sidebarNavItemLabelClass`, `sidebarNavItemSubtitleClass`, `sidebarNavItemTrailingClass`, `sidebarNavItemActionsClass` and `sidebarNavItemIndentStyle(indent)`. See [Menu item corners and sidebar nav rows (0.7.1)](#menu-item-corners-and-sidebar-nav-rows-071) and [Sidebar nav row parts (0.7.2)](#sidebar-nav-row-parts-072).

### Header actions and account badge (0.5.2)

All opt-in. Without these props the header keeps its end spacer and the account trigger has no dot.

```tsx
<AppSidebar
  /* … */
  mobileHeaderActions={
    <>
      <Button size="icon" variant="ghost" aria-label="Search"><IconSearch size={20} /></Button>
      <Button size="icon" variant="ghost" aria-label="New item"><IconPlus size={20} /></Button>
    </>
  }
/>

<SidebarAccountMenu
  name={name}
  badge={hasUnread}
  triggerProps={{ "aria-label": hasUnread ? `Account menu for ${name}, unread updates` : `Account menu for ${name}` }}
  contentProps={{ fitViewport: true, "aria-label": "Account" }}
>
  <DropdownMenuItem>Settings</DropdownMenuItem>
</SidebarAccountMenu>
```

The dot is `aria-hidden`, so say it in the trigger label when it matters, as above.

### Resizable panel (0.5.1)

Pass `resizable` to `AppShell`. Widths are panel px, rail excluded. Without it nothing changes.

```tsx
<AppShell
  resizable={{ storageKey: "sidebar-width", defaultWidth: 256, minWidth: 200, maxWidth: 480 }}
  sidebar={<AppSidebar /* as above */ />}
>
  {page}
</AppShell>
```

- `resizable`: `storageKey`, `defaultWidth`, `minWidth`, `maxWidth`, `label` (default `"Resize sidebar"`). The shell reads the stored width (a JSON number in `localStorage`) on mount, ignores invalid values, clamps it to the bounds and writes each change. Server and hydration renders use `defaultWidth`. `--app-shell-sidebar-width` becomes `calc(<railWidth> + <width>px)` and `sidebarWidth` is ignored. While resizing, the main margin and `<aside>` width transitions are off.
- `AppSidebar` adds the handle to the `<aside>` right edge on desktop while the panel shows (not `collapsed`, not `panelHidden`). The mobile drawer has none.
- `SidebarResizeHandle` (`className`): the handle, for custom layouts. Place it in a positioned parent. Dragging past the bounds rubber-bands and springs back on release. ArrowLeft and ArrowRight step 16px. Double-click resets to `defaultWidth`. It renders nothing outside a resizable `AppShell`.
- `useAppShellResize()`: `{ width, setWidth, isResizing, minWidth, maxWidth, defaultWidth }`, or `null` outside a resizable `AppShell`. `setWidth` takes a number or an updater.

```tsx
function PanelWidth() {
  const resize = useAppShellResize();
  return resize ? <span>{Math.round(resize.width)}px</span> : null;
}
```

### Rail tabs (0.5.1)

`SidebarRail tabs` renders the body as a Radix tabs list (arrow-key roving focus, same classes). Wrap the sidebar in a Tabs root with `orientation="vertical"` (the package `Tabs` works). `RailTile tabValue` renders a tabs trigger: tile classes, the children, the label as sr-only text instead of `aria-label`, then the badge. `active` drives the state classes and other props (for example `aria-expanded`) go to the trigger. `asChild` is ignored with `tabValue`. Without `tabs` and `tabValue` the rail renders as before.

```tsx
<Tabs value={tab} onValueChange={setTab} orientation="vertical">
  <AppSidebar
    /* … */
    rail={
      <SidebarRail tabs>
        <RailTile tabValue="files" label="Files" active={tab === "files"} aria-expanded={tab === "files" ? !collapsed : undefined}>
          <IconFiles size={22} />
        </RailTile>
        <RailTile tabValue="search" label="Search" active={tab === "search"}>
          <IconSearch size={22} />
        </RailTile>
      </SidebarRail>
    }
    panel={
      <>
        <TabsContent value="files">{files}</TabsContent>
        <TabsContent value="search">{search}</TabsContent>
      </>
    }
  />
</Tabs>
```

## Composable parts (0.6.0, options 0.6.1)

Shadcn-style building blocks. The prop-driven components above are thin compositions of them and render the same DOM.

Convention: compound parts are static members of a namespace object, `<Namespace>.<Part>`. There are four namespaces: `ConfirmDialog.*`, `AppShell.*`, `Sidebar.*` and (0.7.0) `EmptyState.*` (see [Spinner, empty state, tabs, badge and kbd](#spinner-empty-state-tabs-badge-and-kbd-070)). `ConfirmDialog` and `AppShell` stay callable with their legacy props. `Sidebar` is a plain object. Prop types are exported flat, for example `ConfirmDialogRootProps`, `AppShellMainProps` and `SidebarRailItemProps`. Every part that renders an element merges `className` last and forwards native props.

### `ConfirmDialog.*`

| Part | Purpose |
| --- | --- |
| `Root` | Radix dialog root. `size` (`"default"`, `"sm"`, `"md"`: layout slot for the other parts), `alert` (blocking alert dialog; default `size === "default"`), `pending` (swallows close requests, disables Cancel, Action shows its pending state), `confirmPhrase` (type-to-confirm; the typed text resets each time the dialog opens). 0.6.1: `dismissibleWhilePending` (Escape, outside click and the close button still close while `pending`; Cancel stays disabled), `focusCancel` (with `alert={false}`, Cancel gets `data-alert-cancel` so a `role="alertdialog"` Content focuses it on open). |
| `Content` | `AlertDialogContent` with `alert`, else `DialogContent`. `sm` and `md` add `sm:max-w-96`. Takes every `DialogContent` prop (`role`, `hideCloseButton`, ...). |
| `Header` | `DialogHeader`; `md` adds `pb-4`. |
| `Title` | `DialogTitle`; `sm` adds `mb-2 text-sm font-medium`. |
| `Description` | `DialogDescription`; `sm` and `md` add their spacing. |
| `Body` | Plain `<div>` for extra content. No default classes. |
| `Footer` | `DialogFooter` (`md` adds `pt-4`); `sm` renders a `flex justify-end gap-2` row. 0.6.1: `row` keeps a right-aligned row at every width, compact sheet included (`justify-end flex-row!`); no-op for `sm`. |
| `Cancel` | Alert: the outline `AlertDialogCancel` (closes through Radix). Otherwise a ghost `Button` that runs `onClick`, then (unless it called `preventDefault()`) the Root `onOpenChange(false)`. In both modes `preventDefault()` in `onClick` skips the close, and `variant` overrides the default. Disabled while pending. Default text `"Cancel"`. |
| `Action` | Confirm button. Never closes the dialog. Disabled while `disabled`, pending, or until `confirmPhrase` matches. `pendingLabel` replaces the children with a spinner (`spinnerSize`, default 14) and the label while pending. `pending` on Action alone shows the pending state without blocking close. 0.6.1: `spinnerClassName` merges after `animate-spin` (for example `"mr-2"`). |
| `Field` | Type-to-confirm input bound to `confirmPhrase` (trimmed, case-insensitive). `label` replaces the label content, `onEnter` runs on Enter while the phrase matches, `inputProps` go to the `Input`. |

`useConfirmDialog()` returns `{ size, alert, pending, focusCancel, phraseMatches, typed, setTyped, requestClose }` for custom parts.

### `AppShell.*`

| Part | Purpose |
| --- | --- |
| `Root` | Frame `<div>`. Sets the `--app-shell-*` variables (`railWidth`, `sidebarWidth`, `mobileHeaderHeight`), owns the `resizable` state, and passes `panelHidden` and `mainId` to the parts. `style` merges over the variables. |
| `SkipLink` | Visually hidden link to `<main>`. `label` (`"Skip to main content"`), `targetId` (default the Root `mainId`). |
| `Main` | The `<main>`. Offsets by the sidebar width, or the rail width while `panelHidden`. `id` defaults to the Root `mainId` (`"main-content"`). |
| `Content` | The content card inside `<main>`. |

### `Sidebar.*`

| Part | Purpose |
| --- | --- |
| `Root` | No DOM. Holds `isDesktop`, `mobileOpen`, `onMobileOpenChange`, `collapsed`, `panelHidden` and the drawer `id`. Closes the drawer at the desktop breakpoint. The chrome parts need it. |
| `MobileHeader` | Fixed header below `md`, a three-column grid (menu button, title, actions). Escape closes the drawer. Keep all three children so the columns line up. |
| `MobileMenuButton` | Opens the drawer. `label`, `icon` (`(open) => node`). |
| `MobileTitle` | Centred `<h1>` that truncates. Without children, an empty `<span>` keeps the middle column. |
| `MobileActions` | Trailing header actions. Without children, a spacer that keeps the title centred. |
| `Backdrop` | Drawer backdrop; a click closes the drawer. `label` (`"Close navigation"`). |
| `Aside` | The `<aside>`: fixed on desktop, a swipe-to-close drawer below it. `id` overrides the Root id. |
| `ResizeHandle` | `SidebarResizeHandle` in a resizable `AppShell`, shown on desktop while the panel shows. Place it inside `Aside`. |
| `Rail` | Rail column. `showDivider`. |
| `RailHeader` / `RailBody` / `RailFooter` | Top block, scroll body (`asChild`, `tabs` for a Radix tabs list) and bottom block. `Footer` is an alias of `RailFooter`. |
| `RailItem` | Rail tile with tooltip (`RailTile`): `label`, `active`, `tooltip`, `showTooltip`, `badge`, `asChild`, `tabValue`. |
| `RailSeparator` | Short rule between rail items (`RailDivider`). |
| `Tooltip` | Right-side icon tooltip (`SidebarIconTooltip`). |
| `Panel` | Panel column. `collapsed` (`md:hidden`) and `panelHidden` (renders nothing) default to the Root values. |
| `PanelHeader` | Padded header row for `PanelTitle` and `PanelActions`. |
| `PanelTitle` / `PanelActions` | The `<h2>` and the trailing actions. |
| `PanelClose` | Ghost close button. `label` (`"Close navigation"`). Without `onClick` it closes the drawer. |
| `NavItem` | Panel nav row (`sidebarNavItemClass`). `active` (fill, `font-medium`, `aria-current="page"`), `iconOnly`, `icon` (element; gets `sidebarNavIconClass`), `asChild` for a router link. A `<button type="button">` without `asChild`. 0.7.2: `selected`, `indent`, `dragging`, `dropTarget`; see [Sidebar nav row parts (0.7.2)](#sidebar-nav-row-parts-072). |
| `NavItemLeading` / `NavItemLabel` / `NavItemTrailing` / `NavItemActions` | Row parts (0.7.2): leading slot, truncated label, always-visible trailing content and hover-revealed actions. `<span>`, or the child with `asChild`. |
| `AccountMenu` | Dropdown root. `badge` adds the unread dot (`AccountBadge`) in a `relative` wrapper. |
| `AccountTrigger` | Rail-tile-sized avatar button. `userName` (default `title` and `aria-label`, and the initials), `imageUrl`, plus `Button` props; native `name` goes to the button. |
| `AccountAvatar` | Avatar image or initials. `userName`, `imageUrl`. |
| `AccountContent` | Menu content. Defaults `align="center"`, `side="right"`, `sideOffset={8}`, `w-56`. |
| `AccountLabel` | Identity label: avatar, `userName`, optional `email`, `stacked`. |
| `AccountSeparator` | Separator after the label. Kept separate so the label can stand alone. |
| `AccountBadge` | Unread dot. `visible` (default `true`; `false` fades it out). |

### Examples

A destructive confirm with a pending state and type-to-confirm:

```tsx
<ConfirmDialog.Root open={open} onOpenChange={setOpen} pending={deleting} confirmPhrase={item.name}>
  <ConfirmDialog.Content>
    <ConfirmDialog.Header>
      <ConfirmDialog.Title>Delete item?</ConfirmDialog.Title>
      <ConfirmDialog.Description>This cannot be undone.</ConfirmDialog.Description>
    </ConfirmDialog.Header>
    <ConfirmDialog.Field onEnter={remove} />
    <ConfirmDialog.Footer>
      <ConfirmDialog.Cancel />
      <ConfirmDialog.Action variant="destructive" pendingLabel="Deleting..." onClick={remove}>
        Delete
      </ConfirmDialog.Action>
    </ConfirmDialog.Footer>
  </ConfirmDialog.Content>
</ConfirmDialog.Root>
```

A dismissible rename dialog:

```tsx
<ConfirmDialog.Root open={open} onOpenChange={setOpen} alert={false}>
  <ConfirmDialog.Content>
    <ConfirmDialog.Header>
      <ConfirmDialog.Title>Rename</ConfirmDialog.Title>
    </ConfirmDialog.Header>
    <ConfirmDialog.Body>
      <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Name" />
    </ConfirmDialog.Body>
    <ConfirmDialog.Footer>
      <ConfirmDialog.Cancel />
      <ConfirmDialog.Action disabled={!name.trim()} onClick={save}>Save</ConfirmDialog.Action>
    </ConfirmDialog.Footer>
  </ConfirmDialog.Content>
</ConfirmDialog.Root>
```

A dismissible alert (0.6.1 options) that focuses Cancel, keeps a button row on mobile, and can still be closed while busy:

```tsx
<ConfirmDialog.Root open={open} onOpenChange={setOpen} alert={false} focusCancel pending={busy} dismissibleWhilePending>
  <ConfirmDialog.Content role="alertdialog">
    <ConfirmDialog.Header>
      <ConfirmDialog.Title>Delete item?</ConfirmDialog.Title>
      <ConfirmDialog.Description>This cannot be undone.</ConfirmDialog.Description>
    </ConfirmDialog.Header>
    <ConfirmDialog.Footer row>
      <ConfirmDialog.Cancel variant="outline" />
      <ConfirmDialog.Action variant="destructive" pendingLabel="Delete" spinnerSize={16} spinnerClassName="mr-2" onClick={remove}>
        Delete
      </ConfirmDialog.Action>
    </ConfirmDialog.Footer>
  </ConfirmDialog.Content>
</ConfirmDialog.Root>
```

Parts read the nearest Root through context, so `Footer`, `Cancel` and `Action` work inside a child component or a `<form>` rendered in `Content`. To show another step, render a different footer (and Content `role`) conditionally inside the same Root and Content.

A full shell:

```tsx
<AppShell.Root panelHidden={collapsed || !hasPanel} resizable={resizeOptions}>
  <AppShell.SkipLink />
  <Sidebar.Root
    isDesktop={isDesktop}
    mobileOpen={open}
    onMobileOpenChange={setOpen}
    collapsed={collapsed}
    panelHidden={!hasPanel}
  >
    <Sidebar.MobileHeader>
      <Sidebar.MobileMenuButton />
      <Sidebar.MobileTitle>{pageTitle}</Sidebar.MobileTitle>
      <Sidebar.MobileActions />
    </Sidebar.MobileHeader>
    <Sidebar.Backdrop />
    <Sidebar.Aside>
      <Sidebar.Rail showDivider>
        <Sidebar.RailHeader>
          <Sidebar.RailItem asChild label="Home" active={isHome}>
            <Link to="/"><IconHome size={22} /></Link>
          </Sidebar.RailItem>
        </Sidebar.RailHeader>
        <Sidebar.RailBody>
          <Sidebar.RailItem label="Search"><IconSearch size={22} /></Sidebar.RailItem>
        </Sidebar.RailBody>
        <Sidebar.RailFooter>
          <Sidebar.AccountMenu>
            <Sidebar.AccountTrigger userName={name} imageUrl={avatarUrl} />
            <Sidebar.AccountContent>
              <Sidebar.AccountLabel userName={name} email={email} imageUrl={avatarUrl} />
              <Sidebar.AccountSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
            </Sidebar.AccountContent>
          </Sidebar.AccountMenu>
        </Sidebar.RailFooter>
      </Sidebar.Rail>
      <Sidebar.Panel>
        <Sidebar.PanelHeader>
          <Sidebar.PanelTitle>Library</Sidebar.PanelTitle>
          <Sidebar.PanelActions>{isDesktop ? null : <Sidebar.PanelClose />}</Sidebar.PanelActions>
        </Sidebar.PanelHeader>
        {nav}
      </Sidebar.Panel>
      <Sidebar.ResizeHandle />
    </Sidebar.Aside>
  </Sidebar.Root>
  <AppShell.Main>
    <AppShell.Content>{page}</AppShell.Content>
  </AppShell.Main>
</AppShell.Root>
```

## Spinner, empty state, tabs, badge and kbd (0.7.0)

All of these are opt-in. Without the new props, components render as in 0.6.1.

```tsx
import {
  Badge, Button, EmptyState, Kbd, Spinner, Tabs, TabsList, TabsTrigger,
} from "@vvedantb/ui";

<Button disabled={saving}>
  {saving ? <Spinner size={14} tone="inherit" decorative className="mr-1.5" /> : null}
  Save
</Button>

<EmptyState.Root className="h-full">
  <EmptyState.Icon icon={IconFolder} />
  <EmptyState.Description>No files yet.</EmptyState.Description>
</EmptyState.Root>

<EmptyState.Root variant="panel">
  <EmptyState.Icon icon={IconLink} />
  <EmptyState.Title>No linked items</EmptyState.Title>
  <EmptyState.Description>Link one to see it here.</EmptyState.Description>
  <EmptyState.Actions><Button size="sm">Link</Button></EmptyState.Actions>
</EmptyState.Root>

<Tabs value={active}>
  <TabsList>
    <TabsTrigger value="keys" asChild>
      <Link to="/settings/keys">Keys</Link>
    </TabsTrigger>
  </TabsList>
</Tabs>

<Tabs value={feature} onValueChange={setFeature}>
  <TabsList variant="soft" aria-label="Features">
    <TabsTrigger value="notes"><IconNotes size={15} />Notes</TabsTrigger>
  </TabsList>
</Tabs>

<Badge variant="destructive-soft">Revoked</Badge>
<Kbd variant="subtle">Esc</Kbd>
```

- `Spinner` `size`: `"sm"`, `"md"` (default) and `"lg"` add a `size-*` class; a number is passed to the icon as its pixel size and adds no size class. `stroke` sets the stroke width. `tone`: `"muted"` (default) adds `text-muted-foreground`; `"inherit"` adds no colour class, so the spinner takes the current text colour. A colour class in `className` also replaces the muted default. `decorative` renders `aria-hidden="true"` with no `role="status"` or `aria-label`; use it where the parent already has a label, such as a busy button. Without it, `aria-label` in props replaces `"Loading"`.
- `EmptyState.*`: composable "nothing here yet" block. Parts read the Root `variant`.

| Part | Purpose |
| --- | --- |
| `Root` | `<div>`, centred column. `variant`: `"default"` (`px-4 py-20`, open) or `"panel"` (`rounded-lg bg-surface-secondary px-4 py-10`). |
| `Icon` | `icon` component (for example a Tabler icon). `default`: the bare icon, `size` 40, `mb-3 text-muted-foreground`. `panel`: the icon (`size` 22, `stroke` 1.5, `text-muted-foreground`) in an `h-11 w-11 rounded-lg bg-surface-tertiary` tile. `size` and `stroke` override; `className` goes on the outer element (icon or tile). |
| `Title` | `<p>`, `text-sm font-medium text-foreground`; `default` adds `mb-1`. `asChild` renders your element (for example an `h3`) instead. |
| `Description` | `<p>`, `text-sm text-muted-foreground`; `panel` adds `mt-1 max-w-[240px]`. |
| `Actions` | `<div>`, `mt-4`. |

- `TabsList` `variant="soft"`: borderless pills that wrap and centre (`flex flex-wrap items-center justify-center gap-1.5`). Triggers inside it are `rounded-full px-4 py-2 text-sm`, muted until active, filled with `bg-surface-secondary` when active or hovered, and `relative overflow-hidden` so a child such as a progress bar can sit on the bottom edge. It uses no `t-tabs` CSS and has no focus ring of its own. `pills` and `segmented` are unchanged. Link tabs work with any variant: `TabsTrigger asChild` around the router link (Radix sets `role="tab"`, `data-state` and roving focus on it). The package does not depend on a router.
- `Badge` `variant="destructive-soft"`: neutral border with a faint danger tint (`border-border bg-danger/10 text-danger`). Resolves to the same classes as a default badge with `className="bg-danger/10 text-danger"`. `variant="success"` already resolves to the same classes as a default badge with `className="border-success/25 bg-success/12 text-success"`.
- `Kbd` `variant="subtle"`: a plain filled key for inline hints, `rounded bg-surface-secondary px-1.5 py-0.5 text-foreground`. No fixed height, font or size, so it follows the surrounding text.

## Menu item corners and sidebar nav rows (0.7.1)

Visual change. Values in brackets are at the default `--radius: 1rem` and `--spacing: 0.25rem`.

The radius utilities now come with `tokens.css` (and `compat-shadcn-rgb.css`), so an app that imports `@vvedantb/ui/tokens` has them without another import:

| Utility | Value | Used by |
| --- | --- | --- |
| `rounded-surface` | `clamp(0.75rem, var(--radius), 1rem)` (16px) | Opt-in surfaces (Toaster `toastRadius="surface"`, `SessionsHoverCard`). Was in `utilities.css`. |
| `rounded-menu-item` | `min(var(--radius), 0.5rem)` (8px) | Menu items and sidebar nav rows. |
| `rounded-control` | `min(var(--radius), 0.625rem)` (10px) | Apps. |

The root `cn` knows these are radius classes, so `cn("rounded-lg", "rounded-menu-item")` keeps only the last one.

### Menu items

| Piece | Before | From 0.7.1 |
| --- | --- | --- |
| `DropdownMenu` and `ContextMenu` item, sub-trigger, checkbox item and radio item | `rounded-md`, `calc(var(--radius) - 2px)` (14px) | `rounded-menu-item` (8px) |
| Menu surface | `rounded-lg` (16px) | unchanged |

From 0.16.2, `Select` and `RadixSelect` items (`rounded-lg`, 16px), `CommandItem` (`rounded-md`, 14px) and `ComposerSlashMenu` rows (`rounded-lg`, 16px) also use `rounded-menu-item` (8px).

### Sidebar panel nav rows

Rows in the panel beside the rail. Rail tiles are unchanged.

| Piece | Before | From 0.7.1 |
| --- | --- | --- |
| Radius | none in the helper (apps added `rounded-lg`, 16px) | `rounded-menu-item` (8px) |
| Padding | `px-3 py-1.5` (12px / 6px) | `px-4 py-1.5` (16px / 6px) |
| Icon gap | `gap-3` (12px) | `gap-2` (8px) |
| Text | none in the helper (apps added `text-sm`, 14px / 20px) | `text-[0.8125rem] leading-[18px] tracking-[0.005em]` (13px / 18px) |
| Row height | 32px with `text-sm` | 30px |
| Width | none in the helper | `flex w-full items-center` |
| Idle text | `text-muted`, `hover:text-foreground` | `font-normal text-foreground/80`, `hover:text-foreground` |
| Active text | `text-foreground` | `font-medium text-foreground` |
| Hover and active fill | none in the helper | `hover:bg-surface-tertiary` (idle rows), `bg-surface-tertiary` (active row), same radius |
| Press | none | `active:scale-[0.99]`, `transition-[scale,background-color,color] duration-150 ease-smooth` |
| Focus ring | none | `focus-visible:ring-2 focus-visible:ring-foreground/35`, no outline |
| Icon-only row | `justify-center px-0 py-1.5` | same, plus the radius, text, fill and focus classes above |
| Icon (`sidebarNavIconClass`) | none (apps used 18px in a 20px box) | `size-[19px] shrink-0`; `text-muted-foreground` idle, `text-foreground` active |
| Section label | `px-3 py-1 text-[11px]` | `px-4 py-1 text-[11px] leading-4` (16px line). Colour comes from `.sidebar-section-label` in `tokens.css` (0.15.0; `--muted` at `--sidebar-section-label-mix` 55%, 80% on hover). |

The hover fill is static: it does not slide between rows. While another row is hovered, the active row keeps its fill.

One call per row:

```tsx
<nav className="px-2">
  <p className={sidebarSectionLabelClass}>Library</p>
  <div className="space-y-1">
    <Link to="/home" aria-current={active ? "page" : undefined} className={sidebarNavItemClass({ active, iconOnly })}>
      <IconHome size={19} className={sidebarNavIconClass(active)} />
      {iconOnly ? null : <span className="truncate">Home</span>}
    </Link>
  </div>
</nav>
```

Or the part, with the router link as the child:

```tsx
<Sidebar.NavItem asChild active={active} iconOnly={iconOnly} icon={<IconHome />}>
  <Link to="/home">{iconOnly ? null : <span className="truncate">Home</span>}</Link>
</Sidebar.NavItem>
```

- `px-2` on the list is the panel inset: rows are full width inside it. `space-y-1` (4px) separates rows.
- `sidebarNavRowClass(isIconOnly)` and `sidebarNavLinkTextClass(isActive)` now return the classes above, so existing calls change look. `sidebarNavItemClass` is the two merged.
- Classes an app added beside the helpers, such as `rounded-lg text-sm font-medium tracking-normal transition-colors duration-200`, are now redundant. Through the root `cn` they lose to the helper when passed before it. Passed after it, or joined without `cn`, they override the new radius, size and weight. Remove them, and remove app-side active fills such as `bg-surface-tertiary`.

Colour mapping. The package has no sidebar colour tokens, so the rows use the nearest general token:

| Role | Reference look (light / dark, sRGB) | Package token (light / dark, sRGB) |
| --- | --- | --- |
| Hover and active fill | 233 234 236 / 28 28 28 | `surface-tertiary`: 234 234 234 / about 39 39 39. Light matches; dark is a step lighter. It is the rail tile's active fill too, so a rail tile and a nav row stay the same. From 0.7.2 the rows use `sidebar-accent` (234 234 234 / 28 28 28); see below. |
| Active text and icon | 9 9 11 / 250 250 250 | `foreground`: 24 24 24 / 252 252 252 |
| Idle text (80%) | 24 24 25 / 251 252 253 | `foreground` at 80% |
| Idle icon | 100 101 103 / 159 160 162 | `muted-foreground` (`--muted`): 114 114 114 / 160 160 160 |
| Focus ring (35%) | 9 9 11 / 250 250 250 | `foreground` at 35% |

## Sidebar nav row parts (0.7.2)

One row style for every sidebar list: plain nav links and rich rows (checkbox, avatar, two-line label, nested folders, `...` menus, drag and drop, rename inputs). `Sidebar.NavItem` is the row; the parts go inside it.

Rich row (the link is the row; the parts are its children):

```tsx
<Sidebar.NavItem asChild active={isActive} selected={selected} indent={1} dragging={isDragged} dropTarget={isOver}>
  <Link to="/chat/$id" params={{ id }} draggable onDragStart={onDragStart}>
    <Sidebar.NavItemLeading>
      <Checkbox checked={selected} onClick={(event) => event.stopPropagation()} aria-label={`Select ${title}`} />
    </Sidebar.NavItemLeading>
    <Sidebar.NavItemLabel>{title}</Sidebar.NavItemLabel>
    <Sidebar.NavItemTrailing>{generating ? <Spinner size={14} decorative /> : count}</Sidebar.NavItemTrailing>
    <Sidebar.NavItemActions>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Row actions"
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
            }}
          >
            <IconDots size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>...</DropdownMenuContent>
      </DropdownMenu>
    </Sidebar.NavItemActions>
  </Link>
</Sidebar.NavItem>
```

Simple row (unchanged from 0.7.1):

```tsx
<Sidebar.NavItem asChild active={active} icon={<IconHome />}>
  <Link to="/home"><span className="truncate">Home</span></Link>
</Sidebar.NavItem>
```

`Sidebar.NavItem` props added in 0.7.2:

| Prop | Effect |
| --- | --- |
| `selected` | The active fill (`bg-sidebar-accent text-foreground`) without `font-medium` or `aria-current`. `data-selected="true"`. |
| `indent` | Nesting level from 0. Left padding is `calc(1rem + indent * 12px)`: 16px, 28px, 40px, ... Set as inline `paddingLeft`, so any depth works and a `style.paddingLeft` you pass wins. Ignored with `iconOnly`. |
| `dragging` | `opacity-40 cursor-grabbing`. `data-dragging="true"`. |
| `dropTarget` | Fill plus `ring-2 ring-inset ring-focus`. `data-drop-target="true"`. |

`active` also sets `data-active="true"`. Each attribute is left off when its prop is false. The styles key off the attributes (`data-[selected=true]:`, `data-[dragging=true]:`, `data-[drop-target=true]:`), so a row that sets them itself (for example from a tree library's drag state) gets the same look. `sidebarNavItemClass` takes the same `selected`, `dragging` and `dropTarget` options for rows that use the class only.

Parts. Each renders a `<span>` with its class (`className` merges last), or merges onto its single child with `asChild`:

| Part | Class | Use |
| --- | --- | --- |
| `NavItemLeading` | `sidebarNavItemLeadingClass`: `flex shrink-0 items-center` | Checkbox, icon, avatar, status dot, folder chevron. Put `sidebarNavIconClass(active)` on an icon. A 40px avatar makes the row taller; add `py-2` to the row if you want more room. |
| `NavItemLabel` | `sidebarNavItemLabelClass`: `min-w-0 flex-1 truncate` | The title. For two lines, put `<span className="block truncate">` and `<span className={sidebarNavItemSubtitleClass}>` (`block truncate text-xs text-muted-foreground`) inside. For rename, `asChild` on the input. |
| `NavItemTrailing` | `sidebarNavItemTrailingClass`: `ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground` | Always visible: counts, unread dots, spinners, badges. |
| `NavItemActions` | `sidebarNavItemActionsClass` (below) | Hover-revealed `...` button. |

Actions sit in the row flow at the end (`ml-auto`), so an `asChild` link row needs no `relative`. The part is `h-6` with `-my-1`, so a 24px or 28px icon button does not change the 30px row height. It reserves its width while hidden, so the label truncates a little earlier. For the older overlay look, pass `className="absolute right-3"` to the part and `relative` to the row. Visibility:

- `opacity-0` by default, `transition-opacity duration-75`.
- `group-hover:opacity-100` and `group-focus-within:opacity-100`: the row is a `group`.
- `has-[[data-state=open]]:opacity-100`: a Radix menu trigger inside it is open.
- `data-[state=open]:opacity-100`: the part itself is the trigger (`asChild`).

The part adds no handlers. Call `stopPropagation()` (and `preventDefault()` inside a link) on the button so it does not run the row click.

Other rich-row needs:

- Folder rows and drop zones: render the row as a `<div>` or `<button>` (`asChild` on a `<div>` when the row holds its own buttons) and wrap it in your drop zone. Set `dropTarget` while a drag is over it.
- Indent guide lines: absolutely positioned spans in the row; add `relative` to the row.
- Context menus and hover cards: wrap `Sidebar.NavItem` as before; `ContextMenuTrigger asChild` can wrap it directly.

Classes a rich row no longer needs beside the parts: `rounded-lg`, `rounded-md`, `text-sm` (and `text-sm` on the title span), `px-3 py-1.5`, `gap-3`, `py-2`/`gap-3` for padding alone, `pl-7`/`pl-8` (use `indent`), `bg-surface-tertiary` for active, hover or selected, `ring-2 ring-inset ring-focus` and `opacity-40 cursor-grabbing` for drag states, `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity` on the menu button, `mr-2` on a checkbox (the row `gap-2` spaces it), `truncate flex-1 min-w-0` on the title, `text-xs text-muted` on counts, and app row helpers that set any of these (a local list-item class, an outer `group py-px` wrapper, a `ui-sidebar-row` class).

### Fill colour: `sidebar-accent`

Rows (hover, active, selected, drop target) use `bg-sidebar-accent` instead of `bg-surface-tertiary`.

| | Light | Dark |
| --- | --- | --- |
| `tokens.css` `--sidebar-accent` | `var(--surface-tertiary)` (about 234 234 234; unchanged) | `oklch(22.64% 0 0)` (28 28 28; was about 39 39 39) |
| `compat-shadcn-rgb.css` `--color-sidebar-accent` | `rgb(var(--sidebar-accent, var(--secondary)))`: the app's `--sidebar-accent` channels if defined, else `--secondary` as before | same |

Rail tiles keep `surface-tertiary`, so in dark mode the active rail tile is a step lighter than the active row. An app that imports `tokens.css` and defines its own `--sidebar-accent` overrides the fill; it must be a full colour value there (use `compat-shadcn-rgb.css` for `R G B` channels).

## Landing kit, site footer and pricing dialog (0.9.0)

Marketing pieces the apps copied between each other. Each one renders the same
DOM and class strings as the app copies it replaces. Copy, links, logos, prices
and auth buttons come from the app; the package imports no router, no Clerk and
no Motion.

Import the stylesheet once (from CSS or TypeScript):

```css
@import "@vvedantb/ui/landing.css";
```

The components live under `src/`, which the usual `@source` line already scans.

### Landing kit

`createLandingKit({ motion })` takes `motion` from `motion/react` and returns
the animated parts. Call it once at module scope.

```tsx
import { motion } from "motion/react";
import { createLandingKit } from "@vvedantb/ui";

export const { LandingReveal, LandingRevealItem, LandingHero, LandingNav, LandingCta } =
  createLandingKit({ motion });
```

| Part | Props |
| --- | --- |
| `LandingReveal` | `className`, `delay` (seconds, default `0`). Staggers its children in once, when 20% is in view. |
| `LandingRevealItem` | `className`. One revealed child (`landingItemVariants`). |
| `LandingHero` | `eyebrow`, `title`, `description` (nodes), `actions` (the button row; it renders even when empty), `capabilities` (strings). |
| `LandingNav` | `brand`, `homeLabel` (home link `aria-label`), `links`, `github` (`href`, `label`, `icon`), `actions`, `menu`. |
| `LandingCta` | `title`, `description`, `action`. |

Plain parts, no Motion:

| Part | Props |
| --- | --- |
| `LandingPageLayout` | `nav`, `heroBackdrop` (before the hero, inside the atmosphere block), `hero`, `children` (sections), `footer`. Root is `#top`. |
| `LandingSection` | `id`, `className`. |
| `LandingSectionHeading` | `eyebrow`, `heading`, `intro`, `className`. |
| `LandingLattice` | `className` (grid columns). Cells share 1px borders. |
| `LandingFeatureCard` | `icon` (a component, rendered `size={18} stroke={1.5}`), `title`, `description`. |
| `LandingNavMenu` | `links`, `github` (`href`, `icon`). Overflow menu below `md`. |
| `LandingFooter` | `brand`, `tagline`, `links`, `actions` (after the links), `github` (`href`, `label`, `icon`). |

Constants: `landingShellClass`, `landingPanelClass`, `landingItemVariants`, and
for the footer's `actions` slot `landingFooterLinkClass` (a text link) and
`landingFooterButtonClass` (a `Button variant="link"`).

### `SiteFooter`

Brand, tagline and social icon buttons; link columns; then copyright and legal
links under a separator.

| Prop | |
| --- | --- |
| `brand`, `tagline` | Nodes. |
| `socials` | `{ href, icon, label? }[]`. `icon` is a component that takes `className`. Links open in a new tab. |
| `columns` | `{ heading, links }[]`. A link is `{ href, label, external?, image?: { src, alt } }`. |
| `name`, `year` | "Copyright © {year} {name}". `year` defaults to the current year. |
| `legalLinks` | `{ href, label }[]`, open in a new tab. |
| `variant` | `"muted"` (default, `text-muted`), `"muted-foreground"`, or `"touch"` (`text-muted-foreground`, `max-sm:hit-target` links, safe-area bottom padding). |

### `Icon*` app icons

Tabler-style plain app glyphs: `IconVibot`, `IconVhub`, `IconVmem`, `IconVerve`,
`IconVelth` and `IconProjectV`. No background. Each sits on an equalised square viewBox, so all apps look the same size. `APP_ICONS[app]`
looks one up by `AppName`.

```tsx
import { IconVerve } from "@vvedantb/ui"

<IconVerve size={24} color="currentColor" />
```

`size` sets both width and height (default 24; a string is any CSS length). `color`
defaults to `currentColor`. `stroke` sets the stroke width in pixels for stroke
glyphs (fill glyphs ignore it). `title` gives an accessible name. The ref goes
to the `<svg>`.

### `AppMark` (deprecated)

Deprecated in favour of the `Icon*` components for plain marks. Tiles stay here.
Family app icons: `app` (`projectv`, `vibot`, `vhub`, `vmem`, `verve`, `velth`),
`variant`, `size`, `title`.

- `variant="mark"` (default) is the plain logo in `currentColor`. It sits
  on one shared square viewBox (`APP_MARK_CROP_VIEWBOX`, `165 160 700 700`): the union
  of all glyph boxes on the 1024 tile grid, centred, with small breathing room. It is the
  same crop for every app, so relative glyph sizes match the tiles while the widest glyph
  fills the icon box. `size` sets both width and height; a string `size`
  (for example `"2rem"`) is any CSS length. `APP_MARK_VIEWBOX` holds the shared square
  viewBox for each app; `appMarkSvg()` and `APP_MARK_SVG` use it. `markAspect` returns
  1 and is kept for API stability only.
- `variant="tile"` and `"tile-light"` use the same 1024 grid on a
  rounded tile, always square. `appTileSvg`, `appAdaptiveSvg`, `appExtension128Svg`,
  `APP_TILE_SVG`, `APP_TILE_LIGHT_SVG` and favicons are unchanged.

Use tiles only where the app shows on its background (app and store icons,
favicons). Use the plain mark wherever the logo has no background.

### `PricingModal`

Upgrade dialog with two layouts. Without `plans` it is the single-plan dialog
below. With `plans` (0.22.0) it is the wide multi-plan dialog.

Shared props: `open`, `onClose`, `title` (accessible, hidden), `description`
(hidden), `tone` (`"muted"` default or `"muted-foreground"`),
`billingPeriod`, `onBillingPeriodChange`, `defaultBillingPeriod` (`"month"`
default) and `renderCheckout`.

#### Multi-plan (0.22.0)

Header: `apps` (an `AppName[]`, shown as plain `Icon*` logos at the top left; each links to the app's site in a new tab and shows its display name in a tooltip, from `FAMILY_APPS`),
`headline` (centre), a Monthly / Annual switch and a close button (top right).
Then one card per entry of `plans` (2 to 4 fit) and one `finePrint` line. Cards
stack on narrow screens.

A `PricingPlan` is `{ id, name, price: { month, year }, ctaLabel?, intro?,
highlight?: { title, description }, benefits?: { label, icon?: "check" |
AppName, muted? }[], current?, featured?, periodSuffix? }`. Prices are display
strings and always per month (`periodSuffix` default `"/month"`; the yearly
price is the per-month price). `ctaLabel` defaults to "Get started". `featured`
(or `highlighted`) adds a subtle ring. A `current` plan shows a disabled,
outlined "Current plan" button and does not call `renderCheckout`.

`appBenefits` (`{ app, items }[]`, type `PricingPlanAppBenefit`) groups benefits per app, each under a small heading with that app's icon and display name. It renders after `benefits` and scrolls inside the card when long. Set `currentApp` on the modal to put that app's group first; the other groups keep the array order. The `featured` / `highlighted` plan uses `V_PRO_APP_BENEFITS` (the approved V Pro copy, in the order vibot, vmem, vhub, velth, verve) when it omits `appBenefits`, so apps usually pass only `currentApp`. Other plans show app benefits only when set.

`FAMILY_APPS` (and `familyApp(app)`), exported from the root and `@vvedantb/ui/brand`, is the single list of app display names and sites (`vibot`, `Verve`, `Velth`, `vmem`, `vhub`, `Project V`; URLs without a trailing slash). App names live only under `src/brand/`.

The `featured` plan's button is a solid primary button (`Button` `variant="default"`). Other plans use `secondary`.

`renderCheckout(button, plan, period)` wraps each plan's button.

Each app passes its own plan names, prices and copy. The example and the screenshots use placeholder text only.

```tsx
<PricingModal
  open={open}
  onClose={close}
  title="Plans"
  apps={["vibot", "verve", "velth", "vmem", "vhub"]}
  headline="One plan. Every V app."
  finePrint="Cancel anytime. $120 billed yearly. Save 33%."
  plans={[
    { id: "free", name: "Free", price: { month: "$0", year: "$0" }, current: true },
    {
      id: "pro",
      name: "V Pro",
      price: { month: "$15", year: "$10" },
      featured: true,
      intro: "Everything in Free, and:",
    },
  ]}
  renderCheckout={(button, plan, period) => (
    <CheckoutButton planId={plan.id} planPeriod={period}>{button}</CheckoutButton>
  )}
/>
```

In the example, V Pro costs $15/month, or $10/month billed yearly ($120/year,
a 33% saving). The cards show the per-month price only, so the yearly total and
the saving go in `finePrint`. Screenshots: `brand/pricing-modal/` (regenerate with
`node scripts/build-pricing-screenshots.mjs`).

#### Single plan

Props: `logo` (`dark` and `light` image URLs, shown in that colour mode),
`wordmark`, `price`, `tagline`, `taglineFontClassName`, `features`, `ctaLabel`
(default "Get Pro"), `renderCheckout(button, period)` (wrap the button in the
billing provider's checkout), `closeButton` (an extra compact close button,
default `false`) and, when `description` is set, the title is an `sr-only`
`DialogTitle`, otherwise it sits in `VisuallyHidden`.

From 0.20.0, `yearly={{ pricePerMonth, total?, saveLabel? }}` adds a
monthly/yearly toggle; `price` stays the monthly price. `renderCheckout` gets the
selected `period` (`"month"` or `"year"`) as its second argument, for Clerk's
`planPeriod`. Without `yearly` the DOM is unchanged.

```tsx
<PricingModal
  price="$10"
  yearly={{ pricePerMonth: "$8.33", total: "$100" }}
  renderCheckout={(button, period) => (
    <CheckoutButton planId={planId} planPeriod={period}>{button}</CheckoutButton>
  )}
  /* ... */
/>
```

#### Migration

Single-plan callers need no change. To move to the multi-plan layout, replace
`logo`, `wordmark`, `price`, `tagline`, `features` and `yearly` with `plans`,
`apps` and `headline`, and change `renderCheckout` to
`(button, plan, period)`. Type helpers: use `PricingModalLegacyProps` or
`PricingModalMultiProps` when you need one layout's props;
`PricingModalProps` is their union.

### Account menu items and rail collapse tile

`SidebarAccountMenu` takes three optional props. Without them it renders as before.

- `themeToggle={{ isDark, onToggle }}`: a "Light mode" / "Dark mode" item after `children`.
- `signOut={{ onSignOut, description? }}`: a separator and a danger "Sign out" item, last. It opens `SignOutDialog`; Alt-click skips the dialog and `ConfirmSkipHint` shows while Alt is held. The menu owns the dialog state. If `onSignOut` rejects, the dialog buttons enable again.
- `itemIconSize`: `size` of those two items' icons. Default: the icon's own size.

`RailCollapseTile({ collapsed, onToggle })`: the rail tile that shows or hides the sidebar panel ("Show sidebar" with the expand icon, or "Hide sidebar").

## Animated nav icons (0.11.0)

Eighteen 24x24 stroked icons that animate while their row or tile is hovered. Animation is plain CSS:

```css
@import "@vvedantb/ui/tokens/css/nav-icons.css"; /* or tokens/css/index.css, which includes it */
```

Hover needs an ancestor with the `group` class (rail tiles and nav rows have one):

```tsx
import { MemoryIcon, TerminalIcon } from "@vvedantb/ui";

<a className="group" href="/memory"><MemoryIcon /> Memory</a>
<button className="group"><TerminalIcon active={isCurrent} /></button>
```

| Icon | Shows | Stroke | Longest loop |
| --- | --- | --- | --- |
| `MemoryIcon` | Brain; the synapse fires | 1.7 | 1000 ms |
| `BoltIcon` | Lightning bolt; flashes | 1.7 | 900 ms |
| `FilesIcon` | Two stacked files; the back one slides | 1.7 | 1400 ms |
| `InboxIcon` | Tray; a letter drops in | 1.7 | 1300 ms |
| `BuildingIcon` | Building; windows blink | 1.7 | 1600 ms |
| `SettingsIcon` | Gear; spins. `variant="turn"`: clicks round a notch at a time | 1.7 (`turn`: 1.75) | 2500 ms (`turn`: 2400 ms) |
| `BoardIcon` | Three-column board; cards drop, one travels | 1.75 | 1800 ms |
| `ChecklistIcon` | Two checked tasks; checks redraw | 1.75 | 1600 ms |
| `TerminalIcon` | Terminal; prompt, typing, cursor. Has `active` | 1.75 | 1400 ms |
| `DocumentIcon` | Page; lines draw, corner folds | 1.75 | 1500 ms |
| `ReviewIcon` | Circle with a check | 1.75 | 1500 ms |
| `FlaskIcon` | Flask; sloshes, bubbles rise | 1.75 | 1400 ms |
| `InboxArrowIcon` | Tray with an arrow and a dot. Has `active` | 1.75 | 1100 ms |
| `DraftIcon` | Page with a pencil nib | 1.75 | 1500 ms |
| `AutomationIcon` | Orbit around a play button. Has `active` | 1.75 | 1800 ms |
| `BarChartIcon` | Bars and a trend line | 1.75 | 1600 ms |
| `SearchIcon` | Magnifying glass; scans | 1.75 | 1200 ms |
| `SidebarToggleIcon` | Window with a side panel. Has `collapsed` | 1.75 | 900 ms |

Props (type `IconProps`; all optional):

| Prop | Default | Behaviour |
| --- | --- | --- |
| `size` | `20` | `width` and `height`. Number or string. |
| `color` | `"currentColor"` | Any other value sets the svg's inline `color`; every part follows it. The default sets nothing, so `text-*` classes work. |
| `strokeWidth` | icon's own (table) | Shapes with their own stroke width (the bar chart trend line, the inbox arrow halo) keep it. |
| `className`, `style` | | Merged onto the svg (`vv-icon` class first). |
| `title` | | Renders `<title>`, `role="img"` and `aria-labelledby`. Without it the svg is `aria-hidden="true"`. |
| `animate` | `"hover"` | `"hover"`: animate while a `.group` ancestor is hovered. `true`: always. `false`: never, and no hover scale. Sets `data-animate`. |
| `duration` | | Length in ms of the icon's longest loop (table). Sets `--vv-icon-duration-scale` to `duration / longest loop`; every duration and delay in the icon is multiplied by it, so staggers keep their proportions. |
| `active` | `false` | `TerminalIcon`, `InboxArrowIcon`, `AutomationIcon`: solid variant with cut-out details. Other icons: `data-active="true"` only. |
| `cutoutColor` | sidebar accent | Cut-out tone while `active` (`CutoutIconProps`). Default `var(--color-sidebar-accent, var(--sidebar-accent))`, so the solid icon suits a `bg-sidebar-accent` tile. If neither variable holds a full colour (for example `--sidebar-accent` holds bare RGB channels such as `233 234 236` and there is no `--color-sidebar-accent`), the cut-outs lose their tone and vanish into the solid shape; pass the colour, e.g. `cutoutColor="rgb(var(--sidebar-accent))"`. |
| `collapsed` | `false` | `SidebarToggleIcon` only: chevron points out (`SidebarToggleIconProps`). |
| `variant` | `"spin"` | `SettingsIcon` only (`SettingsIconProps`, 0.12.0). `"spin"`: continuous linear spin, stroke 1.7, 1.15 spring hover scale. `"turn"`: a second gear drawing (hub first) that turns 60deg at a time with the emphasized ease over 2400 ms, stroke 1.75, 1.12 hover scale like the other 1.75-stroke icons. `duration` scales against the variant's own loop. |

Other SVG props (`id`, `data-*`, handlers, `ref`) go to the svg. On group hover the svg scales to 1.15 (the first six icons, spring ease) or 1.12 (the rest). `NavIconBase` is the shared svg wrapper, for icons drawn in the same style. The stylesheet has no reduced-motion override.

## Artifact viewers (0.13.0)

Web viewers for artifacts: standalone HTML, Markdown, SVG, code or typed JSON (quiz, flashcards) documents with per-user state. The pure core (schemas, state limits and ops, the document wrapper, the guest bridge) lives in `@vvedantb/server` (see its `docs/artifacts.md`); install `@vvedantb/server` 0.6.1 or later next to this package. The components hold no data: rows come in through props and changes leave through callbacks, so any backend works.

```tsx
import { ArtifactList, ArtifactListToolbar, ArtifactViewer, type ArtifactStateStore } from "@vvedantb/ui";

<ArtifactListToolbar query={query} onQueryChange={setQuery} type={type} onTypeChange={setType} layout={layout} onLayoutChange={setLayout} />
<ArtifactList
  artifacts={rows}
  layout={layout}
  getHref={(a) => `/artifacts/${a.id}`}
  onOpen={(a) => navigate(a.id)}
  getBody={(a) => fetchBody(a.id)}
  onRename={(a, title) => rename(a.id, title)}
  onDelete={(a) => remove(a.id)}
/>

const store: ArtifactStateStore = {
  load: async () => (await getState(id))?.data ?? {},
  save: (data) => putState({ id, sets: data, reset: true }),
  onError: (error) => toast.error(error.message),
};
<ArtifactViewer
  artifact={detail}
  store={store}
  stateGlobalAliases={["app"]}
  versions={history}
  viewingVersion={version}
  onViewVersion={setVersion}
  onRestoreVersion={(v) => restore(id, v)}
  href={`/artifacts/${id}`}
  headerStart={<BackLink />}
  onRename={(title) => rename(id, title)}
  onDelete={() => remove(id)}
/>
```

- `ArtifactFrame`: the body in an iframe with `sandbox="allow-scripts"` (never `allow-same-origin`) and the CSP from `wrapArtifactDocument`. Props `body`, `format`, `title` (the iframe name, and a template's heading), `template` (`stateSpec.template`), `store`, `stateGlobalAliases`, `saveDelayMs` (5 s) and `saveMaxWaitMs` (30 s); other iframe props pass through. It calls `store.load()` once per document and writes the snapshot into the `srcdoc`, answers the guest's `window.artifactState` requests over a `MessageChannel` with the core's ops and limits, and calls `store.save(data)` with the whole map (replace, not merge) after the debounce, on `pagehide`, when the page is hidden and on unmount. A reload waits for a save in flight. If `load` fails, the frame starts empty and never saves, so it cannot overwrite stored state; `store.onError(error, "load" | "save")` hears about failures. Without a store, state lives until unmount. Keep `store` stable per artifact (a new object reloads the frame); a new `stateGlobalAliases` array with the same names does not.
- `ArtifactStateStore`: `{ load(): Promise<Record<string, string>>, save(data): Promise<void>, onError?(error, phase) }`.
- `ArtifactRender`: the body by format. Markdown renders with Streamdown, code with `CodeBlock` (`language`), and HTML, SVG and JSON in an `ArtifactFrame`.
- `ArtifactCard`: a grid tile (type icon, title, description, compact updated time) or a `layout="list"` row. With `getHref` it is an `<a>`; a plain left click then calls `onOpen` instead of following the link, and modified clicks stay native. The actions menu (dots button and right-click) lists Open (`onOpen`), Open in new tab (`getHref`), Rename (`onRename`), Copy and Download (`getBody`, since list rows carry no body) and Delete (`onDelete`). Each shows only when its callback is set; with none, there is no menu.
- `ArtifactList`: `ArtifactCard`s in a grid (one to three columns) or a list, with the card callbacks passed through. With no artifacts it shows an `EmptyState` (`emptyTitle`, `emptyDescription`, `emptyActions`).
- `ArtifactListToolbar`: controlled `SearchInput variant="toolbar"` (`query`, `onQueryChange`), a type filter menu (`type`, `onTypeChange`, `types`; `undefined` is "All types") and a grid or list toggle (`layout`, `onLayoutChange`). The filter and the toggle show only with their callbacks. `children` go at the end.
- `ArtifactViewer`: the ai-elements `Artifact` container with a header (`headerStart`, type icon, title) and actions: versions menu (`versions`), Rename, Copy, Download (the format's extension and MIME type from `ARTIFACT_FORMAT_FILES`), Open in new tab (`href`), your `actions`, and Delete. Below it, `ArtifactRender` of `artifact.body`. Pass the body of the version on screen.
- `ArtifactVersionsMenu`: a "vN" button listing `versions` newest first, with the current one marked. With `onViewVersion`, picking a version shows it, and "Restore vN" (`onRestoreVersion`) appears while an older version is on screen. Without it, picking an older version restores it.
- Rename and delete use `ConfirmDialog` (`ArtifactRenameDialog`, `ArtifactDeleteDialog`, and `useArtifactEditDialogs` for custom surfaces). Rename sends the trimmed title, and does nothing when it is unchanged. Alt-click on Delete skips the dialog, as with `useRequestConfirm`. The delete dialog says "This cannot be undone."; pass `deleteDescription` to `ArtifactViewer`, `ArtifactCard` or `ArtifactList` to change it (0.13.1), for example when your delete can be undone. A callback that rejects keeps its dialog open and shows an error toast; copy and load failures toast too, so mount `SonnerToaster`.
- `ArtifactTypeIcon` (`type`, `size`, `stroke`) and `ARTIFACT_TYPE_LABELS` (`mindmap` is "Mind map"). Helpers `downloadArtifactBody(title, format, body)`, `copyArtifactBody(body)`, `openArtifactInNewTab(href)`. Row types: `ArtifactSummary` (any `ArtifactListRow` fits), `ArtifactDocument`, `ArtifactVersionSummary`.

## Date pickers (0.14.0)

Controlled pickers that read and write the native input strings, as local calendar dates with no timezone logic. They need `react-day-picker` 9, a dependency of this package.

```tsx
import { DatePicker, DateTimePicker, MonthPicker } from "@vvedantb/ui";

<DatePicker value={due} onChange={setDue} min="2026-01-01" clearable name="due" ariaLabel="Due date" />
<DateTimePicker value={startsAt} onChange={setStartsAt} defaultTime="09:00" name="startsAt" />
<MonthPicker value={month} onChange={setMonth} max="2026-12" />
```

- `DatePicker`: `value` "YYYY-MM-DD" or "". The trigger matches `TimePicker` and shows the date with `dateStyle: "medium"` (`locale`) or `placeholder` ("Pick a date"). `min` and `max` disable days; `clearable` adds a clear control (`onChange("")`); `name` adds a hidden input. `className` goes on the wrapper, `triggerClassName` merges onto the button (default `w-40`). A width on either sizes the field, and `w-full` on either fills the row; pill inputs can pass `triggerClassName="h-10 w-full rounded-full px-4 text-sm"`. `ariaLabel` names the trigger, followed by the shown text.
- `DateTimePicker`: `value` "YYYY-MM-DDTHH:mm" or "". A date with no time uses `defaultTime` ("00:00"); a time with no date uses today. Only the date part of `min` and `max` applies. `triggerClassName` goes to both triggers, a width only to the date.
- `MonthPicker`: `value` "YYYY-MM" or "", with year navigation and a month grid. `min` and `max` are "YYYY-MM".
- `Calendar`: the styled `DayPicker` for custom layouts (every `DayPicker` prop). `parseDateValue` and `formatDateValue` convert between "YYYY-MM-DD" and a local `Date`.

## Slider (0.16.0, dark contrast and className props 0.16.1)

shadcn's slider on `@radix-ui/react-slider` (a peer dependency), with package tokens.

```tsx
import { LabeledSliderRow, Slider } from "@vvedantb/ui";

<Slider value={volume} onValueChange={setVolume} max={100} step={1} aria-label="Volume" />
<Slider defaultValue={[20, 80]} thumbLabels={["Minimum price", "Maximum price"]} />
<LabeledSliderRow id="temperature" label="Temperature" value={temp} onValueChange={setTemp} max={2} step={0.1} formatValue={(v) => v.map((n) => n.toFixed(1)).join("–")} minLabel="Precise" maxLabel="Creative" />
```

- `Slider`: every Radix `Root` prop (`value`, `defaultValue`, `min`, `max`, `step`, `orientation`, `disabled`, `onValueChange`, `onValueCommit`, and so on). It renders one thumb per value, so `[n]` gives one thumb and `[a, b]` a range. The track is `bg-default` (`dark:bg-muted/40`), the range `bg-primary`, and the thumb a `size-4` circle on `bg-background` with `border-border` (`dark:bg-foreground dark:border-muted`, a light thumb in dark mode) and the `Switch` focus ring. `trackClassName`, `rangeClassName` and `thumbClassName` merge after the defaults, so caller classes win; override a `dark:` default with a `dark:` class. Disabled dims to 50%. A vertical slider needs a height from its parent or `className` (default `min-h-40`). The ref goes to `Root`.
- Names: `id`, `aria-label`, `aria-labelledby` and `aria-valuetext` go to the first thumb, the focusable `role="slider"` element, not `Root`. `thumbLabels` sets `aria-label` per thumb and wins over `aria-label` on the first. Without a name, Radix labels a two-thumb range "Minimum" and "Maximum". The thumb is a `<span>`, so `<Label htmlFor>` does not name it; pass `aria-labelledby` with the label's `id`.
- `LabeledSliderRow`: the `LabeledSwitchRow` layout with the slider below. `id`, `label`, `description`, `icon`, `value`, `onValueChange`, `onValueCommit`, `min`, `max`, `step`, `disabled`, `thumbLabels`, `className`. `formatValue` sets the right-aligned value (default: values joined by an en dash). `minLabel` and `maxLabel` add captions under the ends. The label names the first thumb through `aria-labelledby`, unless `thumbLabels` is set.

## Toaster

```tsx
import { SonnerToaster, toast } from "@vvedantb/ui";

<SonnerToaster
  theme={theme}
  toastRadius="surface"
  toastIcons="filled24"
  closeButtonStyle="hoverChip"
  sonnerVars
  descriptionMuted
/>;
```

With no new props and no `UiConfig.SonnerToaster` entry the toaster looks as it did in 0.2.1. An entry sets app defaults for any prop (see "App config: AI chat" below). Caller props merge with the package defaults instead of replacing them:

- `toastOptions.classNames`: per key, the package classes come first and the caller classes follow, so callers can override utilities. Other `toastOptions` fields (such as `duration`) take the caller value.
- `icons`: merged per key. With `toastIcons="filled24"` the caller overrides single icons and keeps the rest.
- `style`: merged over the package style. `className` is appended.

Opt-in props (all default to the current look):

| Prop | Values | Effect |
| --- | --- | --- |
| `toastRadius` | `"lg"` (default), `"surface"`, `"control"` | `rounded-lg`, `rounded-surface` (from `tokens.css`, or the compat file) or `rounded-field` (the input radius, `min(var(--radius), 0.625rem)`, 10px). |
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

## App config

`UiConfigProvider` gives components app-level defaults, so an app does not pass the same props at every call site. Wrap the app once:

```tsx
import { UiConfigProvider, type UiConfig } from "@vvedantb/ui";

const config = { cn: appCn } satisfies UiConfig;

<UiConfigProvider config={config}>{app}</UiConfigProvider>
```

Defaults are unchanged. Without a provider, or with an empty entry, every component renders its built-in DOM. `src/default-dom.test.tsx` renders 53 primitives and AI elements without a provider and compares `document.body` (portals included) with `tokens/test/fixtures/default-dom.json`, byte for byte.

- Root exports: `UiConfigProvider` (`config`, `children`), `useUiConfig(name)` (the app's entry for one component, or `undefined`) and the `UiConfig` and `UiConfigProviderProps` types.
- An entry's `classes` replace built-in classes part by part. A part left out keeps its default, and a caller `className` still merges after it. Other keys are default prop values. An explicit prop always wins.
- `cn`: the class merger that components use in place of the built-in `cn` when they merge a caller `className`. Set it when the app's tailwind-merge setup differs, for example when it does not treat `rounded-surface` as a radius class and relies on the CSS order instead. Components read it with the internal `useCn` hook.
- Component entries and opt-in props are in the sections below: "App config: existing primitives", "Loaders, rows, status, sortable list and helpers", "App config: AI chat", "Agent activity, plan, tests, preview and model picker", "Kibo blocks".

## App config: existing primitives

`UiConfig` entries and opt-in props for components that were already in the package. Without an entry or a new prop, each one renders its built-in DOM. Every component in this section merges a caller `className` with `UiConfig.cn` when it is set.

### Controls

```tsx
const config = {
  Button: { classes: { variant: { default: "bg-brand text-white" }, size: { xs: "h-7 px-2 text-2xs" } } },
  Tabs: { variant: "segmented", pillMotion: "xy" },
  ClearInput: { animation: "none" },
} satisfies UiConfig;
```

- `Button`: `classes.base`, `classes.variant.<variant>`, `classes.size.<size>`. New size `xs` (`h-7 rounded-md px-2 text-xs hit-target`, 14px icons).
- `Badge`: `classes.base`, `classes.variant.<variant>`.
- `Input`, `Textarea`: `classes.base`.
- `Checkbox`: `classes.root`, `classes.indicator`, `icon`. New prop `icon`: the indicator content (default a 14px check). The `CheckboxProps` type is exported.
- `Switch`: `classes.root`, `classes.thumb`.
- `Slider`: `classes.root`, `classes.track`, `classes.range`, `classes.thumb`. `trackClassName`, `rangeClassName` and `thumbClassName` still merge after them. `children` now render inside the track, after the range (for example tick marks). Before, they were dropped.
- `ButtonGroup`: `classes.base`, `classes.orientation.<horizontal|vertical>`, `classes.text` (`ButtonGroupText`), `classes.separator` (`ButtonGroupSeparator`).
- `InputGroup`: `classes.root`, `classes.addon.base`, `classes.addon.align.<align>`, `classes.button.base`, `classes.button.size.<size>`, `classes.text`, `classes.input`, `classes.textarea`. New prop `classes` on `InputGroupAddon` (`{ addon }`), `InputGroupText` (`{ text }`), `InputGroupInput` (`{ input }`) and `InputGroupTextarea` (`{ textarea }`): the same keys for one instance; they win over the entry.
- `ClearInput`: `animation`, `classes.wrapper`, `classes.input`, `classes.button`. New prop `animation`: `"dissolve"` (default) or `"none"`, which clears at once, focuses the input and renders only the wrapper (`relative`), the input and the clear button. The `dissolve` wrapper keeps its `t-clear` classes and adds `classes.wrapper`. New prop `classes`: the same keys for one instance, each wins over the entry. New prop `clearButton` (with `"none"`): `"filled"` (default) mounts the button while there is a value; `"always"` keeps it mounted, hidden while empty (`pointer-events-none opacity-0`, `tabIndex=-1`, `aria-hidden`), and the input always reserves `pr-9`.
- `SearchInput`: `classes.wrapper` (a base for the wrapper), `classes.input` (replaces the size classes), `classes.icon` (replaces the icon classes), `iconSize` (default 16), `label`, `placeholder`, `clearLabel`, `enterKeyHint` (`false` leaves `aria-label` or `enterkeyhint` off), and `classNameTarget: "wrapper"` to send `className` to the wrapper instead of the input. New props: `onClear` (called after `onChange` when the value becomes empty) and `inputClassName` (merged into the input last).
- `Calendar`: `classes.base` replaces the root `className` classes; every other key replaces that DayPicker `classNames` key (a caller `classNames` still wins). `components` is the default for the prop, applied over the built-in `Root` and `Chevron`. New export `CalendarDayButton`: DayPicker's day button plus `data-selected`, for classes such as `data-[selected=true]:bg-primary` on the button; pass it as `components.DayButton`.
- `Carousel`: `classes.dots`, `classes.dot`, `classes.dotActive`, `classes.dotInactive` for the new `CarouselDots` (one button per snap, nothing for a single page). `useCarousel` is exported and its context adds `selectedIndex`, `scrollSnaps` and `scrollTo`.
- `Tabs`: `variant` (default for the `TabsList` prop), `pillMotion` (`"x"` default; `"xy"` moves the segmented pill on both axes with `transform`, for lists that wrap or run in a column), `classes.list` (replaces the list classes of every variant), `classes.size.<default|sm>`, `classes.pill`, `classes.trigger` (every trigger), `classes.content`. New `TabsList` prop `size`: `"sm"` shrinks the triggers (`[&_.t-tab]:px-2.5 py-1 text-xs`); `"default"` adds no classes. New `TabsBar`: a tab strip on a bottom hairline (`border-b border-border`, `px-3 py-2`; `size="sm"` `px-2 py-1.5`) with an `actions` slot on the right. `syncTabsPill` takes an optional motion (`"x"` or `"xy"`).
- `Accordion`: `classes.item`, `classes.header`, `classes.trigger`, `classes.content` (the animated panel), `classes.contentInner` (the padded box inside it), `icon`. New `AccordionTrigger` prop `icon`: shown after the children (default the chevron). New prop `classes` on `AccordionItem` (`{ item }`), `AccordionTrigger` (`{ header, trigger }`) and `AccordionContent` (`{ content, contentInner }`): the same keys for one instance; they win over the entry.
- `Collapsible`: `classes.trigger`, `classes.content`. The parts have no built-in classes, so without an entry `className` passes through untouched. `CollapsibleTrigger` and `CollapsibleContent` are now thin wrappers (same DOM, refs still reach the element); the `CollapsibleContentProps` type is exported.
- Deprecated `AccordionAlt*`, `InputGroupAlt*` and `ClearInputAlt` wrap the main parts with their old markup (pinned by `src/ui/alt-wrappers.test.tsx`; no `UiConfig` entry reaches them). Use the main components; the `Alt` names go in a later minor release once consumers move. `InputGroupAlt` (the root) and `InputGroupButtonAlt` stay a plain `<div>` and a `Button`: the root renders `data-input-group` before `class`, and the button has no default `type`, which the main parts cannot reproduce.

### Overlays

```tsx
<UiConfigProvider config={{ Dialog: { viewportAware: false, classes: { content: "..." } }, Tooltip: { delayDuration: 300, portal: true } }}>
```

| Entry | `classes` parts | Other keys |
| --- | --- | --- |
| `Dialog` | `trigger`, `overlay`, `content` (both layouts), `centered`, `compact`, `close`, `header`, `body`, `footer`, `title`, `description` | `viewportAware` |
| `Popover` | `trigger`, `content` | `sideOffset`, `collisionPadding` |
| `HoverCard` | `content` | `openDelay`, `closeDelay`, `sideOffset`, `portal` |
| `Tooltip` | `content` | `delayDuration` (read by `TooltipProvider`), `sideOffset`, `portal` |
| `DropdownMenu` | `trigger`, `content`, `subContent`, `subTrigger`, `item`, `checkboxItem`, `radioItem`, `label`, `separator`, `shortcut` | `icons.check`, `icons.radio`, `sideOffset`, `collisionPadding` |
| `ContextMenu` | same as `DropdownMenu` | `icons.check`, `icons.radio`, `collisionPadding`, `subContentPortal` |
| `Select` | `trigger`, `scrollButton`, `content`, `viewport`, `popperViewport`, `label`, `item`, `separator` | `icons.trigger`, `icons.scrollUp`, `icons.scrollDown`, `icons.check`, `triggerSlot`, `collisionPadding` |
| `Command` | `root`, `dialogContent`, `dialogCommand`, `inputWrapper`, `input`, `list`, `empty`, `group`, `separator`, `item`, `shortcut` | `icons.search`, `emptyClassNameReplaces` |

`icons.*` take a node and replace the built-in icon. A `trigger` class is added only when set: without it the trigger renders exactly as the Radix one.

New props and exports:

- `DialogContent` `viewportAware` (default `true`): the bottom sheet on compact viewports, visual-viewport sizing, keyboard-aware scrolling and the body pointer-events fix. `false` keeps a centred dialog at every size and leaves the viewport and body alone.
- `PopoverAnchor` (Radix `Popover.Anchor`).
- `HoverCardContent` and `TooltipContent` `portal`: render into `document.body`.
- `ContextMenuSubContent` `portal`.
- Config `Select.triggerSlot`: adds `data-slot="select-trigger"`, which the `ButtonGroup` selectors read.
- Config `Command.emptyClassNameReplaces`: a `className` on `CommandEmpty` (even `""`) replaces its classes instead of merging.

`DialogTrigger`, `PopoverTrigger`, `DropdownMenuTrigger` and `ContextMenuTrigger` are now thin wrappers that read the config; `HoverCard` and `TooltipProvider` are function components that read the configured delays. Same DOM and props without config.

### Card, table, progress, separator and label

| Entry | Keys |
| --- | --- |
| `Card` | `classes.root`, `header`, `title`, `description`, `content`, `footer`, `action`. |
| `Table` | `classes.wrapper` (the scroll `<div>`), `table`, `header`, `body`, `footer`, `row`, `head`, `cell`, `caption`. |
| `Progress` | `classes.root`, `indicator`. |
| `Separator` | `classes.root` (the orientation size classes stay). |
| `Label` | `classes.root`. |

```tsx
<UiConfigProvider config={{ Card: { classes: { root: "rounded-surface bg-card text-card-foreground" } } }}>
```

New exports: `CardTitle`, `CardDescription`, `CardFooter`, `CardAction`.

## Loaders, rows, status, sortable list and helpers

Basic components and helpers that came from an app, all exported from the root, with `UiConfig` entries for the ones that have app-specific looks. Existing components keep their defaults. Every component here merges a caller `className` with `UiConfig.cn` when it is set.

### Components

- `Spinner` `variant?: "icon" | "circle" | "ring"`: without it the spinner draws the `mark` (prop, else `UiConfig.Spinner.mark`), else the loader icon as before; an explicit `variant` wins over the configured mark. `"icon"` is the loader icon. `"circle"` is a faint ring with a two-tone arc (Web Animations, paused off screen), for slots too small for a mark; `colors` (`{ track?, arc?, lead? }`, default `UiConfig.Spinner.circle`, else `currentColor`) sets its strokes. `"ring"` is the `Button` loading ring (fixed `h-4 w-4`, `currentColor`, unlabelled; `size`, `tone`, `stroke` and `decorative` do not apply). `Button loading` now renders `<Spinner variant="ring" />`, with the same DOM as before.
- `Spinner` `mark?: SpinnerMark` (`{ viewBox, shapes, strokeWidth, dashArray }`; each shape is `{ points, stroke }` (a `<polygon>`) or `{ d, stroke }` (a `<path>`)). With a mark the spinner draws the outline with a dash that runs around each shape (Web Animations, 2s a lap, paused off screen and in hidden tabs). `tone` and `stroke` do not apply; `decorative` and numeric `size` (as `width`/`height`) do.
- `CenteredSpinner` (`label`): a `Spinner` centred in its box (`flex-1`, `p-6`, `aria-busy`).
- `LoadingState` (`variant` `Drive | Dots | Orbit`, `size` `default | sm`, `iconOnly`, `label`, `colors`, `labelStyle`): a 3×3 pulsing grid with a label and an elapsed timer (one shared 100ms clock, asleep in hidden tabs).
- `RefreshSpinIcon` (`busy`, `className`): a refresh glyph that crossfades to `<Spinner variant="circle" />`.
- `CrossfadeIcon` (`show`, `whenTrue`, `whenFalse`, keys, `variant` `default | soft`) and `CrossfadeIconSlot` (`iconKey`): keyed icon swaps on `motion` `m` (needs the app's `LazyMotion`).
- `BorderBeam` (`active`, `size`, `colorVariant` `mono | progress | colorful`): a light that travels around the wrapper's border. Import `@vvedantb/ui/tokens/css/border-beam.css` for the `.beam-*` rules; colours are `--beam-color`, `--beam-progress-color`, `--beam-colorful-from` and `--beam-colorful-to`.
- `StatusDot` (`tone`, `size`): a small coloured status dot; forwards `ref`.
- `Surface` (`density` `tight | default | comfortable | none`) and `surfaceVariants`: a card-filled box with one padding.
- `ListRow` (`link`, `href`, `onClick`, `selected`, `accentClassName`, `contentClassName`, `decoration`) and `LIST_ROW_CONTROL_CLASS`: a selectable row with a stretched native overlay; nested controls take `LIST_ROW_CONTROL_CLASS` to sit above it.
- `Avatar`, `AvatarImage`, `AvatarFallback` (Radix Avatar from `radix-ui`).
- Sortable list (built on [Kibo UI](https://www.kibo-ui.com) and dnd-kit): `SortableListProvider` (`onDragEnd` gets a `SortableListDragEndEvent`, vertical drag), `SortableListGroup`, `SortableListHeader` (`name` + `color`, or `children`), `SortableListItems`, `SortableListItem`. For a static selectable row use `ListRow`.
- `useDragSensors({ sortable? })`: the dnd-kit sensor set for drag surfaces (mouse arms on distance, touch on a 200ms hold, keyboard; `sortable` adds sortable keyboard coordinates).

`Avatar`, the `ListRow` idle hover and the sortable list drop highlight fill with `surface-secondary` (the same colour as `muted` under `compat-shadcn-rgb.css`).

New dependencies (installed with the package): `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` and `@dnd-kit/utilities`.

### App config entries

| Entry | Keys |
| --- | --- |
| `Spinner` | `mark` (default for the `mark` prop), `circle` (`{ track?, arc?, lead? }`, default for `colors` of the `circle` variant). |
| `LoadingState` | `label`, `colors` (three column colours), `labelStyle`, `classes.label`. |
| `StatusDot` | `classes.tone` (fill class per tone; tones left out keep theirs). |
| `ListRow` | `classes.root`, `interactive`, `selected`, `idle`, `accent`, `overlay`, `content`. |

```tsx
<UiConfigProvider
  config={{
    Spinner: {
      mark: { viewBox: "0 0 24 24", strokeWidth: 2, dashArray: "0.3 0.7", shapes: [{ d: LOGO_PATH, stroke: "#635bff" }] },
      circle: { track: "#635bff", arc: "#635bff", lead: "#00d4ff" },
    },
  }}
>
```

### Helpers

- Motion (in the motion presets): `tokenTransition.fast` (150ms), `tokenTransition.base` (220ms), `tokenTransition.slow` (320ms), all `motionEase` like the CSS `--motion-fast/base/slow` tokens, and `staggerDelay(index, step = motionTiming.stagger, max = 0.2)`. The spring is the existing `springTransition`.
- Gesture physics: `rubberband(overshoot, dimension, constant = 0.55)`, `projectVelocity(velocity, decelerationRate = 0.998)`, `DRAG_ACTIVATION_DISTANCE_PX` (8). `SidebarResize` now uses the shared `rubberband` (same maths).
- Animation budget: `ensureRuntimeVisibility()` (sets `html[data-page-hidden]`), `observeAnimVisibility(el, onChange?)` and `useAnimOffscreenRef()` (set `data-anim-offscreen`), `bindRuntimeAnimation(el, animation)` (pauses a WAAPI loop while hidden, off screen or in a parked `aria-hidden` subtree; decorative chrome marked `data-anim-chrome` does not count).
- Shared clock: `subscribeQuantized(intervalMs, onChange)`, `quantizedSnapshot(intervalMs)`, `msUntilNextBoundary(intervalMs)`.
- Identity colours: `catSlotForId`, `catColorForId`, `catColorForSlot`, `CAT_SLOT_COUNT` (class names `text-cat-N`, `bg-cat-N`, `bg-cat-N/12`, `border-cat-N`; the app defines the `cat` colours).
- Radius classes: `SURFACE_RADIUS_CLASS` (`rounded-surface`), `CONTROL_RADIUS_CLASS` (`rounded-control`).

## App config: AI chat

`UiConfigProvider` entries and opt-in props for the AI chat elements, plus the components and markdown renderer that came from an app. Without an entry each element renders its built-in DOM; `classes` parts replace built-in classes and the caller `className` merges last (with `UiConfig.cn`); other keys are prop defaults, and an explicit prop wins.

```tsx
const config = {
  Conversation: { scrollButton: { label: "Scroll to end", showDelay: 150, size: "sm" } },
  Message: { lazyActionTooltips: true },
  PromptInput: { classes: { groupDragOver: "border-primary bg-primary/5" }, submitCrossfade: true },
  Shimmer: { mode: "mask" },
  CodeBlock: { plain: true, copyLabel: "Copy code" },
} satisfies UiConfig;
```

- `Conversation`: `classes.content` (`ConversationContent`), `classes.scroll` (a default `scrollClassName`, merged before the prop), `classes.download`, and for `ConversationScrollButton` `classes.scrollButton`, `classes.scrollButtonMotion` (the animated wrapper; `""` renders it without a class) and `classes.scrollButtonFrame` (a static wrapper around the presence; none by default). `scrollButton` holds defaults for `label`, `icon`, `showDelay`, `size` and the motion (`initial`, `animate`, `exit`, `transition`). New `ConversationScrollButton` props: `label` (text after the icon, also `aria-label` and `title`), `icon`, `showDelay` (ms to wait after leaving the bottom before showing; hiding stays immediate; default 0) and `resetKey` (a change hides the button and cancels a pending show). The button now animates with `m` inside its own `LazyMotion`, so it also works under an app's `<LazyMotion strict>`.
- `JumpRail`, `ChatJumpRail` (new): a timeline minimap for long scroll areas. Place it in a `relative` parent. `ChatJumpRail` goes inside `Conversation` and reads the scroll viewport and `stopScroll` from its context:

  ```tsx
  <Conversation>
    <ConversationContent>{/* rows with data-message-id */}</ConversationContent>
    <ChatJumpRail
      messages={buildChatJumpRailTicks(transcript)}
      renderedFromId={firstRenderedId}
      onRevealMessage={revealMessage}
      formatPreview={mentionsToText}
    />
  </Conversation>
  ```

  Outside a `StickToBottom` (for example a page outline) use `JumpRail` with `items` (`{ id, title, preview?, level? }`), a `scrollRef` or `getScrollElement`, and `targetAttribute="data-toc-id"` or `resolveTarget`. `onReveal` runs when a target is not in the DOM; `onBeforeScroll` runs just before it. `onSelect(id)` runs after a click or Enter/Space pick, once the scroll has started or `onReveal` has run, so an app can move focus to the target for keyboard users; `ChatJumpRail` accepts it too. `observeKey` re-observes when the rendered window changes. The geometry helpers (`resolveJumpRailTopPercent`, `resolveJumpRailIndexFromPointer`, `resolveJumpRailHeightStyle`, `resolveJumpRailTickWidthClass`, `resolveJumpRailTickLevelStyle`) are exported.
- `Message`: `classes.root`, `classes.user`, `classes.assistant` (the role classes of `Message`), `classes.content` (all `MessageContent` classes), `classes.branchSelector`, `classes.branchIcon` (a class in place of the arrows' `size={14}`), and `lazyActionTooltips`: a `MessageAction` mounts its tooltip on first hover or focus (focus opens it), not with the button.
- `PromptInput`: `classes.group` (the input group, default `overflow-hidden`), `classes.groupIdle` / `classes.groupDragOver` (added while no drag / an accepted drag is over the form), `classes.groupDefault` (added when no `containerClassName` is given), `classes.textarea`, `classes.footer`, `classes.submit`, `classes.tabItem`; `submitIcons.<send|submitted|streaming|error>`, `submitCrossfade` (cross-fade the submit icon on status change) and `menuTriggerAsChild` (`PromptInputActionMenuTrigger` becomes the Radix trigger instead of a button inside it). New `PromptInput` props: `dataDrop` (`{ type, onDrop }`: a non-file drag of that MIME type counts as a drag over the form and `onDrop` gets its string payload) and `inputGroupClassName` (same as `containerClassName`). The attachments context adds `replace(id, file)`; `accept` now matches extension patterns such as `.html` by file name; `useOptionalPromptInputController` is exported.
- `PromptInputSettings` (new): an overflow menu with a "Model" submenu (one radio list, or a submenu per provider). Entry: `providerLabel(provider)` (default the id), `providerIcon(provider)` (default none), `classes.trigger`.
- `TraitsPanel` (new, with `isUltrathinkPrompt`, `applyUltrathinkPrefix`): reasoning, speed, context and thinking segments for a model picker; inside a `PromptInputProvider` it offers "Ultrathink" by editing the prompt. Entry: `classes.label`, `classes.empty`, `classes.option`, `classes.optionSelected`, `classes.optionIdle`, `classes.note`.
- `PromptInputSpeech`, `useSpeechRecognition`, `getSpeechRecognition` (new): Web Speech API dictation; the button renders nothing without the API.
- `Queue`: one family, used in one of two ways. The queued-messages widget is unchanged: `Queue` with `count`, `QueueHeader`, `QueueList` (`open`) and `QueueItem` with `text` (`model`, `personalityName`, `personaName`, `personaImage`, `onEdit`, `onRemove`). The composable parts (the AI Elements `Queue`, new): `Queue` without `count` (a plain root), `QueueSection`, `QueueSectionTrigger`, `QueueSectionLabel`, `QueueSectionContent`, `QueueList` (inside a composable `Queue`: a list capped at `max-h-48`), `QueueItem` without `text` (an `li`, takes `ref`), `QueueItemIndicator`, `QueueItemContent`, `QueueItemActions`, `QueueItemAction`. The composable parts render no `motion.*`, so they work under `<LazyMotion strict>`. Entry `Queue`: `classes.sectionTrigger`.
- `Shimmer`: `mode`, `as`, `classes.base`, `classes.overlay`, `classes.band`, `classes.copy`. New prop `mode`: `"gradient"` (default) or `"mask"`, which sweeps a masked copy of the text with transforms only (no repaint, paused offscreen). `mask` needs the app to define `.shimmer-overlay`, `.shimmer-band` and `.shimmer-copy` (or the `classes` it names).
- `CodeBlock`: `plain`, `copyButtonSize`, `copyLabel` (a screen-reader label on the copy button), `copyEveryClick` (the copy button copies on every click, also while it shows the check; by default those clicks do nothing until it resets after `timeout`), `classes.container`, `classes.pre`, `classes.copyButton`, `classes.copyIcon` (a class in place of `size={14}`). New props: `plain` (no shiki: a `pre` with the code, and `children` replace that `pre` instead of sitting above it); `language` is now optional.
- `Artifact`: `classes.root`, `classes.header`, `classes.title`, `classes.description`, `classes.actions`, `classes.action` (`ArtifactAction` and `ArtifactClose`), `classes.actionIcon`, `classes.content`, `actionSize`, `actionLabel` (`"sr-only"` names actions with a hidden span instead of `aria-label`). `ArtifactAction`: `tooltip` is optional (no tooltip, no wrapper) and `icon` also takes an icon component (`icon={IconCopy}`). New `ArtifactClose` (an action with an X, `label` default `"Close"`).
- `Attachments`: `classes.item.<variant>`, `classes.preview.<variant>`, `classes.remove.<variant>` replace the variant classes of `Attachment`, `AttachmentPreview` and `AttachmentRemove`.
- `FileChip` (new, no entry): a file name chip that opens the file.
- `SonnerToaster`: `UiConfig.SonnerToaster` sets a default for any `SonnerToaster` prop; an explicit prop wins, and a prop passed as `undefined` keeps the config value. New prop `classes` (`ToastClassNames & { toaster?: string }`): replaces the package `classNames` per key (`""` removes one); `toaster` replaces `toaster group !font-sans` on the list (`""` removes it). Caller `toastOptions.classNames` still merge after. See also "Toaster" above.

### Markdown

`Markdown` (Streamdown with GFM, KaTeX math, CJK, Shiki code blocks with a wrap toggle and copy button, mermaid diagrams loaded on first use, GitHub alerts `> [!NOTE]`, links with the site favicon, file paths in inline code, copy as markdown) and `MarkdownLink`. `components` and `remarkPlugins` extend the defaults. It imports KaTeX's stylesheet; import `@vvedantb/ui/tokens/css/markdown.css` for the typography. That file reads the shadcn channel variables (`rgb(var(--foreground))`, `--muted-foreground`, `--border`, `--primary`, `--success`, `--warning`, `--destructive`), as with `compat-shadcn-rgb.css`, and fills code block and table panels with `var(--color-surface-secondary)` (defined by `tokens.css` and by the compat file, which maps it to the app's `--muted`); `--markdown-alert-important` (RGB channels, default `var(--primary)`) colours `[!IMPORTANT]`. `Markdown` merges a caller `className` with `UiConfig.cn`.

New dependency (installed with the package): `katex`. `streamdown` and the `@streamdown/*` plugins stay peers; `streamdown` must be `^2.3.0` (`Markdown` uses `useIsCodeFenceIncomplete`, `parseMarkdownIntoBlocks` and the plugin types, which 2.2 and earlier lack).

## Agent activity, plan, tests, preview and model picker

AI surfaces that came from an app, exported from the root. Fills use `surface-secondary` (`bg-surface-secondary`, `from-surface-secondary/40`), which is the app's `--muted` under `compat-shadcn-rgb.css` and the secondary surface under `tokens.css`. They also use the shadcn colour names `bg-secondary`, `bg-popover` and `bg-card` and a few app utilities (`motion-press`, `smooth-shadow-*`, `scrollbar`, `scrollbar-none`, `text-2xs`, `text-3xs`), so they look as intended with `compat-shadcn-rgb.css` and an app that defines those utilities. They merge a caller `className` with `UiConfig.cn` when set.

- `ActivityTasks` (`steps`, `isStreaming`, `name`, `startedAt`, `duration`, `layout` `folded | inline`, `onOpenFile`, `onRequestFullDetail`): an agent turn as a timeline. Tool runs fold behind one summary line, reasoning and mid-turn text render as Markdown, subtasks nest their steps, long timelines cap behind "Show N more". `OpenSubagentContext` gives subtask rows a "View" link.
- The step model: `ActivityStep`, `ActivityTodoItem`, `ActivityQuestion`, `ActivityQuestionOption`, `ActivityStepOutput`, `ActivityStepEdit`, `activityStepHasRichDetail`, `activityStepConfig` (glyph and fallback label per step type), `ActivityThinkingIcon`, `useActivitySpinnerVerb`, `getRandomActivityVerb`, `useActivityElapsedSeconds`, `formatActivityElapsed`, `useStreamingDisclosure`.
- Tool-call details show files with `FileChip` and output in a `CodeBlock` (`plain`) with its copy button, so the `CodeBlock` entry (see "App config: AI chat") styles those frames too.
- `ActivityQuestionCard` (`questions`, `answers`): the read-only record of a multiple-choice question and its answer.
- `AgentTrace`, `AgentTraceLine` (`status`: `AgentTraceStatus`, `running | error | pending`), `AgentTraceIcon` (`iconKey` crossfades a swap), `AgentTraceTitle` (`shimmer`), `AgentTraceDescription`, `AgentTraceCollapsible`, `AgentTraceCollapsibleTrigger` (`trailing`: controls beside the trigger), `AgentTraceCollapsibleContent`: one agent step as one line, with an optional fold.
- `AgentPlan*`, `TestResults*` / `TestSuite*` / `TestResult*` (one test: `TestResult`, `TestResultStatusIndicator`, `TestResultName`, `TestResultDuration`, `TestResultError`, `TestResultErrorMessage`, `TestResultErrorStack`), `WebPreview*` (with `useWebPreview`), `ContextUsage*` (context window usage in a hover card: `ContextUsage`, `ContextUsageTrigger`, `ContextUsageContent`, `ContextUsageContentHeader` / `Body` / `Footer`, `ContextUsageInput`, `ContextUsageOutput`, `ContextUsageCacheRead`, `ContextUsageCacheWrite`, deprecated `ContextUsageCache`).
- `ModelPicker` (button and popover; `simpleLadder` opens on a discrete slider; the one model picker), `ModelPickerContent` (the searchable model and account list, for menus; pair it with `modelPickerSurfaceClass`), `ModelOption`, `ModelAccount`, `findModelOption`, `formatModelDisplayLabel`, `getProviderLabel`, `ProviderIcon` (`claude`, `codex`, `opencode`, `cursor`).
- Deprecated, removed in the next minor release: `ModelSelector*` and `PromptInputModelSelect*` (use `ModelPicker`). Behaviour is unchanged, except `ModelSelectorLogo`: it now renders `ProviderIcon` and fetches nothing (it loaded `https://models.dev/logos/<provider>.svg`). `anthropic`, `google-vertex-anthropic` and `claude` show the Claude mark, `openai` and `codex` the OpenAI mark, `opencode` and `cursor` their marks; any other id shows a neutral CPU glyph. It takes SVG props and `size` (default 12) and keeps the `"<provider> logo"` name. `ModelSelectorLogoGroup` styles `svg` children.

### App config entries

| Entry | Keys |
| --- | --- |
| `ActivityTasks` | `name` (agent name in the streaming header, default `"Agent"`; the `name` prop wins), `markdown` (a component that takes `{ className, mode, children }` and renders reasoning and reply text; default `Streamdown` with the cjk, code, math and mermaid plugins), `thinkingIcon` (`{ src, alt }`: `ActivityThinkingIcon` shows this image, 16px and round, instead of the brain glyph). |
| `ActivityQuestionCard` | `classes.selectedOption` (fill of the picked option, default `bg-surface-tertiary`). |
| `ModelPicker` | `classes.trigger` (replaces the `ModelPicker` trigger classes), `badgeRing.trigger` / `badgeRing.panel` (ring colour around the account initials badge on the trigger and in the panel; default `var(--color-border)` / `var(--color-surface-secondary)`). |

```tsx
const config = {
  ActivityTasks: { name: "Ada", markdown: AppMarkdown, thinkingIcon: { src: "/logo.svg", alt: "Ada" } },
  ActivityQuestionCard: { classes: { selectedOption: "bg-accent" } },
  ModelPicker: { badgeRing: { trigger: "rgb(var(--input))", panel: "rgb(var(--muted))" } },
} satisfies UiConfig;
```

## Kibo blocks

Blocks that came from an app, built on [Kibo UI](https://www.kibo-ui.com). All exported from the root, next to the sortable list.

### New components

- Gantt: `GanttProvider` (`range`: `GanttRange`, `daily | monthly | quarterly`, `zoom`, `onZoomChange` for Ctrl/Cmd + wheel, `onAddItem`), `GanttSidebar` (`headerTitle`, `headerMeta`), `GanttSidebarGroup`, `GanttSidebarItem` (`icon`, `meta`, `selected`, `onSelectItem`), `GanttSidebarHeader`, `GanttTimeline`, `GanttHeader`, `GanttContentHeader`, `GanttColumns`, `GanttColumn`, `GanttFeatureList`, `GanttFeatureListGroup`, `GanttFeatureRow`, `GanttFeatureItem` (`onMove`, `onClick`), `GanttFeatureItemCard`, `GanttFeatureDragHelper`, `GanttToday`, `GanttContext` / `useGanttContext`. The canvas pans on drag, centres on today and grows by a year at either edge.
- Kanban: `KanbanProvider` (`columns`, `data`, `overlay`, drag callbacks, `collisionDetection`), `KanbanBoard` (`disabled`; highlights while a card is over it or over one of its cards), `KanbanHeader`, `KanbanCards` (render prop per item), `KanbanCard`, `useKanbanContext`.
- `ContributionGraph` (`data`: `ContributionGraphActivity[]`, `labels`: `ContributionGraphLabels`) with `ContributionGraphCalendar`, `ContributionGraphBlock`, `ContributionGraphFooter`, `ContributionGraphTotalCount`, `ContributionGraphLegend`.
- `VideoPlayer` (media-chrome `MediaController`, dark control styling) with `VideoPlayerContent`, `VideoPlayerControlBar` and the `VideoPlayer*Button`, `VideoPlayerTimeRange`, `VideoPlayerTimeDisplay` and `VideoPlayerVolumeRange` controls.
- `LiveCursor`, `LiveCursorPointer`, `LiveCursorBody`, `LiveCursorName` (a collaborator's pointer and name tag); `AvatarStack` (`size`); `ThemeSwitcher` (`value`, `defaultValue`, `onChange`; system, light, dark).

Kanban, the sortable list and the gantt bars drag with `useDragSensors`.

New dependencies (installed with the package): `media-chrome` and `dayjs` (a dev dependency before).

### App config entries

| Entry | Keys |
| --- | --- |
| `Gantt` | `classes.root` (scroll container), `today` (today pill), `todayDate` (the date under it), `dragHandle` (resize grip), `offscreenIndicator` (edge date chip). |
| `Kanban` | `classes.card` (`KanbanCard` cursor, transitions and press), `cardTransition` (CSS `transition` list appended to dnd-kit's inline reorder transition; default 150ms `scale` and `opacity`). |
| `ThemeSwitcher` | `classes.button` (each theme button). |
| `VideoPlayer` | `classes.root` (`VideoPlayer`), `classes.controlBar` (`VideoPlayerControlBar`). |

The defaults use plain Tailwind (`duration-150`, `text-[0.625rem]`, `shadow-lg`, `[scrollbar-width:none]`). Fills use `surface-secondary` (with `compat-shadcn-rgb.css` that is `--muted`). Apps with their own motion or shadow utilities put them here. Every kibo part merges a caller `className` with `UiConfig.cn`.

```tsx
const config = {
  Kanban: { cardTransition: "scale var(--motion-fast) ease-out, opacity var(--motion-fast) ease-out" },
  VideoPlayer: { classes: { root: "overflow-hidden rounded-surface shadow-xl" } },
} satisfies UiConfig;
```

## Colour names in components

Components use `text-muted-foreground`, `primary` and `--color-*` theme variables. They no longer use `text-muted`, `*-accent` or raw `var(--muted)` reads, which clash with shadcn names. Exceptions that match existing app markup on purpose: the `InputArea` ghost text, the `Button` `flat` variant and the `CommandDialog` `listLayout="auto"` group headings use `text-muted`. `tokens.css` still defines `--color-muted` and `--color-accent`. `pnpm --filter @vvedantb/ui check:tokens` fails if a component brings the old names back (it also runs in `build`, `test` and `verify`). It also fails on fill-type `muted` (`bg-`, `from-`, `via-`, `to-`, `fill-`, `stroke-`, `border-`, `ring-`, `divide-` and `outline-muted`, with variants and opacity; not `*-muted-foreground`): `muted` is a text colour in `tokens.css` and a fill in shadcn, so components fill with `surface-secondary`, which is the same fill under `compat-shadcn-rgb.css`. The dark-mode `Switch` off state, the `Slider` track and thumb and the slash menu row hover keep their `muted` fills on purpose, each line marked `check-tokens-allow: muted`. The package CSS (`tokens/src/css` and any `.css` under `src`) is checked too: a background, fill, stroke, border or outline colour, shadow or `--*-bg`-style variable that reads `--muted` or `--color-muted` fails; fill with `var(--color-surface-secondary)`.

## Using an existing shadcn RGB theme

Use this when the app defines shadcn-style variables as space-separated channels (`--background: 244 245 246`) and reads them as `rgb(var(--background) / 0.5)`.

1. Import `compat-shadcn-rgb.css` **instead of** `tokens.css`. Never import both.
2. The app keeps `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring` (each with its `-foreground` where shadcn has one) and `--radius`. The compat file does not define them. It only references them, so the app can change `--primary`, `--ring`, `--radius` or `--font-sans` at runtime. `--sidebar-accent` is optional: sidebar nav rows use it when set, else `--secondary` (0.7.2).
3. Add the `@source` line for the package sources.

```css
@import "tailwindcss";
@import "@vvedantb/ui/tokens/css/compat-shadcn-rgb.css";
@source "../node_modules/@vvedantb/ui/src/**/*.{ts,tsx}";
```

Shared CSS that is safe without `tokens.css`: `compat-shadcn-rgb.css`, `dialog.css`, `utilities.css`, `scrollbar-thin.css` (reads `--scrollbar`, which the compat file defines), `clear-input.css` and `motion.css` (import them yourself; `tokens.css` is what imports them otherwise), `modal.css` and `tabs.css` (both need the motion variables listed in `tokens/README.md` on the app `:root`, because `tokens.css` sets them), and `animations.css` (not with the Tailwind preset). `base.css` and `tabs-pills.css` read raw `--accent`, `--foreground`, `--muted`, `--segment` and `--default`; skip them unless the app defines those as full colour values.

`text-muted` (the exceptions above) reads `--muted-foreground` under the compat file, so it stays grey text. `bg-muted` and `border-muted` still read the app's `--muted` fill (0.17.1).

The compat file defines `.glass-panel-strong` for toasts, dialogs and hover cards as the solid popover colour (`rgb(var(--popover))`, as `bg-overlay`), the same as `tokens.css`. Before 0.15.0 it was `rgb(var(--card) / 0.95)` with a 12px blur. The rule is in `@layer components`, so an app `.glass-panel-strong` rule after the import wins.

A fixture that renders the main components against sample light and dark RGB variables is in `tokens/examples/compat-shadcn-rgb/`.

The components that came from the app (loaders, `ListRow`, `Surface`, `BorderBeam`, `Avatar`, `StatusDot`, kanban and the sortable list, activity, agent trace, agent plan, test results, the model picker and markdown) render on plain `tokens.css` in light and dark in `tokens/examples/tokens-moved/`.

`@clerk/clerk-react`, `convex`, `@tanstack/react-hotkeys`, `motion`, `zod` and `@vvedantb/server` (0.13.0) are optional peers (`peerDependenciesMeta`), so the package manager does not install or warn about them. The root still imports each of them statically from some module (`useStableAuth` and `ConvexClerkProvider` import Clerk; `ConvexClerkProvider` and `useEnsureUser` import `convex/react`; the artifact viewers import `@vvedantb/server`; the motion presets, `ConfirmSkipHint` and others import the rest). So an app that imports `@vvedantb/ui` must have all six resolvable, even if it uses none of those exports: a bundler resolves every import before it tree-shakes. `app/tests-node/convex-esm.test.mjs` pins which root modules import `convex` and Clerk, and `app/tests-node/artifacts-esm.test.mjs` which import `@vvedantb/server`.

Full documentation: the repository `README.md`. Upgrading from `@vvedantb/tokens`, `@vvedantb/shell` or `@vvedantb/app-kit`: `MIGRATION.md`.

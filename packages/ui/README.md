# @vvedantb/ui

Shared React 19 web UI. Source-exported: no build step.

| Import | What it is |
| --- | --- |
| `@vvedantb/ui` | The only JavaScript entry. Primitives (Radix-based), AI elements, audio (`playChime`, `useReplyChime`, `playTone`), `toast` and `SonnerToaster`, the composer (`InputArea`, deprecated 0.3 `Composer`), shell (`SidebarHeader`, `PillTabs`, `SessionsHoverCard`, and the app shell: `AppShell`, `AppSidebar`, `SidebarRail`, `RailTile`, `SidebarPanel`, `SidebarAccountMenu`, `SignOutDialog` and related helpers), app helpers (confirm skip, update watcher, settings chrome, `useStableAuth`), `cn`, and the native tokens `tokens` and `Tokens`. See `app/README.md` in the repository for the app helpers. |
| `@vvedantb/ui/tokens` | `tokens.css`: colour, radius, shadow, ease and font tokens for Tailwind v4. CSS. |
| `@vvedantb/ui/tokens/tokens.css` | Same file as `@vvedantb/ui/tokens`. CSS. |
| `@vvedantb/ui/tokens/css/*.css` | `index`, `base`, `dialog`, `modal`, `tabs`, `tabs-pills`, `utilities`, `scrollbar-thin`, `animations`, `compat-shadcn-rgb`. CSS. |
| `@vvedantb/ui/tokens/compat/shadcn-rgb.css` | Same file as `tokens/css/compat-shadcn-rgb.css`. CSS. |
| `@vvedantb/ui/tokens/tailwind-preset` | Tailwind preset (`.mjs`) for `@config "@vvedantb/ui/tokens/tailwind-preset"`. Kept as a build-tool entry: Tailwind needs a resolvable package path, and it is not a React API. |
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
import { ConfirmDialog, SlideOverPanel, ToolbarSearchInput } from "@vvedantb/ui";

<div className="relative">
  <SlideOverPanel open={open} onClose={() => setOpen(false)} header={<h2>Details</h2>}>
    <div className="p-4">Body</div>
  </SlideOverPanel>
</div>

<ToolbarSearchInput value={query} onChange={setQuery} />

<ConfirmDialog size="sm" open={open} onOpenChange={setOpen} title="Delete item?" variant="destructive" onConfirm={remove} />

<ConfirmDialog size="md" open={open} onOpenChange={setOpen} title="Delete item?" description="This cannot be undone." confirmLabel="Delete" variant="destructive" onConfirm={remove} />
```

- `SlideOverPanel`: a right-side panel, absolutely positioned inside its nearest positioned parent. It is not a portal or dialog. It slides in with a spring and is hidden below `md`. Only the close button closes it (no Escape, no outside click). `width` is `"w-96"` (default) or `"w-80"`. `closeLabel` defaults to `"Close panel"`. `className` merges last.
- `ToolbarSearchInput`: a compact `h-8` search field for toolbars, with a search icon and a clear button. The clear button stays mounted and is hidden while the value is blank. Clearing calls `onChange("")` and does not move focus. Defaults: `placeholder="Search..."`, `label="Search"` (the `aria-label`), `clearLabel="Clear search"`. The ref goes to the `<input>`.
- `ConfirmDialog` `size`: `"default"` keeps the alert dialog. `"sm"` renders a compact, dismissible dialog (outside click, Escape and the close button close it) with small Cancel and confirm buttons. Cancel calls `onCancel` and then `onOpenChange(false)`. Confirm calls `onConfirm` only, so the caller closes it. `"md"` (0.5.2) is dismissible like `"sm"`, with the title in a header (`pb-4`), the description in its own section (`py-6`) and a footer (`pt-4`) with default-size buttons. It has the same Cancel and confirm behaviour as `"sm"`.
- Legacy (still supported): the `ConfirmDialog` `size`, `variant`, `cancelLabel` and `confirmLabel` props. For anything they do not cover, compose the parts (see [Composable parts](#composable-parts-060)).

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
- Class helpers: `railTileClass`, `railTileStateClass(active)`, `railBadgeClass`, `sidebarNavRowClass(isIconOnly)`, `sidebarNavLinkTextClass(isActive)`, `sidebarSectionLabelClass`.

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

## Composable parts (0.6.0)

Shadcn-style building blocks. The prop-driven components above are thin compositions of them and render the same DOM.

Convention: compound parts are static members of a namespace object, `<Namespace>.<Part>`. There are three namespaces: `ConfirmDialog.*`, `AppShell.*` and `Sidebar.*`. `ConfirmDialog` and `AppShell` stay callable with their legacy props. `Sidebar` is a plain object. Prop types are exported flat, for example `ConfirmDialogRootProps`, `AppShellMainProps` and `SidebarRailItemProps`. Every part that renders an element merges `className` last and forwards native props.

### `ConfirmDialog.*`

| Part | Purpose |
| --- | --- |
| `Root` | Radix dialog root. `size` (`"default"`, `"sm"`, `"md"`: layout slot for the other parts), `alert` (blocking alert dialog; default `size === "default"`), `pending` (swallows close requests, disables Cancel, Action shows its pending state), `confirmPhrase` (type-to-confirm; the typed text resets each time the dialog opens). |
| `Content` | `AlertDialogContent` with `alert`, else `DialogContent`. `sm` and `md` add `sm:max-w-96`. Takes every `DialogContent` prop (`role`, `hideCloseButton`, ...). |
| `Header` | `DialogHeader`; `md` adds `pb-4`. |
| `Title` | `DialogTitle`; `sm` adds `mb-2 text-sm font-medium`. |
| `Description` | `DialogDescription`; `sm` and `md` add their spacing. |
| `Body` | Plain `<div>` for extra content. No default classes. |
| `Footer` | `DialogFooter` (`md` adds `pt-4`); `sm` renders a `flex justify-end gap-2` row. |
| `Cancel` | Alert: the outline `AlertDialogCancel` (closes through Radix). Otherwise a ghost `Button` that runs `onClick`, then (unless it called `preventDefault()`) the Root `onOpenChange(false)`. Disabled while pending. Default text `"Cancel"`. |
| `Action` | Confirm button. Never closes the dialog. Disabled while `disabled`, pending, or until `confirmPhrase` matches. `pendingLabel` replaces the children with a spinner (`spinnerSize`, default 14) and the label while pending. |
| `Field` | Type-to-confirm input bound to `confirmPhrase` (trimmed, case-insensitive). `label` replaces the label content, `onEnter` runs on Enter while the phrase matches, `inputProps` go to the `Input`. |

`useConfirmDialog()` returns `{ size, alert, pending, phraseMatches, typed, setTyped, requestClose }` for custom parts.

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
| `AccountMenu` | Dropdown root. `badge` adds the unread dot (`AccountBadge`) in a `relative` wrapper. |
| `AccountTrigger` | Rail-tile-sized avatar button. `name`, `imageUrl`, plus `Button` props. |
| `AccountAvatar` | Avatar image or initials. |
| `AccountContent` | Menu content. Defaults `align="center"`, `side="right"`, `sideOffset={8}`, `w-56`. |
| `AccountLabel` | Identity label: avatar, `name`, optional `email`, `stacked`. |
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
            <Sidebar.AccountTrigger name={name} imageUrl={avatarUrl} />
            <Sidebar.AccountContent>
              <Sidebar.AccountLabel name={name} email={email} imageUrl={avatarUrl} />
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

Components use `text-muted-foreground`, `primary` and `--color-*` theme variables. They no longer use `text-muted`, `*-accent` or raw `var(--muted)` reads, which clash with shadcn names. Exceptions that match existing app markup on purpose: the `InputArea` ghost text, the `Button` `flat` variant and the `CommandDialog` `listLayout="auto"` group headings use `text-muted`. `tokens.css` still defines `--color-muted` and `--color-accent`. `pnpm --filter @vvedantb/ui check:tokens` fails if a component brings the old names back (it also runs in `build`, `test` and `verify`).

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

`@clerk/clerk-react`, `@tanstack/react-hotkeys`, `motion` and `zod` are optional peers (`peerDependenciesMeta`). Install `@clerk/clerk-react` only to use `useStableAuth`, `@tanstack/react-hotkeys` and `zod` only for the features that use them, and `motion` only to use the motion presets, `InputArea`, the 0.3 `Composer` or the AI elements and primitives that animate.

Full documentation: the repository `README.md`. Upgrading from `@vvedantb/tokens`, `@vvedantb/shell` or `@vvedantb/app-kit`: `MIGRATION.md`.

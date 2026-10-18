# @vvedantb/ui

Shared React 19 web UI. Source-exported: no build step.

| Import | What it is |
| --- | --- |
| `@vvedantb/ui` | Primitives (Radix-based), AI elements, `playChime` and `useReplyChime`. |
| `@vvedantb/ui/sonner` | `SonnerToaster`, its helpers and `toast`. |
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

`children` is the trigger. It is rendered with `asChild` by default, so it keeps its own handlers (such as a context menu). Extra props and the ref go to it. Use `asChild={false}` for a default trigger element. The content portals to `document.body` by default, so `overflow:hidden` ancestors do not clip it. Pass `portal={false}` to opt out. `surface` is `"overlay"` (default), `"surface"` (`rounded-surface`) or `"glass"` (`glass-panel-strong`, `rounded-surface`). `className` merges over the surface without `!`. Defaults: `openDelay` 400 ms, `closeDelay` 150 ms, `side="right"`, `align="start"`, `sideOffset` 8, width and padding `w-64 p-3` (override with `className`). `body` is a node or a function of `{ open }`. `loadContent` runs only while the card is open. Control the state with `open`, `defaultOpen` and `onOpenChange`. Fixture: `shell/examples/sessions-hover-card/`.

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

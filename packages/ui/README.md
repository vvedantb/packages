# @vvedantb/ui

Shared React 19 web UI. Source-exported: no build step.

| Import | What it is |
| --- | --- |
| `@vvedantb/ui` | Primitives (Radix-based), AI elements, `playChime` and `useReplyChime`. |
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

`children` is the trigger. Defaults: `openDelay` 400 ms, `closeDelay` 150 ms, `side="right"`, `align="start"`, `sideOffset` 8, width and padding `w-64 p-3` (override with `className`). `body` is a node or a function of `{ open }`. `loadContent` runs only while the card is open. Control the state with `open`, `defaultOpen` and `onOpenChange`. Fixture: `shell/examples/sessions-hover-card/`.

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

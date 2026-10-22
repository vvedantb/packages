# packages

Shared packages for vvedantb apps. Four public npm packages.

| Package | Version | What it is |
| --- | --- | --- |
| `@vvedantb/ui` | `0.13.1` | Shared React 19 web UI from one JavaScript entry (`.`): primitives, AI elements, audio, `toast` and `SonnerToaster`, the composer, the app shell, app helpers (confirm skip, update watcher, settings chrome, stable Clerk auth, theme provider, page title context, page motion provider, compact relative time, `ConvexClerkProvider`, `parseClientEnv`, `useEnsureUser`), marketing pieces (landing kit, site footer, pricing dialog), animated nav icons, artifact viewers (`ArtifactFrame` state bridge, card, list, toolbar, viewer, versions menu) and the native tokens. CSS subpaths: `./tokens`, `./tokens/css/*.css` and `./landing.css`; plus the `./tokens/tailwind-preset` build-tool entry. Source-exported. |
| `@vvedantb/native-ui` | `0.2.1` | React Native + Expo primitives (floating surfaces, forms, tab bar, settings chrome). Source-exported. Has no dependency on `@vvedantb/ui`; it carries its own copy of the JS tokens. |
| `@vvedantb/server` | `0.6.1` | Convex backend helpers, Convex optimistic updates and Node-side MCP client OAuth from one root export (`.` only): query-limit errors, Clerk auth and token verification, Clerk-user lookups and `ensureUser`, bearer tokens, env, CORS, `jsonResponse`, MCP server scaffolding and route registration for Convex `httpAction`s, WebCrypto primitives, optimistic-update helpers (`mapLoadedQuery`, `patchLoadedQuery`, `tempId`, an in-memory store for tests) and MCP client OAuth for desktop apps (provider, sign-in, refresh, revocation, loopback redirect server; Node built-ins and the MCP SDK load on first use, so Convex V8 bundles stay clean), a QuickJS code sandbox, and a pure artifacts core (Zod contract, state ops, quiz and flashcards pages, sandboxed document wrapper). Compiled. |
| `@vvedantb/config` | `0.3.0` | Root JS export plus JSON tsconfig and oxlint bases, Vite, Vitest, Babel and Metro presets, pinned tool versions, the `vvedantb-config sync` CLI and the `vvedantb-check-asar` packaged-app check. Compiled. |

Moving from the earlier packages (`@vvedantb/tokens`, `shell`, `app-kit`, `convex-kit`, `mcp-kit`)? See [MIGRATION.md](MIGRATION.md).

## Install

```sh
npm install @vvedantb/ui                 # web
npm install @vvedantb/native-ui          # Expo / React Native
npm install @vvedantb/server             # Convex backends, optimistic updates, MCP client OAuth (Node)
npm install -D @vvedantb/config          # tooling
```

For a local checkout of this repo:

```json
"dependencies": {
  "@vvedantb/ui": "link:../packages/packages/ui"
}
```

`@vvedantb/ui` and `@vvedantb/native-ui` ship source and need no compile step. `@vvedantb/server` and `@vvedantb/config` publish compiled `dist` (built on pack); after a path or git install, run `pnpm build` first.

`@vvedantb/ui` expects the baseline peer stack (React 19, Radix, CVA, cmdk, motion, sonner, clsx, tailwind-merge, Tabler icons) plus the extras' peers (`radix-ui`, accordion/scroll-area/visually-hidden, vaul, embla, shiki, `ai`, streamdown, nanoid, use-stick-to-bottom). Install those in the app. The app helpers also use `@clerk/clerk-react`, `convex`, `@tanstack/react-hotkeys` and `zod`, and the artifact viewers use `@vvedantb/server` (0.6.1 or later). These are optional peers, so the package manager does not install them, but the root imports each one statically, so an app that imports `@vvedantb/ui` must have them installed (motion too).

## Package notes

- `@vvedantb/ui` app helpers: `ConfirmSkipHint`, `useRequestConfirm`, `useAltHeld`, `startUpdateAvailableWatcher`, `SettingsPage` and friends, `useStableAuth`, `createThemeProvider`, `createPageTitleContext`, `PageMotionProvider`, `formatCompactRelativeTime`, `ConvexClerkProvider`, `parseClientEnv`, `useEnsureUser`. See `packages/ui/app/README.md`.
- `@vvedantb/ui/tokens`: see `packages/ui/tokens/README.md`.
- `@vvedantb/server`: see `packages/server/README.md`, `packages/server/docs/convex.md` (including optimistic updates), `packages/server/docs/mcp.md`, `packages/server/docs/mcp-oauth-client.md`, `packages/server/docs/crypto.md`, `packages/server/docs/sandbox.md` and `packages/server/docs/artifacts.md`. Per-app migration steps and measured line counts for the MCP kit are in `packages/server/docs/migration.md`.
- `@vvedantb/config`: `versions` and the CLIs from the root, `@vvedantb/config/tsconfig/{base,web,convex,react-native}.json` and `@vvedantb/config/oxlint/base.json` (JSON by path), `vvedantb-config sync [--check]` and `vvedantb-check-asar list|resolve`. See `packages/config/README.md`.

## Use in a Tailwind v4 app

In the app's main stylesheet:

```css
@import "tailwindcss";
@import "@vvedantb/ui/tokens";
@source "../node_modules/@vvedantb/ui/src/**/*.{ts,tsx}";
@source "../node_modules/@vvedantb/ui/shell/src/**/*.{ts,tsx}";
@source "../node_modules/@vvedantb/ui/app/src/**/*.{ts,tsx}";
```

- `@vvedantb/ui/tokens` does not import Tailwind itself, so import Tailwind first.
- Tailwind does not scan `node_modules`. The `@source` lines tell it to read the UI, shell and app sources, so their classes are generated. Paths are relative to the stylesheet. Change them to match the app's layout. Drop the shell or app line if you do not import that subpath.
- Dark mode uses the `.dark` class (the next-themes class strategy). `[data-theme="dark"]` also works.

#### Shared app CSS (0.2.0)

Rules that 3 or more apps had copied are now opt-in files. Import only the ones the app used to define, at the position of the app's own copy (Tailwind inlines `@import` where it sits; it must be at top level):

```css
@import "@vvedantb/ui/tokens/css/base.css";        /* html, ::selection, control transitions, cursor, range accent */
@import "@vvedantb/ui/tokens/css/dialog.css";      /* compact Dialog max-width fix (unlayered) */
@import "@vvedantb/ui/tokens/css/modal.css";       /* .t-modal, .is-open, .is-closing; needs --modal-* on :root */
@import "@vvedantb/ui/tokens/css/tabs.css";        /* .t-tab, .t-tabs-pill; needs --tabs-dur, --tabs-ease */
@import "@vvedantb/ui/tokens/css/tabs-pills.css";  /* --tabs-* colours, .t-tabs--segmented / --pills */
@import "@vvedantb/ui/tokens/css/utilities.css";   /* @utility hit-target, reveal-on-hover */
@import "@vvedantb/ui/tokens/css/scrollbar-thin.css";
@import "@vvedantb/ui/tokens/css/animations.css";  /* CSS-first apps only; @config apps use the preset */
```

`@vvedantb/ui/tokens/css/index.css` imports base, dialog, utilities, scrollbar-thin and animations for a new app. Apps that load a `tailwind.config.ts` through `@config` add `presets: [tokensPreset()]` from `@vvedantb/ui/tokens/tailwind-preset` (shared colours, radii, shadows, `ease-smooth`, px screens, keyframes). app-c passes its color-mix wrapper: `tokensPreset({ color: v })`.

The per-app steps (which blocks to delete, where each import goes, which `:root` parameters to add) are in `packages/ui/tokens/examples/migration.md`, generated and checked by `pnpm --filter @vvedantb/ui verify`.

### What the app must provide

`@vvedantb/ui` uses some classes that neither Tailwind nor `@vvedantb/ui/tokens` defines. Without them the classes silently render nothing:

- `@import "shadow-plugin";` for `smooth-shadow-ring-*`, the edge and shadow of dialogs, sheets, menus, popovers, tooltips and toasts.
- `@plugin "tailwindcss-animate";` (or `tw-animate-css`) for `animate-in`/`fade-*`/`zoom-*`/`slide-in-*` on overlays. `animate-accordion-down`/`-up` also need `accordion-down`/`accordion-up` keyframes (in `@vvedantb/ui/tokens/tailwind-preset`, or in the app) and an `animation` timing in the app.
- `.t-modal` with `.is-open`/`.is-closing`: import `@vvedantb/ui/tokens/css/modal.css` and set `--modal-open-dur`, `--modal-close-dur`, `--modal-scale`, `--modal-scale-close` and `--modal-ease` on `:root`, or keep an app copy (app-b and app-c do; theirs differ).
- `.t-tab` and `.t-tabs-pill`: import `@vvedantb/ui/tokens/css/tabs.css` (+ `tabs-pills.css` for the `--tabs-*` colours and the segmented/pills variants) and set `--tabs-dur` and `--tabs-ease`. The `.t-tabs` container rule is still app CSS.
- `hit-target` and `reveal-on-hover`: import `@vvedantb/ui/tokens/css/utilities.css` (or keep plain `@layer utilities` rules, as app-a and app-e do).
- App-local CSS: `.glass-panel-strong` (dialog and toast fill), the `.t-tabs` container, `.t-clear*` (ClearInput dissolve layers).

### Font

The tokens set `font-sans` to Instrument Sans, with a `system-ui` fallback. To load it from Google Fonts, put this line *above* `@import "tailwindcss"`. CSS ignores `@import url(...)` when it comes after other rules, so the token file cannot include it.

```css
@import url("https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&display=swap");
```

Instrument Serif, Michroma and Inter are marketing fonts. They stay in each app and are not part of these packages.

### Components

```tsx
import { Button, Dialog, Input } from "@vvedantb/ui";
import { SidebarHeader, PillTabs } from "@vvedantb/ui/shell";
```

- `SidebarHeader`: 44px (`h-11`) header row with a truncated title and an optional `trailing` slot. It has no close button, icons or navigation.
- `PillTabs`: controlled pill tabs, icon and label only. It has no counts or badges. Use it only where you want pill tabs. It does not replace each app's segmented controls. Arrow keys, Home and End move between tabs.
- `SessionsHoverCard`: hover card shell for list rows. `children` is the trigger. Sets `openDelay` (400 ms default), position, `w-64 p-3` and `header`, `body` and `footer` slots. `body` can be a function of `{ open }`, and `loadContent` runs only while the card is open. It portals by default (`portal={false}` opts out), takes `surface` and `asChild`, and forwards its ref.
- `playChime` and `useReplyChime` (from `@vvedantb/ui`): soft two-note reply chime and a hook that plays it once when a thread stops streaming.

## What moved into `@vvedantb/ui`

**baseline (plain names, not blended):** `_menu-classes`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `dropdown-menu`, `hover-card`, `input`, `label`, `labeled-switch-row`, `modalTransition`, `popover`, `progress`, `select`, `separator`, `skeleton`, `sonner`, `sonner.css`, `spinner`, `switch`, `table`, `tabs`, `tabsSliding`, `textarea`, `time-picker`, `tooltip`, plus `cn` and motion presets.

**Leftovers from two other apps (now shared here):** `accordion`, `clear-input`, `input-group`, `scroll-area`, `button-group`, `carousel`, `pagination`, `radix-select`, `search-input`, `surface-classes`, the whole `ai-elements` directory, `clearInputDissolve`, `kbd`, `sheet`, `visually-hidden`. the extra motion presets and `_menu-classes` variants sit beside the baseline files as `presets.alt.ts` and `_menu-classes.alt.ts`.

### Drift (two copies existed)

- `accordion`: the default (`accordion.tsx`) uses the unified `radix-ui` package, a local chevron, and `data-slot` plus height animation. The second copy stays as `accordion.alt.tsx` (`@radix-ui/react-accordion`, Tabler chevron, `forwardRef`), exported as `AccordionAlt`, `AccordionItemAlt`, `AccordionTriggerAlt` and `AccordionContentAlt`.
- `clear-input`: the default runs the dissolve animation via `clearInputDissolve`. The simpler clear button stays as `clear-input.alt.tsx`, exported as `ClearInputAlt`.
- `input-group`: the default has `data-slot` variants and more addon/button sizes. The copy with an `error` prop and `forwardRef` stays as `input-group.alt.tsx`, exported as `InputGroupAlt`, `InputGroupAddonAlt`, `InputGroupButtonAlt`, `InputGroupTextAlt`, `InputGroupInputAlt` and `InputGroupTextareaAlt`.
- `scroll-area`: the default uses `radix-ui`, `data-slot` and a hover thumb. The `@radix-ui/react-scroll-area` `forwardRef` copy stays as `scroll-area.alt.tsx`, exported as `ScrollAreaAlt` and `ScrollBarAlt`.


`radix-select` is exported as `RadixSelect*` so it does not clash with app-a `select`.

## What stays app-local

Navigation layout (icon rails, sidebars, sidebar and header size variables), page layouts, segmented controls, motion variables (`--modal-*`, `--tabs-dur`, `--tabs-ease`, view-transition timings), the `.t-tabs` container and any tab or modal rules that differ from the shared files, `.t-clear*`, `glass-panel-*` / `smooth-shadow-ring-*` utilities, app colours and fonts (app-d's pink accent, app-c's chart colours, app-b's feature colours), Tailwind plugins, marketing fonts, page animations, markdown/editor styles and landing CSS. `packages/ui/tokens/verify/ANALYSIS.md` lists every duplicated block that was left in the apps and why.

## Develop

Needs Node 22 and pnpm.

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

`pnpm build` typechecks `@vvedantb/ui` (source export, no `dist`) and checks that every `@vvedantb/ui` export target exists, compiles `@vvedantb/server` and `@vvedantb/config` to each package's `dist`, and checks the `@vvedantb/native-ui` entry. `pnpm test` runs the vitest suites, and an offline `node --test` suite in `@vvedantb/ui` for the tokens (exports, CSS structure, Tailwind compile of each shared file and the preset).

`pnpm --filter @vvedantb/ui verify` is not part of `pnpm test`: it needs the five app clones (`APPS_DIR`) and network access to install Tailwind into a scratch directory (`VERIFY_DIR`). It builds each app's CSS before and after its migration and fails on any difference. Results: `packages/ui/tokens/verify/RESULTS.md`.

`pnpm typecheck` runs each package's `typecheck` script.

## Publish

No CI workflow. Publish from a logged-in npm machine (`NPM_CONFIG_USERCONFIG` if the token lives in a non-default rc). Bump each version in its `package.json` first.

```sh
pnpm --filter @vvedantb/ui exec npm publish --access public
pnpm --filter @vvedantb/native-ui exec npm publish --access public
pnpm --filter @vvedantb/server exec npm publish --access public
pnpm --filter @vvedantb/config exec npm publish --access public
```

`@vvedantb/server` and `@vvedantb/config` compile in `prepack`, so publishing builds `dist` first. The packages are independent of each other: `@vvedantb/native-ui` does not need `@vvedantb/ui`.

`@vvedantb/ui` `0.2.0` removes the old `@vvedantb/tokens` and `@vvedantb/shell` packages and the deprecated alias exports. Apps must change imports before they upgrade; see `MIGRATION.md`.

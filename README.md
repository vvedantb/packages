# ui

Shared UI for vvedantb web apps. One token package (tokens, shared app CSS and a Tailwind preset), one primitive library, and two shell pieces.

| Package | What it is |
| --- | --- |
| `@vvedantb/tokens` | CSS tokens for Tailwind v4 web, shared app CSS (`@vvedantb/tokens/css/*.css`: base, dialog, modal, tabs, utilities, scrollbar, animations), a Tailwind preset for `@config` apps (`@vvedantb/tokens/tailwind-preset`), and `@vvedantb/tokens/native` JS colours, radii and spacing for React Native. `0.2.1`. See `packages/tokens/README.md`. |
| `@vvedantb/ui` | Shared React 19 primitives. the baseline app `packages/ui` is the base; leftover files from two other apps are included so the apps can share and unify them later. Source-exported. Colour, radius, shadow and font come from `@vvedantb/tokens`, not a second token file. Web only. |
| `@vvedantb/shell` | React 19 components with no router dependency: `SidebarHeader` and `PillTabs`. Only copy; they are not also in `@vvedantb/ui`. |
| `@vvedantb/native-ui` | React Native + Expo primitives (floating surfaces, forms, tab bar, settings chrome). Source-exported. Uses `@vvedantb/tokens/native`. |
| `@vvedantb/app-kit` | Web React helpers shared by apps: Alt-click confirm skip, update-available watcher, settings chrome and a stable Clerk auth hook. Compiled. `0.1.0`, not yet published. |
| `@vvedantb/config` | tsconfig bases (base, web, convex, react-native), an oxlint base, pinned tool versions and the `vvedantb-config sync` CLI. Compiled. `0.1.1`, not yet published. |
| `@vvedantb/convex-kit` | Convex backend helpers: query-limit errors, Clerk auth config, bearer tokens, env, MCP CORS and server info. No React. Compiled. `0.1.0`, not yet published. |
| `@vvedantb/mcp-kit` | MCP server scaffolding for Convex `httpAction`s: `/mcp` bearer-auth handler, OAuth metadata endpoints, a pure JSON-RPC dispatcher, tool helpers and user-scoped explorer tools. Builds on convex-kit. No Node APIs, no MCP SDK dependency. Compiled. `0.1.1`, not yet published. |

All packages are public npm packages under the `vvedantb` scope.

## Install

```sh
npm install @vvedantb/ui @vvedantb/tokens @vvedantb/shell
# Expo / React Native:
npm install @vvedantb/native-ui @vvedantb/tokens
# Shared web helpers, tooling and Convex helpers (not yet published):
npm install @vvedantb/app-kit
npm install -D @vvedantb/config
npm install @vvedantb/convex-kit
npm install @vvedantb/mcp-kit
```

For a local checkout of this repo:

```json
"dependencies": {
  "@vvedantb/tokens": "link:../ui/packages/tokens",
  "@vvedantb/ui": "link:../ui/packages/ui",
  "@vvedantb/shell": "link:../ui/packages/shell"
}
```

`@vvedantb/tokens` and `@vvedantb/ui` ship source and need no compile step. `@vvedantb/shell` publishes compiled `dist` (built on pack). After a path/git install of this repo, run `pnpm build` so Tailwind can scan the compiled shell.

`@vvedantb/ui` expects the baseline peer stack (React 19, Radix, CVA, cmdk, motion, sonner, clsx, tailwind-merge, Tabler icons) plus the leftover extras' peers (`radix-ui`, accordion/scroll-area/visually-hidden, vaul, embla, shiki, `ai`, streamdown, nanoid, use-stick-to-bottom). Install those in the app. Also install `@vvedantb/tokens` and import it; `@vvedantb/ui` does not copy tokens.

## New packages

- `@vvedantb/app-kit`: `ConfirmSkipHint`, `useRequestConfirm`, `useAltHeld`, `startUpdateAvailableWatcher`, `SettingsPage` and friends, `useStableAuth`. Peers: React 19, Clerk, `@tanstack/react-hotkeys`, zod. See `packages/app-kit/README.md`.
- `@vvedantb/config`: `@vvedantb/config/tsconfig/{base,web,convex,react-native}.json`, `@vvedantb/config/oxlint/base.json`, `@vvedantb/config/versions`, and `npx @vvedantb/config sync [--check]` for Claude commands, `CLAUDE.md` headings, `.cursor/environment.json` and the Convex tsconfig. See `packages/config/README.md`.
- `@vvedantb/convex-kit`: `clerkAuthConfig`, `getClerkClient`, `extractBearerToken`, `requiredEnv`, `mcpCorsHeaders`, `defineMcpServerInfo`, `expectMcpToolCount` and more. `@clerk/backend` is an optional peer. See `packages/convex-kit/README.md`.
- `@vvedantb/mcp-kit`: `createMcpHttpHandler`, `createAuthorizationServerMetadataProxy`, `createProtectedResourceMetadata`, `createHealthHandler`, `createOptionsHandler`, `runSdkMcpRequest`, `createMcpDispatcher`, `defineTool`, `createExplorerTools` and result helpers. Depends on `@vvedantb/convex-kit`; `zod` is an optional peer. Per-app migration steps and measured line counts are in `packages/mcp-kit/docs/migration.md`. See `packages/mcp-kit/README.md`.

## Use in a Tailwind v4 app

In the app's main stylesheet:

```css
@import "tailwindcss";
@import "@vvedantb/tokens";
@source "../node_modules/@vvedantb/ui/src/**/*.{ts,tsx}";
@source "../node_modules/@vvedantb/shell/dist/**/*.js";
@source "../node_modules/@vvedantb/app-kit/dist/**/*.js";
```

- `@vvedantb/tokens` does not import Tailwind itself, so import Tailwind first.
- Tailwind does not scan `node_modules`. The `@source` lines tell it to read the UI source, the compiled shell, and compiled app-kit, so their classes are generated. Paths are relative to the stylesheet. Change them to match the app's layout.
- Dark mode uses the `.dark` class (the next-themes class strategy). `[data-theme="dark"]` also works.

#### Shared app CSS (0.2.0)

Rules that 3 or more apps had copied are now opt-in files. Import only the ones the app used to define, at the position of the app's own copy (Tailwind inlines `@import` where it sits; it must be at top level):

```css
@import "@vvedantb/tokens/css/base.css";        /* html, ::selection, control transitions, cursor, range accent */
@import "@vvedantb/tokens/css/dialog.css";      /* compact Dialog max-width fix (unlayered) */
@import "@vvedantb/tokens/css/modal.css";       /* .t-modal, .is-open, .is-closing; needs --modal-* on :root */
@import "@vvedantb/tokens/css/tabs.css";        /* .t-tab, .t-tabs-pill; needs --tabs-dur, --tabs-ease */
@import "@vvedantb/tokens/css/tabs-pills.css";  /* --tabs-* colours, .t-tabs--segmented / --pills */
@import "@vvedantb/tokens/css/utilities.css";   /* @utility hit-target, reveal-on-hover */
@import "@vvedantb/tokens/css/scrollbar-thin.css";
@import "@vvedantb/tokens/css/animations.css";  /* CSS-first apps only; @config apps use the preset */
```

`@vvedantb/tokens/css/index.css` imports base, dialog, utilities, scrollbar-thin and animations for a new app. Apps that load a `tailwind.config.ts` through `@config` add `presets: [tokensPreset()]` from `@vvedantb/tokens/tailwind-preset` (shared colours, radii, shadows, `ease-smooth`, px screens, keyframes). app-c passes its color-mix wrapper: `tokensPreset({ color: v })`.

The per-app steps (which blocks to delete, where each import goes, which `:root` parameters to add) are in `packages/tokens/examples/migration.md`, generated and checked by `pnpm --filter @vvedantb/tokens verify`.

### What the app must provide

`@vvedantb/ui` uses some classes that neither Tailwind nor `@vvedantb/tokens` defines. Without them the classes silently render nothing:

- `@import "shadow-plugin";` for `smooth-shadow-ring-*`, the edge and shadow of dialogs, sheets, menus, popovers, tooltips and toasts.
- `@plugin "tailwindcss-animate";` (or `tw-animate-css`) for `animate-in`/`fade-*`/`zoom-*`/`slide-in-*` on overlays. `animate-accordion-down`/`-up` also need `accordion-down`/`accordion-up` keyframes (in `@vvedantb/tokens/tailwind-preset`, or in the app) and an `animation` timing in the app.
- `.t-modal` with `.is-open`/`.is-closing`: import `@vvedantb/tokens/css/modal.css` and set `--modal-open-dur`, `--modal-close-dur`, `--modal-scale`, `--modal-scale-close` and `--modal-ease` on `:root`, or keep an app copy (app-b and app-c do; theirs differ).
- `.t-tab` and `.t-tabs-pill`: import `@vvedantb/tokens/css/tabs.css` (+ `tabs-pills.css` for the `--tabs-*` colours and the segmented/pills variants) and set `--tabs-dur` and `--tabs-ease`. The `.t-tabs` container rule is still app CSS.
- `hit-target` and `reveal-on-hover`: import `@vvedantb/tokens/css/utilities.css` (or keep plain `@layer utilities` rules, as app-a and app-e do).
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
import { SidebarHeader, PillTabs } from "@vvedantb/shell";
```

- `SidebarHeader`: 44px (`h-11`) header row with a truncated title and an optional `trailing` slot. It has no close button, icons or navigation.
- `PillTabs`: controlled pill tabs, icon and label only. It has no counts or badges. Use it only where you want pill tabs. It does not replace each app's segmented controls. Arrow keys, Home and End move between tabs.

## What moved into `@vvedantb/ui`

**baseline (plain names, not blended):** `_menu-classes`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `dropdown-menu`, `hover-card`, `input`, `label`, `labeled-switch-row`, `modalTransition`, `popover`, `progress`, `select`, `separator`, `skeleton`, `sonner`, `sonner.css`, `spinner`, `switch`, `table`, `tabs`, `tabsSliding`, `textarea`, `time-picker`, `tooltip`, plus `cn` and motion presets.

**Leftovers from two other apps (now shared here):** `accordion`, `clear-input`, `input-group`, `scroll-area`, `button-group`, `carousel`, `pagination`, `radix-select`, `search-input`, `surface-classes`, the whole `ai-elements` directory, `clearInputDissolve`, `kbd`, `sheet`, `visually-hidden`. the extra motion presets and `_menu-classes` variants sit beside the baseline files as `presets.alt.ts` and `_menu-classes.alt.ts`.

### Drift (two copies existed)

- `accordion`: the default (`accordion.tsx`) uses the unified `radix-ui` package, a local chevron, and `data-slot` plus height animation. The second copy stays as `accordion.alt.tsx` (`@radix-ui/react-accordion`, Tabler chevron, `forwardRef`), exported as `AccordionAlt`, `AccordionItemAlt`, `AccordionTriggerAlt` and `AccordionContentAlt`.
- `clear-input`: the default runs the dissolve animation via `clearInputDissolve`. The simpler clear button stays as `clear-input.alt.tsx`, exported as `ClearInputAlt`.
- `input-group`: the default has `data-slot` variants and more addon/button sizes. The copy with an `error` prop and `forwardRef` stays as `input-group.alt.tsx`, exported as `InputGroupAlt`, `InputGroupAddonAlt`, `InputGroupButtonAlt`, `InputGroupTextAlt`, `InputGroupInputAlt` and `InputGroupTextareaAlt`.
- `scroll-area`: the default uses `radix-ui`, `data-slot` and a hover thumb. The `@radix-ui/react-scroll-area` `forwardRef` copy stays as `scroll-area.alt.tsx`, exported as `ScrollAreaAlt` and `ScrollBarAlt`.


Deprecated aliases (since `0.1.6`): `AccordionVerve`, `AccordionItemVerve`, `AccordionTriggerVerve`, `AccordionContentVerve`, `ClearInputVibot`, `InputGroupVerve`, `InputGroupAddonVerve`, `InputGroupButtonVerve`, `InputGroupTextVerve`, `InputGroupInputVerve`, `InputGroupTextareaVerve`, `ScrollAreaVerve` and `ScrollBarVerve` still work. They point at the `Alt` names above and will be removed in a later release.
`radix-select` is exported as `RadixSelect*` so it does not clash with app-a `select`.

## What stays app-local

Navigation layout (icon rails, sidebars, sidebar and header size variables), page layouts, segmented controls, motion variables (`--modal-*`, `--tabs-dur`, `--tabs-ease`, view-transition timings), the `.t-tabs` container and any tab or modal rules that differ from the shared files, `.t-clear*`, `glass-panel-*` / `smooth-shadow-ring-*` utilities, app colours and fonts (app-d's pink accent, app-c's chart colours, app-b's feature colours), Tailwind plugins, marketing fonts, page animations, markdown/editor styles and landing CSS. `packages/tokens/verify/ANALYSIS.md` lists every duplicated block that was left in the apps and why.

## Develop

Needs Node 22 and pnpm.

```sh
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

`pnpm build` typechecks `@vvedantb/ui` (source export, no `dist`), compiles `@vvedantb/shell`, `@vvedantb/app-kit`, `@vvedantb/config`, `@vvedantb/convex-kit` and `@vvedantb/mcp-kit` to each package's `dist`, checks that every `@vvedantb/tokens` export target and the native-ui entry exist, and typechecks the token native and preset types. `pnpm test` runs the vitest suites in the packages that have one, and an offline `node --test` suite in `@vvedantb/tokens` (exports, CSS structure, Tailwind compile of each shared file and the preset).

`pnpm --filter @vvedantb/tokens verify` is not part of `pnpm test`: it needs the five app clones (`APPS_DIR`) and network access to install Tailwind into a scratch directory (`VERIFY_DIR`). It builds each app's CSS before and after its migration and fails on any difference. Results: `packages/tokens/verify/RESULTS.md`.

`pnpm typecheck` runs each package's `typecheck` script.

## Publish

No CI workflow. Publish from a logged-in npm machine (`NPM_CONFIG_USERCONFIG` if the token lives in a non-default rc):

```sh
pnpm --filter @vvedantb/tokens exec npm publish --access public
pnpm --filter @vvedantb/native-ui exec npm publish --access public
pnpm --filter @vvedantb/app-kit exec npm publish --access public
pnpm --filter @vvedantb/config exec npm publish --access public
pnpm --filter @vvedantb/convex-kit exec npm publish --access public
# mcp-kit depends on convex-kit via workspace:^; pnpm publish rewrites it to ^0.1.0 (npm publish would not)
pnpm --filter @vvedantb/mcp-kit publish --access public
```

`@vvedantb/app-kit`, `@vvedantb/config`, `@vvedantb/convex-kit` and `@vvedantb/mcp-kit` have not been published (`app-kit` and `convex-kit` are at `0.1.0`, `config` and `mcp-kit` at `0.1.1`). Each compiles in `prepack`, so publishing builds `dist` first. The first three are independent of each other; `@vvedantb/mcp-kit` needs `@vvedantb/convex-kit` published first.

Version the package in its `package.json` first. `@vvedantb/tokens` `0.1.1` added `@vvedantb/tokens/native` and must land before `@vvedantb/native-ui` `0.1.0` (now `0.1.1`). `@vvedantb/tokens` `0.2.0` (minor, additive) adds the `css/*.css` files and `tailwind-preset`; `.`, `./tokens.css` and `./native` are unchanged. Publish it before migrating any app (see `packages/tokens/examples/migration.md`); app-d also needs it added as a dependency.

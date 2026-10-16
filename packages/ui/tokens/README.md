# `@vvedantb/ui/tokens`

Design tokens and shared Tailwind v4 CSS for the vvedantb web apps, plus JS tokens for React Native. These are subpaths of `@vvedantb/ui`, source-exported: no build step. Paths in the `File` column are relative to `packages/ui/tokens/`.

## Exports

| Export | File | What it is |
| --- | --- | --- |
| `@vvedantb/ui/tokens`, `@vvedantb/ui/tokens/tokens.css` | `src/tokens.css` | Colour, radius, shadow, ease and font tokens (`@theme`), light/dark variables, `dark` variant, `*` border and `body` defaults. Unchanged in 0.2.0. |
| `@vvedantb/ui/tokens/native` | `src/native.ts` | JS colours, radii and spacing for React Native. `@vvedantb/native-ui` keeps its own copy in `src/tokens.ts`; a test keeps the two equal. |
| `@vvedantb/ui/tokens/css/base.css` | `src/css/base.css` | `html` touch/accent, `::selection`, control transitions, pointer cursor, range accent (`@layer base`). |
| `@vvedantb/ui/tokens/css/dialog.css` | `src/css/dialog.css` | Unlayered `max-width: none` for `@vvedantb/ui` compact (bottom-sheet) dialogs. |
| `@vvedantb/ui/tokens/css/modal.css` | `src/css/modal.css` | `.t-modal`, `.is-open`, `.is-closing` and `t-modal-presence-wait` (`@layer components`). |
| `@vvedantb/ui/tokens/css/tabs.css` | `src/css/tabs.css` | `.t-tab`, active colour, `.t-tabs-pill`, small-screen `.t-tabs` scrolling. |
| `@vvedantb/ui/tokens/css/tabs-pills.css` | `src/css/tabs-pills.css` | `--tabs-*` colour variables, `.t-tabs--segmented`, `.t-tabs--pills` and pill hover / active fills. |
| `@vvedantb/ui/tokens/css/utilities.css` | `src/css/utilities.css` | `@utility hit-target` and `@utility reveal-on-hover`. |
| `@vvedantb/ui/tokens/css/scrollbar-thin.css` | `src/css/scrollbar-thin.css` | `.scrollbar-thin` (`@layer utilities`, always emitted). |
| `@vvedantb/ui/tokens/css/animations.css` | `src/css/animations.css` | `animate-aurora`, `animate-fade-in-up`, `animate-indeterminate` as `@theme` (CSS-first apps). |
| `@vvedantb/ui/tokens/css/index.css` | `src/css/index.css` | base + dialog + utilities + scrollbar-thin + animations, for new CSS-first apps. |
| `@vvedantb/ui/tokens/tailwind-preset` | `src/tailwind-preset.mjs` (+ `.d.mts`) | Tailwind preset for apps that load a JS config with `@config`. |

Every file was extracted because the same rule (same at-rule context, selector and body) sits in 3 or more of the five apps. The measured duplication is in `verify/ANALYSIS.md`, and the proof that each app compiles to the same CSS after migrating is in `verify/RESULTS.md`. Blocks that only 2 apps share, or that drift in a way that would change an app's CSS, stay in the apps; `verify/ANALYSIS.md` lists them.

## Use

CSS-first app (no `tailwind.config`):

```css
@import "tailwindcss";
@import "@vvedantb/ui/tokens";
@import "@vvedantb/ui/tokens/css/animations.css";
@import "@vvedantb/ui/tokens/css/base.css";
/* ...app @layer base rules... */
@import "@vvedantb/ui/tokens/css/modal.css";
@import "@vvedantb/ui/tokens/css/tabs.css";
/* ...app @layer components rules... */
```

App with a JS config (`@config "../tailwind.config.ts"`):

```ts
import { tokensPreset } from "@vvedantb/ui/tokens/tailwind-preset";

export default {
  presets: [tokensPreset()],
  // or tokensPreset({ color: (name) => `color-mix(in oklch, var(--${name}) calc(<alpha-value> * 100%), transparent)` })
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { /* app-only colours, fonts, animations */ } },
  plugins: [tailwindcssAnimate],
};
```

The preset holds `darkMode: "class"`, the shared colour map (`border`, `surface.*`, `danger.*`, `field.*`, shadcn aliases `primary`/`secondary`/`destructive`/`card`/`popover`/`input` ...), `borderRadius` lg/md/sm/field, `boxShadow` soft/panel/insetSoft, `ease-smooth`, `screens` xs to 2xl in px, and the aurora / fade-in-up / indeterminate / accordion keyframes. It does not hold plugins, `content`, fonts, `accent`/`muted`/`ring`/`sidebar` (they differ per app) or accordion timings.

Do not import `css/animations.css` in an app that uses the preset: the preset already defines the same keyframes and animations.

### Where to put the imports

Tailwind inlines an `@import` where it sits, even in the middle of a file (it must be at top level, not inside an `@layer` block). Put each import where the app's own copy of the rules was. Within one layer, later rules win at equal specificity, so moving shared rules above or below app rules can flip the result for elements matched by both. `examples/migration.md` gives the exact position for each app, and `pnpm --filter @vvedantb/ui verify` checks it.

### Variables each file needs

| File | Needs | Provided by |
| --- | --- | --- |
| `base.css` | `--accent`, `--foreground` | tokens.css or the app theme |
| `dialog.css` | none | |
| `modal.css` | `--modal-open-dur`, `--modal-close-dur`, `--modal-scale`, `--modal-scale-close`, `--modal-ease` | app `:root` |
| `tabs.css` | `--tabs-dur`, `--tabs-ease` (app `:root`); `--tabs-text-muted`, `--tabs-text-active`, `--tabs-pill-bg` | colours: tabs-pills.css or the app theme |
| `tabs-pills.css` | `--muted`, `--segment`, `--segment-foreground`, `--default` | tokens.css or the app theme |
| `utilities.css` | `--breakpoint-sm` (Tailwind default or app theme) | Tailwind |
| `scrollbar-thin.css` | `--scrollbar` | tokens.css or the app theme |
| `animations.css` | none | |
| `tailwind-preset` | the CSS variables named in its colour map, `--radius`, `--field-radius` | tokens.css or the app theme |

### Parameters

Where apps share a rule but drifted in one value, the value is a custom property whose fallback is the most common value. Set it on `:root` to keep a different value.

| File | Property | Default | Set by |
| --- | --- | --- | --- |
| `base.css` | `--tokens-control-transition-property` | `background-color, border-color, color, box-shadow, transform, opacity` | app-c: `background-color, color, transform, opacity` |
| `base.css` | `--tokens-control-transition-duration` | `240ms` | app-c: `100ms` |

## Develop

```sh
pnpm --filter @vvedantb/ui build     # export targets exist + tsc (primitives, shell, app)
pnpm --filter @vvedantb/ui test      # vitest (app helpers) + offline node --test: exports, CSS structure, Tailwind compile, preset
pnpm --filter @vvedantb/ui analyze   # rule-level duplication across the app clones -> verify/ANALYSIS.tables.md
pnpm --filter @vvedantb/ui verify    # before/after compile of every app -> verify/RESULTS.md, examples/migration.md
```

`analyze` and `verify` need the app clones (`APPS_DIR`, default `/workspace/cvx`; name or symlink the clones `app-a` to `app-e` inside it) and network access the first time: they install Tailwind 4.3.3, the plugins, postcss and jiti into a scratch directory (`VERIFY_DIR`, default `/workspace/pk-tokens-verify`, outside the repo). The migration for each app is data in `verify/migrations/<app>.json`. Each removed block must equal the shared file's block with the same context and selector, or the run fails.

# Shared CSS analysis (summary)

Source: `node verify/analyze.mjs` (full tables in `ANALYSIS.tables.md`), run on the five clones in `$APPS_DIR` (app-a `8c972b1a2cf7`, app-b `f7b61259270b`, app-c `4d0ab45cbbc6`, app-d `3bdce79780d0`, app-e `7077eaf9ff8a`). A rule is the same when its at-rule context chain, selector and body match after stripping comments and collapsing whitespace. The final decision for each block was checked by `verify/run.mjs` (compiled CSS before and after), not by this table alone.

## Extracted

| Shared file | Rules (identical copies found) | Importing apps | Notes |
| --- | --- | --- | --- |
| `css/base.css` | `html` (app-a, app-b, app-c), `::selection` (4), control transitions (app-a, app-b, app-d; app-c drifts), button/link cursor (all 5), `input[type=range]` (4) | app-a, app-b, app-c, app-d | app-c sets 2 parameters for its 100ms / shorter property list. app-d keeps a local `html { font-feature-settings }` (its rule has one extra declaration). app-e has only the cursor rule in `@layer base` and its `html` rule is unlayered, so it does not import this file. |
| `css/dialog.css` | `[role="dialog"][data-compact="true"]` (app-a, app-b, app-c, app-e) | same 4 | Unlayered, as in the apps. app-d does not use `@vvedantb/ui` Dialog. |
| `css/modal.css` | `.t-modal`, `.is-open` (4), `.is-closing` (app-a, app-d, app-e), `@keyframes t-modal-presence-wait` (app-a, app-b, app-d, app-e) | app-a, app-d, app-e | app-c's `.is-closing` has no presence-wait animation, app-b wraps the rules in a `@media` and uses `pointer-events: auto`; both stay local. |
| `css/tabs.css` | `@media (max-width: 639px) .t-tabs` + scrollbar (app-a, app-d, app-e), `.t-tab` (app-a, app-b, app-d, app-e), tab colour rule (all 5), `.t-tabs-pill` (app-a, app-d, app-e) | app-a, app-d, app-e | app-b's `.t-tabs-pill` and media rules differ, so app-b keeps its tab CSS. |
| `css/tabs-pills.css` | light/dark `--tabs-*` variables (app-a, app-e; app-c inside a larger rule), `.t-tabs--segmented`, `.t-tabs--pills`, pill hover and active (app-a, app-c, app-e) | app-a, app-c, app-e | app-c trims the 5 variables from its chart-colour rule. |
| `css/utilities.css` | `@utility hit-target`, `@utility reveal-on-hover` (app-b, app-c, app-d) | same 3 | |
| `css/scrollbar-thin.css` | 6 `.scrollbar-thin` rules (app-a, app-b, app-d) | same 3 | |
| `css/animations.css` | `aurora`, `fade-in-up`, `indeterminate` keyframes + timings (app-a `@theme`; app-b, app-c, app-d config) | app-a | CSS-first form of the preset's animations. Moving them from a config into `@theme` changes compiled output (`var(--animate-x)` instead of inlined values), so `@config` apps take them from the preset. A test asserts both forms compile to the same keyframes. |
| `tailwind-preset` | `darkMode`, 45 colour paths (same token in all 3; app-c wraps them in color-mix with `<alpha-value>`, passed as `color`), `borderRadius` lg/md/sm/field, `boxShadow` soft/panel/insetSoft, `transitionTimingFunction.smooth`, `screens` xs-2xl, keyframes aurora/fade-in-up/indeterminate/accordion-down/accordion-up, animations aurora/fade-in-up/indeterminate | app-b, app-c, app-d | `plugins: [tailwindcss-animate]` is shared too but stays in the app (the package has no runtime dependencies). |
| `tokens.css` (already shipped) | `* { @apply border-border }` (app-b, app-c, app-d), `body` (app-b, app-c: a subset of tokens.css `body`), app-b's 41 light + 41 dark colour variables | app-b, app-c | They already import tokens.css; the copies were redundant. |

## Not extracted, and why

- `.t-tabs` container: five variants (app-a = app-e, the others differ in gap/padding/background/max-width). Stays local everywhere.
- `.t-tabs--pills .t-tab`: app-a = app-e; app-c's transition list ends in `transform 100ms ease-out` instead of `border-color`. A parameter would have to hold a value containing `var(--tabs-*)`, which resolves on `:root` rather than on the tab, so it stays local (2 identical copies).
- app-c tab rules (`.t-tab` with `:active` scale, its media rule, its single-transition `.t-tabs-pill`) and app-b tab/modal rules (media-wrapped modal, `.t-tabs > .t-tabs-pill`, motion-driven `.t-tabs-pill`): drift in values and selectors.
- `.scrollbar-thin` in app-c (40%/80% mix, `@supports not (scrollbar-color: auto)`) and app-e (no `:hover` rules; importing the shared file would add them).
- Menu-item cursor rules: two variants of two apps each (app-a/app-d `:not([data-disabled])`, app-b/app-c `:not([data-disabled="false"])` with different selector syntax).
- `.hit-target` / `.reveal-on-hover` as plain `@layer utilities` rules in app-a and app-e. Switching to `@utility` changes when and where they are emitted.
- `.t-clear*` (app-c = app-d, app-e differs), `.cl-drawer*` (app-b, app-c), `.sidebar-section-label` (app-a, app-c), `.glass-panel-strong` (4 variants), `html[data-page-motion="off"] ...` and `::view-transition` rules (2 apps per context; app-a's are unlayered), `--breakpoint-xs` in app-a/app-e `@theme` (1 line each).
- app-d's `*`, `body` (with `font-sans`) and colour variables: app-d does not import tokens.css, and its accent differs.
- app-b `markdown.css` (287 lines): only app-b has it, so there is no `prose.css`. app-c `editor.css`, app-b `tiptap.css` and the app-a/app-e `landing.css` (271 lines, byte-identical in 2 apps) are app files outside the global stylesheet. `landing.css` belongs with the landing-page package (R5), not tokens.
- Config: `boxShadow.overlay` (app-b, app-d), `colors.accent`/`muted`/`ring`/`sidebar`/`field.DEFAULT` (2 apps each or different targets), `fontFamily` (drifts), accordion and `tab-progress` animation timings (drift), app-d `container`.

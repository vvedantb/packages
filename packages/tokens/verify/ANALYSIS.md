# Shared CSS analysis (summary)

Source: `node verify/analyze.mjs` (full tables in `ANALYSIS.tables.md`), run on the five clones in `$APPS_DIR` (vmem `8c972b1a2cf7`, vibot `f7b61259270b`, verve `4d0ab45cbbc6`, velth `3bdce79780d0`, vhub `7077eaf9ff8a`). A rule is the same when its at-rule context chain, selector and body match after stripping comments and collapsing whitespace. The final decision for each block was checked by `verify/run.mjs` (compiled CSS before and after), not by this table alone.

## Extracted

| Shared file | Rules (identical copies found) | Importing apps | Notes |
| --- | --- | --- | --- |
| `css/base.css` | `html` (vmem, vibot, verve), `::selection` (4), control transitions (vmem, vibot, velth; verve drifts), button/link cursor (all 5), `input[type=range]` (4) | vmem, vibot, verve, velth | verve sets 2 parameters for its 100ms / shorter property list. velth keeps a local `html { font-feature-settings }` (its rule has one extra declaration). vhub has only the cursor rule in `@layer base` and its `html` rule is unlayered, so it does not import this file. |
| `css/dialog.css` | `[role="dialog"][data-compact="true"]` (vmem, vibot, verve, vhub) | same 4 | Unlayered, as in the apps. velth does not use `@vvedantb/ui` Dialog. |
| `css/modal.css` | `.t-modal`, `.is-open` (4), `.is-closing` (vmem, velth, vhub), `@keyframes t-modal-presence-wait` (vmem, vibot, velth, vhub) | vmem, velth, vhub | verve's `.is-closing` has no presence-wait animation, vibot wraps the rules in a `@media` and uses `pointer-events: auto`; both stay local. |
| `css/tabs.css` | `@media (max-width: 639px) .t-tabs` + scrollbar (vmem, velth, vhub), `.t-tab` (vmem, vibot, velth, vhub), tab colour rule (all 5), `.t-tabs-pill` (vmem, velth, vhub) | vmem, velth, vhub | vibot's `.t-tabs-pill` and media rules differ, so vibot keeps its tab CSS. |
| `css/tabs-pills.css` | light/dark `--tabs-*` variables (vmem, vhub; verve inside a larger rule), `.t-tabs--segmented`, `.t-tabs--pills`, pill hover and active (vmem, verve, vhub) | vmem, verve, vhub | verve trims the 5 variables from its chart-colour rule. |
| `css/utilities.css` | `@utility hit-target`, `@utility reveal-on-hover` (vibot, verve, velth) | same 3 | |
| `css/scrollbar-thin.css` | 6 `.scrollbar-thin` rules (vmem, vibot, velth) | same 3 | |
| `css/animations.css` | `aurora`, `fade-in-up`, `indeterminate` keyframes + timings (vmem `@theme`; vibot, verve, velth config) | vmem | CSS-first form of the preset's animations. Moving them from a config into `@theme` changes compiled output (`var(--animate-x)` instead of inlined values), so `@config` apps take them from the preset. A test asserts both forms compile to the same keyframes. |
| `tailwind-preset` | `darkMode`, 45 colour paths (same token in all 3; verve wraps them in color-mix with `<alpha-value>`, passed as `color`), `borderRadius` lg/md/sm/field, `boxShadow` soft/panel/insetSoft, `transitionTimingFunction.smooth`, `screens` xs-2xl, keyframes aurora/fade-in-up/indeterminate/accordion-down/accordion-up, animations aurora/fade-in-up/indeterminate | vibot, verve, velth | `plugins: [tailwindcss-animate]` is shared too but stays in the app (the package has no runtime dependencies). |
| `tokens.css` (already shipped) | `* { @apply border-border }` (vibot, verve, velth), `body` (vibot, verve: a subset of tokens.css `body`), vibot's 41 light + 41 dark colour variables | vibot, verve | They already import tokens.css; the copies were redundant. |

## Not extracted, and why

- `.t-tabs` container: five variants (vmem = vhub, the others differ in gap/padding/background/max-width). Stays local everywhere.
- `.t-tabs--pills .t-tab`: vmem = vhub; verve's transition list ends in `transform 100ms ease-out` instead of `border-color`. A parameter would have to hold a value containing `var(--tabs-*)`, which resolves on `:root` rather than on the tab, so it stays local (2 identical copies).
- verve tab rules (`.t-tab` with `:active` scale, its media rule, its single-transition `.t-tabs-pill`) and vibot tab/modal rules (media-wrapped modal, `.t-tabs > .t-tabs-pill`, motion-driven `.t-tabs-pill`): drift in values and selectors.
- `.scrollbar-thin` in verve (40%/80% mix, `@supports not (scrollbar-color: auto)`) and vhub (no `:hover` rules; importing the shared file would add them).
- Menu-item cursor rules: two variants of two apps each (vmem/velth `:not([data-disabled])`, vibot/verve `:not([data-disabled="false"])` with different selector syntax).
- `.hit-target` / `.reveal-on-hover` as plain `@layer utilities` rules in vmem and vhub. Switching to `@utility` changes when and where they are emitted.
- `.t-clear*` (verve = velth, vhub differs), `.cl-drawer*` (vibot, verve), `.sidebar-section-label` (vmem, verve), `.glass-panel-strong` (4 variants), `html[data-page-motion="off"] ...` and `::view-transition` rules (2 apps per context; vmem's are unlayered), `--breakpoint-xs` in vmem/vhub `@theme` (1 line each).
- velth's `*`, `body` (with `font-sans`) and colour variables: velth does not import tokens.css, and its accent differs.
- vibot `markdown.css` (287 lines): only vibot has it, so there is no `prose.css`. verve `editor.css`, vibot `tiptap.css` and the vmem/vhub `landing.css` (271 lines, byte-identical in 2 apps) are app files outside the global stylesheet. `landing.css` belongs with the landing-page package (R5), not tokens.
- Config: `boxShadow.overlay` (vibot, velth), `colors.accent`/`muted`/`ring`/`sidebar`/`field.DEFAULT` (2 apps each or different targets), `fontFamily` (drifts), accordion and `tab-progress` animation timings (drift), velth `container`.

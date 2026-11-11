---
"@vvedantb/ui": patch
---

Phone-browser fixes:

- Hover styles in the kit CSS now apply only under `@media (hover: hover) and (pointer: fine)`. On touch, a tap leaves `:hover` stuck, so icons stayed scaled, marquees stayed scrolled and links stayed lit. This covers `nav-icons.css`, `marquee.css`, `markdown.css` (`.markdown-link`), `tabs.css`, `tabs-pills.css`, `scrollbar-thin.css`, `.sidebar-section-label` in `tokens.css`, the `reveal-on-hover` utility (now also needs a fine pointer) and the `AgentTraceLine` button-hover colour. `nav-icons.css` now sets each shape's animation in `--vv-icon-animation`; two shared rules run it for `data-animate="true"` and for group hover. A `data-animate="true"` icon still animates on touch.
- `Input`, `Textarea`, `Select`, `ClearInput`, `SearchInput` and the `Command` input keep 16 px text on coarse pointers at every width (`sm:pointer-fine:text-sm`). An iPad is wider than `sm`, so it got 14 px fields and iOS zoomed in on focus. The `Queue` edit field no longer forces `text-sm`, for the same reason.
- `base.css` sets `touch-action: manipulation` on buttons, links, `summary`, `label`, checkboxes, radios and the `button`, `link`, `tab`, `option`, `menuitem*`, `checkbox`, `radio` and `switch` roles. This removes the double-tap-zoom wait on taps. The rule is in `@layer base`, so `touch-*` utilities still win.
- `Button` press feedback runs in `--motion-fast` (150 ms), down from 200 ms. Hover and release keep 200 ms.
- `SonnerToaster` adds `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to sonner's 16 px phone offset, so toasts clear the notch and home indicator under a translucent status bar. A `mobileOffset` prop or config replaces it.

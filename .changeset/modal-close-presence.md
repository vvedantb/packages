---
"@vvedantb/ui": patch
---

Dialog close now animates. The closing styles (shrink to `--modal-scale-close`, toward the trigger since 0.52.0, plus the `t-modal-presence-wait` animation) also key on Radix `data-state="closed"`. Radix Presence reads the animation in the same commit that sets `data-state`. `.is-closing` arrives a moment later from a MutationObserver, so Presence saw no animation and removed the dialog at once. `html[data-page-motion="off"]` covers the new selector too.

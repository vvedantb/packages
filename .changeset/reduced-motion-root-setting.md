---
"@vvedantb/ui": minor
---

`MotionProvider reducedMotion` ("user" by default, "always" or "never") now governs the whole package, not only `m.*` components, like HeroUI's provider. It stamps `html[data-reduced-motion]` and provides context. `prefersReducedMotion()`, the Dialog zoom, the `motion-reduce:` Tailwind variant (`utilities.css`), `motion.css` and the landing CSS follow it. New: `useReducedMotionSetting()` and the `ReducedMotion` type. With no provider, or "user", nothing changes.

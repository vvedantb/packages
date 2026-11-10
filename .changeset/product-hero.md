---
"@vvedantb/ui": minor
---

Add `ProductHero`, a shared hero for product landing pages, and `PROJECT_V_HOME_URL`. Both are exported from `@vvedantb/ui` and `@vvedantb/ui/client`.

- Copy first, then the visual on mobile. Side by side from `lg`. Uses `landingShellClass` width.
- One `h1` with the `pageTitleClass` family, weight 600, leading and tracking, at a display scale.
- Pill primary action, optional secondary action, and at most one "Sign in" control (`signIn`).
- `visual` slot for an animated concept visual, not an app replica or screenshot. Decorative (`aria-hidden`) unless `visualLabel` is set.
- "a product of Project V" line, linked to `PROJECT_V_HOME_URL`. `SiteFooter` now uses the same constant; its rendered output does not change.

`LandingHero` from `createLandingKit` is unchanged.

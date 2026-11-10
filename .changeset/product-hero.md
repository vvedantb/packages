---
"@vvedantb/ui": minor
---

Add `ProductHero`, a shared hero for product landing pages, and `PROJECT_V_HOME_URL`. Both are exported from `@vvedantb/ui` and `@vvedantb/ui/client`.

- Copy first, then the visual on mobile. Side by side from `lg`. Uses `landingShellClass` width.
- One `h1` with the `pageTitleClass` family, weight 600, leading and tracking, at a display scale.
- Pill primary action, optional secondary action, and at most one "Sign in" control (`signIn`).
- `visual` slot for an animated concept visual, not an app replica or screenshot. Decorative (`aria-hidden`) unless `visualLabel` is set.
- Optional `userCount` social proof under the actions: "Free to use · 1,284+ people already here", with a green dot that pulses unless `prefers-reduced-motion: reduce`. Hidden for `undefined`, `null` and 0 or less. The package does no fetching; apps feed the number (for example a Convex action around Clerk `users.getCount()`).
- "a product of Project V" line, always linked to `PROJECT_V_HOME_URL`. No prop changes the link; `showProductOf={false}` hides the line. `SiteFooter` now uses the same constant; its rendered output does not change.

`LandingHero` from `createLandingKit` is unchanged.

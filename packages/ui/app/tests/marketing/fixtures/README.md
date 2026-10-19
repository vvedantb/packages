# Parity fixtures

Copies of each app's current component, taken from the app's `main` branch,
so the parity tests can render them beside the shared component.

Edits from the originals, and nothing else:

- App and brand names are replaced by `app-a` to `app-e` (also in copy text,
  URLs and identifiers); external domains are `example.com`; billing plan ids
  are placeholders.
- `@vvedantb/ui` imports point at this package's `src/index`.
- App-only modules (Clerk, env, router, theme, brand icons and app-only landing
  sections) come from `stubs.tsx`. `import.meta.env.DEV` reads `stubEnv.dev`.
- The landing page copies drop their `import "./landing.css"` line.

# product hero fixture

Renders `ProductHero` from `@vvedantb/ui/client` with the live headline and tagline of each product site (see `docs/audits/v-apps-hero-audit.md` at the repository root). The visual is a placeholder: a CSS pulse and orbit rings, as a stand-in for the Project V concept visual. It is not an app replica. The rings stop under `prefers-reduced-motion: reduce`.

Choose the example with `?app=`: `vibot` (default), `verve`, `velth`, `vmem` or `vhub`. The playground loads Instrument Sans from `fonts/instrument-sans.css`, so titles render in the real font. The component source names no app; only `Fixture.tsx` does.

Each example renders:

- One `h1`, the tagline and the "a product of Project V" link to `https://projectv.uk`.
- Pill actions with unique labels, so `getByRole("link", { name })` works.
- Exactly one "Sign in" control, except `velth`, which has none (the live site has none). `velth` uses "Try the demo" (`#demo`) and "Download on V Store". The V Store link is the `V_STORE_DOWNLOAD_URL` constant in `Fixture.tsx` (`https://projectv.uk/download/v-store`), with `rel: "nofollow"`.
- The social proof row ("Free to use · 1,284+ people already here") for `vibot` and `verve`. It is a fixed number here; the package does no fetching.
- A "Last click" line (`data-testid="hero-status"`) that shows which action was clicked: `primary`, `secondary` or `sign-in`.

One page, `/tokens.html`, with `tokens.css` (`styles-tokens.css`).

Run it from this folder (it is not a workspace member, and React resolves from the parent `packages/ui` install):

```sh
pnpm install --ignore-workspace && pnpm dev --port 5174
```

Open `http://localhost:5174/tokens.html?app=vmem`. Add `&theme=dark` for dark mode.

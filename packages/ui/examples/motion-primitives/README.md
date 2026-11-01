# motion primitives fixture

Renders the motion primitives from `@vvedantb/ui/client` on one page, inside `MotionProvider` and `PageMotionProvider`:

1. `RollingNumber` with a timer string ("55s", "1m", "1m 1s") that ticks once a second.
2. `SendQueueIcon` and `PromptInputSubmit` with `queued`. "Agent working" toggles it.
3. `ActivityTasks` streaming with no rows, so it shows the header and its rolling clock. Both clocks share `startedAt`.
4. `useCountUpDisplay` on a meter that steps through 12%, 45%, 45% (no replay), 80% and "—" (shown as it is), one value every 2 s.

One page, `/tokens.html`, with `tokens.css` (`styles-tokens.css`).

Run it from this folder (it is not a workspace member, and React resolves from the parent `packages/ui` install):

```sh
pnpm install --ignore-workspace && pnpm dev
```

Open the printed URL plus `/tokens.html`. Query options, for screenshots:

- `?theme=dark` starts in dark mode ("Toggle theme" switches it).
- `?queued=1` starts with `queued` on.
- `?motion=off` starts with `PageMotionProvider` disabled ("Page motion" switches it): `useCountUpDisplay` shows each value at once, and `m` animations run with `reducedMotion="always"`.

`Fixture.tsx` is not part of the package typecheck.

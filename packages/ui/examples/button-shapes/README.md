# button shapes fixture

Renders `Button` from `@vvedantb/ui/client` on one page, for the 0.31.0 pill default:

1. Every variant at every size with the default `shape="pill"`. The text sizes (`xs`, `sm`, `default`, `lg`) are pills and the icon sizes (`icon-xs`, `icon-sm`, `icon`) are circles.
2. The `shape="rounded"` opt-out for four variants at every size: `rounded-lg`, and `rounded-md` on `xs` and `icon-xs` (the radius from before 0.31.0).
3. `ButtonGroup` with `shape="rounded"` children: a horizontal group, the message branch selector layout (`rounded-md` inner corners) and a vertical group. Below them, a group with default pill children, for comparison.
4. `InputGroup` with `InputGroupButton` addons, which set `shape="rounded"` themselves.

One page, `/tokens.html`, with `tokens.css` (`styles-tokens.css`).

Run it from this folder (it is not a workspace member, and React resolves from the parent `packages/ui` install):

```sh
pnpm install --ignore-workspace && pnpm dev
```

Open the printed URL plus `/tokens.html`. Query options, for screenshots:

- `?theme=dark` starts in dark mode ("Toggle theme" switches it).

`Fixture.tsx` is not part of the package typecheck.

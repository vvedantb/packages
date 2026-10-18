# sessions-hover-card fixture

Renders `SessionsHoverCard` from `@vvedantb/ui/shell` forced open, with header, body and footer slots. The trigger sits in an `overflow:hidden` box, and the card portals by default, so it is not clipped. Two pages, one for each style mode:

| Page | Stylesheet |
| --- | --- |
| `/tokens.html` | `tokens.css` (`styles-tokens.css`) |
| `/compat.html` | `compat-shadcn-rgb.css` with sample `R G B` variables (`styles-compat.css`) |

Run it from this folder (it is not a workspace member, and React resolves from the parent `packages/ui` install):

```sh
pnpm install --ignore-workspace && pnpm dev
```

Open the printed URL plus `/tokens.html` or `/compat.html`. Add `?theme=dark` for dark mode, or use "Toggle theme". `Fixture.tsx` is not part of the package typecheck.

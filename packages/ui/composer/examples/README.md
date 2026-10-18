# composer fixture

Renders `Composer` from `@vvedantb/ui/composer` in six states: empty, typing with ghost text, with attachments, streaming (stop button), disabled and a long draft that scrolls. Two pages, one for each style mode:

| Page | Stylesheet |
| --- | --- |
| `/tokens.html` | `tokens.css` (`styles-tokens.css`) |
| `/compat.html` | `compat-shadcn-rgb.css` with sample `R G B` variables (`styles-compat.css`) |

Run it from this folder (it is not a workspace member, and React resolves from the parent `packages/ui` install):

```sh
pnpm install --ignore-workspace && pnpm dev
```

Open the printed URL plus `/tokens.html` or `/compat.html`. Add `?theme=dark` for dark mode, or use "Toggle theme". The ghost text appears right away in the second block because the fixture sets `predictionDebounceMs={0}` and returns a fixed string. It makes no network call. `Fixture.tsx` is not part of the package typecheck.

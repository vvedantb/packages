# toaster fixture

Renders `SonnerToaster` with every opt-in prop on (`toastRadius="surface"`, `toastIcons="filled24"`, `closeButtonStyle="hoverChip"`, `sonnerVars`, `descriptionMuted`). It fires one sample toast with a title and a description on load. The toast stays open. Use "Show toast" to fire another.

| Page | Stylesheet |
| --- | --- |
| `/tokens.html` | `tokens.css` plus `utilities.css` (`styles-tokens.css`) |
| `/compat.html` | `compat-shadcn-rgb.css` plus `utilities.css`, with sample `R G B` variables (`styles-compat.css`) |

Each stylesheet declares `glass-panel-strong` (tokens page only) and `smooth-shadow-ring-md`. The app owns those toast classes. The compat page also defines `--success` and `--warning` and maps them to `--color-success` and `--color-warning`.

Run it from this folder (it is not a workspace member, and React resolves from the parent `packages/ui` install):

```sh
pnpm install --ignore-workspace && pnpm dev
```

Open the printed URL plus `/tokens.html` or `/compat.html`. Add `?theme=dark` for dark mode, or use "Toggle theme". Hover the toast to see the close chip. `Fixture.tsx` is not part of the package typecheck.

# toaster fixture

Renders `SonnerToaster` with every opt-in prop on (`toastRadius="surface"`, `toastIcons="filled24"`, `closeButtonStyle="hoverChip"`, `sonnerVars`, `descriptionMuted`). It fires one sample toast with a title and a description on load. The toast stays open. Use "Show toast" to fire another.

| Page | Stylesheet |
| --- | --- |
| `/tokens.html` | `tokens.css` plus `utilities.css` (`styles-tokens.css`) |
| `/compat.html` | `compat-shadcn-rgb.css` plus `utilities.css`, with sample `R G B` variables (`styles-compat.css`) |
| `/update.html` | `tokens.css` plus `utilities.css` (`styles-tokens.css`). Fires the update toast from `showUpdateAvailableToast` on load: title, description and a Refresh action that reloads the page. "Show update toast" fires it again. |

Each stylesheet declares `glass-panel-strong` (tokens page only) and `smooth-shadow-ring-md`. The app owns those toast classes. The compat page also defines `--success` and `--warning` and maps them to `--color-success` and `--color-warning`.

Run it from this folder (it is not a workspace member, and React resolves from the parent `packages/ui` install):

```sh
pnpm install --ignore-workspace && pnpm dev
```

Open the printed URL plus `/tokens.html`, `/compat.html` or `/update.html`. Add `?variant=compact` for the compact density with `toastRadius="control"`. Add `?theme=dark` for dark mode (combine with `&`), or use "Toggle theme". `?variant=compact` applies to the first two pages only. Hover the toast to see the close chip. `Fixture.tsx` and `UpdateToastFixture.tsx` are not part of the package typecheck.

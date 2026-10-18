# compat-shadcn-rgb fixture

Renders Button, toast, Dialog, Input, Textarea and Switch against sample shadcn-style `R G B` variables for light and dark. `styles.css` imports `compat-shadcn-rgb.css` and not `tokens.css`.

Run it from this folder (it is not a workspace member, and React resolves from the parent `packages/ui` install):

```sh
pnpm install --ignore-workspace && pnpm dev
```

Open the printed URL and use "Toggle theme" to switch between light and dark. `Fixture.tsx` is not part of the package typecheck.

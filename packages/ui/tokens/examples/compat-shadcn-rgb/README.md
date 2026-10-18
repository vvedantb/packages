# compat-shadcn-rgb fixture

Renders Button, toast, Dialog, Input, Textarea and Switch against sample shadcn-style `R G B` variables for light and dark. `styles.css` imports `compat-shadcn-rgb.css` and not `tokens.css`.

The package has no bundler dependency. To view it, point any Vite + `@tailwindcss/vite` project at this folder as the root (`vite tokens/examples/compat-shadcn-rgb`), then use "Toggle theme" for the dark check. `Fixture.tsx` is not part of the package typecheck.

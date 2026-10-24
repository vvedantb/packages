# tokens-moved fixture

Renders the components that moved in from eva on plain `tokens.css`, with no app variables and no compat layer, so they can be screenshotted in light and dark:

- Loaders: `Spinner` (icon, `circle`, `ring`), `Button loading`, `RefreshSpinIcon`, `CenteredSpinner`, `LoadingState` (`Drive`, `Dots`, `Orbit`).
- `ListRow` (selected and idle), `Surface`, `BorderBeam` (mono and colourful), `Avatar`, `StatusDot` (every tone).
- Kanban and sortable list.
- `ActivityTasks`, `AgentTrace`, `AgentPlan`, `TestResults`.
- `ModelPickerContent`.
- `Markdown`.

`styles.css` imports `tokens.css`, `border-beam.css` and `markdown.css`. The page shows a light pane and a dark pane side by side. Add `?theme=light` or `?theme=dark` to show one pane at full width.

Run it from this folder (it is not a workspace member, and React resolves from the parent `packages/ui` install):

```sh
pnpm install --ignore-workspace && pnpm dev
```

`Fixture.tsx` is not part of the package typecheck. To check it: `npx tsc -p tokens/examples/tokens-moved/tsconfig.json` from `packages/ui` (only `vite.config.ts` fails until this folder is installed).

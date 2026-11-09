# Agent rules

## Releases

- Every user-facing change to a published package (`@vvedantb/ui`, `native-ui`, `server`, `config`) needs a changeset. Run `pnpm changeset`.
- Do not bump package versions by hand. The Release workflow opens a Version Packages PR and publishes with OIDC trusted publishing only. Do not run `npm publish` or `pnpm publish`, and do not add `NPM_TOKEN` or any npm token. See [RELEASING.md](RELEASING.md).
- Gallery and app workspaces must be `"private": true`. Add them to `ignore` in `.changeset/config.json` when they should stay out of the version graph.
- Before you finish, run `pnpm build`, `pnpm typecheck` and `pnpm test`.

## `@vvedantb/native-ui`

> Every new or changed `@vvedantb/native-ui` component must be added to the Expo gallery (`apps/native-gallery`) with a Maestro flow covering the change, and must be tested by hand on an Android emulator before merging.

What that means in this repository:

- **Gallery.** Render the component in `apps/native-gallery` (a section in `src/sections/`, or the layering or keyboard screen when the change is about overlays or the keyboard). Show the realistic case and the stress cases: long text, an empty state, larger text, dark mode.
- **Registry.** Add the component name to `apps/native-gallery/src/galleryRegistry.ts`. `packages/native-ui/tests/galleryRegistry.test.ts` fails when a React component export has no entry, or when its section does not use the name.
- **Maestro.** Add or extend a flow in `apps/native-gallery/.maestro/` that covers the change, with `testID`s on the parts it drives. CI runs the flows as `native-ui-gallery-android` (`.github/workflows/native-ui-gallery.yml`).
- **By hand.** Run the gallery on an Android emulator (`pnpm --filter native-gallery start`, or `cd apps/native-gallery && npx expo run:android`) and check the change before merging. Passing CI does not replace this.
- **Release.** Add a changeset (`pnpm changeset`) for the package bump. Keep `pnpm --filter @vvedantb/native-ui typecheck`, `test` and `build` green. Do not bump the version or publish by hand.

Touch targets: every pressable row is at least 44 points high (56 with larger text).

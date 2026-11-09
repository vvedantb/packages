# Claude Code rules

## `@vvedantb/native-ui`

> Every new or changed `@vvedantb/native-ui` component must be added to the Expo gallery (`apps/native-gallery`) with a Maestro flow covering the change, and must be tested by hand on an Android emulator before merging.

What that means in this repository:

- **Gallery.** Render the component in `apps/native-gallery` (a section in `src/sections/`, or the layering or keyboard screen when the change is about overlays or the keyboard). Show the realistic case and the stress cases: long text, an empty state, larger text, dark mode.
- **Registry.** Add the component name to `apps/native-gallery/src/galleryRegistry.ts`. `packages/native-ui/tests/galleryRegistry.test.ts` fails when a React component export has no entry, or when its section does not use the name.
- **Maestro.** Add or extend a flow in `apps/native-gallery/.maestro/` that covers the change, with `testID`s on the parts it drives. CI runs the flows as `native-ui-gallery-android` (`.github/workflows/native-ui-gallery.yml`).
- **By hand.** Run the gallery on an Android emulator (`pnpm --filter native-gallery start`, or `cd apps/native-gallery && npx expo run:android`) and check the change before merging. Passing CI does not replace this.
- **Release.** Bump `packages/native-ui/package.json`, add a `CHANGELOG.md` entry and keep `pnpm --filter @vvedantb/native-ui typecheck`, `test` and `build` green. Do not run `npm publish` from an agent.

Touch targets: every pressable row is at least 44 points high (56 with larger text).

See also `AGENTS.md`, which has the same rule for all agents.

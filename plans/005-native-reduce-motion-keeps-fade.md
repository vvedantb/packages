# 005: Native Reduce Motion keeps a fade, drops the movement

- **Status:** Not started. Needs a yes from the maintainer first (see Problem).
- **Commit:** `76eb8a0` (audit baseline on `main`)
- **Severity:** MEDIUM
- **Category:** Accessibility
- **Estimated scope:** 4 files, about 30 changed lines, plus one changeset

## Problem

With Reduce Motion on, native overlays appear and vanish with no transition
at all. Reduce Motion asks for less movement, not for no feedback. iOS itself
swaps slides for cross-fades.

`packages/native-ui/src/primitives/native-only-animated-view.tsx:30-32`:

```tsx
entering={reduceMotion ? undefined : entering}
exiting={reduceMotion ? undefined : exiting}
layout={reduceMotion ? undefined : layout}
```

Used by Toast, BulkActionBar, the conversation scroll button and Select.

Modal fades are removed too:

- `packages/native-ui/src/primitives/overlay.tsx:156`
  `animationType={slides || reduceMotion ? "none" : "fade"}`
- `packages/native-ui/src/DropdownMenu.tsx:221`
  `animationType={reduceMotion ? "none" : "fade"}`
- `packages/native-ui/src/ai/message-action-sheet.tsx:72`
  `animationType={reduceMotion ? "none" : "fade"}`

**This is a documented choice, not an oversight.** The doc comment at
`native-only-animated-view.tsx:11-15` says: "With Reduce Motion on, it drops
the animations: sheets, toasts and the `Select` popover appear and leave in
place." This plan reverses that choice. Do not start it until the maintainer
agrees.

## Target

With Reduce Motion on:

- Entering and exiting use a plain opacity fade, 150ms in and 120ms out.
- Layout transitions stay off.
- Modal backdrops keep `animationType="fade"`.

With Reduce Motion off: no change.

## Repo conventions

- Motion constants live in `packages/native-ui/src/motion.ts` (`EASE_OUT`,
  `SHEET_SPRING`). Add new shared values there.
- Reanimated animations honour the OS setting through `reduceMotion`. A fade
  that must run under Reduce Motion needs
  `.reduceMotion(ReduceMotion.Never)`.
- `useReduceMotion` is the hook in `packages/native-ui/src/useReduceMotion`.
- `CLAUDE.md` rule for every changed native-ui component: show it in
  `apps/native-gallery`, cover the change with a Maestro flow in
  `apps/native-gallery/.maestro/`, and test by hand on an Android emulator
  before merging.
- Changeset needed (`pnpm changeset`, minor or patch for
  `@vvedantb/native-ui`; this changes visible behaviour, so say so).

## Steps

1. In `motion.ts`, export two layout animations:

   ```ts
   export const REDUCED_FADE_IN = FadeIn.duration(150).reduceMotion(ReduceMotion.Never);
   export const REDUCED_FADE_OUT = FadeOut.duration(120).reduceMotion(ReduceMotion.Never);
   ```

2. In `native-only-animated-view.tsx`, change the three props to:

   ```tsx
   entering={reduceMotion ? (entering ? REDUCED_FADE_IN : undefined) : entering}
   exiting={reduceMotion ? (exiting ? REDUCED_FADE_OUT : undefined) : exiting}
   layout={reduceMotion ? undefined : layout}
   ```

3. Update the doc comment in that file to describe the new behaviour.
4. In `overlay.tsx:156`, change to `animationType={slides ? "none" : "fade"}`.
   Read the surrounding code first: when `slides` is true the sheet drives
   its own animation, so check what the sheet does under Reduce Motion and
   leave that path alone.
5. In `DropdownMenu.tsx:221` and `ai/message-action-sheet.tsx:72`, change to
   `animationType="fade"`. Remove `reduceMotion` there if it is now unused.
6. Update any test that asserts "no animation under Reduce Motion".
7. Run `pnpm changeset`.

## Boundaries

- Do not change gesture code, springs or the sheet slide.
- Do not add movement under Reduce Motion.
- Do not change the web (`Platform.OS === "web"`) branch.

## Verification

**Mechanical**

```bash
pnpm --filter @vvedantb/native-ui typecheck
pnpm --filter @vvedantb/native-ui test
```

**Feel check** (device or simulator, Reduce Motion on)

- Show a toast. It fades in without sliding and fades out.
- Open a dropdown menu. The backdrop fades; nothing moves.
- Open a Select. The popover fades in place.
- Turn Reduce Motion off. Everything animates as before.

**Done when**

- No overlay pops in with zero transition under Reduce Motion.
- Typecheck and tests pass and a changeset file exists.

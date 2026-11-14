# 002: Open the command palette and slash menu with no animation

- **Status:** Implemented on 14 November 2026
- **Commit:** `76eb8a0` (audit baseline on `main`)
- **Severity:** HIGH
- **Category:** Purpose and frequency
- **Estimated scope:** 2 to 3 files, about 20 changed lines, plus one changeset

## Problem

The command palette and the composer slash menu open from the keyboard, many
times a day. Both animate on open and close. An animation on a keyboard
surface that a person opens 100 or more times a day reads as lag.

**Command palette.** `packages/ui/src/ui/command.tsx:94-95`:

```tsx
<Dialog {...props}>
  <DialogContent className={merge(classes?.dialogContent ?? "overflow-hidden p-0 sm:max-w-xl sm:rounded-menu", className)}>
```

`DialogContent` applies the `t-modal` class (`packages/ui/src/ui/dialog.tsx:207`).
`packages/ui/tokens/src/css/modal.css` animates it:

```css
.t-modal {
  transform: translate(-50%, -50%) scale(var(--modal-scale));
  opacity: 0;
  transition:
    transform var(--modal-open-dur) var(--modal-ease),
    opacity var(--modal-open-dur) var(--modal-ease);
}
.t-modal.is-closing {
  transition:
    transform var(--modal-close-dur) var(--modal-ease),
    opacity var(--modal-close-dur) var(--modal-ease);
  /* Radix Presence waits on animationend, not transitionend */
  animation: t-modal-presence-wait var(--modal-close-dur) linear forwards;
}
```

`tokens.css` sets `--modal-open-dur: 180ms`, `--modal-close-dur: 120ms` and
`--modal-scale: 0.96` on `:root`. `packages/ui/src/ui/modalTransition.ts`
adds and removes `is-open` and `is-closing`.

**Slash menu.** `packages/ui/src/composer/input-area/ComposerSlashMenu.tsx:58-62`:

```tsx
<m.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={motionFast}
```

`motionFast` is 0.22s (`packages/ui/src/composer/input-area/motion.ts`).

## Target

- Command palette: content and overlay appear and leave in the same frame.
- Slash menu: appears and leaves in the same frame.
- Other dialogs keep the 180ms / 120ms `t-modal` animation.

## Repo conventions

- Dialog timing is driven by CSS variables. Override the variables on the
  element; do not fork the CSS.
- App-level overrides arrive through `useUiConfig("Command")?.classes`. Keep
  that path working: defaults go in the fallback string.
- Tests must not read source text. Test rendered class names or behaviour.
- Published-package change: add a changeset (`pnpm changeset`, patch for
  `@vvedantb/ui`). No hand version bumps. No `npm publish`.

## Steps

1. Read `packages/ui/src/ui/modalTransition.ts` and the overlay part of
   `packages/ui/src/ui/dialog.tsx` first. Note how the overlay fades and
   whether it reads the same duration variables.
2. In `command.tsx`, add to the default `dialogContent` class:
   `[--modal-open-dur:0ms] [--modal-close-dur:0ms] [--modal-scale:1] [--modal-scale-close:1]`.
3. Check the close path. `t-modal-presence-wait` runs for
   `var(--modal-close-dur)`. With `0ms` the `animationend` event must still
   fire so Radix Presence unmounts. If it does not fire in the browser, use
   `1ms` for `--modal-close-dur` and say so in the changeset.
4. Make the overlay match. If `DialogOverlay` takes a class or prop, pass a
   no-animation class from `CommandDialog`. If it cannot be reached from
   `CommandDialog`, add a small `overlayClassName` (or similar) prop to
   `DialogContent`, following the existing prop style, and use it.
5. In `ComposerSlashMenu.tsx`, remove `initial`, `animate`, `exit` and
   `transition` from the `m.div`. If nothing else in the element needs
   motion, replace `m.div` with `div` and drop the unused imports. If an
   `AnimatePresence` wraps it only for this exit, remove that too.
6. Run `pnpm changeset`: "Command palette and composer slash menu open and
   close with no animation."

## Boundaries

- Do not change `modal.css` or the `:root` values in `tokens.css`.
- Do not change other `Dialog` users.
- Do not remove `motionFast`; the stop button and banners use it.

## Verification

**Mechanical**

```bash
pnpm --filter @vvedantb/ui typecheck
pnpm --filter @vvedantb/ui test
```

**Feel check**

- Press the palette shortcut ten times fast. Each open and close is
  immediate, with no stale overlay left on screen.
- Type `/` in the composer, then Escape, five times. No scale or fade.
- Open a normal dialog. It still scales in over 180ms.
- After closing the palette, check the DOM: the dialog node is gone.

**Done when**

- Palette and slash menu have no open or close animation.
- The palette unmounts on close.
- Typecheck and tests pass and a changeset file exists.

# 001: Scale menus, popovers and tooltips from their trigger

- **Status:** Implemented on 14 November 2026
- **Commit:** `76eb8a0` (audit baseline on `main`)
- **Severity:** MEDIUM
- **Category:** Physicality and origin
- **Estimated scope:** 2 files, about 4 changed lines, plus one changeset

## Problem

Floating surfaces zoom from 95% on open, but from their own centre. A menu
that opens below a button should grow out of that button.

`packages/ui/src/ui/_menu-classes.ts:11-13`:

```ts
export const floatingSurfaceAnimateClass =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
```

There is no `origin-*` class. The same class is used by:

- `packages/ui/src/ui/dropdown-menu.tsx:89,132`
- `packages/ui/src/ui/context-menu.tsx:87,113`
- `packages/ui/src/ui/popover.tsx:58-62`
- `packages/ui/src/ui/hover-card.tsx:55-58`
- `packages/ui/src/ui/select.tsx:128-137`

`packages/ui/src/ui/tooltip.tsx:47` has its own class string with
`animate-in fade-in-0 zoom-in-95 …` and also no origin.

## Target

Every Radix popper surface scales from the trigger:

```
origin-[var(--radix-popper-transform-origin)]
```

Radix sets `--radix-popper-transform-origin` on the content of every
Popper-based primitive (dropdown menu, context menu, popover, hover card,
tooltip, and select when `position="popper"`).

## Repo conventions

- The repo already uses this exact class in `popover.tsx:64`, but only when
  `fitViewport` is set. Follow that spelling.
- `radix-select.tsx:70` uses `origin-(--radix-select-content-transform-origin)`.
  Leave it as it is.
- Classes go through `merge(...)` (`useCn`), so an app override still wins.
- Tests must not read source text (`CLAUDE.md`).
- A user-facing change to a published package needs a changeset
  (`pnpm changeset`, patch for `@vvedantb/ui`). Do not bump versions by hand.
  Do not run `npm publish` or `pnpm publish`.

## Steps

1. In `packages/ui/src/ui/_menu-classes.ts`, append
   ` origin-[var(--radix-popper-transform-origin)]` to
   `floatingSurfaceAnimateClass`.
2. In `packages/ui/src/ui/tooltip.tsx:47`, add the same class to the default
   content class string.
3. In `packages/ui/src/ui/popover.tsx:64`, remove the now duplicate
   `origin-[var(--radix-popper-transform-origin)]` from the `fitViewport`
   branch. Keep the rest of that branch.
4. Check `select.tsx` with `position="item-aligned"` (not popper). The
   variable is unset there, so `transform-origin` falls back to the default
   centre. Confirm it looks the same as before.
5. Run `pnpm changeset` and add a patch for `@vvedantb/ui`: "Menus, popovers,
   hover cards, select and tooltips now scale from their trigger."

## Boundaries

- Do not change durations, easing or the zoom amount.
- Do not touch `radix-select.tsx`.
- Do not add reduced-motion handling here. That is a separate finding.

## Verification

**Mechanical**

```bash
pnpm --filter @vvedantb/ui typecheck
pnpm --filter @vvedantb/ui test
```

**Feel check**

- Open a dropdown menu from a button in the top right of a page. It grows
  from the top right corner of the menu, nearest the button.
- Open the same menu when it flips above the trigger. It grows from the
  bottom edge.
- Record at 0.25× and check the corner nearest the trigger stays still.

**Done when**

- All five consumers and the tooltip scale from the trigger side.
- Typecheck and tests pass.
- A changeset file exists.

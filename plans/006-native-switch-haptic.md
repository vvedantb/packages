# 006: Native Switch ticks on toggle, like Checkbox

- **Status:** Not started
- **Commit:** `76eb8a0` (audit baseline on `main`)
- **Severity:** LOW
- **Category:** Cohesion and tokens
- **Estimated scope:** 1 file, 2 changed lines, plus one changeset

## Problem

`Checkbox` gives a selection haptic when toggled. `Switch` does not, so two
controls that do the same job feel different.

`packages/native-ui/src/Checkbox.tsx:51-54`:

```tsx
onPress={() => {
  selectionHaptic();
  onCheckedChange?.(checked !== true);
}}
```

`packages/native-ui/src/switch.tsx:32-35`:

```tsx
const handleCheckedChange = (nextValue: boolean) => {
  onCheckedChange?.(nextValue);
  onValueChange?.(nextValue);
};
```

## Target

```tsx
const handleCheckedChange = (nextValue: boolean) => {
  selectionHaptic();
  onCheckedChange?.(nextValue);
  onValueChange?.(nextValue);
};
```

## Repo conventions

- `selectionHaptic` comes from `packages/native-ui/src/haptics.ts`. It is a
  no-op on web and when `expo-haptics` is not installed, so no guard is
  needed.
- `Checkbox.tsx:6` shows the import: `import { selectionHaptic } from "./haptics";`
- `CLAUDE.md` rule for every changed native-ui component: it must be in
  `apps/native-gallery` with a Maestro flow covering the change, and be
  tested by hand on an Android emulator before merging. Switch is already in
  the gallery; extend its flow to toggle it.
- Changeset needed (`pnpm changeset`, patch for `@vvedantb/native-ui`).

## Steps

1. Add `import { selectionHaptic } from "./haptics";` to `switch.tsx`.
2. Call `selectionHaptic();` as the first line of `handleCheckedChange`.
3. Check `packages/native-ui/src/primitives/switch.tsx` does not already fire
   a haptic. It did not at the audit commit.
4. Run `pnpm changeset`: "Switch gives a selection haptic on toggle."

## Boundaries

- Do not change the primitive.
- Do not add haptics to other controls here.

## Verification

**Mechanical**

```bash
pnpm --filter @vvedantb/native-ui typecheck
pnpm --filter @vvedantb/native-ui test
```

**Feel check** (physical device; simulators do not vibrate)

- Toggle a Switch. One light tick per toggle.
- Toggle a Checkbox. The tick feels the same.
- A disabled Switch gives no tick.

**Done when**

- Switch and Checkbox both tick once per toggle.
- Typecheck and tests pass and a changeset file exists.

# 004: Stop the gradient shimmer remounting on every render

- **Status:** Not started
- **Commit:** `76eb8a0` (audit baseline on `main`)
- **Severity:** HIGH
- **Category:** Performance
- **Estimated scope:** 1 file, about 15 changed lines, plus one changeset

## Problem

`Shimmer` runs for the whole of a streaming response. Its default mode
creates a new component type on every render.

`packages/ui/src/ai-elements/shimmer.tsx:51-58`:

```tsx
function GradientShimmer({
  children,
  as: Component = "span",
  className,
  duration = 2,
  spread = 2,
}: ShimmerProps) {
  const MotionComponent = motion.create(Component);
```

React treats a new component type as a different element. Each parent
re-render unmounts and remounts the node, so the sweep restarts from the
start. During streaming the parent re-renders often.

Two more points in the same file:

- Line 2 imports `motion` from `motion/react`. The rest of the library uses
  `m` under `LazyMotion strict` (`packages/ui/src/motion/motion-provider.tsx`).
  `motion.*` inside a strict `LazyMotion` throws.
- Lines 80-85 animate `backgroundPosition` on an infinite loop. That repaints
  every frame. A compositor path already exists (`MaskShimmer`,
  `mode: "mask"`), but it needs app-defined `.shimmer-overlay`,
  `.shimmer-band` and `.shimmer-copy` classes, so it cannot become the
  default without shipping that CSS.

## Target

- One stable motion component per `as` element. The sweep does not restart
  when the parent re-renders.
- The file uses `m`, not `motion`.
- Default mode stays `"gradient"`.

## Repo conventions

- Motion components come from `m` (`import { m } from "motion/react"`), as in
  `ComposerSlashMenu.tsx`.
- No source-text tests. Test behaviour: render, re-render the parent, and
  assert the DOM node is the same instance.
- Changeset needed (`pnpm changeset`, patch for `@vvedantb/ui`).

## Steps

1. Replace the `motion` import with `m`.
2. Add a module-level cache above `GradientShimmer`:

   ```tsx
   const motionComponents = new Map<ElementType, ReturnType<typeof m.create>>();

   function motionComponentFor(Component: ElementType) {
     let cached = motionComponents.get(Component);
     if (!cached) {
       cached = m.create(Component);
       motionComponents.set(Component, cached);
     }
     return cached;
   }
   ```

   Adjust the types to what `m.create` returns in the installed `motion`
   version (`^12`). If `m.create` does not exist in that version, check the
   `motion/react` exports and use the documented equivalent.
3. In `GradientShimmer`, replace line 58 with
   `const MotionComponent = motionComponentFor(Component);`.
4. Add a test next to the existing shimmer tests (or create
   `shimmer.test.tsx`): render `<Shimmer>` inside the library's
   `MotionProvider`, keep a reference to the root node, re-render the parent
   with the same props, and assert the node is identical.
5. Run `pnpm changeset`: "Shimmer no longer restarts its sweep when the
   parent re-renders."

## Boundaries

- Do not change the default mode or the mask path.
- Do not change `duration`, `spread` or the gradient.
- Shipping default CSS for the mask classes is a follow-up, not this plan.

## Verification

**Mechanical**

```bash
pnpm --filter @vvedantb/ui typecheck
pnpm --filter @vvedantb/ui test
```

**Feel check**

- Start a streaming response that shows a shimmer label ("Thinking…"). The
  highlight sweeps across in one smooth pass every 2s and does not jump back
  to the start while tokens arrive.
- In React DevTools, turn on "Highlight updates". The shimmer node updates
  but does not remount.

**Done when**

- The new test passes.
- No `motion.` usage remains in `shimmer.tsx`.
- Typecheck and tests pass and a changeset file exists.

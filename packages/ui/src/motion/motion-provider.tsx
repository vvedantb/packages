import { LazyMotion, MotionConfig, domMax, type FeatureBundle } from "motion/react";
import { useLayoutEffect, type ReactNode } from "react";
import { ReducedMotionContext, type ReducedMotion } from "./reduced-motion";

/**
 * The app-wide Motion setup that `m.*` components (in this package and the
 * app) need: one lazy feature bundle under `strict`, so a stray `motion.*`
 * import throws instead of pulling the full bundle into the entry chunk.
 *
 * `features` defaults to `domMax`, which includes layout animations
 * (`layoutId` shared highlights); `domAnimation` is smaller if the app has
 * none. Under `strict` a missing feature silently skips the animation.
 * `reducedMotion` defaults to `"user"` (follow the OS setting); pass `"never"`
 * to always animate. It governs the whole package, not only `m.*`: dialogs,
 * sheets, the `motion-reduce:` variant and motion.css read it too, through
 * `html[data-reduced-motion]` (stamped here, kept after unmount) and context.
 */
export function MotionProvider({
  children,
  features = domMax,
  reducedMotion = "user",
}: {
  children: ReactNode;
  features?: FeatureBundle;
  reducedMotion?: ReducedMotion;
}) {
  useLayoutEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  return (
    <ReducedMotionContext value={reducedMotion}>
      <LazyMotion features={features} strict>
        <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
      </LazyMotion>
    </ReducedMotionContext>
  );
}

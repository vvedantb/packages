import { LazyMotion, MotionConfig, domMax, type FeatureBundle } from "motion/react";
import type { ReactNode } from "react";

/**
 * The app-wide Motion setup that `m.*` components (in this package and the
 * app) need: one lazy feature bundle under `strict`, so a stray `motion.*`
 * import throws instead of pulling the full bundle into the entry chunk.
 *
 * `features` defaults to `domMax`, which includes layout animations
 * (`layoutId` shared highlights); `domAnimation` is smaller if the app has
 * none. Under `strict` a missing feature silently skips the animation.
 * `reducedMotion` defaults to `"user"` (follow the OS setting); pass `"never"`
 * to always animate.
 */
export function MotionProvider({
  children,
  features = domMax,
  reducedMotion = "user",
}: {
  children: ReactNode;
  features?: FeatureBundle;
  reducedMotion?: "user" | "always" | "never";
}) {
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </LazyMotion>
  );
}

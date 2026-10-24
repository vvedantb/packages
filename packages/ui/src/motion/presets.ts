import type { Transition, Variants } from "motion/react";

export const motionEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const motionDuration = {
  fast: 0.22,
  base: 0.3,
  slow: 0.36,
} as const;

export const motionTiming = {
  route: 0.3,
  sidebar: 0.28,
  stagger: 0.03,
} as const;

export const motionDistance = {
  routeX: 12,
  pageY: 8,
} as const;

export const defaultTransition: Transition = {
  duration: motionDuration.base,
  ease: motionEase,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: motionDistance.pageY },
  show: { opacity: 1, y: 0, transition: defaultTransition },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: motionDuration.fast, ease: motionEase },
  },
};

export const springTransition: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.35,
};

export const springFastTransition: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.25,
};

export const fadeUpSpring: Variants = {
  hidden: { opacity: 0, y: motionDistance.pageY },
  show: { opacity: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, y: 6, transition: springFastTransition },
};

/**
 * `motion/react` transitions that match the CSS duration tokens
 * `--motion-fast` (150ms), `--motion-base` (220ms) and `--motion-slow`
 * (320ms) with `--motion-ease-out`. Seconds here, milliseconds in CSS: if an
 * app changes a token, it changes the number here too.
 *
 * - `fast`: hover, focus, small reveals.
 * - `base`: the default for anything entering or leaving.
 * - `slow`: large surfaces and staggered page content.
 */
export const tokenTransition = {
  fast: { duration: 0.15, ease: motionEase },
  base: { duration: 0.22, ease: motionEase },
  slow: { duration: 0.32, ease: motionEase },
} as const satisfies Record<"fast" | "base" | "slow", Transition>;

/**
 * A stagger step for list entrances, capped so a long list does not make the
 * last row wait. Use as `delay: staggerDelay(index)`.
 */
export function staggerDelay(index: number, step: number = motionTiming.stagger, max = 0.2): number {
  return Math.min(index * step, max);
}

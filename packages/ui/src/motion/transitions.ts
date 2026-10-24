import type { Transition } from "motion/react";
import { motionEase } from "./presets";

// `motion/react` transitions that match the CSS duration tokens
// `--motion-fast` (150ms), `--motion-base` (220ms) and `--motion-slow`
// (320ms) with `--motion-ease-out`. Seconds here, milliseconds in CSS: if an
// app changes a token, it changes the number here too. For the critically
// damped spring use `springTransition` from `./presets`.

/** 150ms, ease-out. Hover, focus, small reveals. */
export const transitionFast: Transition = { duration: 0.15, ease: motionEase };

/** 220ms, ease-out. The default for anything entering or leaving. */
export const transitionBase: Transition = { duration: 0.22, ease: motionEase };

/** 320ms, ease-out. Large surfaces and staggered page content. */
export const transitionSlow: Transition = { duration: 0.32, ease: motionEase };

/**
 * A stagger step for list entrances, capped so a long list does not make the
 * last row wait. Use as `delay: staggerDelay(index)`.
 */
export function staggerDelay(index: number, step = 0.03, max = 0.2): number {
  return Math.min(index * step, max);
}

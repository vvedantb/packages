"use client";

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

/** Critically damped default — Apple damping 1.0 / response ~0.35s */
export const defaultTransition: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.35,
};

export const fastTransition: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.25,
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: defaultTransition },
  exit: {
    opacity: 0,
    transition: fastTransition,
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: motionDistance.pageY },
  show: { opacity: 1, y: 0, transition: defaultTransition },
  exit: {
    opacity: 0,
    y: 6,
    transition: fastTransition,
  },
};

export const routeSlideFade: Variants = {
  hidden: { opacity: 0, x: -motionDistance.routeX },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", bounce: 0, duration: motionTiming.route },
  },
  exit: {
    opacity: 0,
    x: -6,
    transition: fastTransition,
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: { opacity: 1, scale: 1, transition: defaultTransition },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: fastTransition,
  },
};

export function staggerContainer(
  stagger = motionTiming.stagger,
  delayChildren = 0,
): Variants {
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        delayChildren,
        staggerChildren: stagger,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        when: "afterChildren",
        staggerChildren: Math.max(0.01, stagger / 2),
        staggerDirection: -1,
      },
    },
  };
}

export const staggerItem: Variants = fadeUp;

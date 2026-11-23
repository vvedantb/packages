"use client";

import { AnimatePresence, m, type Variants } from "motion/react";
import { useState, type ReactNode } from "react";
import { motionEase } from "../motion/presets";
import { cn } from "../utils/cn";
import { useUiConfig } from "./ui-config";

/**
 * How tab content moves when the tab changes. The new panel comes from the
 * side of the tab that was picked (right of the old one: from the right), as a
 * phone swipe does.
 * - `"none"` (default): swap at once.
 * - `"slide"`: a short 32px slide with a fade. Reads the direction without
 *   moving the page; the desktop default for apps that opt in.
 * - `"push"`: the old panel leaves the full width as the new one enters, like
 *   a phone pager. Heavier; suits narrow or swipe-driven surfaces.
 */
export type TabsTransitionVariant = "none" | "slide" | "push";

type Direction = 1 | -1;

const SLIDE_PX = 32;

const variants: Record<Exclude<TabsTransitionVariant, "none">, Variants> = {
  slide: {
    enter: (dir: Direction) => ({ x: dir * SLIDE_PX, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.24, ease: motionEase } },
    // Leaves faster than it enters, so the old panel never lingers.
    exit: (dir: Direction) => ({
      x: -dir * SLIDE_PX,
      opacity: 0,
      transition: { duration: 0.14, ease: motionEase },
    }),
  },
  push: {
    enter: (dir: Direction) => ({ x: `${dir * 100}%` }),
    center: { x: "0%", transition: { duration: 0.32, ease: motionEase } },
    exit: (dir: Direction) => ({
      x: `${-dir * 100}%`,
      transition: { duration: 0.32, ease: motionEase },
    }),
  },
};

export interface TabsTransitionProps {
  /** The selected tab. A new value plays the transition. */
  value: string;
  /** Tab values in their on-screen order, left to right; gives the direction. */
  order: ReadonlyArray<string>;
  /** Defaults to the app's `UiConfig.Tabs.transition`, then `"none"`. */
  variant?: TabsTransitionVariant;
  className?: string;
  /** The selected tab's content. */
  children: ReactNode;
}

/**
 * Wraps the content of a tab set and moves it when the tab changes. Works with
 * any tab content, routed or not: it keys on `value`, so the outgoing panel can
 * leave while the new one enters. The container clips the slide sideways only,
 * so content keeps its natural height. Motion settings apply: `MotionProvider
 * reducedMotion` and page-motion off stop the slide.
 */
export function TabsTransition({
  value,
  order,
  variant: variantProp,
  className,
  children,
}: TabsTransitionProps) {
  const configVariant = useUiConfig("Tabs")?.transition;
  const variant = variantProp ?? configVariant ?? "none";
  // Direction follows the move from the previous tab to this one. Derived in
  // render (adjust-state-on-change), so the first frame already knows it.
  const [previous, setPrevious] = useState(value);
  const [direction, setDirection] = useState<Direction>(1);
  if (value !== previous) {
    setDirection(order.indexOf(value) >= order.indexOf(previous) ? 1 : -1);
    setPrevious(value);
  }

  if (variant === "none") {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-x-clip", className)}>
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <m.div
          key={value}
          custom={direction}
          variants={variants[variant]}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {children}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

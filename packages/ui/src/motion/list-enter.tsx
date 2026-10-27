import { useEffect, useRef, type ReactNode } from "react";
import { m } from "motion/react";
import { staggerDelay, tokenTransition } from "./presets";

/**
 * `true` until the list has painted once. Pass `firstPaint.current` to
 * `ListEnter` so a virtualised list's recycled rows (and later overscan) do
 * not restagger. Stable keys already skip a remount on a data refresh.
 */
export function useFirstPaintGate() {
  const firstPaint = useRef(true);
  useEffect(() => {
    firstPaint.current = false;
  }, []);
  return firstPaint;
}

export interface ListEnterProps {
  index: number;
  children: ReactNode;
  className?: string;
  /** `tokenTransition.fast` instead of `.base`. */
  fast?: boolean;
  /** When `false`, skip the enter (recycled rows, later overscan). */
  firstPaint?: boolean;
  staggerStep?: number;
  staggerMax?: number;
  /** Fade only, for rows that must not shift (e.g. gantt bars). Default `true`. */
  slide?: boolean;
  /** `tr` / `li` when the parent is a table or list; an `m.div` there is invalid HTML. */
  as?: "div" | "tr" | "li";
}

/**
 * First-paint fade and 8px slide for a list item, staggered by `index`.
 * Uses `m`, so the app must render it inside `LazyMotion`.
 */
export function ListEnter({
  index,
  children,
  className,
  fast = false,
  firstPaint,
  staggerStep,
  staggerMax,
  slide = true,
  as = "div",
}: ListEnterProps) {
  const skip = firstPaint === false;
  const transition = fast ? tokenTransition.fast : tokenTransition.base;
  const MotionTag = as === "tr" ? m.tr : as === "li" ? m.li : m.div;
  return (
    <MotionTag
      className={className}
      initial={skip ? false : { opacity: 0, y: slide ? 8 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...transition,
        delay: skip ? 0 : staggerDelay(index, staggerStep, staggerMax),
      }}
    >
      {children}
    </MotionTag>
  );
}

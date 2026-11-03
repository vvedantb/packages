import { m, useInView, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "../../utils/cn";

export interface AnimatedCounterProps {
  /** Target value to count up to. */
  value: number;
  /** Rough animation length in seconds (scales the spring stiffness). Default `1`. */
  duration?: number;
  className?: string;
  /** Formats the displayed number. Default: rounded, `toLocaleString()`. */
  formatValue?: (value: number) => string;
  /** Wait until the counter scrolls into view. Default `true`. */
  animateOnView?: boolean;
}

const defaultFormat = (v: number) => Math.round(v).toLocaleString();

/**
 * Number that springs up from 0 to `value` (`tabular-nums`). Changes to
 * `value` spring from the current number. The spring runs without the app's
 * `LazyMotion`.
 */
export function AnimatedCounter({
  value,
  duration = 1,
  className,
  formatValue = defaultFormat,
  animateOnView = true,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const springValue = useSpring(0, { stiffness: 100 / duration, damping: 30, restDelta: 0.01 });
  const displayValue = useTransform(springValue, (v) => formatValue(v));

  useEffect(() => {
    if (!animateOnView || isInView) springValue.set(value);
  }, [value, springValue, animateOnView, isInView]);

  return (
    <m.span ref={ref} className={cn("tabular-nums", className)}>
      {displayValue}
    </m.span>
  );
}

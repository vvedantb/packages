import { m } from "motion/react";
import { cn } from "../../utils/cn";

export interface PulsingRingsProps {
  /** Size of the element the rings surround (for example the record button), in px. The svg is `size * 1.6`. */
  size: number;
  /** Number of rings. Default `3`. */
  ringCount?: number;
  /** Ring colour. Default `var(--color-danger)`. */
  color?: string;
  /** Render the rings. Default `true`; `false` renders nothing. */
  active?: boolean;
  className?: string;
}

/**
 * Concentric rings that expand and fade with staggered timing, for a
 * recording state. Absolutely centred: put it in a `relative` parent beside
 * the button. Decorative and `pointer-events-none`.
 */
export function PulsingRings({ size, ringCount = 3, color = "var(--color-danger)", active = true, className }: PulsingRingsProps) {
  if (!active) return null;
  const baseDelay = 1.2 / ringCount;

  return (
    <svg
      width={size * 1.6}
      height={size * 1.6}
      viewBox="0 0 100 100"
      className={cn("pointer-events-none absolute", className)}
      style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      aria-hidden="true"
    >
      {Array.from({ length: ringCount }, (_, i) => (
        <m.circle
          key={i}
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke={color}
          strokeWidth="2"
          initial={{ r: 30, opacity: 0.6 }}
          animate={{ r: 48, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: i * baseDelay }}
        />
      ))}
    </svg>
  );
}

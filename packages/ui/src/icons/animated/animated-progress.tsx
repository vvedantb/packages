import { m, useSpring, useTransform } from "motion/react";
import { useEffect, useId } from "react";

export interface AnimatedProgressProps {
  /** Progress from 0 to 100 (clamped). */
  value: number;
  /** Bar height in px. Default `4`. */
  height?: number;
  /** Class on the wrapping `div`. */
  className?: string;
  /** Run the moving gradient and shimmer. Default `true`. */
  showGradient?: boolean;
  /** Accessible name for the `progressbar`. */
  label?: string;
}

/**
 * Thin progress bar whose fill springs to `value`, with a moving gradient
 * and shimmer (SVG `<animate>`). Fill: `--color-primary`; track:
 * `--color-surface-secondary`. Renders `role="progressbar"`.
 */
export function AnimatedProgress({ value, height = 4, className, showGradient = true, label }: AnimatedProgressProps) {
  const id = useId();
  const gradientId = `${id}-gradient`;
  const shimmerId = `${id}-shimmer`;
  const clamped = Math.min(Math.max(value, 0), 100);
  const springValue = useSpring(0, { stiffness: 100, damping: 30 });
  const width = useTransform(springValue, (v) => `${v}%`);

  useEffect(() => {
    springValue.set(clamped);
  }, [clamped, springValue]);

  return (
    <div
      className={className}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      style={{ height, overflow: "hidden", borderRadius: height / 2 }}
    >
      <svg width="100%" height={height} className="block" aria-hidden="true">
        <defs>
          {/* Moving gradient */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="50%" stopColor="color-mix(in oklch, var(--color-primary) 80%, transparent)" />
            <stop offset="100%" stopColor="var(--color-primary)" />
            {showGradient ? <animate attributeName="x1" values="-100%;100%" dur="2s" repeatCount="indefinite" /> : null}
            {showGradient ? <animate attributeName="x2" values="0%;200%" dur="2s" repeatCount="indefinite" /> : null}
          </linearGradient>
          {/* Shimmer overlay */}
          <linearGradient id={shimmerId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="transparent" />
            <animate attributeName="x1" values="-50%;150%" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="x2" values="0%;200%" dur="1.5s" repeatCount="indefinite" />
          </linearGradient>
        </defs>
        {/* Track */}
        <rect x="0" y="0" width="100%" height={height} rx={height / 2} fill="var(--color-surface-secondary)" />
        {/* Fill */}
        <m.rect x="0" y="0" height={height} rx={height / 2} fill={`url(#${gradientId})`} style={{ width }} />
        {/* Shimmer */}
        {showGradient && clamped > 0 ? (
          <m.rect x="0" y="0" height={height} rx={height / 2} fill={`url(#${shimmerId})`} style={{ width }} />
        ) : null}
      </svg>
    </div>
  );
}

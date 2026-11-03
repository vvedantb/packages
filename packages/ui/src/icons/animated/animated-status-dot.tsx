import { m } from "motion/react";
import { useId } from "react";

export type StatusDotPhase = "idle" | "listening" | "thinking" | "speaking" | "error";

export interface AnimatedStatusDotProps {
  phase: StatusDotPhase;
  /** Dot diameter in px. The svg is `size * 3` square to leave room for the ripples. Default `10`. */
  size?: number;
  className?: string;
}

const PHASE_COLORS: Record<StatusDotPhase, string> = {
  idle: "var(--color-muted-foreground)",
  listening: "var(--color-danger)",
  thinking: "var(--color-warning)",
  speaking: "var(--color-success)",
  error: "var(--color-danger)",
};

const RIPPLE_DELAYS = [0, 0.5, 1];

/**
 * Status dot for voice states: ripples while `listening`, a glow pulse while
 * `listening` or `speaking`. Decorative (`aria-hidden`); show the phase as text too.
 */
export function AnimatedStatusDot({ phase, size = 10, className }: AnimatedStatusDotProps) {
  const filterId = `${useId()}-glow`;
  const color = PHASE_COLORS[phase];
  const isListening = phase === "listening";
  const isActive = isListening || phase === "speaking";

  return (
    <svg
      width={size * 3}
      height={size * 3}
      viewBox="0 0 30 30"
      className={className}
      overflow="visible"
      aria-hidden="true"
      data-phase={phase}
    >
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ripples while listening */}
      {isListening
        ? RIPPLE_DELAYS.map((delay) => (
            <m.circle
              key={delay}
              cx="15"
              cy="15"
              r="5"
              fill="none"
              stroke={color}
              strokeWidth="1"
              initial={{ r: 5, opacity: 0.6 }}
              animate={{ r: 14, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay }}
            />
          ))
        : null}

      {/* Glow ring while active */}
      {isActive ? (
        <m.circle
          cx="15"
          cy="15"
          r="7"
          fill={color}
          opacity={0.3}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.15, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      {/* Dot */}
      <m.circle
        cx="15"
        cy="15"
        r="5"
        fill={color}
        filter={isActive ? `url(#${filterId})` : undefined}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    </svg>
  );
}

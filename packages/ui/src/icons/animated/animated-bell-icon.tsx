import { m } from "motion/react";

export interface AnimatedBellIconProps {
  /** Width and height in px. Default `32`. */
  size?: number;
  className?: string;
  /** Draw the mute slash. Default `true` (the empty-notifications state). */
  muted?: boolean;
}

/**
 * Bell that draws itself, then swings every few seconds with a moving
 * clapper. For empty notification states. Uses `currentColor`. Decorative (`aria-hidden`).
 */
export function AnimatedBellIcon({ size = 32, className, muted = true }: AnimatedBellIconProps) {
  return (
    <m.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      initial={{ rotate: 0 }}
      animate={{ rotate: [0, 10, -10, 8, -8, 5, -5, 0] }}
      transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
      style={{ transformOrigin: "top center" }}
    >
      {/* Body */}
      <m.path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      {/* Bottom curve */}
      <m.path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      />
      {/* Mute slash */}
      {muted ? (
        <m.path
          d="M2 2l20 20"
          data-slot="mute-slash"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        />
      ) : null}
      {/* Clapper */}
      <m.circle
        cx="12"
        cy="17"
        r="0.5"
        fill="currentColor"
        animate={{ x: [0, 1, -1, 0.5, -0.5, 0] }}
        transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
      />
    </m.svg>
  );
}

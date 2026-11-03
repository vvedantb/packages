import { m } from "motion/react";

export interface MorphingMenuIconProps {
  /** `true` draws the X (close), `false` the three bars (menu). */
  isOpen: boolean;
  /** Width and height in px. Default `20`. */
  size?: number;
  className?: string;
}

const LINE = {
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const MORPH = { duration: 0.25, ease: "easeInOut" } as const;

/**
 * Hamburger that morphs into an X: the outer bars cross and the middle bar
 * fades out. Uses `currentColor`. Decorative (`aria-hidden`): label the button
 * that holds it and set its `aria-expanded`.
 */
export function MorphingMenuIcon({ isOpen, size = 20, className }: MorphingMenuIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      data-state={isOpen ? "open" : "closed"}
    >
      {/* Top bar: becomes the "\" of the X */}
      <m.line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        {...LINE}
        initial={false}
        animate={{ x1: isOpen ? 5 : 4, y1: isOpen ? 5 : 6, x2: isOpen ? 19 : 20, y2: isOpen ? 19 : 6 }}
        transition={MORPH}
      />
      {/* Middle bar: fades out */}
      <m.line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        {...LINE}
        initial={false}
        animate={{ opacity: isOpen ? 0 : 1, scaleX: isOpen ? 0 : 1 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        style={{ transformOrigin: "center" }}
      />
      {/* Bottom bar: becomes the "/" of the X */}
      <m.line
        x1="4"
        y1="18"
        x2="20"
        y2="18"
        {...LINE}
        initial={false}
        animate={{ x1: isOpen ? 5 : 4, y1: isOpen ? 19 : 18, x2: isOpen ? 19 : 20, y2: isOpen ? 5 : 18 }}
        transition={MORPH}
      />
    </svg>
  );
}

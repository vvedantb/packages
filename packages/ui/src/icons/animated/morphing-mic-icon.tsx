import { m } from "motion/react";
import { cn } from "../../utils/cn";

export interface MorphingMicIconProps {
  /** `true` shows the stop square, `false` the microphone. */
  isListening: boolean;
  /** Width and height in px. Default `32`. */
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const ICON_TRANSITION = { type: "spring", duration: 0.3, bounce: 0 } as const;
const HIDDEN = { scale: 0.25, opacity: 0, filter: "blur(4px)" };
const VISIBLE = { scale: 1, opacity: 1, filter: "blur(0px)" };

/**
 * Cross-fades a microphone and a stop square (scale, opacity and blur).
 * Uses `currentColor`. Decorative (`aria-hidden`): label the button that holds it.
 */
export function MorphingMicIcon({ isListening, size = 32, strokeWidth = 2, className }: MorphingMicIconProps) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "absolute inset-0",
  };

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
      data-state={isListening ? "listening" : "idle"}
    >
      <m.svg {...svgProps} data-slot="mic" initial={false} animate={isListening ? HIDDEN : VISIBLE} transition={ICON_TRANSITION}>
        <rect x="9" y="1" width="6" height="12" rx="3" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <path d="M12 19v4" />
        <path d="M8 23h8" />
      </m.svg>
      <m.svg {...svgProps} data-slot="stop" initial={false} animate={isListening ? VISIBLE : HIDDEN} transition={ICON_TRANSITION}>
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </m.svg>
    </span>
  );
}

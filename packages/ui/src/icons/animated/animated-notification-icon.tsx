import { m } from "motion/react";

export type NotificationIconType = "success" | "warning" | "error" | "info";

export interface AnimatedNotificationIconProps {
  type: NotificationIconType;
  /** Width and height in px. Default `20`. */
  size?: number;
  /** Stroke colour. Default: the type's token (`--color-success`, `--color-warning`, `--color-danger`, `--color-primary` for `info`). */
  color?: string;
  /** Class on the wrapping `span`. */
  className?: string;
}

const TYPE_COLORS: Record<NotificationIconType, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-danger)",
  info: "var(--color-primary)",
};

interface PartProps {
  size: number;
  color: string;
}

function SuccessIcon({ size, color }: PartProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Circle */}
      <m.circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      {/* Checkmark draws itself */}
      <m.path
        d="M8 12l2.5 2.5L16 9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
      />
    </svg>
  );
}

function WarningIcon({ size, color }: PartProps) {
  return (
    <m.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      initial={{ rotate: 0 }}
      animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Triangle */}
      <m.path
        d="M12 2L2 20h20L12 2z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      {/* Exclamation line */}
      <m.path
        d="M12 9v4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.2, delay: 0.3 }}
      />
      {/* Exclamation dot */}
      <m.circle
        cx="12"
        cy="17"
        r="1"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.15, delay: 0.45, type: "spring" }}
      />
    </m.svg>
  );
}

function ErrorIcon({ size, color }: PartProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Circle */}
      <m.circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
      {/* X, first stroke */}
      <m.path
        d="M15 9l-6 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.2, delay: 0.2 }}
      />
      {/* X, second stroke */}
      <m.path
        d="M9 9l6 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.2, delay: 0.3 }}
      />
    </svg>
  );
}

function InfoIcon({ size, color }: PartProps) {
  return (
    <m.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      initial={{ y: 2, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Circle */}
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      {/* Dot */}
      <m.circle
        cx="12"
        cy="8"
        r="1"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, delay: 0.2, type: "spring" }}
      />
      {/* Line */}
      <m.path
        d="M12 12v4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.2, delay: 0.3 }}
      />
    </m.svg>
  );
}

const PARTS: Record<NotificationIconType, (props: PartProps) => React.JSX.Element> = {
  success: SuccessIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

/**
 * Notification status icon that animates on mount: the check draws itself,
 * the warning shakes, the error pops in and the info icon rises. Decorative
 * (`aria-hidden`); put the message text beside it.
 */
export function AnimatedNotificationIcon({ type, size = 20, color, className }: AnimatedNotificationIconProps) {
  const Part = PARTS[type];
  return (
    <span className={className} data-type={type}>
      <Part size={size} color={color ?? TYPE_COLORS[type]} />
    </span>
  );
}

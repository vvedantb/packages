// Motion-driven animated SVG icons. Entry: `@vvedantb/ui/icons/animated` (not re-exported from
// the root or `/client`, so apps that do not use them do not load them). They need the optional
// `motion` peer and animate through `m.*`, so wrap the app in `MotionProvider` (or its own
// `LazyMotion`); without it they render their resting frame. No stylesheet is needed.
export { AnimatedBellIcon } from "./animated-bell-icon";
export type { AnimatedBellIconProps } from "./animated-bell-icon";
export { AnimatedCounter } from "./animated-counter";
export type { AnimatedCounterProps } from "./animated-counter";
export { AnimatedKeyIcon } from "./animated-key-icon";
export type { AnimatedKeyIconProps } from "./animated-key-icon";
export { AnimatedNotificationIcon } from "./animated-notification-icon";
export type { AnimatedNotificationIconProps, NotificationIconType } from "./animated-notification-icon";
export { AnimatedProgress } from "./animated-progress";
export type { AnimatedProgressProps } from "./animated-progress";
export { AnimatedStatusDot } from "./animated-status-dot";
export type { AnimatedStatusDotProps, StatusDotPhase } from "./animated-status-dot";
export { MorphingMenuIcon } from "./morphing-menu-icon";
export type { MorphingMenuIconProps } from "./morphing-menu-icon";
export { MorphingMicIcon } from "./morphing-mic-icon";
export type { MorphingMicIconProps } from "./morphing-mic-icon";
export { PulsingRings } from "./pulsing-rings";
export type { PulsingRingsProps } from "./pulsing-rings";

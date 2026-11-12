import { createContext, type ComponentType, type ReactNode } from "react";

/**
 * The rules of a toast's drag to dismiss, as plain numbers, so they stay
 * testable apart from the gesture. A toast enters down from the top edge, so
 * it leaves the same way: up. `dy` is the drag's travel in points (up
 * negative) and `vy` the finger's speed in points per second (the Gesture
 * Handler unit). Each rule is a worklet, so the drag runs it on the UI thread.
 */

/** Vertical travel (pt) before a drag takes the toast: a tap still presses it. */
export const TOAST_DRAG_ACTIVE_OFFSET_Y = 8;

/** A flick up at this speed (pt/s) dismisses the toast, however short the drag. */
const FLICK_VELOCITY = 500;

/** How far ahead (s) the release velocity carries the toast when deciding to dismiss it. */
const PROJECTION_S = 0.2;

/** How far a downward pull may move the toast: it is already as low as it goes. */
const DOWN_REACH = 24;

/**
 * Where the toast sits for a drag of `dy`: it follows the finger up 1:1, and
 * down it meets growing resistance, up to `DOWN_REACH`.
 */
export function toastDragOffset(dy: number): number {
  "worklet";
  if (dy <= 0) return dy;
  return DOWN_REACH * (1 - 1 / (1 + dy / (DOWN_REACH * 2)));
}

/**
 * Whether a released drag dismisses the toast: a quick flick up, or a drag
 * whose position, carried on by its speed, passes half the toast's height.
 * A slow, short drag springs back.
 */
export function toastDragDismisses(dy: number, vy: number, height: number): boolean {
  "worklet";
  if (dy >= 0) return false;
  if (vy <= -FLICK_VELOCITY) return true;
  return dy + Math.min(0, vy) * PROJECTION_S < -height / 2;
}

export type ToastDragProps = {
  /** The drag dismissed the toast: it has left the screen. */
  onDismiss: () => void;
  /** A finger is on the toast (`true`), or has lifted: the toast's timer pauses meanwhile. */
  onHoldChange: (held: boolean) => void;
  children: ReactNode;
};

/**
 * The Gesture Handler toast drag, from `@vvedantb/native-ui/gesture-handler`
 * (`GestureHandlerProvider`). A context, so only that entry imports
 * `react-native-gesture-handler`; without it a toast closes on a tap only.
 */
export const ToastDragContext = createContext<ComponentType<ToastDragProps> | null>(null);

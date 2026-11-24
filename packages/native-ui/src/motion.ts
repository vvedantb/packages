import { Easing, ReduceMotion } from "react-native-reanimated";
import { useReduceMotion } from "./useReduceMotion";

// The kit's motion values, from the `animate-expo` tables, so every part
// eases and springs in one family.

/** Strong ease-out: things entering or leaving the screen. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** A sheet opened or closed by a tap: no finger, so no velocity and no bounce. */
export const SHEET_SPRING = {
  duration: 300,
  dampingRatio: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

/** A dragged sheet that springs home: critically damped, no bounce. Add the release `velocity`. */
export const SHEET_SNAP_SPRING = {
  duration: 300,
  dampingRatio: 1,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

/**
 * Press feedback on press-in, as a class for a `Pressable`: the 3% scale the
 * `animate-expo` press recipe allows for something pressed this often (the
 * web buttons and composer chips scale by 3-4%). With Reduce Motion, a dim
 * instead of the scale.
 */
export function usePressFeedback(): string {
  return useReduceMotion() ? "active:opacity-80" : "active:scale-[0.97]";
}

/** Start scale of a popover or dialog panel as it opens: never from 0, as the `animate-expo` rules say. */
export const PANEL_SCALE_FROM = 0.96;

/** A menu panel opening from its trigger: opacity and scale together. */
export const POPOVER_ENTER = { duration: 150, easing: EASE_OUT, reduceMotion: ReduceMotion.System } as const;

/** A menu panel leaving: a quick fade only. */
export const POPOVER_EXIT = { duration: 100, easing: EASE_OUT, reduceMotion: ReduceMotion.System } as const;

/** A centred dialog opening: the backdrop fades while the panel scales and fades in. */
export const DIALOG_ENTER = { duration: 200, easing: EASE_OUT, reduceMotion: ReduceMotion.System } as const;

/** A centred dialog closing. */
export const DIALOG_EXIT = { duration: 150, easing: EASE_OUT, reduceMotion: ReduceMotion.System } as const;

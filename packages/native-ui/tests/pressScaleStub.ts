import { vi } from "vitest";

// A stand-in for `src/pressScale` in the tests that call components as plain
// functions, outside a renderer: the real hook needs a React renderer and
// Reanimated's UI runtime. `AnimatedPressable` is the stubbed `Pressable`. The
// hook is a spy, so a test can check the options a component passes, and it
// returns the rest opacity as the style so a dimmed state stays visible.
export const AnimatedPressable = "Pressable";

export const usePressScale = vi.fn((options: { restOpacity?: number } = {}) => ({
  style: { opacity: options.restOpacity ?? 1 },
  onPressIn: undefined,
  onPressOut: undefined,
}));

/** Calls a component element once, as the tests call the exported components, so its tree can be read. */
export function expand<T extends { type: unknown; props: unknown }>(element: T): T {
  return typeof element.type === "function" ? (element.type as (props: unknown) => T)(element.props) : element;
}

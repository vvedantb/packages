import { useState } from "react";

/**
 * Whether a `Pressable` is held down, as state, for a pressed look. With a
 * `className`, NativeWind drops a `Pressable` style function (`({ pressed })
 * => ...`), and with it the radius, border and fill it sets; so a pressable
 * with classes reads `pressed` from here and passes a plain style. Spread
 * `onPressIn` and `onPressOut` on the `Pressable`.
 */
export function usePressed() {
  const [pressed, setPressed] = useState(false);
  return { pressed, onPressIn: () => setPressed(true), onPressOut: () => setPressed(false) };
}

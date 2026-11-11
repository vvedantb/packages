import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import type { SwipeAction } from "./swipeRow";

export type SwipeableRowProps = {
  /** Revealed at the left by a swipe right. The first one commits on a full swipe and sits at the screen edge. */
  leadingActions?: readonly SwipeAction[];
  /** Revealed at the right by a swipe left. The first one commits on a full swipe and sits at the screen edge. */
  trailingActions?: readonly SwipeAction[];
  /** `false` (such as in select mode) leaves the row still under the finger. */
  enabled?: boolean;
  /** The row's fill while it moves, so the actions behind do not show through. Default the screen background. */
  backgroundColor?: string;
  children: ReactNode;
};

/**
 * The Gesture Handler row, from `@vvedantb/native-ui/gesture-handler`
 * (`GestureHandlerProvider`). A context, so only that entry imports
 * `react-native-gesture-handler`.
 */
export const SwipeRowGestureContext = createContext<ComponentType<SwipeableRowProps> | null>(null);

/**
 * A list row that a horizontal swipe moves aside, to reveal its actions
 * behind it, as the iOS and Android mail apps. The row follows the finger
 * 1:1 and springs on at the finger's speed when it lifts: past half its
 * buttons it stays open; a full swipe (half the row, with a light haptic as
 * it arms) runs the first action, and an action that `exits` slides the row
 * out. Toward a side with no actions it gives a little, with resistance. A
 * vertical drag scrolls the list first. One row is open at a time: another
 * row opening, a tap on any row, or `closeSwipeRows` (pass it to the list's
 * `onScrollBeginDrag`) closes it. With Reduce Motion on it still follows the
 * finger, and the release settles at once.
 *
 * The swipe needs `GestureHandlerProvider`; without it the row is drawn as
 * is, with no swipe. Either way, spread `swipeActionsAccessibility(actions)`
 * on the row's main pressable, so screen reader users get the same actions.
 */
export function SwipeableRow(props: SwipeableRowProps) {
  const GestureRow = useContext(SwipeRowGestureContext);
  if (!GestureRow) return <>{props.children}</>;
  return <GestureRow {...props} />;
}

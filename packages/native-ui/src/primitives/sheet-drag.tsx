import { createContext, useContext, useState, type ReactNode } from "react";
import {
  PanResponder,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { impactHaptic } from "../haptics";
import { SHEET_SNAP_SPRING, SHEET_SPRING } from "../motion";
import { isSheetDragDown, SHEET_OVERPULL, sheetDragDismisses, sheetDragOffset, sheetSnapVelocity } from "../sheetDrag";

/**
 * The live state of one open overlay's motion, shared by the sheet (which
 * moves), the backdrop (which fades with it) and a `DialogBody` / `SheetBody`
 * inside (which reports its scroll, so a drag only takes over at the top).
 * One `offset` drives the slide in, the drag, the release and the slide out,
 * so each can take over from the others mid-flight. Shared values, so the
 * motion runs on the UI thread and a drag re-renders nothing per move.
 */
export type SheetDragState = {
  /** How far down the sheet sits from rest. */
  offset: SharedValue<number>;
  /** The sheet's height, from its layout; 0 until it is laid out. */
  height: SharedValue<number>;
  /** The scroll offset of the body inside, 0 at the top. */
  scrollTop: SharedValue<number>;
  /** Set once a release flung the sheet out: the overlay then closes. */
  dismissed: SharedValue<boolean>;
  /** Set while the sheet slides out after the overlay closed: a touch no longer catches it. */
  closing: SharedValue<boolean>;
  /** The sheet slides in from below on its first layout (a bottom sheet, Reduce Motion off). */
  slides: boolean;
  /** While the sheet follows a finger: the body inside stops scrolling, so the native scroll does not take the touch. */
  dragging: boolean;
  setDragging: (dragging: boolean) => void;
};

const SheetDragContext = createContext<SheetDragState | null>(null);

/**
 * Makes the motion state for one open overlay and closes it once a drag
 * flung the sheet out. Call it inside the `Modal`, so each opening starts
 * fresh: below the screen when `slides`, else at rest.
 */
export function useSheetDragState(close: () => void, slides: boolean): SheetDragState {
  const window = useWindowDimensions();
  const offset = useSharedValue(slides ? window.height : 0);
  const height = useSharedValue(0);
  const scrollTop = useSharedValue(0);
  const dismissed = useSharedValue(false);
  const closing = useSharedValue(false);
  const [dragging, setDragging] = useState(false);
  useAnimatedReaction(
    () => dismissed.get(),
    (done, previous) => {
      if (done && !previous) runOnJS(close)();
    },
    [close],
  );
  return { offset, height, scrollTop, dismissed, closing, slides, dragging, setDragging };
}

export const SheetDragProvider = SheetDragContext.Provider;

/** The backdrop's opacity, from the sheet's offset: 1 at rest, 0 with the sheet out of sight. */
export function useSheetBackdropStyle(drag: SheetDragState) {
  return useAnimatedStyle(() => {
    const height = drag.height.get();
    // Not laid out yet: hidden while a sliding sheet waits below the screen.
    if (height === 0) return { opacity: drag.offset.get() > 0 ? 0 : 1 };
    return { opacity: interpolate(drag.offset.get(), [0, height], [1, 0], "clamp") };
  });
}

/** Springs a sheet that is sliding out back to rest: the overlay opened again. */
export function slideSheetIn(drag: SheetDragState) {
  drag.closing.set(false);
  if (drag.height.get() > 0) drag.offset.set(withSpring(0, SHEET_SPRING));
}

/** Slides the sheet down out of sight, then calls `done` (which hides the `Modal`). */
export function slideSheetOut(drag: SheetDragState, done: () => void) {
  drag.closing.set(true);
  drag.offset.set(
    withSpring(drag.height.get(), SHEET_SPRING, (finished) => {
      "worklet";
      if (finished) runOnJS(done)();
    }),
  );
}

/**
 * For a scroll view inside a sheet: `onScroll` reports its offset, so a
 * downward drag moves the sheet only once the content is scrolled to the top,
 * and `scrollEnabled` is off while the sheet follows the finger, so the native
 * scroll does not take the touch over (Android and iOS would cancel the drag).
 * Returns nothing outside a sheet.
 */
export function useSheetScrollBinding() {
  const drag = useContext(SheetDragContext);
  if (!drag) return null;
  return {
    scrollEnabled: !drag.dragging,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      drag.scrollTop.set(event.nativeEvent.contentOffset.y);
    },
  };
}

/**
 * The part of a bottom sheet that follows the finger. A drag down from
 * anywhere on it (rows included; a body only when scrolled to its top) moves
 * the sheet 1:1 and fades the backdrop. A touch on a sheet still sliding in,
 * springing home or flung out catches it where it is. On release the sheet
 * springs on at the finger's speed: a quick flick or a drag past half the
 * sheet carries it out and closes the overlay; a slow, short drag springs it
 * home, with a light haptic. Pulled up past rest, it gives a little, with
 * resistance. On its first layout it slides in from below when `slides`.
 * With Reduce Motion on it still follows the finger, and the release settles
 * at once. `enabled={false}` (a sheet that may not be dismissed) leaves it
 * still under the finger.
 */
export function SheetDragView({
  enabled,
  style,
  children,
}: {
  enabled: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const drag = useContext(SheetDragContext);
  // Created once: its handlers only touch shared values and `start`, so they never go stale.
  const [responder] = useState(() => {
    if (!drag) return null;
    // Where the sheet was when the finger caught it.
    let start = 0;
    return PanResponder.create({
      // A touch on a sheet in motion catches it: it stops under the finger.
      onStartShouldSetPanResponderCapture: () => !drag.closing.get() && drag.offset.get() > 1,
      // Capture, so a downward drag wins over the rows and over a body
      // scrolled to its top. Only then: a body scrolled down keeps its
      // scroll both ways, and an upward drag always scrolls it.
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        !drag.closing.get() && isSheetDragDown(gesture.dx, gesture.dy) && drag.scrollTop.get() <= 0,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        cancelAnimation(drag.offset);
        start = drag.offset.get();
        drag.setDragging(true);
      },
      // Track phase: one shared value write per move, no React render.
      onPanResponderMove: (_event, gesture) => {
        drag.offset.set(sheetDragOffset(start + gesture.dy));
      },
      onPanResponderRelease: (_event, gesture) => settle(drag, start + gesture.dy, gesture.vy, true),
      onPanResponderTerminate: (_event, gesture) => settle(drag, start + gesture.dy, gesture.vy, false),
    });
  });
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag ? drag.offset.get() : 0 }] }));
  return (
    <Animated.View
      {...(enabled && responder ? responder.panHandlers : null)}
      onLayout={(event) => {
        if (!drag) return;
        const height = event.nativeEvent.layout.height;
        const first = drag.height.get() === 0;
        drag.height.set(height);
        // Slide in: from just below the screen edge, whatever the sheet's height.
        if (first && drag.slides) {
          drag.offset.set(height);
          drag.offset.set(withSpring(0, SHEET_SPRING));
        }
      }}
      style={[style, dragStyle]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Release phase, at `position` below rest with velocity `vy` (pt/ms): the
 * sheet springs on at the finger's speed, out (then the overlay closes) or
 * home. `mayDismiss` is false when the system took the touch away.
 */
function settle(drag: SheetDragState, position: number, vy: number, mayDismiss: boolean) {
  drag.setDragging(false);
  const height = drag.height.get();
  const velocity = vy * 1000;
  if (mayDismiss && sheetDragDismisses({ dy: position, vy, height })) {
    drag.offset.set(
      withSpring(height, { ...SHEET_SPRING, velocity }, (finished) => {
        "worklet";
        if (finished) drag.dismissed.set(true);
      }),
    );
    return;
  }
  drag.offset.set(
    withSpring(0, {
      ...SHEET_SNAP_SPRING,
      velocity: sheetSnapVelocity(position, velocity),
      // Bounce, but never so far up that the bottom edge lifts off the screen.
      clamp: { min: -SHEET_OVERPULL },
    }),
  );
  if (position > 1) impactHaptic("light");
}

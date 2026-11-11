import { createContext, useContext, useState, type ReactNode } from "react";
import { PanResponder, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { isSheetDragDown, sheetDismissDuration, sheetDragDismisses, sheetDragOffset } from "../sheetDrag";

/**
 * The live state of one open overlay's drag, shared by the sheet (which moves),
 * the backdrop (which fades with it) and a `DialogBody` / `SheetBody` inside
 * (which reports its scroll, so a drag only takes over at the top). Shared
 * values, so the motion runs on the UI thread.
 */
export type SheetDragState = {
  /** How far down the sheet sits from rest. */
  offset: SharedValue<number>;
  /** The sheet's height, from its layout. */
  height: SharedValue<number>;
  /** The scroll offset of the body inside, 0 at the top. */
  scrollTop: SharedValue<number>;
  /** Set once a release slid the sheet out: the overlay then closes. */
  dismissed: SharedValue<boolean>;
  /** While the sheet follows a finger: the body inside stops scrolling, so the native scroll does not take the touch. */
  dragging: boolean;
  setDragging: (dragging: boolean) => void;
};

const SheetDragContext = createContext<SheetDragState | null>(null);

/**
 * Makes the drag state for one open overlay and closes it once a drag
 * dismissed the sheet. Call it inside the `Modal`, so each opening starts at rest.
 */
export function useSheetDragState(close: () => void): SheetDragState {
  const offset = useSharedValue(0);
  const height = useSharedValue(0);
  const scrollTop = useSharedValue(0);
  const dismissed = useSharedValue(false);
  const [dragging, setDragging] = useState(false);
  useAnimatedReaction(
    () => dismissed.value,
    (done, previous) => {
      if (done && !previous) runOnJS(close)();
    },
    [close],
  );
  return { offset, height, scrollTop, dismissed, dragging, setDragging };
}

export const SheetDragProvider = SheetDragContext.Provider;

/** The backdrop's opacity: 1 at rest, fading to 0 as the sheet is dragged out. */
export function useSheetBackdropStyle(drag: SheetDragState) {
  return useAnimatedStyle(() => ({
    opacity: drag.height.value > 0 ? interpolate(drag.offset.value, [0, drag.height.value], [1, 0], "clamp") : 1,
  }));
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
      drag.scrollTop.value = event.nativeEvent.contentOffset.y;
    },
  };
}

/**
 * The part of a bottom sheet that follows the finger. A drag down from
 * anywhere on it (rows included; a body only when scrolled to its top) moves
 * the sheet and fades the backdrop. On release, a quick flick or a drag past
 * half the sheet slides it out and closes the overlay; a slow, short drag
 * springs back. Pulled back up past where it started, it gives a little,
 * with resistance. With Reduce Motion on, the release settles at once.
 * `enabled={false}` (a sheet that may not be dismissed) leaves it still.
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
  // Created once: its handlers only touch shared values, so they never go stale.
  const [responder] = useState(() =>
    drag
      ? PanResponder.create({
          // Capture, so a downward drag wins over the rows and over a body
          // scrolled to its top. Only then: a body scrolled down keeps its
          // scroll both ways, and an upward drag always scrolls it.
          onMoveShouldSetPanResponderCapture: (_event, gesture) =>
            isSheetDragDown(gesture.dx, gesture.dy) && drag.scrollTop.value <= 0,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: () => {
            cancelAnimation(drag.offset);
            drag.setDragging(true);
          },
          onPanResponderMove: (_event, gesture) => {
            drag.offset.value = sheetDragOffset(gesture.dy);
          },
          onPanResponderRelease: (_event, gesture) => settle(drag, gesture.dy, gesture.vy),
          onPanResponderTerminate: (_event, gesture) => settle(drag, 0, gesture.vy),
        })
      : null,
  );
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag ? drag.offset.value : 0 }] }));
  return (
    <Animated.View
      {...(enabled && responder ? responder.panHandlers : null)}
      onLayout={(event) => {
        if (drag) drag.height.value = event.nativeEvent.layout.height;
      }}
      style={[style, dragStyle]}
    >
      {children}
    </Animated.View>
  );
}

/** Slides the sheet out (then the overlay closes) or springs it back to rest. */
function settle(drag: SheetDragState, dy: number, vy: number) {
  drag.setDragging(false);
  const height = drag.height.value;
  if (sheetDragDismisses({ dy, vy, height })) {
    drag.offset.value = withTiming(
      height,
      {
        duration: sheetDismissDuration({ dy, vy, height }),
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      },
      (finished) => {
        "worklet";
        if (finished) drag.dismissed.value = true;
      },
    );
    return;
  }
  drag.offset.value = withSpring(0, {
    velocity: vy * 1000,
    damping: 30,
    stiffness: 320,
    overshootClamping: true,
    reduceMotion: ReduceMotion.System,
  });
}

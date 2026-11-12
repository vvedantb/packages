import { createContext, useContext, useState, type ComponentType, type ReactNode } from "react";
import {
  PanResponder,
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
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
 * `dragging` is for the `PanResponder` drag only; the Gesture Handler drag
 * (`SheetGestureParts`) holds the body still on the UI thread instead.
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
  /** While the sheet follows a `PanResponder` finger: the body inside stops scrolling, so the native scroll does not take the touch. */
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

export type SheetDragViewProps = {
  enabled: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * The Gesture Handler build of the sheet parts, from
 * `@vvedantb/native-ui/gesture-handler`. Without it (the peer is optional)
 * the sheets drag with `PanResponder`. A context, so only that entry imports
 * `react-native-gesture-handler` and an app without it bundles as before.
 */
export type SheetGestureParts = {
  /** Wraps each overlay's `Modal` content: on Android a `Modal` is its own root, and gestures need a root view there. */
  ModalRoot: ComponentType<{ children: ReactNode }>;
  DragView: ComponentType<SheetDragViewProps & { drag: SheetDragState }>;
  ScrollView: ComponentType<ScrollViewProps & { drag: SheetDragState }>;
};

export const SheetGestureContext = createContext<SheetGestureParts | null>(null);

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
 * A scroll view that hands a downward drag to the sheet around it: the drag
 * moves the sheet only once the content is scrolled to its top, and the
 * content holds still while the sheet follows the finger. With
 * `react-native-gesture-handler` (`SheetGestureParts`) both run on the UI
 * thread; with `PanResponder`, `onScroll` reports the offset and
 * `scrollEnabled` is off during a drag, so the native scroll does not take
 * the touch over (Android and iOS would cancel the drag). Outside a sheet, a
 * plain `ScrollView`.
 */
export function SheetScrollView(props: ScrollViewProps) {
  const drag = useContext(SheetDragContext);
  const gestures = useContext(SheetGestureContext);
  if (!drag) return <ScrollView {...props} />;
  if (gestures) return <gestures.ScrollView {...props} drag={drag} />;
  const { onScroll, scrollEnabled = true } = props;
  return (
    <ScrollView
      {...props}
      scrollEnabled={scrollEnabled && !drag.dragging}
      onScroll={(event) => {
        drag.scrollTop.set(event.nativeEvent.contentOffset.y);
        onScroll?.(event);
      }}
    />
  );
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
 * still under the finger. The drag runs on Gesture Handler when the app
 * provides it (`SheetGestureParts`), else on `PanResponder`.
 */
export function SheetDragView({ enabled, style, children }: SheetDragViewProps) {
  const drag = useContext(SheetDragContext);
  const gestures = useContext(SheetGestureContext);
  if (!drag) return <View style={style}>{children}</View>;
  if (gestures) {
    return (
      <gestures.DragView drag={drag} enabled={enabled} style={style}>
        {children}
      </gestures.DragView>
    );
  }
  return (
    <PanResponderDragView drag={drag} enabled={enabled} style={style}>
      {children}
    </PanResponderDragView>
  );
}

/**
 * The view that moves: `translateY` from the sheet's offset, and the slide in
 * from below on its first layout. Both drags wrap it.
 */
export function SheetMotionView({
  drag,
  style,
  ...props
}: ViewProps & { drag: SheetDragState }) {
  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.offset.get() }] }));
  return (
    <Animated.View
      {...props}
      onLayout={(event: LayoutChangeEvent) => {
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
    />
  );
}

/** The drag on the JavaScript thread, for an app without `react-native-gesture-handler`. */
function PanResponderDragView({
  drag,
  enabled,
  style,
  children,
}: SheetDragViewProps & { drag: SheetDragState }) {
  // Created once: its handlers only touch shared values and `start`, so they never go stale.
  const [responder] = useState(() => {
    // Where the sheet was when the finger caught it.
    let start = 0;
    const release = (position: number, vy: number, mayDismiss: boolean) => {
      drag.setDragging(false);
      if (settleSheet(drag, position, vy, mayDismiss)) impactHaptic("light");
    };
    return PanResponder.create({
      // A touch on a sheet in motion catches it: it stops under the finger.
      onStartShouldSetPanResponderCapture: () => sheetCatches(drag),
      // Capture, so a downward drag wins over the rows and over a body
      // scrolled to its top. Only then: a body scrolled down keeps its
      // scroll both ways, and an upward drag always scrolls it.
      onMoveShouldSetPanResponderCapture: (_event, gesture) => sheetTakesDrag(drag, gesture.dx, gesture.dy),
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
      onPanResponderRelease: (_event, gesture) => release(start + gesture.dy, gesture.vy, true),
      onPanResponderTerminate: (_event, gesture) => release(start + gesture.dy, gesture.vy, false),
    });
  });
  return (
    <SheetMotionView drag={drag} {...(enabled ? responder.panHandlers : null)} style={style}>
      {children}
    </SheetMotionView>
  );
}

/** The parts of the motion state a worklet may capture (no React setter). */
export type SheetMotion = Pick<SheetDragState, "offset" | "height" | "scrollTop" | "dismissed" | "closing">;

/** A touch on a sheet in motion (sliding in, springing home, flung out) catches it; one sliding out after a close does not. */
export function sheetCatches(drag: SheetMotion): boolean {
  "worklet";
  return !drag.closing.get() && drag.offset.get() > 1;
}

/** A downward drag takes the sheet once the body inside is at its top. */
export function sheetTakesDrag(drag: SheetMotion, dx: number, dy: number): boolean {
  "worklet";
  return !drag.closing.get() && isSheetDragDown(dx, dy) && drag.scrollTop.get() <= 0;
}

/**
 * Release phase, at `position` below rest with velocity `vy` (pt/ms): the
 * sheet springs on at the finger's speed, out (then the overlay closes) or
 * home. `mayDismiss` is false when the system took the touch away. Returns
 * true when it springs home from below rest: the caller fires the light
 * haptic, in the same frame.
 */
export function settleSheet(drag: SheetMotion, position: number, vy: number, mayDismiss: boolean): boolean {
  "worklet";
  const height = drag.height.get();
  const velocity = vy * 1000;
  if (mayDismiss && sheetDragDismisses({ dy: position, vy, height })) {
    drag.offset.set(
      withSpring(height, { ...SHEET_SPRING, velocity }, (finished) => {
        "worklet";
        if (finished) drag.dismissed.set(true);
      }),
    );
    return false;
  }
  drag.offset.set(
    withSpring(0, {
      ...SHEET_SNAP_SPRING,
      velocity: sheetSnapVelocity(position, velocity),
      // Bounce, but never so far up that the bottom edge lifts off the screen.
      clamp: { min: -SHEET_OVERPULL },
    }),
  );
  return position > 1;
}

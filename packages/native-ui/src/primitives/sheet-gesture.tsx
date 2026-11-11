import { createContext, useContext, useState, type ReactNode } from "react";
import { StyleSheet, type ScrollViewProps } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  type NativeGesture,
} from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { impactHaptic } from "../haptics";
import { SwipeRowGestureContext } from "../SwipeableRow";
import { sheetDragAnchor, sheetDragOffset } from "../sheetDrag";
import {
  settleSheet,
  sheetCatches,
  sheetTakesDrag,
  SheetMotionView,
  type SheetDragState,
  type SheetDragViewProps,
  type SheetGestureParts,
  type SheetMotion,
  SheetGestureContext,
} from "./sheet-drag";
import { PagerGestureContext } from "../Pager";
import { ToastDragContext } from "../toastDrag";
import { GesturePager } from "./pager-gesture";
import { GestureSwipeableRow } from "./swipe-row-gesture";
import { GestureToastDrag } from "./toast-drag-gesture";

// The sheet drag on Gesture Handler: the touch, the track phase and the
// release all run as worklets on the UI thread, so a busy JavaScript thread
// (a reply streaming in behind the sheet) cannot make the sheet lag the
// finger. The rules are the same as the `PanResponder` drag's (`sheet-drag`).

/** What a body inside the sheet needs from the drag around it. */
type SheetScrollLink = {
  /** The body's native scroll, run together with the sheet's pan. */
  native: NativeGesture;
  /** While the sheet follows the finger: the scroll offset the body holds; else `null`. */
  heldTop: SharedValue<number | null>;
};

const SheetScrollLinkContext = createContext<SheetScrollLink | null>(null);

function motionOf(drag: SheetDragState): SheetMotion {
  return {
    offset: drag.offset,
    height: drag.height,
    scrollTop: drag.scrollTop,
    dismissed: drag.dismissed,
    closing: drag.closing,
  };
}

function GestureSheetDragView({ drag, enabled, style, children }: SheetDragViewProps & { drag: SheetDragState }) {
  // Shared values only: the worklets must not capture the React setter in `drag`.
  const motion = motionOf(drag);
  const [native] = useState(() => Gesture.Native());
  const heldTop = useSharedValue<number | null>(null);
  // Where the finger touched down, and the body's scroll then.
  const downX = useSharedValue(0);
  const downY = useSharedValue(0);
  const downTop = useSharedValue(0);
  // Where the sheet was when the finger caught it, and the finger position
  // its travel counts from (`sheetDragAnchor`). Window positions, as the
  // sheet moves under the finger.
  const start = useSharedValue(0);
  const anchorY = useSharedValue(0);
  // Built on each render (for `enabled`): the detector keeps the same handler,
  // and a drag in flight, and only takes the new config.
  const pan = Gesture.Pan()
    .enabled(enabled)
    // The same rules as the `PanResponder` capture: a touch on a sheet in
    // motion catches it; a drag down takes it once the body is at its top.
    .manualActivation(true)
    .simultaneousWithExternalGesture(native)
    .onTouchesDown((event, manager) => {
      const touch = event.allTouches[0];
      if (!touch) return;
      downX.set(touch.absoluteX);
      downY.set(touch.absoluteY);
      downTop.set(motion.scrollTop.get());
      if (sheetCatches(motion)) manager.activate();
    })
    .onTouchesMove((event, manager) => {
      const touch = event.allTouches[0];
      if (touch && sheetTakesDrag(motion, touch.absoluteX - downX.get(), touch.absoluteY - downY.get())) {
        manager.activate();
      }
    })
    .onStart(() => {
      cancelAnimation(motion.offset);
      start.set(motion.offset.get());
      anchorY.set(sheetDragAnchor(downY.get(), downTop.get(), motion.scrollTop.get()));
      heldTop.set(motion.scrollTop.get());
    })
    // Track phase: one shared value write per frame, on the UI thread.
    .onUpdate((event) => {
      motion.offset.set(sheetDragOffset(start.get() + event.absoluteY - anchorY.get()));
    })
    .onEnd((event, success) => {
      const position = start.get() + event.absoluteY - anchorY.get();
      // `velocityY` is pt/s; the rules take pt/ms, as `PanResponder`'s `vy`.
      if (settleSheet(motion, position, event.velocityY / 1000, success)) runOnJS(impactHaptic)("light");
    })
    .onFinalize(() => {
      heldTop.set(null);
    });
  return (
    <SheetScrollLinkContext.Provider value={{ native, heldTop }}>
      <GestureDetector gesture={pan}>
        <SheetMotionView drag={drag} style={style}>
          {children}
        </SheetMotionView>
      </GestureDetector>
    </SheetScrollLinkContext.Provider>
  );
}

function GestureSheetScrollView({ drag, ...props }: ScrollViewProps & { drag: SheetDragState }) {
  const link = useContext(SheetScrollLinkContext);
  const heldTop = link?.heldTop;
  const ref = useAnimatedRef<Animated.ScrollView>();
  // The offset on the UI thread, where the pan reads it: no `onScroll` to JavaScript.
  useScrollOffset(ref, drag.scrollTop);
  // While the sheet follows the finger, the content stays where it was, so
  // the scroll (which runs together with the pan) does not move it too.
  useAnimatedReaction(
    () => drag.scrollTop.get(),
    (top) => {
      const held = heldTop?.get();
      if (typeof held === "number" && top !== held) scrollTo(ref, 0, held, false);
    },
  );
  const scroll = <Animated.ScrollView ref={ref} {...props} />;
  return link ? <GestureDetector gesture={link.native}>{scroll}</GestureDetector> : scroll;
}

function GestureModalRoot({ children }: { children: ReactNode }) {
  return <GestureHandlerRootView style={styles.fill}>{children}</GestureHandlerRootView>;
}

const PARTS: SheetGestureParts = {
  ModalRoot: GestureModalRoot,
  DragView: GestureSheetDragView,
  ScrollView: GestureSheetScrollView,
};

/**
 * Runs the kit's sheet drags (`SheetContent`, the compact `DialogContent`)
 * on Gesture Handler instead of `PanResponder`, and turns on the swipes of
 * `SwipeableRow`, `Pager` and the `Toaster` toasts (up to dismiss). Put it
 * inside the app's `GestureHandlerRootView`; each overlay adds its own root
 * view inside its `Modal`.
 */
export function GestureHandlerProvider({ children }: { children: ReactNode }) {
  return (
    <SheetGestureContext.Provider value={PARTS}>
      <SwipeRowGestureContext.Provider value={GestureSwipeableRow}>
        <PagerGestureContext.Provider value={GesturePager}>
          <ToastDragContext.Provider value={GestureToastDrag}>{children}</ToastDragContext.Provider>
        </PagerGestureContext.Provider>
      </SwipeRowGestureContext.Provider>
    </SheetGestureContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

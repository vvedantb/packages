import { View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { impactHaptic } from "../haptics";
import {
  TOAST_DRAG_ACTIVE_OFFSET_Y,
  toastDragDismisses,
  toastDragOffset,
  type ToastDragProps,
} from "../toastDrag";
import { useWebClickGuard } from "./web-click-guard";

// The toast drag on Gesture Handler: the track phase and the release run as
// worklets on the UI thread. The rules are plain worklets in `toastDrag`.

/** Back home after a short drag: a little bounce, as the finger applied force. */
const HOME_SPRING = { duration: 250, dampingRatio: 0.8, reduceMotion: ReduceMotion.System } as const;
/** Away up the screen: no overshoot back into view. */
const AWAY_SPRING = { duration: 250, dampingRatio: 1, overshootClamping: true, reduceMotion: ReduceMotion.System } as const;

export function GestureToastDrag({ onDismiss, onHoldChange, children }: ToastDragProps) {
  const y = useSharedValue(0);
  const height = useSharedValue(0);
  // Where the toast was when the finger caught it, and the finger's travel then.
  const start = useSharedValue(0);
  const startY = useSharedValue(0);
  const webClicks = useWebClickGuard();
  const dismissed = () => {
    impactHaptic("light");
    onDismiss();
  };

  // Built on each render: the detector keeps the same handler, and a drag in flight.
  const pan = Gesture.Pan()
    .activeOffsetY([-TOAST_DRAG_ACTIVE_OFFSET_Y, TOAST_DRAG_ACTIVE_OFFSET_Y])
    // The timer holds from the touch, a tap included (a tap closes the toast anyway).
    .onBegin(() => {
      runOnJS(onHoldChange)(true);
    })
    .onStart((event) => {
      cancelAnimation(y);
      start.set(y.get());
      // Count from here, so the toast does not jump by the slop the drag needed to start.
      startY.set(event.translationY);
      runOnJS(webClicks.swallowNext)();
    })
    // Track phase: one shared value write per frame, on the UI thread.
    .onUpdate((event) => {
      y.set(toastDragOffset(start.get() + event.translationY - startY.get()));
    })
    .onEnd((event) => {
      const position = y.get();
      if (toastDragDismisses(position, event.velocityY, height.get())) {
        // Up past its own height, fading on the way (`toastStyle`), at the finger's speed.
        y.set(
          withSpring(-height.get() * 1.5, { ...AWAY_SPRING, velocity: event.velocityY }, (finished) => {
            "worklet";
            if (finished) runOnJS(dismissed)();
          }),
        );
        return;
      }
      y.set(withSpring(0, { ...HOME_SPRING, velocity: event.velocityY }));
    })
    .onFinalize(() => {
      runOnJS(onHoldChange)(false);
    });

  // Linked to the same value: the toast fades as it rises, gone one height up.
  const toastStyle = useAnimatedStyle(() => ({
    opacity: height.get() > 0 ? interpolate(y.get(), [-height.get(), 0], [0, 1], "clamp") : 1,
    transform: [{ translateY: y.get() }],
  }));
  return (
    // Its own root: on iOS the toasts draw in a separate window (`FullWindowOverlay`).
    <GestureHandlerRootView>
      <GestureDetector gesture={pan}>
        <Animated.View style={toastStyle} onLayout={(event) => height.set(event.nativeEvent.layout.height)}>
          <View ref={webClicks.ref}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

import { useContext, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { impactHaptic } from "../haptics";
import { InsidePagerContext } from "../Pager";
import { EASE_OUT } from "../motion";
import { palette } from "../palette";
import type { SwipeableRowProps } from "../SwipeableRow";
import {
  closeSwipeRows,
  isSwipeRowOpen,
  markSwipeRowClosed,
  markSwipeRowOpen,
  SWIPE_ACTION_WIDTH,
  SWIPE_FAIL_OFFSET_Y,
  swipeRowActivation,
  swipeRowArmed,
  swipeRowOffset,
  swipeRowSettle,
  type SwipeAction,
  type SwipeRowHandle,
  type SwipeSide,
} from "../swipeRow";
import { tokens } from "../tokens";
import { useScheme } from "../useScheme";
import { useWebClickGuard } from "./web-click-guard";

// The swipeable row on Gesture Handler: the track phase and the release run
// as worklets on the UI thread, so the row never lags the finger. The rules
// are plain worklets in `swipeRow`.

/** The release: springs on at the finger's speed, no bounce (a row overshooting rest would flash the other side). */
const ROW_SPRING = { duration: 250, dampingRatio: 1, reduceMotion: ReduceMotion.System } as const;

/** The armed full swipe: the first action's icon grows a little, with the haptic, so the commit shows without it. */
const ARMED_SCALE = 1.15;
const ARMED_TIMING = { duration: 150, easing: EASE_OUT, reduceMotion: ReduceMotion.System } as const;

const ICON_SIZE = 20;

/** Each tone's fill and the icon colour on it. */
const TONES = {
  default: { fill: palette.primary, icon: palette.primaryForeground },
  warning: { fill: palette.warning, icon: palette.warningForeground },
  danger: { fill: palette.danger, icon: palette.dangerForeground },
} as const;

export function GestureSwipeableRow({
  leadingActions = [],
  trailingActions = [],
  enabled = true,
  backgroundColor,
  children,
}: SwipeableRowProps) {
  const scheme = useScheme();
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  // Where the row was when the finger caught it.
  const start = useSharedValue(0);
  const dragging = useSharedValue(false);
  const armed = useSharedValue<SwipeSide | null>(null);
  const armedScale = useSharedValue(1);
  // Plain values for the worklets: they must not capture the actions' functions.
  const leading = leadingActions.length * SWIPE_ACTION_WIDTH;
  const trailing = trailingActions.length * SWIPE_ACTION_WIDTH;
  const leadingExits = leadingActions[0]?.exits === true;
  const trailingExits = trailingActions[0]?.exits === true;
  const [handle] = useState<SwipeRowHandle>(() => ({ close: () => x.set(withSpring(0, ROW_SPRING)) }));

  // Whether this touch began while a row was open, so its release only closes that row. Nothing renders from it.
  const closesOnRelease = useRef(false);
  // The action strips mount on the row's first touch, not with the row: a
  // list of a hundred rows then mounts no hidden buttons and icons up front.
  // A touch lands a few frames before a swipe can move the row, so the strip
  // is there before any of it shows.
  const [revealed, setRevealed] = useState(false);
  const reveal = () => setRevealed(true);
  const webClicks = useWebClickGuard(isSwipeRowOpen);
  const insidePager = useContext(InsidePagerContext);
  const opened = () => {
    closesOnRelease.current = false;
    webClicks.swallowNext();
    markSwipeRowOpen(handle);
  };
  const closed = () => markSwipeRowClosed(handle);
  const firstOf = (side: SwipeSide) => (side === "leading" ? leadingActions[0] : trailingActions[0]);
  /** Runs an action once the row slid out: if it fails, the row comes back. */
  const runExited = (action: SwipeAction | undefined) => {
    const result = action?.onPress();
    if (result instanceof Promise) result.catch(() => x.set(withSpring(0, ROW_SPRING)));
  };
  // The worklets take sides, never the actions (their functions stay on the JavaScript thread).
  const runFirstExited = (side: SwipeSide) => runExited(firstOf(side));
  const runFirstInPlace = (side: SwipeSide) => void firstOf(side)?.onPress();
  /** A tapped button: the row closes, or slides out for an action that exits, then the action runs. */
  const press = (action: SwipeAction, side: SwipeSide) => {
    closed();
    if (!action.exits) {
      x.set(withSpring(0, ROW_SPRING));
      void action.onPress();
      return;
    }
    const run = () => runExited(action);
    x.set(
      withSpring(side === "leading" ? width.get() : -width.get(), { ...ROW_SPRING, overshootClamping: true }, (finished) => {
        "worklet";
        if (finished) runOnJS(run)();
      }),
    );
  };

  // The full swipe arms and disarms as the row crosses the point: the icon
  // grows, and a light haptic fires as it arms under the finger.
  useAnimatedReaction(
    () => swipeRowArmed(x.get(), { leading, trailing, width: width.get() }),
    (side, previous) => {
      if (side === previous) return;
      armed.set(side);
      armedScale.set(withTiming(side ? ARMED_SCALE : 1, ARMED_TIMING));
      if (side && dragging.get()) runOnJS(impactHaptic)("light");
    },
    [leading, trailing],
  );

  // Built on each render (for `enabled` and the actions): the detector keeps
  // the same handler, and a drag in flight, and only takes the new config.
  const activation = swipeRowActivation({ leading, trailing }, insidePager);
  const pan = Gesture.Pan()
    .enabled(enabled && leading + trailing > 0)
    // Sideways intent first; a drag that goes vertical first is the list's scroll.
    .activeOffsetX(activation.activeOffsetX)
    .failOffsetY([-SWIPE_FAIL_OFFSET_Y, SWIPE_FAIL_OFFSET_Y]);
  if (activation.failOffsetX !== undefined) pan.failOffsetX(activation.failOffsetX);
  pan
    .onBegin(() => {
      runOnJS(reveal)();
    })
    .onStart(() => {
      cancelAnimation(x);
      start.set(x.get());
      dragging.set(true);
      runOnJS(opened)();
    })
    // Track phase: one shared value write per frame, on the UI thread.
    .onUpdate((event) => {
      x.set(swipeRowOffset(start.get() + event.translationX, { leading, trailing, width: width.get() }));
    })
    .onEnd((event, success) => {
      dragging.set(false);
      const rowWidth = width.get();
      const settle = swipeRowSettle(x.get(), event.velocityX, { leading, trailing, width: rowWidth });
      const velocity = event.velocityX;
      if (success && settle.kind === "commit") {
        // Armed by the fling rather than the position: the haptic fires now, with the commit.
        if (armed.get() === null) runOnJS(impactHaptic)("light");
        runOnJS(closed)();
        const side = settle.side;
        if (side === "leading" ? leadingExits : trailingExits) {
          x.set(
            withSpring(side === "leading" ? rowWidth : -rowWidth, { ...ROW_SPRING, velocity, overshootClamping: true }, (finished) => {
              "worklet";
              if (finished) runOnJS(runFirstExited)(side);
            }),
          );
        } else {
          x.set(withSpring(0, { ...ROW_SPRING, velocity }));
          runOnJS(runFirstInPlace)(side);
        }
        return;
      }
      if (settle.kind === "open") {
        x.set(withSpring(settle.side === "leading" ? leading : -trailing, { ...ROW_SPRING, velocity }));
        return;
      }
      x.set(withSpring(0, { ...ROW_SPRING, velocity }));
      runOnJS(closed)();
    })
    .onFinalize(() => {
      dragging.set(false);
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <View onLayout={(event) => width.set(event.nativeEvent.layout.width)} style={styles.clip}>
      {revealed && leadingActions.length > 0 ? (
        <ActionStrip side="leading" actions={leadingActions} x={x} armedScale={armedScale} onPress={press} />
      ) : null}
      {revealed && trailingActions.length > 0 ? (
        <ActionStrip side="trailing" actions={trailingActions} x={x} armedScale={armedScale} onPress={press} />
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: backgroundColor ?? tokens.color.background[scheme] }, rowStyle]}>
          <View
            ref={webClicks.ref}
            // While a row is open, a tap on any row only closes it: the row
            // takes the touch from the pressables inside.
            onStartShouldSetResponderCapture={() => {
              closesOnRelease.current = isSwipeRowOpen();
              return closesOnRelease.current;
            }}
            onResponderRelease={() => {
              if (closesOnRelease.current) closeSwipeRows();
            }}
          >
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**
 * One side's actions behind the row, the first at the screen edge, on the
 * first action's fill (which stretches with a full swipe). Shown only while
 * the row moves toward that side. Hidden from screen readers: they reach the
 * actions on the row itself (`swipeActionsAccessibility`).
 */
function ActionStrip({
  side,
  actions,
  x,
  armedScale,
  onPress,
}: {
  side: SwipeSide;
  actions: readonly SwipeAction[];
  x: SharedValue<number>;
  armedScale: SharedValue<number>;
  onPress: (action: SwipeAction, side: SwipeSide) => void;
}) {
  const scheme = useScheme();
  const reveal = actions.length * SWIPE_ACTION_WIDTH;
  const direction = side === "leading" ? 1 : -1;
  const stripStyle = useAnimatedStyle(() => ({ opacity: x.get() * direction > 0 ? 1 : 0 }));
  // Past its slot the first icon keeps beside the row's edge, so it stays in view.
  const firstIconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: direction * Math.max(0, Math.abs(x.get()) - reveal) },
      { scale: armedScale.get() },
    ],
  }));
  return (
    <Animated.View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        { flexDirection: side === "leading" ? "row" : "row-reverse" },
        { backgroundColor: TONES[actions[0]?.tone ?? "default"].fill[scheme] },
        stripStyle,
      ]}
    >
      {actions.map((action, index) => {
        const tone = TONES[action.tone ?? "default"];
        const Icon = action.icon;
        return (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => onPress(action, side)}
            style={[styles.action, { backgroundColor: tone.fill[scheme] }]}
          >
            {index === 0 ? (
              <Animated.View style={firstIconStyle}>
                <Icon size={ICON_SIZE} color={tone.icon[scheme]} />
              </Animated.View>
            ) : (
              <Icon size={ICON_SIZE} color={tone.icon[scheme]} />
            )}
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  action: {
    width: SWIPE_ACTION_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
});

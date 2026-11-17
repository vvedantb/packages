import { cssInterop } from "nativewind";
import { useCallback, useEffect } from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { EASE_OUT } from "./motion";
import { useReduceMotion } from "./useReduceMotion";

/**
 * A `Pressable` whose `style` can take the style from `usePressScale`.
 * NativeWind maps `className` only for components it knows, so it is told
 * about this one, or the classes would be dropped.
 */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: "style" });

export type PressScaleOptions = {
  /** Scale while pressed. Default 0.97. */
  scale?: number;
  /** Opacity while pressed, a light dim. Default 0.7, the dim these controls had before the scale. */
  dim?: number;
  /** Dim used instead under Reduce Motion. Default `dim`. */
  reducedDim?: number;
  /** Opacity at rest, such as 0.5 when disabled. The press dims from here. Default 1. */
  restOpacity?: number;
  /** Press-in duration in ms. Default 120. */
  pressInMs?: number;
  /** Release duration in ms. Default 160. */
  pressOutMs?: number;
  /** A disabled control lets go at once, so it cannot stay pressed. */
  disabled?: boolean;
};

/**
 * Press feedback for a small control: a scale and a light dim that ease in on
 * press-in and ease back on release. Pass `onPressIn` and `onPressOut` to the
 * `Pressable` and `style` to the animated view that should scale (an
 * `AnimatedPressable`, or an `Animated.View` inside the `Pressable`). One
 * shared value on the UI thread drives transform and opacity only. A new press
 * or release starts from the current value, so a fast tap never sticks. With
 * Reduce Motion nothing animates and nothing scales: the dim switches on and
 * off at once.
 */
export function usePressScale({
  scale = 0.97,
  dim = 0.7,
  reducedDim = dim,
  restOpacity = 1,
  pressInMs = 120,
  pressOutMs = 160,
  disabled = false,
}: PressScaleOptions = {}) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const target = reduceMotion ? reducedDim : dim;
  const onPressIn = useCallback(() => {
    progress.set(reduceMotion ? 1 : withTiming(1, { duration: pressInMs, easing: EASE_OUT }));
  }, [progress, reduceMotion, pressInMs]);
  const onPressOut = useCallback(() => {
    progress.set(reduceMotion ? 0 : withTiming(0, { duration: pressOutMs, easing: EASE_OUT }));
  }, [progress, reduceMotion, pressOutMs]);
  useEffect(() => {
    if (disabled) progress.set(0);
  }, [disabled, progress]);
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: restOpacity * (1 - p * (1 - target)),
      transform: [{ scale: reduceMotion ? 1 : 1 - p * (1 - scale) }],
    };
  });
  return { style, onPressIn, onPressOut };
}

import { useEffect } from "react";
import { View, type ViewProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cn } from "./cn";
import { palette } from "./palette";
import { useAccentColor } from "./theme";
import { useReduceMotion } from "./useReduceMotion";
import { useScheme } from "./useScheme";

export type ProgressProps = ViewProps & {
  /** Current value, 0 to `max`. Default 0. */
  value?: number | null;
  /** Default 100. */
  max?: number;
  /** Indicator fill. Default the theme accent. */
  indicatorColor?: string;
  className?: string;
};

/** Determinate bar: 10 high, rounded, `palette.default` track. The fill eases over 300 ms (instant with Reduce Motion). */
export function Progress({
  value,
  max = 100,
  indicatorColor,
  className,
  style,
  ...props
}: ProgressProps) {
  const scheme = useScheme();
  const accent = useAccentColor();
  const reduceMotion = useReduceMotion();
  const percent = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100));
  const width = useSharedValue(percent);

  useEffect(() => {
    width.value = reduceMotion
      ? percent
      : withTiming(percent, {
          duration: 300,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        });
  }, [percent, reduceMotion, width]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as const,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: value ?? 0 }}
      className={cn("h-2.5 w-full overflow-hidden rounded-full", className)}
      style={[{ backgroundColor: palette.default[scheme] }, style]}
      {...props}
    >
      <Animated.View
        className="h-full rounded-full"
        style={[{ backgroundColor: indicatorColor ?? accent }, indicatorStyle]}
      />
    </View>
  );
}

import { View, type ViewProps } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { cn } from "./cn";
import { cardStyle } from "./controlStyles";
import { useReduceMotion } from "./useReduceMotion";
import { useScheme } from "./useScheme";

/** Pulsing placeholder block. Holds still with Reduce Motion. Size it with `className` (for example `h-4 w-32`). */
export function Skeleton({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.7;
      return;
    }
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...props}
      style={[animatedStyle, style]}
      className={cn("bg-neutral-200 dark:bg-neutral-700 rounded-lg", className)}
    />
  );
}

/** A `Card`-shaped placeholder: the flat card fill and radius. */
export function CardSkeleton() {
  const scheme = useScheme();
  return (
    <View className="gap-3 p-5" style={cardStyle(scheme)}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-16 w-full" />
    </View>
  );
}

import { Fragment, type ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
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
import { ListDivider } from "./DividedList";
import { useReduceMotion } from "./useReduceMotion";
import { useScheme } from "./useScheme";

/**
 * Pulsing placeholder block. Holds still with Reduce Motion. Size it with
 * `className` (for example `h-4 w-32`). The classes sit on a plain `View`:
 * NativeWind does not style a Reanimated `Animated.View`, so only the pulse
 * (opacity) is animated, on a fill inside.
 */
export function Skeleton({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    if (reduceMotion) {
      opacity.set(0.7);
      return;
    }
    opacity.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...props}
      style={style}
      className={cn("overflow-hidden rounded-lg", className)}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <View className="flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </Animated.View>
    </View>
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

/** Title widths, row by row, so a list of placeholders does not read as one block. */
const TITLE_WIDTHS: readonly `${number}%`[] = ["72%", "54%", "84%", "62%", "46%", "78%"];

export type SkeletonRowProps = {
  /** The row's place in its list: the title width varies with it. */
  index?: number;
  /** A round mark before the text, this wide (a status dot, an avatar). */
  leading?: number;
  /** A title only, or a title over a shorter detail line. */
  lines?: 1 | 2;
  /** A short block at the end, where the real row shows its age. Default on. */
  trailing?: boolean;
  /** The real row's height, so nothing moves when it loads. Default 56. */
  minHeight?: number;
  className?: string;
};

/**
 * A list row's placeholder, shaped like the row it stands for: a round mark,
 * a title (and a detail line), and a short trailing block, on the `px-4` row
 * padding. Pulses as `Skeleton`; holds still with Reduce Motion.
 */
export function SkeletonRow({ index = 0, leading, lines = 1, trailing = true, minHeight = 56, className }: SkeletonRowProps) {
  return (
    <View className={cn("flex-row items-center gap-3 px-4", className)} style={{ minHeight }}>
      {leading ? <Skeleton style={{ width: leading, height: leading, borderRadius: leading / 2 }} /> : null}
      <View className="min-w-0 flex-1 gap-2">
        <Skeleton className="h-3.5" style={{ width: TITLE_WIDTHS[index % TITLE_WIDTHS.length] }} />
        {lines === 2 ? <Skeleton className="h-3 w-1/3" /> : null}
      </View>
      {trailing ? <Skeleton className="h-3 w-8" /> : null}
    </View>
  );
}

export type SkeletonListProps = {
  /** What is loading, for assistive tech ("Loading sessions"). */
  label: string;
  /** Rows to draw. Default 6. */
  count?: number;
  /** A `ListDivider` between rows, as a `DividedList`. Default on. */
  divided?: boolean;
  /** One placeholder row, such as a `SkeletonRow` with this `index`. */
  renderRow: (index: number) => ReactNode;
  className?: string;
};

/**
 * Placeholder rows where a list is loading, in place of a centred spinner:
 * the screen keeps the shape it will have. Screen readers hear one busy
 * element named `label`.
 */
export function SkeletonList({ label, count = 6, divided = true, renderRow, className }: SkeletonListProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      className={cn("min-h-0 w-full flex-1 overflow-hidden", className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <Fragment key={index}>
          {divided && index > 0 ? <ListDivider /> : null}
          {renderRow(index)}
        </Fragment>
      ))}
    </View>
  );
}

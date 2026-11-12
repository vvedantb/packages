import { cssInterop } from "nativewind";
import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import Animated, { interpolate, interpolateColor, useAnimatedStyle, type SharedValue } from "react-native-reanimated";

// The tab labels are `Animated.Text`s (their colour follows `progress`).
// NativeWind maps `className` only for components it knows, so it is told
// about this one, or the labels lose their font and size classes.
cssInterop(Animated.Text, { className: "style" });

/** A tab's box in its row, from its layout. */
export type TabBox = { x: number; y: number; width: number; height: number };

/**
 * The selected fill of a tab row linked to a `Pager`'s `progress` (`PillTabs`,
 * `TabsList`): one indicator that slides with the pages between the measured
 * tabs. The tabs sit on one line, so it moves on x and width only; its top
 * and height are the first tab's. Until every tab has reported its layout,
 * `measured` is false and each tab paints its own fill, so the first frame
 * already shows the selection. `boxes` is every tab's box once all are
 * measured (with or without `progress`), else empty.
 */
export function useTabIndicator(progress: SharedValue<number> | undefined, count: number) {
  // Each tab's box, measured on layout (not per frame).
  const [layouts, setLayouts] = useState<ReadonlyArray<TabBox | undefined>>([]);
  const found = layouts.slice(0, count).filter((box) => box !== undefined);
  const boxes = found.length === count ? found : [];
  const measured = progress !== undefined && boxes.length > 0;
  const style = useAnimatedStyle(() => {
    const first = boxes[0];
    if (!progress || !measured || !first) return { opacity: 0 };
    const pages = boxes.map((_, index) => index);
    const at = (pick: (box: TabBox) => number) =>
      boxes.length === 1 ? pick(first) : interpolate(progress.get(), pages, boxes.map(pick), "clamp");
    return {
      opacity: 1,
      top: first.y,
      height: first.height,
      width: at((box) => box.width),
      transform: [{ translateX: at((box) => box.x) }],
    };
  });
  /** The `onLayout` of tab `index`. */
  const onLayout = (index: number) => (event: LayoutChangeEvent) => {
    const box = event.nativeEvent.layout;
    setLayouts((current) => {
      const next = [...current];
      next[index] = box;
      return next;
    });
  };
  return { measured, style, boxes, onLayout };
}

/**
 * A tab label's colour. With `progress` it blends from `muted` to `selected`
 * as the pages reach tab `index`, so the label turns with the sliding fill
 * under a swipe, not when the swipe settles. Without it, `fallback`.
 */
export function useTabLabelStyle(
  progress: SharedValue<number> | undefined,
  index: number,
  colors: { selected: string; muted: string },
  fallback: string,
) {
  const { selected, muted } = colors;
  return useAnimatedStyle(() => {
    if (!progress) return { color: fallback };
    return { color: interpolateColor(progress.get(), [index - 1, index, index + 1], [muted, selected, muted]) };
  });
}

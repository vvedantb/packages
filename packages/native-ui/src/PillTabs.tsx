import { useState } from "react";
import { View, Text, Pressable } from "react-native";

/** A pill's box in the row, from its layout. */
type Box = { x: number; y: number; width: number; height: number };
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { cn } from "./cn";
import { selectionHaptic } from "./haptics";
import {
  MIN_TOUCH_TARGET,
  tabColors,
  tabTriggerSize,
  touchSlop,
  typeStyle,
} from "./controlStyles";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

/**
 * A row of pill tabs from an options array: the `pills` `TabsList` look and
 * size (30 high, `text-sm` medium), as wide as its pills, at the start.
 *
 * With `progress` (a `Pager`'s), the selected fill is one indicator that
 * moves with that value, so it follows the pages under a swipe; a press
 * still changes `value` at once.
 */
export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  progress,
}: {
  options: ReadonlyArray<{ id: T; label: string; testID?: string }>;
  value: T;
  onChange: (id: T) => void;
  /** Where the linked `Pager` is, in pages: option 0 is page 0. */
  progress?: SharedValue<number>;
}) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const trigger = tabTriggerSize("pills", "default", largerText);
  // Each pill's box, measured on layout (not per frame), for the indicator.
  const [layouts, setLayouts] = useState<ReadonlyArray<Box | undefined>>([]);
  const boxes = options.map((_, index) => layouts[index]).filter((box) => box !== undefined);
  const indicatorStyle = useAnimatedStyle(() => {
    const first = boxes[0];
    if (!progress || !first || boxes.length !== options.length) return { opacity: 0 };
    const at = (pick: (box: Box) => number) =>
      boxes.length === 1
        ? pick(first)
        : interpolate(progress.get(), boxes.map((_, index) => index), boxes.map(pick), "clamp");
    return {
      opacity: 1,
      width: at((box) => box.width),
      height: at((box) => box.height),
      transform: [{ translateX: at((box) => box.x) }, { translateY: at((box) => box.y) }],
    };
  });

  return (
    <View
      accessibilityRole="tablist"
      className="max-w-full flex-row flex-wrap gap-1.5 self-start"
    >
      {progress ? (
        // The selected fill, absolutely placed with no children: animating its
        // width keeps the pill's radius, and lays out nothing else.
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", left: 0, top: 0, borderRadius: 9999 },
            { backgroundColor: tabColors("pills", true, scheme).backgroundColor },
            indicatorStyle,
          ]}
        />
      ) : null}
      {options.map((tab, index) => {
        const isSelected = value === tab.id;
        const colors = tabColors("pills", isSelected, scheme);

        return (
          <Pressable
            key={tab.id}
            testID={tab.testID}
            accessibilityLabel={tab.label}
            onLayout={
              progress
                ? (event) => {
                    const box = event.nativeEvent.layout;
                    setLayouts((current) => {
                      const next = [...current];
                      next[index] = box;
                      return next;
                    });
                  }
                : undefined
            }
            onPress={() => {
              // A segmented choice ticking to a new value, as `TabsTrigger`.
              if (!isSelected) selectionHaptic();
              onChange(tab.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            hitSlop={touchSlop(MIN_TOUCH_TARGET, trigger.minHeight)}
            className={cn(
              "shrink justify-center rounded-full border border-white/40 active:opacity-70 dark:border-white/10",
              trigger.className,
            )}
            style={{
              // When linked, the indicator draws the selected fill.
              backgroundColor: progress ? "transparent" : colors.backgroundColor,
              minHeight: trigger.minHeight,
            }}
          >
            <Text
              numberOfLines={1}
              className={cn("text-center font-instrument-sans-medium", trigger.textClassName)}
              style={[{ color: colors.color }, typeStyle("medium")]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

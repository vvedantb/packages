import { Pressable } from "react-native";
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { cn } from "./cn";
import { selectionHaptic } from "./haptics";
import {
  MIN_TOUCH_TARGET,
  tabColors,
  tabTriggerSize,
  touchSlop,
  typeStyle,
} from "./controlStyles";
import { centredTabScroll } from "./pagerSwipe";
import { useTabIndicator, useTabLabelStyle } from "./tabIndicator";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

/**
 * A row of pill tabs from an options array, the web pills look tuned for a
 * phone: 36 high pills (`px-3.5`, a `text-sm` medium label) with 4 slop above
 * and below, so each is a 44 target. The row is one line that scrolls
 * sideways when the pills do not fit (larger system text), and never wraps.
 * The active pill scrolls into view, centred, each time it changes.
 *
 * With `progress` (a `Pager`'s), the selected fill is one indicator that
 * slides with that value, and each label blends to the selected colour with
 * it, so fill, label and the centred scroll follow the pages under a swipe;
 * a press still changes `value` at once.
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
  const slop = touchSlop(MIN_TOUCH_TARGET, trigger.minHeight);
  const indicator = useTabIndicator(progress, options.length);
  const { boxes } = indicator;
  const selectedIndex = Math.max(0, options.findIndex((tab) => tab.id === value));
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const viewport = useSharedValue(0);
  // Keeps the active pill centred: with `progress` it follows the pages frame
  // by frame (a swipe, or a press's slide), else it moves with `value`.
  useAnimatedReaction(
    () => (progress ? progress.get() : selectedIndex),
    (at) => {
      if (boxes.length === 0 || viewport.get() <= 0) return;
      scrollTo(scroll, centredTabScroll(boxes, at, viewport.get()), 0, false);
    },
  );

  return (
    <Animated.ScrollView
      ref={scroll}
      horizontal
      accessibilityRole="tablist"
      showsHorizontalScrollIndicator={false}
      // Android fades the pills out at an edge that scrolls.
      fadingEdgeLength={16}
      onLayout={(event) => viewport.set(event.nativeEvent.layout.width)}
      // The slop above and below lies inside the row, where touches land; the
      // negative margins keep the row's place in the layout.
      style={{ flexGrow: 0, marginVertical: -slop.top }}
      // The web pills' `gap-1.5`, as a style: the animated scroll view drops `contentContainerClassName`.
      contentContainerStyle={{ flexDirection: "row", gap: 6, paddingVertical: slop.top }}
    >
      {indicator.measured ? (
        // The selected fill, absolutely placed with no children: animating its
        // width keeps the pill's radius, and lays out nothing else.
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", left: 0, borderRadius: 9999 },
            { backgroundColor: tabColors("pills", true, scheme).backgroundColor },
            indicator.style,
          ]}
        />
      ) : null}
      {options.map((tab, index) => (
        <PillTab
          key={tab.id}
          label={tab.label}
          testID={tab.testID}
          index={index}
          selected={value === tab.id}
          // Until the indicator is measured, the selected pill paints its own fill.
          filled={!indicator.measured}
          progress={progress}
          trigger={trigger}
          hitSlop={slop}
          onLayout={indicator.onLayout(index)}
          onPress={() => onChange(tab.id)}
        />
      ))}
    </Animated.ScrollView>
  );
}

function PillTab({
  label,
  testID,
  index,
  selected,
  filled,
  progress,
  trigger,
  hitSlop,
  onLayout,
  onPress,
}: {
  label: string;
  testID?: string;
  index: number;
  selected: boolean;
  filled: boolean;
  progress: SharedValue<number> | undefined;
  trigger: ReturnType<typeof tabTriggerSize>;
  hitSlop: ReturnType<typeof touchSlop>;
  onLayout: ReturnType<ReturnType<typeof useTabIndicator>["onLayout"]>;
  onPress: () => void;
}) {
  const scheme = useScheme();
  const colors = tabColors("pills", selected, scheme);
  const labelStyle = useTabLabelStyle(
    progress,
    index,
    { selected: tabColors("pills", true, scheme).color, muted: tabColors("pills", false, scheme).color },
    colors.color,
  );
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      onLayout={onLayout}
      onPress={() => {
        // A segmented choice ticking to a new value, as `TabsTrigger`.
        if (!selected) selectionHaptic();
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      hitSlop={hitSlop}
      className={cn(
        "justify-center rounded-full border border-white/40 active:opacity-70 dark:border-white/10",
        trigger.className,
      )}
      style={{
        backgroundColor: filled ? colors.backgroundColor : "transparent",
        minHeight: trigger.minHeight,
      }}
    >
      <Animated.Text
        numberOfLines={1}
        className={cn("text-center font-instrument-sans-medium", trigger.textClassName)}
        style={[typeStyle("medium"), labelStyle]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

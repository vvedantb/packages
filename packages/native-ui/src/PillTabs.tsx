import { View, Text, Pressable } from "react-native";
import { cn } from "./cn";
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
 */
export function PillTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ id: T; label: string; testID?: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const trigger = tabTriggerSize("pills", "default", largerText);
  return (
    <View
      accessibilityRole="tablist"
      className="max-w-full flex-row flex-wrap gap-1.5 self-start"
    >
      {options.map((tab) => {
        const isSelected = value === tab.id;
        const colors = tabColors("pills", isSelected, scheme);

        return (
          <Pressable
            key={tab.id}
            testID={tab.testID}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            hitSlop={touchSlop(MIN_TOUCH_TARGET, trigger.minHeight)}
            className={cn(
              "shrink justify-center rounded-full border border-white/40 active:opacity-70 dark:border-white/10",
              trigger.className,
            )}
            style={{ backgroundColor: colors.backgroundColor, minHeight: trigger.minHeight }}
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

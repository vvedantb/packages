import { View, Text, Pressable } from "react-native";
import { textStyle } from "./controlStyles";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

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
  return (
    <View className="flex-row gap-2">
      {options.map((tab) => {
        const isSelected = value === tab.id;

        return (
          <Pressable
            key={tab.id}
            testID={tab.testID}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            className={`flex-1 justify-center rounded-full border border-white/40 px-3 dark:border-white/10 ${
              largerText ? "min-h-16 py-3" : "min-h-14 py-3"
            } ${
              isSelected ? "bg-pink-100 dark:bg-pink-900/40" : "bg-secondary"
            }`}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text
              numberOfLines={1}
              className={`text-center font-instrument-sans-semibold ${
                largerText ? "text-xl" : "text-lg"
              } ${
                isSelected ? "text-pink-700 dark:text-pink-300" : ""
              }`}
              style={isSelected ? undefined : textStyle("muted", scheme)}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

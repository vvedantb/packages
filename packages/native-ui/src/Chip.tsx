import { Pressable, Text } from "react-native";
import { textStyle, typeStyle } from "./controlStyles";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export function Chip({
  label,
  selected,
  onPress,
  testID,
  round = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
  round?: boolean;
}) {
  const largerText = useLargerText();
  const scheme = useScheme();
  const size = round
    ? largerText
      ? "h-14 w-14"
      : "h-12 w-12"
    : largerText
      ? "min-h-14 px-5 py-3"
      : "min-h-12 px-4 py-2";
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`items-center justify-center rounded-full border border-white/40 active:opacity-70 dark:border-white/10 ${
        size
      } ${selected ? "bg-pink-100 dark:bg-pink-900/40" : "bg-secondary"}`}
    >
      <Text
        className={`font-instrument-sans-semibold ${
          largerText ? "text-xl" : "text-lg"
        } ${
          selected ? "text-pink-700 dark:text-pink-300" : ""
        }`}
        style={[selected ? null : textStyle("muted", scheme), typeStyle("semibold")]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

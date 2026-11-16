import { Text, View } from "react-native";
import { IconMinus, IconPlus } from "@tabler/icons-react-native";
import { cn } from "./cn";
import { textStyle, typeStyle } from "./controlStyles";
import { IconButton } from "./IconButton";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decrementLabel: string;
  incrementLabel: string;
  valueLabel?: string;
  testID?: string;
};

export function Stepper({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  decrementLabel,
  incrementLabel,
  valueLabel,
  testID,
}: StepperProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const clamp = (next: number) => {
    const floored = Math.max(min, next);
    return max === undefined ? floored : Math.min(max, floored);
  };
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;
  return (
    <View testID={testID} className="flex-row items-center gap-1">
      <IconButton
        testID={testID === undefined ? undefined : `${testID}-less`}
        icon={IconMinus}
        label={decrementLabel}
        size="lg"
        disabled={atMin}
        onPress={() => onChange(clamp(value - step))}
      />
      <Text
        accessibilityLabel={valueLabel}
        className={cn("min-w-8 text-center font-instrument-sans-semibold", largerText ? "text-3xl" : "text-2xl")}
        style={[textStyle("foreground", scheme), typeStyle("semibold")]}
      >
        {value}
      </Text>
      <IconButton
        testID={testID === undefined ? undefined : `${testID}-more`}
        icon={IconPlus}
        label={incrementLabel}
        size="lg"
        disabled={atMax}
        onPress={() => onChange(clamp(value + step))}
      />
    </View>
  );
}

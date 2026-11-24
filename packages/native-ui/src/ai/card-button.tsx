import { Text } from "react-native";
import { cn } from "../cn";
import { buttonColors, MIN_TOUCH_TARGET, sizeStyle, touchSlop, typeStyle, type ButtonVariant } from "../controlStyles";
import { AnimatedPressable, usePressScale } from "../pressScale";
import { useLargerText } from "../theme";
import { useScheme } from "../useScheme";
import { chatTextSize } from "./chat-text";

export type CardButtonProps = {
  label: string;
  variant: Extract<ButtonVariant, "primary" | "outline" | "secondary" | "destructive" | "ghost">;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * The compact pill button of the tool and subagent cards: at least 44 points
 * high, label in the `small` chat size (steps up with larger text). Internal.
 */
export function CardButton({ label, variant, onPress, disabled, accessibilityLabel, testID }: CardButtonProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const size = chatTextSize("small", largerText);
  const colors = buttonColors(variant, scheme)!;
  const press = usePressScale({ restOpacity: disabled ? 0.5 : 1, disabled: !!disabled });
  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={touchSlop(MIN_TOUCH_TARGET)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      className="items-center justify-center rounded-full border px-4"
      style={[
        {
          minHeight: MIN_TOUCH_TARGET,
          minWidth: MIN_TOUCH_TARGET,
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
        press.style,
      ]}
    >
      <Text className={cn(size, "font-instrument-sans-medium")} style={[sizeStyle(size), typeStyle("medium"), { color: colors.color }]}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

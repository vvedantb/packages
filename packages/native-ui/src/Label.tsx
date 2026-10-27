import { Text, type TextProps } from "react-native";
import { cn } from "./cn";
import { useLargerText } from "./theme";

export type LabelProps = TextProps & {
  className?: string;
  /** Dims the label (the web `peer-disabled` style). */
  disabled?: boolean;
};

/**
 * Field label, the same type as `SettingsField`'s. Link it to a field with
 * `nativeID` here and `accessibilityLabelledBy` on the field (Android), or
 * give the field its own `accessibilityLabel`.
 */
export function Label({ className, disabled, ...props }: LabelProps) {
  const largerText = useLargerText();
  return (
    <Text
      className={cn(
        "font-instrument-sans-semibold text-foreground",
        largerText ? "text-lg" : "text-base",
        disabled && "opacity-70",
        className,
      )}
      {...props}
    />
  );
}

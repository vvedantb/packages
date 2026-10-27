import { Text, type TextProps } from "react-native";
import { cn } from "./cn";
import { textStyle } from "./controlStyles";
import { useLargerText } from "./theme";
import { useScheme } from "./useScheme";

export type LabelProps = TextProps & {
  className?: string;
  /** Dims the label (the web `peer-disabled` style). */
  disabled?: boolean;
};

/**
 * Field label, the same type as `SettingsField`'s. Link it to a field with
 * `nativeID` here and `accessibilityLabelledBy` on the field (Android), or
 * give the field its own `accessibilityLabel`. The colour is a style that
 * follows the colour scheme; recolour with `style`.
 */
export function Label({ className, disabled, style, ...props }: LabelProps) {
  const largerText = useLargerText();
  const scheme = useScheme();
  return (
    <Text
      className={cn(
        "font-instrument-sans-semibold",
        largerText ? "text-lg" : "text-base",
        disabled && "opacity-70",
        className,
      )}
      style={[textStyle("foreground", scheme), style]}
      {...props}
    />
  );
}
